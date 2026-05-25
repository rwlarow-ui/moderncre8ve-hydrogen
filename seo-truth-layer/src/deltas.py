"""
Week-over-week delta computation.

Reads the two most recent runs from data/history.db and emits
data/deltas_wow.csv with one row per (page_path, query?, metric).

Mover types:
  RISING  — metric improved by at least the threshold
  FALLING — metric degraded by at least the threshold
  NEW     — present in current run, absent in previous
  LOST    — present in previous run, absent in current

For "position" lower is better, so the sign convention is inverted.
"""

from __future__ import annotations

import os

import pandas as pd

from .history import load_latest_two


RISE_FALL_PCT = 0.20      # 20% change qualifies as RISING/FALLING for clicks/impr/sessions
RISE_FALL_POSITION = 2.0  # absolute position movement of 2+ qualifies
MIN_BASELINE_VALUE = 5    # ignore noise from tiny baselines


def _classify(prev: float, curr: float, metric: str) -> str | None:
    """Return mover_type or None if change is below threshold."""
    if pd.isna(prev) and pd.isna(curr):
        return None
    if pd.isna(prev) or prev == 0:
        return "NEW" if (curr or 0) >= MIN_BASELINE_VALUE else None
    if pd.isna(curr) or curr == 0:
        return "LOST" if (prev or 0) >= MIN_BASELINE_VALUE else None

    if metric == "position":
        delta = prev - curr  # positive = rank improved
        if abs(delta) < RISE_FALL_POSITION:
            return None
        return "RISING" if delta > 0 else "FALLING"

    if max(prev, curr) < MIN_BASELINE_VALUE:
        return None
    pct = (curr - prev) / prev
    if abs(pct) < RISE_FALL_PCT:
        return None
    return "RISING" if pct > 0 else "FALLING"


def _page_deltas(prev: pd.DataFrame, curr: pd.DataFrame) -> pd.DataFrame:
    """Compute deltas at page level for truth_snapshots."""
    if prev.empty and curr.empty:
        return pd.DataFrame()

    metrics = ["total_clicks", "total_impressions", "avg_position", "sessions",
               "purchase_revenue"]
    metric_aliases = {
        "total_clicks": "clicks",
        "total_impressions": "impressions",
        "avg_position": "position",
        "sessions": "sessions",
        "purchase_revenue": "revenue",
    }

    prev_idx = prev.set_index("page_path") if not prev.empty else pd.DataFrame()
    curr_idx = curr.set_index("page_path") if not curr.empty else pd.DataFrame()
    pages = sorted(set(prev_idx.index) | set(curr_idx.index))

    rows = []
    for page in pages:
        for raw_metric in metrics:
            prev_val = prev_idx.loc[page, raw_metric] if page in prev_idx.index else None
            curr_val = curr_idx.loc[page, raw_metric] if page in curr_idx.index else None
            label = metric_aliases[raw_metric]
            mover = _classify(prev_val, curr_val, label if label != "revenue" else "revenue")
            if mover is None:
                continue
            rows.append({
                "scope": "page",
                "page_path": page,
                "query": "",
                "metric": label,
                "prev_value": prev_val,
                "curr_value": curr_val,
                "delta": (curr_val or 0) - (prev_val or 0) if (prev_val is not None and curr_val is not None) else None,
                "delta_pct": ((curr_val - prev_val) / prev_val) if (prev_val and curr_val is not None) else None,
                "mover_type": mover,
            })
    return pd.DataFrame(rows)


