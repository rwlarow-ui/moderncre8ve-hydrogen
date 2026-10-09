/**
 * Reviewed assignment plan for Shopify category metafields (shopify.*) on
 * live ModernCre8ve products. Consumed by scripts/sync-product-attributes.mjs.
 *
 * Source of every value (audit 2026-10-08, see docs/metaobjects-seo-audit-2026-10.md):
 *   - materials  → the product's Material / Wood Options / Color variant option
 *                  values, the custom.material metafield, or the product title
 *   - colors     → derived from the wood: walnut/cherry → Brown,
 *                  oak/maple/ash → Beige, Onyx stain → Black, Frost stain → White
 *   - extension  → custom.material "Extension:" line, or a Leaf variant option
 *   - bed sizes  → the Size variant option on beds
 * Products with no evidence for a value are left out (see NEEDS_INPUT) rather
 * than guessed — wrong structured data is worse than none for Merchant Center.
 *
 * Taxonomy value IDs come from the Admin API `taxonomy` query and are stable.
 */

/** Metaobject entries to upsert (by handle) for each shopify--* type. */
export const METAOBJECT_ENTRIES = {
  "shopify--furniture-fixture-material": {
    taxonomyField: "taxonomy_reference",
    entries: {
      "walnut-wood": { label: "Walnut wood", value: 21897 },
      "oak-wood": { label: "Oak wood", value: 21885 },
      "cherry-wood": { label: "Cherry wood", value: 21869 },
      "maple-wood": { label: "Maple wood", value: 21880 },
      wood: { label: "Wood", value: 21899 },
      glass: { label: "Glass", value: 21875 },
      marble: { label: "Marble", value: 21881 },
      steel: { label: "Steel", value: 21895 },
      brass: { label: "Brass", value: 21866 },
      resin: { label: "Resin", value: 21893 },
    },
  },
  "shopify--color-pattern": {
    taxonomyField: "color_taxonomy_reference",
    taxonomyIsList: true,
    entries: {
      brown: { label: "Brown", value: 7, hex: "#6B4A2E" },
      beige: { label: "Beige", value: 6, hex: "#D9C4A0" },
      black: { label: "Black", value: 1, hex: "#1F1F1F" },
      white: { label: "White", value: 3, hex: "#F4F1EA" },
      pink: { label: "Pink", value: 11, hex: "#E8B4B8" },
    },
  },
  "shopify--extension-mechanism": {
    taxonomyField: "taxonomy_reference",
    entries: {
      "butterfly-leaf": { label: "Butterfly leaf", value: 46565 },
      "removable-leaf": { label: "Removable leaf", value: 46571 },
    },
  },
  "shopify--bedding-size": {
    taxonomyField: "taxonomy_reference",
    entries: {
      twin: { label: "Twin", value: 7231 },
      double: { label: "Full", value: 19408 },
      queen: { label: "Queen", value: 8527 },
      king: { label: "King", value: 8526 },
      "california-king": { label: "California king", value: 8525 },
    },
  },
  "shopify--bed-frame-features": {
    taxonomyField: "taxonomy_reference",
    entries: {
      "headboard-included": { label: "Headboard included", value: 23693 },
      "slats-included": { label: "Slats included", value: 23695 },
      "storage-options": { label: "Storage options", value: 23696 },
    },
  },
};

/** Product metafield key (namespace "shopify") → metaobject type. */
const MATERIAL = "shopify--furniture-fixture-material";
const COLOR = "shopify--color-pattern";
export const METAFIELD_TYPES = {
  // Shopify's current taxonomy splits material/color by part, and each
  // category only accepts its own attributes (the Admin API rejects others
  // with "Owner subtype does not match the metafield definition's
  // constraints"). All part-level keys reuse the same two metaobject types.
  "furniture-fixture-material": MATERIAL, // beds, dressers, benches
  "color-pattern": COLOR, // beds, dressers, benches, TV stands
  "tabletop-material": MATERIAL, // dining / coffee / console tables, desks
  "tabletop-color": COLOR,
  "leg-material": MATERIAL,
  "leg-color": COLOR,
  "frame-material": MATERIAL, // sideboards, nightstands
  "frame-color": COLOR,
  "top-material": MATERIAL,
  "top-color": COLOR,
  "extension-mechanism": "shopify--extension-mechanism", // dining tables
  "bedding-size": "shopify--bedding-size",
  "bed-frame-features": "shopify--bed-frame-features",
};

