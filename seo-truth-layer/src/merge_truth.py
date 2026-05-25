"""
Merge GSC ranking data with GA4 revenue/engagement data.
Outputs: data/seo_truth_merged.csv

The merge creates a single source of truth: for every page,
you see both its search performance AND its revenue performance.
"""

from __future__ import annotations

import os
import pandas as pd
from .transform import classify_page, extract_handle, normalize_gsc, normalize_ga4


def _normalize_bing(df: pd.DataFrame) -> pd.DataFrame:
    """Return Bing page-level rows with normalized page_path, page_type, handle."""
    if df is None or df.empty:
        return pd.DataFrame()
    if "scope" in df.columns:
        df = df[df["scope"] == "page"].copy()
    else:
        df = df.copy()
    if df.empty:
        return df
    df["page_path"] = df["page_path"].str.rstrip("/").replace("", "/")
    df["page_type"] = df["page_path"].apply(classify_page)
    df["handle"] = df["page_path"].apply(extract_handle)
    return df


def merge_truth(
    gsc_df: pd.DataFrame,
    ga4_df: pd.DataFrame,
    bing_df: pd.DataFrame | None = None,
) -> pd.DataFrame:
    """
    Merge GSC (query-level) with GA4 (page-level) data, plus optional Bing.

    Strategy:
    1. Aggregate GSC to page_path level (total clicks/impressions, avg position)
    2. Left join with GA4 on page_path
    3. Left join Bing page-level metrics with bing_ prefix
    4. Compute derived metrics (revenue per click, etc.)
    """
    gsc = normalize_gsc(gsc_df)
    ga4 = normalize_ga4(ga4_df)
    bing = _normalize_bing(bing_df)

    if gsc.empty:
        print("[MERGE] Warning: GSC data is empty")
        return pd.DataFrame()

    # --- GSC: aggregate to page level ---
    gsc_page = gsc.groupby("page_path").agg(
        total_clicks=("clicks", "sum"),
        total_impressions=("impressions", "sum"),
        avg_position=("position", "mean"),
        avg_ctr=("ctr", "mean"),
        unique_queries=("query", "nunique"),
        top_query=("clicks", lambda x: gsc.loc[x.idxmax(), "query"] if len(x) > 0 else ""),
        page_type=("page_type", "first"),
        handle=("handle", "first"),
    ).reset_index()

    gsc_page["avg_position"] = gsc_page["avg_position"].round(1)
    gsc_page["avg_ctr"] = gsc_page["avg_ctr"].round(4)

    # --- GA4: already at page level ---
    if ga4.empty:
        print("[MERGE] Warning: GA4 data is empty, merging GSC-only")
        merged = gsc_page.copy()
        merged["sessions"] = 0
        merged["purchase_revenue"] = 0.0
        merged["transactions"] = 0
        merged["bounce_rate"] = 0.0
        merged["new_users"] = 0
    else:
        ga4_slim = ga4[["page_path", "sessions", "engaged_sessions", "bounce_rate",
                         "avg_session_duration", "purchase_revenue", "transactions",
                         "new_users"]].copy()

        merged = gsc_page.merge(ga4_slim, on="page_path", how="left")
        merged = merged.fillna({
            "sessions": 0, "engaged_sessions": 0, "bounce_rate": 0,
            "avg_session_duration": 0, "purchase_revenue": 0,
            "transactions": 0, "new_users": 0,
        })

    # --- Bing (optional) ---
    if not bing.empty:
        bing_slim = bing[["page_path", "clicks", "impressions", "position", "ctr"]].rename(
            columns={
                "clicks": "bing_clicks",
                "impressions": "bing_impressions",
                "position": "bing_position",
                "ctr": "bing_ctr",
            }
        )
        bing_slim = bing_slim.groupby("page_path", as_index=False).agg({
            "bing_clicks": "sum",
            "bing_impressions": "sum",
            "bing_position": "mean",
            "bing_ctr": "mean",
        })
        merged = merged.merge(bing_slim, on="page_path", how="left")
    else:
        merged["bing_clicks"] = 0
        merged["bing_impressions"] = 0
        merged["bing_position"] = 0.0
        merged["bing_ctr"] = 0.0
    merged = merged.fillna({
        "bing_clicks": 0, "bing_impressions": 0,
        "bing_position": 0.0, "bing_ctr": 0.0,
    })

    # --- Derived metrics ---
    merged["revenue_per_click"] = (
        merged["purchase_revenue"] / merged["total_clicks"].replace(0, 1)
    ).round(2)

    merged["click_to_session_ratio"] = (
        merged["total_clicks"] / merged["sessions"].replace(0, 1)
    ).round(2)

    # Sort by total clicks descending (most important pages first)
    merged = merged.sort_values("total_clicks", ascending=False).reset_index(drop=True)

    # Add date range metadata
    if "date_start" in gsc_df.columns:
        merged["date_start"] = gsc_df["date_start"].iloc[0]
        merged["date_end"] = gsc_df["date_end"].iloc[0]

    print(f"[MERGE] Created truth table with {len(merged)} pages")
    return merged


def save_truth(df: pd.DataFrame, output_path: str = "data/seo_truth_merged.csv"):
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    df.to_csv(output_path, index=False)
    print(f"[MERGE] Saved to {output_path}")
