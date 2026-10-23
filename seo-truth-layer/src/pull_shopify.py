"""
Pull Shopify orders and attribute their revenue to product pages.
Outputs: data/shopify_orders_raw.csv (one row per order)
         data/shopify_lines_raw.csv  (one row per order line item)
         data/shopify_raw.csv        (one row per /products/<handle> page_path)

Revenue is attributed through line items, not the order's landing page:
for Hydrogen orders Shopify's firstVisit.landingPage is a checkout URL
(shop.app / myshopify.com/checkouts/...), which never matches a storefront page.

Shopify is the revenue ground truth: GA4 purchase events can be dropped
(consent, checkout-domain split), so this feeds revenue reconciliation.

Auth: OPS_ADMIN_API_TOKEN (read_orders only) is preferred; falls back to
SHOPIFY_ADMIN_API_TOKEN. Needs read_orders (+ read_all_orders for >60 days).
"""

from __future__ import annotations

import json
import os
import time
import urllib.error
import urllib.request
from datetime import datetime, timedelta

import pandas as pd

API_VERSION = "2026-01"
UNATTRIBUTED = "(unattributed)"

ORDERS_QUERY = """
query Orders($query: String!, $cursor: String) {
  orders(first: 50, after: $cursor, query: $query, sortKey: CREATED_AT) {
    pageInfo { hasNextPage endCursor }
    nodes {
      id
      name
      createdAt
      cancelledAt
      test
      sourceName
      currentTotalPriceSet { shopMoney { amount currencyCode } }
      customerJourneySummary {
        firstVisit { landingPage source }
      }
      lineItems(first: 50) {
        nodes {
          title
          quantity
          product { handle }
          discountedTotalSet { shopMoney { amount } }
        }
      }
    }
  }
}
"""


def _config():
    domain = os.getenv("SHOPIFY_STORE_DOMAIN") or os.getenv("PUBLIC_STORE_DOMAIN")
    token = os.getenv("OPS_ADMIN_API_TOKEN") or os.getenv("SHOPIFY_ADMIN_API_TOKEN")
    if not domain or not token:
        raise RuntimeError(
            "Set SHOPIFY_STORE_DOMAIN (or PUBLIC_STORE_DOMAIN) and "
            "OPS_ADMIN_API_TOKEN (or SHOPIFY_ADMIN_API_TOKEN)"
        )
    return domain, token


def _graphql(domain: str, token: str, query: str, variables: dict, retries: int = 4) -> dict:
    url = f"https://{domain}/admin/api/{API_VERSION}/graphql.json"
    body = json.dumps({"query": query, "variables": variables}).encode()
    headers = {"Content-Type": "application/json", "X-Shopify-Access-Token": token}

    for attempt in range(retries):
        req = urllib.request.Request(url, data=body, headers=headers, method="POST")
        try:
            with urllib.request.urlopen(req, timeout=30) as res:
                payload = json.load(res)
        except urllib.error.HTTPError as e:
            if e.code in (429, 502, 503) and attempt < retries - 1:
                time.sleep(2 ** attempt)
                continue
            raise

        errors = payload.get("errors") or []
        if any((err.get("extensions") or {}).get("code") == "THROTTLED" for err in errors):
            time.sleep(2 ** attempt)
            continue
        if errors:
            raise RuntimeError(f"Shopify GraphQL errors: {errors}")
        return payload["data"]

    raise RuntimeError("Shopify GraphQL request kept failing after retries")


def pull_shopify_orders(days_back: int = 7) -> tuple[pd.DataFrame, pd.DataFrame]:
    """
    Pull orders created in the same window the GA4 pull uses
    (yesterday back `days_back` days, inclusive).

    Returns (orders_df, lines_df).
    orders_df: one row per order: order_id, order_name, order_number,
    created_at, channel, amount, currency, landing_page, first_visit_source.
    lines_df: one row per line item: order_id, title, quantity, amount,
    page_path (/products/<handle>, or "(unattributed)" if the product is gone).
    Cancelled and test orders are excluded.
    """
    domain, token = _config()

    end_date = datetime.utcnow().date() - timedelta(days=1)
    start_date = end_date - timedelta(days=days_back)
    search = (
        f"created_at:>={start_date.isoformat()}T00:00:00Z "
        f"created_at:<={end_date.isoformat()}T23:59:59Z"
    )

    rows, line_rows, cursor = [], [], None
    while True:
        data = _graphql(domain, token, ORDERS_QUERY, {"query": search, "cursor": cursor})
        conn = data["orders"]
        for o in conn["nodes"]:
            if o["test"] or o["cancelledAt"]:
                continue
            money = o["currentTotalPriceSet"]["shopMoney"]
            visit = ((o.get("customerJourneySummary") or {}).get("firstVisit")) or {}
            landing = visit.get("landingPage")
            rows.append({
                "order_id": o["id"].rsplit("/", 1)[-1],
                "order_name": o["name"],
                "order_number": o["name"].lstrip("#"),
                "created_at": o["createdAt"],
                "channel": o.get("sourceName"),
                "amount": round(float(money["amount"]), 2),
                "currency": money["currencyCode"],
                "landing_page": landing,
                "first_visit_source": visit.get("source"),
                "date_start": start_date.isoformat(),
                "date_end": end_date.isoformat(),
            })
            for li in o["lineItems"]["nodes"]:
                handle = (li.get("product") or {}).get("handle")
                line_rows.append({
                    "order_id": o["id"].rsplit("/", 1)[-1],
                    "title": li["title"],
                    "quantity": li["quantity"],
                    "amount": round(float(li["discountedTotalSet"]["shopMoney"]["amount"]), 2),
                    "page_path": f"/products/{handle}" if handle else UNATTRIBUTED,
                })
        if not conn["pageInfo"]["hasNextPage"]:
            break
        cursor = conn["pageInfo"]["endCursor"]

    df = pd.DataFrame(rows)
    lines = pd.DataFrame(line_rows, columns=["order_id", "title", "quantity", "amount", "page_path"])
    print(f"[SHOPIFY] Pulled {len(df)} orders, {len(lines)} line items ({start_date} to {end_date})")
    return df, lines


def aggregate_by_page(lines_df: pd.DataFrame) -> pd.DataFrame:
    """Line items -> page_path, shopify_orders (distinct), shopify_revenue."""
    if lines_df.empty:
        return pd.DataFrame(columns=["page_path", "shopify_orders", "shopify_revenue"])
    return (
        lines_df.groupby("page_path")
        .agg(shopify_orders=("order_id", "nunique"), shopify_revenue=("amount", "sum"))
        .round({"shopify_revenue": 2})
        .reset_index()
        .sort_values("shopify_revenue", ascending=False)
    )


def save_shopify(orders_df: pd.DataFrame, lines_df: pd.DataFrame, page_df: pd.DataFrame,
                 orders_path: str = "data/shopify_orders_raw.csv",
                 lines_path: str = "data/shopify_lines_raw.csv",
                 page_path: str = "data/shopify_raw.csv"):
    os.makedirs(os.path.dirname(orders_path), exist_ok=True)
    orders_df.to_csv(orders_path, index=False)
    lines_df.to_csv(lines_path, index=False)
    page_df.to_csv(page_path, index=False)
    print(f"[SHOPIFY] Saved to {orders_path}, {lines_path} and {page_path}")


if __name__ == "__main__":
    from dotenv import load_dotenv
    load_dotenv()

    orders, lines = pull_shopify_orders()
    save_shopify(orders, lines, aggregate_by_page(lines))
