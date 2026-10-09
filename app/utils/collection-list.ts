/**
 * Ordering and display rules for the `/collections` index.
 *
 * Shopify returns collections in its own order, which put catch-alls like
 * "Featured" and "All products" ahead of the categories shoppers actually come
 * for. The priority list below leads with the store's three focus categories —
 * extension tables, dining tables and beds — and the catch-alls move to the end
 * of the grid. Nothing is hidden: a collection that appears in neither list keeps
 * Shopify's order between the two groups.
 */

/** Shown first, in this order. Handles that don't exist are skipped. */
export const PRIORITY_COLLECTION_HANDLES = [
  "custom-made-expandable-dining-tables",
  "mid-century-modern-dining-tables",
  "modern-bed-frames",
  "oval-dining-tables",
  "modern-dining-chairs",
  "bedroom",
] as const;

/** Broad "everything" collections — useful, but not a starting point. */
export const CATCH_ALL_COLLECTION_HANDLES = [
  "new-products",
  "best-sellers",
  "modern-scandinavian-furniture",
  "custom-made-furniture",
  "japandi-scandi-mid-century-modern-furniture",
  "all-products",
  "all",
] as const;

/** Rank bands: priority (0…n) < everything else < catch-alls. */
const UNLISTED_RANK = 1000;
const CATCH_ALL_RANK = 10_000;

function rank(handle: string): number {
  const priority = (PRIORITY_COLLECTION_HANDLES as readonly string[]).indexOf(
    handle,
  );
  if (priority !== -1) {
    return priority;
  }
  const catchAll = (CATCH_ALL_COLLECTION_HANDLES as readonly string[]).indexOf(
    handle,
  );
  if (catchAll !== -1) {
    return CATCH_ALL_RANK + catchAll;
  }
  return UNLISTED_RANK;
}

/** Stable sort: collections of equal rank keep Shopify's order. */
export function sortCollectionsForListing<T extends { handle: string }>(
  nodes: readonly T[],
): T[] {
  return nodes
    .map((node, index) => ({ node, index }))
    .sort(
      (a, b) => rank(a.node.handle) - rank(b.node.handle) || a.index - b.index,
    )
    .map(({ node }) => node);
}

/**
 * Card label for a collection. Drops the store name some titles carry for SEO
 * ("Japandi Collection - Moderncre8ve") and normalises all-caps titles
 * ("BENCHES") so every card reads the same way.
 */
export function getCollectionDisplayTitle(title: string): string {
  const trimmed = title.replace(/\s*[-–|]\s*moderncre8ve\s*$/i, "").trim();
  if (trimmed && trimmed === trimmed.toUpperCase()) {
    return trimmed.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
  }
  return trimmed || title;
}
