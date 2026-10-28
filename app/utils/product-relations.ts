/**
 * Hand-maintained schema.org relations for the Product JSON-LD.
 *
 * Handles are the ones live in Shopify today. Add the Lucia / Xin Yen chair
 * handles to DINING_CHAIRS once those products exist.
 */

const DINING_TABLES = [
  "the-santa-monica-mid-century-modern-dining-table",
  "mid-century-modern-extendable-dining-table-santa-monica",
  "scandinavian-oval-dining-table-mar-vista",
  // Live handle (product-attributes.plan.mjs); the older SEO docs use the second.
  "scandinavian-dining-table-extendable-dining-table",
  "the-vista-scandinavian-extendable-dining-table",
  "bossa-nova-modern-dining-table-small-handmade-ohio",
];

const DINING_CHAIRS = ["the-seymour-modern-dining-chair"];

/**
 * Products NOT made in the USA — no countryOfOrigin is emitted for these.
 * Callers also pass `imported: true` for products from an import vendor (see
 * `productClass` in product-class.ts), so a new Piper + Fox listing never
 * claims US origin by default.
 */
const NON_US_ORIGIN = new Set(["the-seymour-modern-dining-chair"]);

export function relatedProductHandles(handle: string): string[] {
  if (DINING_TABLES.includes(handle)) return DINING_CHAIRS;
  if (DINING_CHAIRS.includes(handle)) return DINING_TABLES;
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