def _query_deltas(prev: pd.DataFrame, curr: pd.DataFrame) -> pd.DataFrame:
    """Compute deltas at query×page level for gsc_query_snapshots."""
    if prev.empty and curr.empty:
        return pd.DataFrame()

    def agg(df: pd.DataFrame) -> pd.DataFrame:
        if df.empty:
            return df
        return (
            df.groupby(["query", "page_path"], as_index=False)
            .agg(clicks=("clicks", "sum"),
                 impressions=("impressions", "sum"),
                 position=("position", "mean"))
        )

    p = agg(prev).set_index(["query", "page_path"]) if not prev.empty else pd.DataFrame()
    c = agg(curr).set_index(["query", "page_path"]) if not curr.empty else pd.DataFrame()
    keys = sorted(set(p.index) | set(c.index))

    rows = []
    for key in keys:
        query, page = key
        for metric in ["clicks", "impressions", "position"]:
            prev_val = p.loc[key, metric] if key in p.index else None
            curr_val = c.loc[key, metric] if key in c.index else None
            mover = _classify(prev_val, curr_val, metric)
            if mover is None:
                continue
            rows.append({
                "scope": "query",
                "page_path": page,
                "query": query,
                "metric": metric,
                "prev_value": prev_val,
                "curr_value": curr_val,
                "delta": (curr_val or 0) - (prev_val or 0) if (prev_val is not None and curr_val is not None) else None,
                "delta_pct": ((curr_val - prev_val) / prev_val) if (prev_val and curr_val is not None) else None,
                "mover_type": mover,
            })
    return pd.DataFrame(rows)


def _ai_referrer_deltas(prev: pd.DataFrame, curr: pd.DataFrame) -> pd.DataFrame:
    """Compute deltas for AI referrer sessions at (page, ai_source) granularity."""
    if prev.empty and curr.empty:
        return pd.DataFrame()

    def agg(df: pd.DataFrame) -> pd.DataFrame:
        if df.empty:
            return df
        return (
            df.groupby(["page_path", "ai_source"], as_index=False)
            .agg(sessions=("sessions", "sum"))
        )

    p = agg(prev).set_index(["page_path", "ai_source"]) if not prev.empty else pd.DataFrame()
    c = agg(curr).set_index(["page_path", "ai_source"]) if not curr.empty else pd.DataFrame()
    keys = sorted(set(p.index) | set(c.index))

    rows = []
    for key in keys:
        page, source = key
        prev_val = p.loc[key, "sessions"] if key in p.index else None
        curr_val = c.loc[key, "sessions"] if key in c.index else None
        mover = _classify(prev_val, curr_val, "sessions")
        if mover is None:
            continue
        rows.append({
            "scope": "ai_referrer",
            "page_path": page,
            "query": source,
            "metric": "ai_sessions",
            "prev_value": prev_val,
            "curr_value": curr_val,
            "delta": (curr_val or 0) - (prev_val or 0) if (prev_val is not None and curr_val is not None) else None,
            "delta_pct": ((curr_val - prev_val) / prev_val) if (prev_val and curr_val is not None) else None,
            "mover_type": mover,
        })
    return pd.DataFrame(rows)


def compute_deltas(db_path: str = "data/history.db") -> pd.DataFrame:
    """Return a unified deltas DataFrame across page, query, and AI-referrer scopes."""
    chunks: list[pd.DataFrame] = []

    prev, curr = load_latest_two("truth_snapshots", db_path)
    chunks.append(_page_deltas(prev, curr))

    prev, curr = load_latest_two("gsc_query_snapshots", db_path)
    chunks.append(_query_deltas(prev, curr))

    prev, curr = load_latest_two("ai_referrer_snapshots", db_path)
    chunks.append(_ai_referrer_deltas(prev, curr))

    chunks = [c for c in chunks if not c.empty]
    if not chunks:
        return pd.DataFrame(
            columns=["scope", "page_path", "query", "metric", "prev_value",
                     "curr_value", "delta", "delta_pct", "mover_type"]
        )

    df = pd.concat(chunks, ignore_index=True)
    df = df.sort_values(
        by=["mover_type", "scope", "page_path"],
        key=lambda col: col if col.name != "mover_type" else col.map(
            {"NEW": 0, "RISING": 1, "FALLING": 2, "LOST": 3}
        ),
    ).reset_index(drop=True)
    return df


def save_deltas(df: pd.DataFrame, output_path: str = "data/deltas_wow.csv") -> None:
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    df.to_csv(output_path, index=False)
    print(f"[DELTAS] Saved {len(df)} mover rows to {output_path}")


if __name__ == "__main__":
    df = compute_deltas()
    save_deltas(df)
