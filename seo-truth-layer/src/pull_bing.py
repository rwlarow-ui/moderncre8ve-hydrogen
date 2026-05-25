"""
Pull Bing Webmaster Tools data.

Bing's index powers Copilot and ChatGPT-with-search, so this is the
single most useful non-Google signal for AI search visibility.

Uses the free Bing Webmaster Tools API:
  https://ssl.bing.com/webmaster/api.svc/json/{Method}?apikey={API_KEY}

Pulled endpoints:
  - GetQueryStats   → top queries (query, clicks, impressions, position)
  - GetPageStats    → top pages   (page, clicks, impressions, position)

Bing does not expose the GSC-style query×page join at site level without
per-page calls, so we emit a long-format CSV where each row is tagged
with scope=query|page.

No-ops gracefully when BING_WEBMASTER_API_KEY is unset.
"""

from __future__ import annotations

import os
from datetime import datetime, timedelta
from urllib.parse import quote

import httpx
import pandas as pd


API_BASE = "https://ssl.bing.com/webmaster/api.svc/json"
TIMEOUT = 30.0


def _normalize_page_path(url: str) -> str:
    if not url:
        return ""
    if "//" in url:
        url = url.split("//", 1)[1]
        url = "/" + url.split("/", 1)[-1] if "/" in url else "/"
    return url.rstrip("/") or "/"


def _get(method: str, params: dict, api_key: str) -> dict:
    url = f"{API_BASE}/{method}"
    params = {**params, "apikey": api_key}
    with httpx.Client(timeout=TIMEOUT) as client:
        resp = client.get(url, params=params)
        resp.raise_for_status()
        return resp.json()


def pull_bing(site_url: str, days_back: int = 7, api_key: str | None = None) -> pd.DataFrame:
    """
    Pull Bing Webmaster Tools query + page stats.

    Returns DataFrame with columns:
        scope (query|page), query, page, page_path, clicks, impressions,
        avg_click_position, avg_impression_position, engine, date_start, date_end
    """
    api_key = api_key or os.getenv("BING_WEBMASTER_API_KEY")
    if not api_key:
        print("[BING] Skipped — BING_WEBMASTER_API_KEY not set")
        return pd.DataFrame()

    end_date = datetime.utcnow().date()
    start_date = end_date - timedelta(days=days_back)

    rows: list[dict] = []

    try:
        q_resp = _get("GetQueryStats", {"siteUrl": site_url}, api_key)
        for item in q_resp.get("d", []) or []:
            rows.append({
                "scope": "query",
                "query": item.get("Query", ""),
                "page": "",
                "page_path": "",
                "clicks": int(item.get("Clicks", 0) or 0),
                "impressions": int(item.get("Impressions", 0) or 0),
                "avg_click_position": float(item.get("AvgClickPosition", 0) or 0),
                "avg_impression_position": float(item.get("AvgImpressionPosition", 0) or 0),
            })
    except Exception as exc:
        print(f"[BING] GetQueryStats failed: {exc}")

    try:
        p_resp = _get("GetPageStats", {"siteUrl": site_url}, api_key)
        for item in p_resp.get("d", []) or []:
            page = item.get("Page", "")
            rows.append({
                "scope": "page",
                "query": "",
                "page": page,
                "page_path": _normalize_page_path(page),
                "clicks": int(item.get("Clicks", 0) or 0),
                "impressions": int(item.get("Impressions", 0) or 0),
                "avg_click_position": float(item.get("AvgClickPosition", 0) or 0),
                "avg_impression_position": float(item.get("AvgImpressionPosition", 0) or 0),
            })
    except Exception as exc:
        print(f"[BING] GetPageStats failed: {exc}")

    df = pd.DataFrame(rows)
    if not df.empty:
        df["engine"] = "bing"
        df["date_start"] = start_date.isoformat()
        df["date_end"] = end_date.isoformat()
        df["position"] = df["avg_click_position"].where(
            df["avg_click_position"] > 0, df["avg_impression_position"]
        ).round(1)
        df["ctr"] = (df["clicks"] / df["impressions"].replace(0, 1)).round(4)

    print(f"[BING] Pulled {len(df)} rows for {site_url}")
    return df


def save_bing(df: pd.DataFrame, output_path: str = "data/bing_raw.csv"):
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    df.to_csv(output_path, index=False)
    print(f"[BING] Saved to {output_path}")


if __name__ == "__main__":
    from dotenv import load_dotenv
    load_dotenv()

    site_url = os.getenv("SITE_URL", "https://moderncre8ve.com/")
    df = pull_bing(site_url)
    save_bing(df)