const DINING = "gid://shopify/TaxonomyCategory/fr-24-4";
const COFFEE = "gid://shopify/TaxonomyCategory/fr-24-1-1";
const CONSOLE = "gid://shopify/TaxonomyCategory/fr-24-1-4";
const NIGHTSTAND = "gid://shopify/TaxonomyCategory/fr-24-6";
const BED = "gid://shopify/TaxonomyCategory/fr-2-2";
const BENCH = "gid://shopify/TaxonomyCategory/fr-3";
const SIDEBOARD = "gid://shopify/TaxonomyCategory/fr-4-11";
const DESK = "gid://shopify/TaxonomyCategory/fr-12-1";

const W = ["walnut-wood"];
const WOODS = (...w) => w.map((x) => `${x}-wood`);

/** Tables & desks: tabletop + legs. Legs default to the top's wood/color. */
const table = ({ top, legs = top, color, legColor = color, extension }) => ({
  ...(top && { "tabletop-material": top }),
  ...(legs && { "leg-material": legs }),
  ...(color && { "tabletop-color": color }),
  ...(legColor && { "leg-color": legColor }),
  ...(extension && { "extension-mechanism": extension }),
});
/** Case goods (sideboards, nightstands): frame + top in one species. */
const caseGood = (material, color) => ({
  "frame-material": material,
  "top-material": material,
  "frame-color": color,
  "top-color": color,
});

/**
 * handle → { category?, attrs: { <metafield key>: [metaobject handles] } }
 * `category` is only set where the current category is wrong or too generic;
 * the `dining` smart collection matches on fr-24-4, so those fixes also put
 * the tables into /collections/dining.
 */
