/**
 * Curated route-level SEO metadata for pages that Search Console flagged as
 * growing or under-clicked. These keep Hydrogen snippets current while the
 * matching Shopify Admin SEO fields are synced.
 */
export interface SeoFallback {
  title: string;
  description: string;
}

export const collectionSeoFallbacks: Record<string, SeoFallback> = {
  "mid-century-modern-dining-tables": {
    title: "Mid Century Modern Dining Tables: Walnut, Oak & Extendable",
    description:
      "Shop solid walnut and oak mid century modern dining tables, handcrafted to order in Ohio with extendable options, custom sizing, and white glove delivery.",
  },
  "japandi-scandi-mid-century-modern-furniture": {
    title: "Japandi MCM Furniture: Scandi & Mid Century Modern",
    description:
      "Shop Japandi MCM furniture blending Japanese minimalism, Scandi warmth, and mid-century lines. Solid walnut and oak pieces handmade to order in Ohio.",
  },
};

export const productSeoFallbacks: Record<string, SeoFallback> = {
  "payne-oval-extendable-dining-table-for-6-8": {
    title: "Payne Oval Extendable Dining Table for 6-8",
    description:
      "Shop the Payne oval extendable dining table for 6-8, handcrafted in solid walnut or oak with a butterfly leaf, custom finishes, and white glove delivery.",
  },
};

export function getCollectionSeoFallback(
  handle: string | null | undefined,
): SeoFallback | undefined {
  return handle ? collectionSeoFallbacks[handle] : undefined;
}

export function getProductSeoFallback(
  handle: string | null | undefined,
): SeoFallback | undefined {
  return handle ? productSeoFallbacks[handle] : undefined;
}
