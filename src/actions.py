"""
SEO Actions Engine — generates prioritized recommendations from truth data.
Outputs: data/seo_actions.csv

Action types:
  - STRIKING_DISTANCE: Pages ranking 4-20 that could reach page 1
  - HIGH_IMPRESSIONS_LOW_CTR: Visible but not clicked — title/meta fix
  - REVENUE_OPPORTUNITY: High clicks but low revenue — CRO opportunity
  - THIN_CONTENT: Low queries per page — needs content expansion
  - QUICK_WIN: Already page 1 but CTR below expected — snippet optimization
  - DECLINING: (Phase 2 with historical data)
"""

import os
import pandas as pd


def generate_actions(truth_df: pd.DataFrame) -> pd.DataFrame:
    """
    Analyze the merged truth table and generate prioritized SEO actions.

    Returns:
        DataFrame with columns: priority_score, action_type, page_path,
                                handle, page_type, metric_value, notes
    """
    if truth_df.empty:
        return pd.DataFrame()

    actions = []
    df = truth_df.copy()

    # --- 1. STRIKING DISTANCE: position 4-20, decent impressions ---
    striking = df[(df["avg_position"] >= 4) & (df["avg_position"] <= 20) & (df["total_impressions"] >= 50)]
    for _, row in striking.iterrows():
        # Higher priority for positions closer to page 1 and more impressions
        score = round((21 - row["avg_position"]) * (row["total_impressions"] / 100), 1)
        actions.append({
            "priority_score": min(score, 100),
            "action_type": "STRIKING_DISTANCE",
            "page_path": row["page_path"],
            "handle": row["handle"],
            "page_type": row["page_type"],
            "metric_value": f"pos {row['avg_position']} | {row['total_impressions']} imp",
            "notes": f"Ranking #{row['avg_position']:.0f} with {row['total_impressions']} impressions. "
                     f"Top query: '{row.get('top_query', 'n/a')}'. "
                     f"Optimize content + internal links to push to page 1.",
        })

    # --- 2. HIGH IMPRESSIONS LOW CTR: lots of eyeballs, few clicks ---
    def get_expected_ctr(pos):
        if pos <= 1:
            return 0.30
        if pos <= 2:
            return 0.15
        if pos <= 3:
            return 0.10
        if pos <= 5:
            return 0.05
        if pos <= 10:
            return 0.02
        return 0.01

    low_ctr = df[(df["total_impressions"] >= 100)].copy()
    low_ctr["expected_ctr"] = low_ctr["avg_position"].apply(get_expected_ctr)
    low_ctr = low_ctr[low_ctr["avg_ctr"] < low_ctr["expected_ctr"] * 0.6]  # 40%+ below expected

    for _, row in low_ctr.iterrows():
        score = round(row["total_impressions"] * (row["expected_ctr"] - row["avg_ctr"]) * 10, 1)
        actions.append({
            "priority_score": min(score, 100),
            "action_type": "HIGH_IMPRESSIONS_LOW_CTR",
            "page_path": row["page_path"],
            "handle": row["handle"],
            "page_type": row["page_type"],
            "metric_value": f"CTR {row['avg_ctr']:.1%} vs expected {row['expected_ctr']:.1%}",
            "notes": f"{row['total_impressions']} impressions but only {row['avg_ctr']:.1%} CTR "
                     f"(expected ~{row['expected_ctr']:.1%} at position {row['avg_position']:.0f}). "
                     f"Rewrite title tag + meta description for this page.",
        })

    # --- 3. REVENUE OPPORTUNITY: high traffic, low conversion ---
    rev_opp = df[(df["total_clicks"] >= 20) & (df["purchase_revenue"] == 0) &
                 (df["page_type"].isin(["product", "collection"]))].copy()
    for _, row in rev_opp.iterrows():
        score = round(row["total_clicks"] * 2, 1)
        actions.append({
            "priority_score": min(score, 100),
            "action_type": "REVENUE_OPPORTUNITY",
            "page_path": row["page_path"],
            "handle": row["handle"],
            "page_type": row["page_type"],
            "metric_value": f"{row['total_clicks']} clicks | $0 revenue",
            "notes": f"Getting {row['total_clicks']} organic clicks but zero revenue. "
                     f"Check product page CRO: pricing visibility, CTA placement, images, trust signals.",
        })

    # --- 4. THIN CONTENT: few unique queries ranking ---
    thin = df[(df["unique_queries"] <= 2) & (df["total_impressions"] >= 20) &
              (df["page_type"].isin(["product", "page", "collection"]))].copy()
    for _, row in thin.iterrows():
        score = round(row["total_impressions"] * 0.5, 1)
        actions.append({
            "priority_score": min(score, 100),
            "action_type": "THIN_CONTENT",
            "page_path": row["page_path"],
            "handle": row["handle"],
            "page_type": row["page_type"],
            "metric_value": f"{row['unique_queries']} queries | {row['total_impressions']} imp",
            "notes": f"Only ranking for {row['unique_queries']} unique queries. "
                     f"Expand content with related keywords, FAQ section, or detailed descriptions.",
        })

    # --- 5. QUICK WIN: page 1 but underperforming CTR ---
    quick = df[(df["avg_position"] <= 3) & (df["total_impressions"] >= 50)].copy()
    quick["expected_ctr"] = quick["avg_position"].apply(get_expected_ctr)
    quick = quick[quick["avg_ctr"] < quick["expected_ctr"] * 0.75]

    for _, row in quick.iterrows():
        potential_clicks = row["total_impressions"] * (row["expected_ctr"] - row["avg_ctr"])
        score = round(potential_clicks * 5, 1)
        actions.append({
            "priority_score": min(score, 100),
            "action_type": "QUICK_WIN",
            "page_path": row["page_path"],
            "handle": row["handle"],
            "page_type": row["page_type"],
            "metric_value": f"pos {row['avg_position']:.0f} | CTR {row['avg_ctr']:.1%} (could be {row['expected_ctr']:.1%})",
            "notes": f"Already ranking #{row['avg_position']:.0f} but CTR is {row['avg_ctr']:.1%} "
                     f"vs expected {row['expected_ctr']:.1%}. "
                     f"~{potential_clicks:.0f} extra clicks/week possible with better title/rich snippets.",
        })

    actions_df = pd.DataFrame(actions)

    if not actions_df.empty:
        actions_df = actions_df.sort_values("priority_score", ascending=False).reset_index(drop=True)
        actions_df["rank"] = range(1, len(actions_df) + 1)

    print(f"[ACTIONS] Generated {len(actions_df)} action items")
    return actions_df


def save_actions(df: pd.DataFrame, output_path: str = "data/seo_actions.csv"):
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    df.to_csv(output_path, index=False)
    print(f"[ACTIONS] Saved to {output_path}")
