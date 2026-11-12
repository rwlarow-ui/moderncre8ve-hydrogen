/**
 * Hand-maintained schema.org relations for the Product JSON-LD.
 *
 * Candidate relations are filtered against verified discoverable products.
 * Update the allowlist after a catalog rollout batch passes storefront checks;
 * a Draft or Unlisted product must not become a structured-data destination.
 */

const DINING_TABLES = [
  "the-santa-monica-mid-century-modern-dining-table",
  "mid-century-modern-extendable-dining-table-santa-monica",
  "scandinavian-oval-dining-table-mar-vista",
  // Live handle (product-attributes.plan.mjs); the older SEO docs use the second.
  "scandinavian-dining-table-extendable-dining-table",
  "the-vista-scandinavian-extendable-dining-table",
  "bossa-nova-modern-dining-table-small-handmade-ohio",
  "payne-oval-extendable-dining-table-for-6-8",
];

const DINING_CHAIRS = ["the-seymour-modern-dining-chair"];

// Shopify Admin snapshot, 2026-11-05: Active AND published to MODERNCRE8VE.
// Vista is Unlisted; Seymour and the other candidate destinations are Draft.
const DISCOVERABLE_RELATED_HANDLES = new Set([
  "the-santa-monica-mid-century-modern-dining-table",
  "bossa-nova-modern-dining-table-small-handmade-ohio",
  "payne-oval-extendable-dining-table-for-6-8",
]);

/**
 * Products NOT made in the USA — no countryOfOrigin is emitted for these.
 * Callers also pass `imported: true` for products from an import vendor (see
 * `productClass` in product-class.ts), so a new Piper + Fox listing never
 * claims US origin by default.
 */
// Empty since 2026-11-12: the Seymour chair is Amish-made (owner).
const NON_US_ORIGIN = new Set<string>();

export function relatedProductHandles(handle: string): string[] {
  if (DINING_TABLES.includes(handle)) {
    return DINING_CHAIRS.filter((h) => DISCOVERABLE_RELATED_HANDLES.has(h));
  }
  if (DINING_CHAIRS.includes(handle)) {
    return DINING_TABLES.filter((h) => DISCOVERABLE_RELATED_HANDLES.has(h));
  }
  return [];
}

/** countryOfOrigin / isRelatedTo fields for the Product node. */
export function productRelationsJsonLd(
  handle: string,
  origin: string,
  { imported = false }: { imported?: boolean } = {},
) {
  const related = relatedProductHandles(handle);
  const usMade = !imported && !NON_US_ORIGIN.has(handle);
  return {
    ...(usMade && {
      countryOfOrigin: { "@type": "Country" as const, name: "US" },
    }),
    ...(related.length && {
      isRelatedTo: related.map((h) => ({
        "@type": "Product" as const,
        url: `${origin}/products/${h}`,
      })),
    }),
  };
}
