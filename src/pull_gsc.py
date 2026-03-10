"""
Pull Google Search Console data for the last 7 days.
Outputs: data/gsc_raw.csv
"""

import os
import json
from datetime import datetime, timedelta

import pandas as pd
from google.oauth2 import service_account
from googleapiclient.discovery import build


SCOPES = ["https://www.googleapis.com/auth/webmasters.readonly"]
DIMENSIONS = ["query", "page", "device", "country"]
ROW_LIMIT = 25000


def get_credentials():
    """Load service account credentials from file or env var."""
    sa_path = os.getenv("GOOGLE_SA_PATH", "service_account.json")
    if os.path.exists(sa_path):
        return service_account.Credentials.from_service_account_file(sa_path, scopes=SCOPES)

    sa_json = os.getenv("GOOGLE_SERVICE_ACCOUNT_JSON")
    if sa_json:
        info = json.loads(sa_json)
        return service_account.Credentials.from_service_account_info(info, scopes=SCOPES)

    raise RuntimeError("No service account credentials found. Set GOOGLE_SERVICE_ACCOUNT_JSON or provide service_account.json")


def pull_gsc(site_url: str, days_back: int = 7) -> pd.DataFrame:
    """
    Pull GSC search analytics for the given site.

    Args:
        site_url: The property URL (e.g. https://moderncre8ve.com/)
        days_back: Number of days to look back (default 7)

    Returns:
        DataFrame with columns: date, query, page, device, country,
                                clicks, impressions, ctr, position
    """
    creds = get_credentials()
    service = build("searchconsole", "v1", credentials=creds)

    end_date = datetime.utcnow().date() - timedelta(days=3)  # GSC has ~3 day lag
    start_date = end_date - timedelta(days=days_back)

    all_rows = []
    start_row = 0

    while True:
        request_body = {
            "startDate": start_date.isoformat(),
            "endDate": end_date.isoformat(),
            "dimensions": DIMENSIONS,
            "rowLimit": ROW_LIMIT,
            "startRow": start_row,
            "dataState": "final",
        }

        response = service.searchanalytics().query(
            siteUrl=site_url, body=request_body
        ).execute()

        rows = response.get("rows", [])
        if not rows:
            break

        for row in rows:
            keys = row["keys"]
            all_rows.append({
                "query": keys[0],
                "page": keys[1],
                "device": keys[2],
                "country": keys[3],
                "clicks": row["clicks"],
                "impressions": row["impressions"],
                "ctr": round(row["ctr"], 4),
                "position": round(row["position"], 1),
            })

        start_row += ROW_LIMIT
        if len(rows) < ROW_LIMIT:
            break

    df = pd.DataFrame(all_rows)

    if not df.empty:
        df["date_start"] = start_date.isoformat()
        df["date_end"] = end_date.isoformat()
        # Normalize page paths: strip domain, keep path only
        df["page_path"] = df["page"].apply(
            lambda u: "/" + u.split("//", 1)[-1].split("/", 1)[-1] if "//" in u else u
        )

    print(f"[GSC] Pulled {len(df)} rows for {site_url} ({start_date} to {end_date})")
    return df


def save_gsc(df: pd.DataFrame, output_path: str = "data/gsc_raw.csv"):
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    df.to_csv(output_path, index=False)
    print(f"[GSC] Saved to {output_path}")


if __name__ == "__main__":
    from dotenv import load_dotenv
    load_dotenv()

    site_url = os.getenv("SITE_URL", "https://moderncre8ve.com/")
    df = pull_gsc(site_url)
    save_gsc(df)
