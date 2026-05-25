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
from src.pull_ga4 import (  # noqa: E402
    pull_ga4,
    pull_ga4_ai_referrers,
    save_ga4,
    save_ga4_ai_referrers,
)
from src.pull_bing import pull_bing, save_bing  # noqa: E402
from src.merge_truth import merge_truth, save_truth  # noqa: E402
from src.actions import generate_actions, save_actions  # noqa: E402
from src.report import generate_brief, save_brief  # noqa: E402
from src.history import append_snapshot  # noqa: E402
from src.deltas import compute_deltas, save_deltas  # noqa: E402


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

    import pandas as pd  # local import keeps cold-path empties working

    # --- 1. Pull GSC ---
    print("\n--- Step 1: Pull Google Search Console ---")
    gsc_df = pull_gsc(site_url)
    save_gsc(gsc_df)

    # --- 2. Pull Bing Webmaster Tools (no-op if no key) ---
    print("\n--- Step 2: Pull Bing Webmaster Tools ---")
    bing_df = pull_bing(site_url)
    save_bing(bing_df)

    # --- 3. Pull GA4 ---
    print("\n--- Step 3: Pull Google Analytics 4 ---")
    if ga4_property_id:
        ga4_df = pull_ga4(ga4_property_id)
        ai_referrer_df = pull_ga4_ai_referrers(ga4_property_id)
    else:
        ga4_df = pd.DataFrame()
        ai_referrer_df = pd.DataFrame()
        print("[GA4] Skipped — no property ID configured")
    save_ga4(ga4_df)
    save_ga4_ai_referrers(ai_referrer_df)

    # --- 4. Merge ---
    print("\n--- Step 4: Merge Truth Table ---")
    truth_df = merge_truth(gsc_df, ga4_df, bing_df)
    save_truth(truth_df)

    # --- 5. Append history snapshot ---
    print("\n--- Step 5: Append History Snapshot ---")
    run_id = append_snapshot(
        truth_df=truth_df,
        gsc_query_df=gsc_df,
        ai_referrer_df=ai_referrer_df,
    )

    # --- 6. Compute WoW deltas ---
    print("\n--- Step 6: Compute Week-over-Week Deltas ---")
    deltas_df = compute_deltas()
    save_deltas(deltas_df)

    # --- 7. Actions ---
    print("\n--- Step 7: Generate Actions ---")
    actions_df = generate_actions(truth_df)
    save_actions(actions_df)

    # --- 8. Brief ---
    print("\n--- Step 8: Generate Weekly Brief ---")
    brief = generate_brief(truth_df, actions_df, gsc_df, ga4_df)
    save_brief(brief)

    # --- Summary ---
    print("\n" + "=" * 60)
    print("  Pipeline Complete!")
    print("=" * 60)
    print(f"  GSC rows:        {len(gsc_df):,}")
    print(f"  Bing rows:       {len(bing_df):,}")
    print(f"  GA4 rows:        {len(ga4_df):,}")
    print(f"  AI-referrer:     {len(ai_referrer_df):,}")
    print(f"  Truth rows:      {len(truth_df):,}")
    print(f"  History run_id:  {run_id}")
    print(f"  Movers:          {len(deltas_df):,}")
    print(f"  Actions:         {len(actions_df):,}")
    print("  Brief:           reports/weekly_brief.md")
    print("=" * 60)


if __name__ == "__main__":
    run()
