"""
Reconcile Shopify orders against GA4 purchase transactions.
Outputs: data/tracking_health.csv (Shopify orders GA4 did not record)

GA4's transactionId format is not guaranteed to match Shopify's, so an order
counts as captured if its numeric id, order number or "#name" appears in GA4.
"""

import os

import pandas as pd


def find_missing_orders(shopify_orders: pd.DataFrame, ga4_tx: pd.DataFrame) -> pd.DataFrame:
    """Shopify orders with no matching GA4 transaction."""
    if shopify_orders.empty:
        return shopify_orders.copy()

    seen = set()
    if ga4_tx is not None and not ga4_tx.empty:
        seen = {str(t).strip().lstrip("#") for t in ga4_tx["transaction_id"]}

    def captured(row) -> bool:
        return str(row["order_id"]) in seen or str(row["order_number"]) in seen

    mask = shopify_orders.apply(captured, axis=1)
    return shopify_orders[~mask].reset_index(drop=True)


def summarize(shopify_orders: pd.DataFrame, missing: pd.DataFrame) -> dict:
    total = len(shopify_orders)
    miss = len(missing)
    return {
        "shopify_orders": total,
        "ga4_missing": miss,
        "capture_rate": round((total - miss) / total, 3) if total else None,
        "shopify_revenue": round(float(shopify_orders["amount"].sum()), 2) if total else 0.0,
        "missing_revenue": round(float(missing["amount"].sum()), 2) if miss else 0.0,
    }


def save_health(missing: pd.DataFrame, output_path: str = "data/tracking_health.csv"):
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    missing.to_csv(output_path, index=False)
    print(f"[HEALTH] Saved {len(missing)} unmatched orders to {output_path}")
