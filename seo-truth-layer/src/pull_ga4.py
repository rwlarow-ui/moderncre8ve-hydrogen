"""
Pull Google Analytics 4 data for the last 7 days.
Outputs: data/ga4_raw.csv
"""

import os
import json
from datetime import datetime, timedelta

import pandas as pd
from google.oauth2 import service_account
from google.analytics.data_v1beta import BetaAnalyticsDataClient
from google.analytics.data_v1beta.types import (
    DateRange,
    Dimension,
    Filter,
    FilterExpression,
    Metric,
    RunReportRequest,
)


SCOPES = ["https://www.googleapis.com/auth/analytics.readonly"]

AI_REFERRER_HOSTS = [
    "chatgpt.com",
    "chat.openai.com",
    "perplexity.ai",
    "www.perplexity.ai",
    "copilot.microsoft.com",
    "gemini.google.com",
    "claude.ai",
    "you.com",
    "phind.com",
]


def get_credentials():
    """Load service account credentials from file or env var."""
    sa_path = os.getenv("GOOGLE_SA_PATH", "service_account.json")
    if os.path.exists(sa_path):
        return service_account.Credentials.from_service_account_file(sa_path, scopes=SCOPES)

    sa_json = os.getenv("GOOGLE_SERVICE_ACCOUNT_JSON")
    if sa_json:
        info = json.loads(sa_json)
        return service_account.Credentials.from_service_account_info(info, scopes=SCOPES)

    raise RuntimeError("No service account credentials found.")


def pull_ga4(property_id: str, days_back: int = 7) -> pd.DataFrame:
    """
    Pull GA4 page-level metrics for the given property.

    Args:
        property_id: GA4 property ID (numeric, e.g. "123456789")
        days_back: Number of days to look back

    Returns:
        DataFrame with columns: date, page_path, sessions, engaged_sessions,
                                bounce_rate, avg_session_duration,
                                purchase_revenue, transactions, new_users
    """
    creds = get_credentials()
    client = BetaAnalyticsDataClient(credentials=creds)

    end_date = datetime.utcnow().date() - timedelta(days=1)
    start_date = end_date - timedelta(days=days_back)

    request = RunReportRequest(
        property=f"properties/{property_id}",
        date_ranges=[
            DateRange(
                start_date=start_date.isoformat(),
                end_date=end_date.isoformat(),
            )
        ],
        dimensions=[
            Dimension(name="date"),
            Dimension(name="pagePath"),
            Dimension(name="sessionDefaultChannelGroup"),
        ],
        metrics=[
            Metric(name="sessions"),
            Metric(name="engagedSessions"),
            Metric(name="bounceRate"),
            Metric(name="averageSessionDuration"),
            Metric(name="purchaseRevenue"),
            Metric(name="transactions"),
            Metric(name="newUsers"),
        ],
        limit=100000,
    )

    response = client.run_report(request)

    rows = []
    for row in response.rows:
        rows.append({
            "date": row.dimension_values[0].value,
            "page_path": row.dimension_values[1].value,
            "channel": row.dimension_values[2].value,
            "sessions": int(row.metric_values[0].value),
            "engaged_sessions": int(row.metric_values[1].value),
            "bounce_rate": round(float(row.metric_values[2].value), 4),
            "avg_session_duration": round(float(row.metric_values[3].value), 1),
            "purchase_revenue": round(float(row.metric_values[4].value), 2),
            "transactions": int(row.metric_values[5].value),
            "new_users": int(row.metric_values[6].value),
        })

    df = pd.DataFrame(rows)

    # Aggregate to page_path level (sum sessions/revenue, avg bounce/duration)
    if not df.empty:
        page_agg = df.groupby("page_path").agg(
            sessions=("sessions", "sum"),
            engaged_sessions=("engaged_sessions", "sum"),
            bounce_rate=("bounce_rate", "mean"),
            avg_session_duration=("avg_session_duration", "mean"),
            purchase_revenue=("purchase_revenue", "sum"),
            transactions=("transactions", "sum"),
            new_users=("new_users", "sum"),
        ).reset_index()

        page_agg["date_start"] = start_date.isoformat()
        page_agg["date_end"] = end_date.isoformat()
        df = page_agg

    print(f"[GA4] Pulled {len(df)} page rows for property {property_id} ({start_date} to {end_date})")
    return df


def save_ga4(df: pd.DataFrame, output_path: str = "data/ga4_raw.csv"):
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    df.to_csv(output_path, index=False)
    print(f"[GA4] Saved to {output_path}")


def pull_ga4_ai_referrers(property_id: str, days_back: int = 7) -> pd.DataFrame:
    """
    Pull GA4 sessions referred from AI chat / answer engines.

    Filters sessions where sessionSource is one of the AI_REFERRER_HOSTS.
    Granularity: (date, page_path, ai_source).

    Returns DataFrame with columns:
        date, page_path, ai_source, sessions, engaged_sessions, new_users,
        purchase_revenue, transactions, date_start, date_end
    """
    creds = get_credentials()
    client = BetaAnalyticsDataClient(credentials=creds)

    end_date = datetime.utcnow().date() - timedelta(days=1)
    start_date = end_date - timedelta(days=days_back)

    source_filter = FilterExpression(
        filter=Filter(
            field_name="sessionSource",
            in_list_filter=Filter.InListFilter(values=AI_REFERRER_HOSTS),
        )
    )

    request = RunReportRequest(
        property=f"properties/{property_id}",
        date_ranges=[
            DateRange(start_date=start_date.isoformat(), end_date=end_date.isoformat())
        ],
        dimensions=[
            Dimension(name="date"),
            Dimension(name="pagePath"),
            Dimension(name="sessionSource"),
        ],
        metrics=[
            Metric(name="sessions"),
            Metric(name="engagedSessions"),
            Metric(name="newUsers"),
            Metric(name="purchaseRevenue"),
            Metric(name="transactions"),
        ],
        dimension_filter=source_filter,
        limit=100000,
    )

    response = client.run_report(request)

    rows = []
    for row in response.rows:
        rows.append({
            "date": row.dimension_values[0].value,
            "page_path": row.dimension_values[1].value,
            "ai_source": row.dimension_values[2].value,
            "sessions": int(row.metric_values[0].value),
            "engaged_sessions": int(row.metric_values[1].value),
            "new_users": int(row.metric_values[2].value),
            "purchase_revenue": round(float(row.metric_values[3].value), 2),
            "transactions": int(row.metric_values[4].value),
        })

    df = pd.DataFrame(rows)
    if not df.empty:
        df["date_start"] = start_date.isoformat()
        df["date_end"] = end_date.isoformat()

    print(
        f"[GA4-AI] Pulled {len(df)} AI-referrer rows "
        f"({start_date} to {end_date}, {len(AI_REFERRER_HOSTS)} sources)"
    )
    return df


def save_ga4_ai_referrers(df: pd.DataFrame, output_path: str = "data/ga4_ai_referrers.csv"):
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    df.to_csv(output_path, index=False)
    print(f"[GA4-AI] Saved to {output_path}")


if __name__ == "__main__":
    from dotenv import load_dotenv
    load_dotenv()

    property_id = os.getenv("GA4_PROPERTY_ID")
    if not property_id:
        raise RuntimeError("GA4_PROPERTY_ID not set")

    df = pull_ga4(property_id)
    save_ga4(df)

    ai_df = pull_ga4_ai_referrers(property_id)
    save_ga4_ai_referrers(ai_df)
