"""
ModernCre8ve SEO Truth Layer — Main Orchestrator

Runs the full pipeline:
  1. Pull GSC data        → data/gsc_raw.csv
  2. Pull GA4 data        → data/ga4_raw.csv
  3. Merge truth table    → data/seo_truth_merged.csv
  4. Generate actions     → data/seo_actions.csv
  5. Generate brief       → reports/weekly_brief.md
"""

import os
import sys

# Allow running from repo root
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from dotenv import load_dotenv  # noqa: E402

load_dotenv()

from src.pull_gsc import pull_gsc, save_gsc  # noqa: E402
from src.pull_ga4 import pull_ga4, pull_ga4_transactions, save_ga4  # noqa: E402
from src.pull_shopify import aggregate_by_page, pull_shopify_orders, save_shopify  # noqa: E402
from src.tracking_health import find_missing_orders, save_health, summarize  # noqa: E402
from src.merge_truth import merge_truth, save_truth  # noqa: E402
from src.actions import generate_actions, save_actions  # noqa: E402
from src.report import generate_brief, save_brief  # noqa: E402


def run():
    print("=" * 60)
    print("  ModernCre8ve SEO Truth Layer v1.0")
    print("=" * 60)
    print()

    # --- Config ---
    site_url = os.getenv("SITE_URL", "https://moderncre8ve.com/")
    ga4_property_id = os.getenv("GA4_PROPERTY_ID")

    if not ga4_property_id:
        print("[WARN] GA4_PROPERTY_ID not set — GA4 data will be empty")

    # --- 1. Pull GSC ---
    print("\n--- Step 1: Pull Google Search Console ---")
    gsc_df = pull_gsc(site_url)
    save_gsc(gsc_df)

    # --- 2. Pull GA4 ---
    print("\n--- Step 2: Pull Google Analytics 4 ---")
    if ga4_property_id:
        ga4_df = pull_ga4(ga4_property_id)
    else:
        import pandas as pd
        ga4_df = pd.DataFrame()
        print("[GA4] Skipped — no property ID configured")
    save_ga4(ga4_df)

    # --- 2b. Pull Shopify (optional; skipped without a token) ---
    print("\n--- Step 2b: Pull Shopify Orders ---")
    import pandas as pd
    shop_orders, shop_pages = pd.DataFrame(), pd.DataFrame()
    health, missing = None, None
    if (os.getenv("OPS_ADMIN_API_TOKEN") or os.getenv("SHOPIFY_ADMIN_API_TOKEN")) and (
        os.getenv("SHOPIFY_STORE_DOMAIN") or os.getenv("PUBLIC_STORE_DOMAIN")
    ):
        try:
            shop_orders, shop_lines = pull_shopify_orders()
            shop_pages = aggregate_by_page(shop_lines)
            save_shopify(shop_orders, shop_lines, shop_pages)
            ga4_tx = pull_ga4_transactions(ga4_property_id) if ga4_property_id else pd.DataFrame()
            missing = find_missing_orders(shop_orders, ga4_tx)
            save_health(missing)
            health = summarize(shop_orders, missing)
        except Exception as e:  # Shopify must never break the SEO run
            print(f"[SHOPIFY] Skipped — {e}")
    else:
        print("[SHOPIFY] Skipped — no Shopify credentials configured")

    # --- 3. Merge ---
    print("\n--- Step 3: Merge Truth Table ---")
    truth_df = merge_truth(gsc_df, ga4_df, shop_pages)
    save_truth(truth_df)

    # --- 4. Actions ---
    print("\n--- Step 4: Generate Actions ---")
    actions_df = generate_actions(truth_df)
    save_actions(actions_df)

    # --- 5. Brief ---
    print("\n--- Step 5: Generate Weekly Brief ---")
    brief = generate_brief(truth_df, actions_df, gsc_df, ga4_df, health, missing)
    save_brief(brief)

    # --- Summary ---
    print("\n" + "=" * 60)
    print("  Pipeline Complete!")
    print("=" * 60)
    print(f"  GSC rows:      {len(gsc_df):,}")
    print(f"  GA4 rows:      {len(ga4_df):,}")
    print(f"  Truth rows:    {len(truth_df):,}")
    print(f"  Actions:       {len(actions_df):,}")
    print("  Brief:         reports/weekly_brief.md")
    print("=" * 60)


if __name__ == "__main__":
    run()
