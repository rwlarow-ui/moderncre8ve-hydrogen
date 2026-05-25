"""
Historical snapshot store for the SEO Truth Layer.

Each pipeline run appends its truth/query/AI-referrer rows into SQLite.
data/history.db is committed to git — for ~120 pages × weekly × 52 weeks
the size stays trivial (sub-megabyte) and gives us a queryable history
without standing up Supabase.

Tables:
  truth_snapshots       — page-level merged truth (one row per page per run)
  gsc_query_snapshots   — query×page rows (one row per query×page per run)
  ai_referrer_snapshots — AI-source sessions (one row per page×source per run)
"""

from __future__ import annotations

import os
import sqlite3
from datetime import datetime

import pandas as pd


DB_PATH_DEFAULT = "data/history.db"


SCHEMAS = {
    "truth_snapshots": """
        CREATE TABLE IF NOT EXISTS truth_snapshots (
            run_id TEXT NOT NULL,
            run_ts TEXT NOT NULL,
            date_start TEXT,
            date_end TEXT,
            page_path TEXT,
            page_type TEXT,
            handle TEXT,
            engine TEXT,
            total_clicks INTEGER,
            total_impressions INTEGER,
            avg_position REAL,
            avg_ctr REAL,
            unique_queries INTEGER,
            top_query TEXT,
            sessions INTEGER,
            engaged_sessions INTEGER,
            bounce_rate REAL,
            avg_session_duration REAL,
            purchase_revenue REAL,
            transactions INTEGER,
            new_users INTEGER,
            revenue_per_click REAL,
            click_to_session_ratio REAL
        )
    """,
    "gsc_query_snapshots": """
        CREATE TABLE IF NOT EXISTS gsc_query_snapshots (
            run_id TEXT NOT NULL,
            run_ts TEXT NOT NULL,
            date_start TEXT,
            date_end TEXT,
            engine TEXT,
            query TEXT,
            page TEXT,
            page_path TEXT,
            device TEXT,
            country TEXT,
            clicks INTEGER,
            impressions INTEGER,
            ctr REAL,
            position REAL
        )
    """,
    "ai_referrer_snapshots": """
        CREATE TABLE IF NOT EXISTS ai_referrer_snapshots (
            run_id TEXT NOT NULL,
            run_ts TEXT NOT NULL,
            date_start TEXT,
            date_end TEXT,
            date TEXT,
            page_path TEXT,
            ai_source TEXT,
            sessions INTEGER,
            engaged_sessions INTEGER,
            new_users INTEGER,
            purchase_revenue REAL,
            transactions INTEGER
        )
    """,
}

INDEXES = [
    "CREATE INDEX IF NOT EXISTS idx_truth_run ON truth_snapshots(run_id)",
    "CREATE INDEX IF NOT EXISTS idx_truth_page ON truth_snapshots(page_path, date_end)",
    "CREATE INDEX IF NOT EXISTS idx_query_run ON gsc_query_snapshots(run_id)",
    "CREATE INDEX IF NOT EXISTS idx_query_key ON gsc_query_snapshots(query, page_path, date_end)",
    "CREATE INDEX IF NOT EXISTS idx_ai_run ON ai_referrer_snapshots(run_id)",
    "CREATE INDEX IF NOT EXISTS idx_ai_page ON ai_referrer_snapshots(page_path, date_end)",
]


def _connect(db_path: str = DB_PATH_DEFAULT) -> sqlite3.Connection:
    os.makedirs(os.path.dirname(db_path), exist_ok=True)
    conn = sqlite3.connect(db_path)
    return conn


def init_db(db_path: str = DB_PATH_DEFAULT) -> None:
    conn = _connect(db_path)
    try:
        for ddl in SCHEMAS.values():
            conn.execute(ddl)
        for ddl in INDEXES:
            conn.execute(ddl)
        conn.commit()
    finally:
        conn.close()