export const PRODUCT_PLAN = {
  // ── Extendable dining tables (priority category) ──────────────────────────
  "bossa-nova-modern-dining-table-small-handmade-ohio": {
    attrs: table({
      top: WOODS("walnut", "cherry", "oak", "maple"),
      color: ["brown", "beige"],
      extension: ["removable-leaf"],
    }),
  },
  "mid-century-modern-extendable-dining-table-santa-monica": {
    attrs: table({
      top: WOODS("walnut", "maple", "oak"),
      color: ["brown", "beige", "black", "white"],
      extension: ["butterfly-leaf"],
    }),
  },
  "payne-oval-extendable-dining-table-for-6-8": {
    attrs: table({
      top: WOODS("walnut", "oak", "maple", "cherry"),
      color: ["brown", "beige"],
      extension: ["butterfly-leaf"],
    }),
  },
  "scandinavian-dining-table-extendable-dining-table": {
    category: DINING,
    attrs: table({
      top: WOODS("walnut", "oak", "cherry", "maple"),
      color: ["brown", "beige"],
      extension: ["butterfly-leaf"],
    }),
  },
  "modern-round-extendable-dining-table-ohio": {
    category: DINING,
    attrs: table({ extension: ["removable-leaf"] }),
  },
  "extendable-dining-table-compagno": {
    attrs: table({ extension: ["removable-leaf"] }),
  },

  // ── Dining tables ─────────────────────────────────────────────────────────
  "the-santa-monica-mid-century-modern-dining-table": {
    category: DINING,
    attrs: table({
      top: WOODS("walnut", "maple", "cherry", "oak"),
      color: ["brown", "beige"],
    }),
  },
  "scandinavian-danish-modern-dining-table": {
    attrs: table({
      top: WOODS("walnut", "maple", "oak", "cherry"),
      color: ["brown", "beige"],
    }),
  },
  "mila-dining-table": {
    attrs: table({
      top: WOODS("walnut", "cherry", "oak", "maple"),
      color: ["brown", "beige"],
    }),
  },
  "sputnik-scandinavian-modern-dining-table-handmade-ohio": {
    attrs: table({ top: WOODS("walnut", "maple"), color: ["brown", "beige"] }),
  },
  "sputnik-hairpin": {
    category: DINING,
    attrs: table({
      top: WOODS("walnut", "maple", "oak"),
      legs: ["steel"],
      color: ["brown", "beige"],
      legColor: [],
    }),
  },
  "round-walnut-dining-table": { attrs: table({ top: W, color: ["brown"] }) },
  "santa-monica-cherry": {
    attrs: table({ top: WOODS("cherry"), color: ["brown"] }),
  },
  "santa-monica-mixed": {
    attrs: table({ top: WOODS("walnut", "oak"), color: ["brown", "beige"] }),
  },
  "santa-barbara": { attrs: table({ top: W, color: ["brown"] }) },
  "modern-mid-century-glass-dining-table": {
    attrs: table({
      top: ["glass"],
      legs: ["walnut-wood", "wood"],
      color: [],
      legColor: ["brown", "beige"],
    }),
  },
  "mid-century-glass-dining-table": {
    attrs: table({
      top: ["glass"],
      legs: WOODS("walnut", "cherry"),
      color: [],
      legColor: ["brown"],
    }),
  },
  "modern-live-edge-dining-table": {
    category: DINING,
    attrs: table({ top: W, color: ["brown"] }),
  },
  "the-april-live-edge-slab": {
    category: DINING,
    attrs: table({ top: W, legs: [], color: ["brown"], legColor: [] }),
  },
  "claro-walnut-dining-table": {
    category: DINING,
    attrs: table({ top: W, legs: [], color: ["brown"], legColor: [] }),
  },
  "claro-walnut-live-edge-table": {
    category: DINING,
    attrs: table({ top: W, legs: [], color: ["brown"], legColor: [] }),
  },
  "scandinavian-oval-dining-table-mar-vista": { category: DINING, attrs: {} },

  // ── Beds (priority category) ──────────────────────────────────────────────
  "bosco-walnut-mid-century-modern-bed-handmade": {
    attrs: {
      "furniture-fixture-material": WOODS("walnut", "maple", "oak", "cherry"),
      "color-pattern": ["brown", "beige"],
      // Replaces the duplicate king-1 / california-king-1 entries.
      "bedding-size": ["twin", "double", "queen", "king", "california-king"],
      "bed-frame-features": ["headboard-included", "slats-included"],
    },
  },
  "the-wookie": {
    attrs: {
      "furniture-fixture-material": WOODS("walnut", "maple", "oak", "cherry"),
      "color-pattern": ["brown", "beige"],
      "bedding-size": ["twin", "double", "queen", "king", "california-king"],
    },
  },
  "the-stowe": {
    attrs: {
      "furniture-fixture-material": [...WOODS("walnut", "maple"), "steel"],
      "color-pattern": ["brown", "beige"],
      "bedding-size": ["double", "queen", "king", "california-king"],
    },
  },
  "scandinavian-solid-hardwood-bed-frame": {
    category: BED,
    attrs: {
      "furniture-fixture-material": W,
      "color-pattern": ["brown"],
      "bedding-size": ["queen", "king", "california-king"],
      "bed-frame-features": ["storage-options"],
    },
  },

  // ── Coffee / console tables, desk ─────────────────────────────────────────
  "mid-century-walnut-coffee-table": {
    attrs: table({ top: W, color: ["brown"] }),
  },
  "modern-surfboard-coffee-table": {
    attrs: table({ top: WOODS("walnut", "cherry"), color: ["brown"] }),
  },
  "mid-century-modern-coffee-table-the-clevelander": {
    attrs: table({ top: WOODS("walnut", "maple"), color: ["brown", "beige"] }),
  },
  "mid-century-walnut-round-coffee-table": {
    attrs: table({ top: W, color: ["brown"] }),
  },
  "modern-oval-surfboard-coffee-table": {
    category: COFFEE,
    attrs: table({ top: W, color: ["brown"] }),
  },
  "live-edge-walnut-resin-table": {
    attrs: table({
      top: ["walnut-wood", "resin"],
      legs: [],
      color: ["brown"],
      legColor: [],
    }),
  },
  "luxury-marble-coffee-table": {
    category: COFFEE,
    attrs: table({ top: ["marble"], legs: [], color: [], legColor: [] }),
  },
  "kineko-japandi-coffee-table": {
    category: COFFEE,
    attrs: table({ top: ["glass"], legs: [], color: [], legColor: [] }),
  },
  "luxury-pink-steel-console-table": {
    category: CONSOLE,
    attrs: table({ top: [], legs: ["steel"], color: [], legColor: ["pink"] }),
  },
  "luxury-pink-console-table": { category: CONSOLE, attrs: {} },
  "danish-mid-century-office-desk": {
    category: DESK,
    attrs: table({
      top: WOODS("walnut", "maple"),
      legs: ["steel"],
      color: ["brown", "beige"],
      legColor: [],
    }),
  },

  // ── Storage / bedroom / other ─────────────────────────────────────────────
  "the-carlyle_walnut-dresser": {
    attrs: {
      "furniture-fixture-material": WOODS("walnut", "maple"),
      "color-pattern": ["brown", "beige"],
    },
  },
  "kineko-mid-century-modern-tv-stand": {
    attrs: { ...caseGood(W, ["brown"]), "color-pattern": ["brown"] },
  },
  "the-elmore-modern-credenza": { category: SIDEBOARD, attrs: {} },
  "the-haven-a-mid-century-modern-credenza": {
    category: SIDEBOARD, // previous category is archived in Shopify's taxonomy
    attrs: caseGood(W, ["brown"]),
  },
  "the-wabi-sabi-low-credenza": { category: SIDEBOARD, attrs: {} },
  "jaco-modern-sideboard-solid-oak-3d-texture-handmade-ohio": {
    category: SIDEBOARD,
    attrs: caseGood(WOODS("oak"), ["beige"]),
  },
  "mid-century-modern-walnut-nightstand": { attrs: caseGood(W, ["brown"]) },
  "modern-side-table-nightstand-pair": { category: NIGHTSTAND, attrs: {} },
  "contemporary-dining-bench-vermonter": {
    category: BENCH,
    attrs: {
      "furniture-fixture-material": WOODS("walnut", "cherry", "oak", "maple"),
      "color-pattern": ["brown", "beige"],
    },
  },
  "mid-century-modern-bench_continental": { category: BENCH, attrs: {} },
};

// Drop empty lists produced by the helpers (e.g. legColor: []).
for (const plan of Object.values(PRODUCT_PLAN)) {
  for (const [k, v] of Object.entries(plan.attrs)) {
    if (!v.length) delete plan.attrs[k];
  }
}

/** Live products left without material/color because nothing in Shopify says what they are. */
export const NEEDS_INPUT = [
  "the-zoe",
  "live-edge-dining-table",
  "capri-modern-dining-table-set_",
  "sputnik-mid-century-dining-set",
  "extendable-dining-table-compagno",
  "modern-round-extendable-dining-table-ohio",
  "scandinavian-oval-dining-table-mar-vista",
  "the-elmore-modern-credenza",
  "the-wabi-sabi-low-credenza",
  "mid-century-modern-bench_continental",
  "modern-side-table-nightstand-pair",
  "the-modern-coffee-table-provo",
  "minimalist-bed-frame-ohio",
  "larchmere-wideboy-mid-century-modern-dresser",
  "copy-of-santa-monica-bench-modern-walnut-bench",
  "the-astrid-mid-century-modern-sideboard-buffet",
  "caipirinha-modern-bar-cabinet-solid-walnut",
  "the-vista-modern-dining-chair",
  "the-seymour-modern-dining-chair",
];
