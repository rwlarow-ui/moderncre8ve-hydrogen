"""
Normalize and clean GSC + GA4 data before merging.
"""

import pandas as pd


# Map Hydrogen routes to clean page types for the storefront
PAGE_TYPE_PATTERNS = [
    ("/products/", "product"),
    ("/collections/", "collection"),
    ("/pages/", "page"),
    ("/blogs/", "blog"),
    ("/cart", "cart"),
    ("/account", "account"),
    ("/search", "search"),
    ("/policies/", "policy"),
]


def classify_page(path: str) -> str:
    """Classify a page path into a storefront page type."""
    for pattern, page_type in PAGE_TYPE_PATTERNS:
        if pattern in path:
            return page_type
    if path == "/" or path == "":
        return "homepage"
    return "other"


def extract_handle(path: str) -> str:
    """Extract the product/collection/page handle from a URL path."""
    parts = path.strip("/").split("/")
    if len(parts) >= 2:
        return parts[-1]
    return path.strip("/") or "homepage"


def normalize_gsc(df: pd.DataFrame) -> pd.DataFrame:
    """
    Normalize GSC data:
    - Ensure page_path exists and is clean
    - Classify page types
    - Extract handles
    - Remove non-organic noise
    """
    if df.empty:
        return df

    df = df.copy()

    # Ensure page_path column
    if "page_path" not in df.columns and "page" in df.columns:
        df["page_path"] = df["page"].apply(
            lambda u: "/" + u.split("//", 1)[-1].split("/", 1)[-1] if "//" in u else u
        )

    # Clean trailing slashes for consistency
    df["page_path"] = df["page_path"].str.rstrip("/").replace("", "/")

    # Classify and extract handle
    df["page_type"] = df["page_path"].apply(classify_page)
    df["handle"] = df["page_path"].apply(extract_handle)

    # Drop queries with zero impressions (noise)
    df = df[df["impressions"] > 0].copy()

    return df


def normalize_ga4(df: pd.DataFrame) -> pd.DataFrame:
    """
    Normalize GA4 data:
    - Clean page paths
    - Classify page types
    - Extract handles
    """
    if df.empty:
        return df

    df = df.copy()

    # Clean trailing slashes
    df["page_path"] = df["page_path"].str.rstrip("/").replace("", "/")

    # Classify and extract handle
    df["page_type"] = df["page_path"].apply(classify_page)
    df["handle"] = df["page_path"].apply(extract_handle)

    return df