def _select_cols(df: pd.DataFrame, cols: list[str]) -> pd.DataFrame:
    """Subset df to the named columns, adding any missing as NaN."""
    out = pd.DataFrame()
    for c in cols:
        out[c] = df[c] if c in df.columns else None
    return out


def append_snapshot(
    truth_df: pd.DataFrame,
    gsc_query_df: pd.DataFrame,
    ai_referrer_df: pd.DataFrame,
    db_path: str = DB_PATH_DEFAULT,
    run_id: str | None = None,
) -> str:
    """
    Append the current run's snapshots to history.db.

    Returns the run_id used (ISO timestamp by default).
    """
    init_db(db_path)

    run_ts = datetime.utcnow().isoformat(timespec="seconds")
    run_id = run_id or run_ts

    conn = _connect(db_path)
    try:
        if truth_df is not None and not truth_df.empty:
            t = truth_df.copy()
            t.insert(0, "run_id", run_id)
            t.insert(1, "run_ts", run_ts)
            if "engine" not in t.columns:
                t["engine"] = "google"
            cols = [
                "run_id", "run_ts", "date_start", "date_end", "page_path", "page_type",
                "handle", "engine", "total_clicks", "total_impressions", "avg_position",
                "avg_ctr", "unique_queries", "top_query", "sessions", "engaged_sessions",
                "bounce_rate", "avg_session_duration", "purchase_revenue", "transactions",
                "new_users", "revenue_per_click", "click_to_session_ratio",
            ]
            _select_cols(t, cols).to_sql(
                "truth_snapshots", conn, if_exists="append", index=False
            )

        if gsc_query_df is not None and not gsc_query_df.empty:
            q = gsc_query_df.copy()
            q.insert(0, "run_id", run_id)
            q.insert(1, "run_ts", run_ts)
            if "engine" not in q.columns:
                q["engine"] = "google"
            cols = [
                "run_id", "run_ts", "date_start", "date_end", "engine", "query", "page",
                "page_path", "device", "country", "clicks", "impressions", "ctr", "position",
            ]
            _select_cols(q, cols).to_sql(
                "gsc_query_snapshots", conn, if_exists="append", index=False
            )

        if ai_referrer_df is not None and not ai_referrer_df.empty:
            a = ai_referrer_df.copy()
            a.insert(0, "run_id", run_id)
            a.insert(1, "run_ts", run_ts)
            cols = [
                "run_id", "run_ts", "date_start", "date_end", "date", "page_path",
                "ai_source", "sessions", "engaged_sessions", "new_users",
                "purchase_revenue", "transactions",
            ]
            _select_cols(a, cols).to_sql(
                "ai_referrer_snapshots", conn, if_exists="append", index=False
            )

        conn.commit()
    finally:
        conn.close()

    print(f"[HISTORY] Appended snapshot run_id={run_id} to {db_path}")
    return run_id


def load_latest_two(table: str, db_path: str = DB_PATH_DEFAULT) -> tuple[pd.DataFrame, pd.DataFrame]:
    """
    Return (previous_run, current_run) DataFrames for the given table.
    If history has <2 runs, returns (empty, current_or_empty).
    """
    if not os.path.exists(db_path):
        return pd.DataFrame(), pd.DataFrame()

    conn = _connect(db_path)
    try:
        runs = pd.read_sql(
            f"SELECT DISTINCT run_id FROM {table} ORDER BY run_id DESC LIMIT 2", conn
        )
        if runs.empty:
            return pd.DataFrame(), pd.DataFrame()

        run_ids = runs["run_id"].tolist()
        current = pd.read_sql(
            f"SELECT * FROM {table} WHERE run_id = ?", conn, params=(run_ids[0],)
        )
        previous = (
            pd.read_sql(
                f"SELECT * FROM {table} WHERE run_id = ?", conn, params=(run_ids[1],)
            )
            if len(run_ids) > 1
            else pd.DataFrame()
        )
        return previous, current
    finally:
        conn.close()


if __name__ == "__main__":
    init_db()
    print(f"[HISTORY] Initialized {DB_PATH_DEFAULT}")
