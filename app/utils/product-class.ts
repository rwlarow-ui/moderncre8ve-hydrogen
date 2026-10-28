/**
 * Which set of storefront promises a product may show.
 *
 * The PRODUCT composition (`app/page-builder/pages/default-product.ts`) is
 * shared by every product and was written for Ohio-built furniture: 12–16 week
 * lead time, lifetime structural warranty, white glove delivery, "Handcrafted
 * in Ohio / Made in the USA", Amish joinery. Those claims are wrong on
 * Lareaux's Furniture Wax (ships in 3–5 business days) and on imported seating
 * (vendor "Piper + Fox Co."; listings say "Place of Origin: China").
 *
 * - `furniture`  — Ohio-built pieces; the composition renders unchanged.
 * - `housewares` — wax and wood-care products; ships in 3–5 business days.
 *   Matched on the "Wood Care" tag / product type or a `wax` handle, not on
 *   the broad "Housewares" product type, which also holds the (archived,
 *   made-to-order) tripod lamp.
 * - `imported`   — products made overseas (Piper + Fox seating).
 */
export type ProductClass = "furniture" | "housewares" | "imported";

export interface ProductClassInput {
  handle?: string | null;
  productType?: string | null;
  vendor?: string | null;
  tags?: readonly string[] | null;
}

const WOOD_CARE_TYPE = /\b(wax|wood care)\b/i;

/** Vendors whose products are made overseas, normalized (lowercase, alphanumerics only). */
const IMPORT_VENDORS = new Set(["piperfoxco", "piperfox", "piperandfox"]);

function normalizeVendor(vendor: string) {
  return vendor
    .toLowerCase()
    .replace(/\band\b/g, "")
    .replace(/[^a-z0-9]/g, "");
}

export function productClass(product: ProductClassInput): ProductClass {
  const vendor = product.vendor ? normalizeVendor(product.vendor) : "";
  if (IMPORT_VENDORS.has(vendor)) {
    return "imported";
  }
  const tags = (product.tags ?? []).map((t) => t.toLowerCase());
  if (
    WOOD_CARE_TYPE.test(product.productType ?? "") ||
    tags.includes("wood care") ||
    /(^|-)wax(-|$)/.test(product.handle ?? "")
  ) {
    return "housewares";
  }
  return "furniture";
}

/** Shipping line shown instead of the furniture lead time on housewares. */
export const HOUSEWARES_LEAD_TIME =
  "Ships within 3–5 business days via standard ground.";
