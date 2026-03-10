"""
Generate the weekly SEO brief as Markdown.
Outputs: reports/weekly_brief.md
"""

import os
from datetime import datetime

import pandas as pd


def generate_brief(
    truth_df: pd.DataFrame,
    actions_df: pd.DataFrame,
    gsc_df: pd.DataFrame,
    ga4_df: pd.DataFrame,
) -> str:
    """
    Generate a human-readable weekly SEO brief.

    Returns:
        Markdown string
    """
    now = datetime.utcnow().strftime("%Y-%m-%d %H:%M UTC")

    # --- Header ---
    lines = [
        "# ModernCre8ve SEO Weekly Brief",
        "",
        f"**Generated:** {now}",
        "",
    ]

    if truth_df.empty:
        lines.append("_No data available for this period._")
        return "\n".join(lines)

    date_start = truth_df.get("date_start", pd.Series(["unknown"])).iloc[0]
    date_end = truth_df.get("date_end", pd.Series(["unknown"])).iloc[0]
    lines.append(f"**Period:** {date_start} to {date_end}")
    lines.append("")

    # --- Summary Stats ---
    total_clicks = truth_df["total_clicks"].sum()
    total_impressions = truth_df["total_impressions"].sum()
    total_revenue = truth_df["purchase_revenue"].sum()
    total_sessions = truth_df["sessions"].sum() if "sessions" in truth_df.columns else 0
    avg_position = truth_df["avg_position"].mean()
    total_pages = len(truth_df)

    lines.extend([
        "## Overview",
        "",
        "| Metric | Value |",
        "|--------|-------|",
        f"| Organic Clicks | {total_clicks:,} |",
        f"| Impressions | {total_impressions:,} |",
        f"| Avg Position | {avg_position:.1f} |",
        f"| GA4 Sessions | {total_sessions:,} |",
        f"| Purchase Revenue | ${total_revenue:,.2f} |",
        f"| Pages Ranking | {total_pages} |",
        "",
    ])

    # --- Top Pages by Clicks ---
    lines.extend(["## Top 10 Pages by Organic Clicks", ""])
    top_pages = truth_df.head(10)
    lines.append("| # | Page | Clicks | Impressions | Pos | CTR | Revenue |")
    lines.append("|---|------|--------|-------------|-----|-----|---------|")
    for i, (_, row) in enumerate(top_pages.iterrows(), 1):
        path = row["page_path"]
        if len(path) > 40:
            path = path[:37] + "..."
        lines.append(
            f"| {i} | `{path}` | {row['total_clicks']:,} | "
            f"{row['total_impressions']:,} | {row['avg_position']:.1f} | "
            f"{row['avg_ctr']:.1%} | ${row['purchase_revenue']:,.2f} |"
        )
    lines.append("")

    # --- Revenue Pages ---
    rev_pages = truth_df[truth_df["purchase_revenue"] > 0].sort_values("purchase_revenue", ascending=False)
    if not rev_pages.empty:
        lines.extend(["## Revenue-Generating Pages", ""])
        lines.append("| Page | Revenue | Clicks | Transactions |")
        lines.append("|------|---------|--------|-------------|")
        for _, row in rev_pages.head(10).iterrows():
            path = row["page_path"]
            if len(path) > 40:
                path = path[:37] + "..."
            tx = row.get("transactions", 0)
            lines.append(
                f"| `{path}` | ${row['purchase_revenue']:,.2f} | "
                f"{row['total_clicks']:,} | {tx:.0f} |"
            )
        lines.append("")

    # --- Page Type Breakdown ---
    lines.extend(["## Performance by Page Type", ""])
    type_agg = truth_df.groupby("page_type").agg(
        pages=("page_path", "count"),
        clicks=("total_clicks", "sum"),
        impressions=("total_impressions", "sum"),
        revenue=("purchase_revenue", "sum"),
    ).sort_values("clicks", ascending=False).reset_index()

    lines.append("| Page Type | Pages | Clicks | Impressions | Revenue |")
    lines.append("|-----------|-------|--------|-------------|---------|")
    for _, row in type_agg.iterrows():
        lines.append(
            f"| {row['page_type']} | {row['pages']} | {row['clicks']:,} | "
            f"{row['impressions']:,} | ${row['revenue']:,.2f} |"
        )
    lines.append("")

    # --- Top Actions ---
    if not actions_df.empty:
        lines.extend(["## Priority Actions", ""])
        top_actions = actions_df.head(10)
        for _, action in top_actions.iterrows():
            emoji = {
                "STRIKING_DISTANCE": "🎯",
                "HIGH_IMPRESSIONS_LOW_CTR": "👁️",
                "REVENUE_OPPORTUNITY": "💰",
                "THIN_CONTENT": "📝",
                "QUICK_WIN": "⚡",
            }.get(action["action_type"], "📋")

            lines.extend([
                f"### {emoji} #{action['rank']}: {action['action_type']}",
                f"**Page:** `{action['page_path']}`  ",
                f"**Metric:** {action['metric_value']}  ",
                f"**Action:** {action['notes']}",
                "",
            ])

    # --- Action Summary ---
    if not actions_df.empty:
        lines.extend(["## Action Summary", ""])
        action_counts = actions_df["action_type"].value_counts()
        lines.append("| Action Type | Count |")
        lines.append("|-------------|-------|")
        for action_type, count in action_counts.items():
            lines.append(f"| {action_type} | {count} |")
        lines.append("")

    # --- Footer ---
    lines.extend([
        "---",
        "_Generated by ModernCre8ve SEO Truth Layer v1.0_",
        "_Data sources: Google Search Console, Google Analytics 4_",
    ])

    return "\n".join(lines)


def save_brief(content: str, output_path: str = "reports/weekly_brief.md"):
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    with open(output_path, "w") as f:
        f.write(content)
    print(f"[REPORT] Saved weekly brief to {output_path}")
