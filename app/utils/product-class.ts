/**
 * Which set of storefront promises a product may show.
 *
 * The PRODUCT composition (`app/page-builder/pages/default-product.ts`) is
 * shared by every product and was written for Ohio-built furniture: 12–16 week
 * lead time, one-year warranty, white glove delivery, "Handcrafted
 * in Ohio / Made in the USA", Amish joinery. Those claims are wrong on
 * Lareaux's Furniture Cure All (ships in 3–5 business days) and on imported seating
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
  // The Seymour chair is Amish-made (owner, 2026-11-12), so it is furniture,
  // not imported; only an import vendor makes a product "imported".
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

/**
 * Shopify product tag that swaps Add to Cart for a "Request this piece" form
 * (`app/components/product/piece-request.tsx`). Use it for pieces that need
 * confirming with the maker before an order is taken.
 */
export const REQUEST_ONLY_TAG = "request-only";

export function isRequestOnly(product: {
  tags?: readonly string[] | null;
}): boolean {
  return (product.tags ?? []).some(
    (t) => t.trim().toLowerCase() === REQUEST_ONLY_TAG,
  );
}

/** Shipping line shown instead of the furniture lead time on housewares. */
export const HOUSEWARES_LEAD_TIME =
  "Ships within 3–5 business days via standard ground.";

/** One-line summary under the product title on housewares (furniture says "Made to order · ships in 12–16 weeks"). */
export const HOUSEWARES_LEAD_SUMMARY = "Ships in 3–5 business days";

/**
 * Shown when the server refuses to put a request-only piece in the cart
 * (`app/utils/request-only-cart.server.ts`). The product page already swaps
 * Add to Cart for the request form; this covers direct POSTs to the cart.
 */
export const REQUEST_ONLY_CART_MESSAGE =
  "This piece is available by request only. Please use the Request this piece form.";

/** A `nodes(ids)` result: a ProductVariant with its product's tags, or null. */
export type CartMerchandiseNode = {
  product?: { handle?: string | null; tags?: readonly string[] | null } | null;
} | null;

/**
 * The distinct merchandise IDs a set of cart line inputs would put in the
 * cart. Lines without a string `merchandiseId` (e.g. a quantity-only
 * LinesUpdate) are skipped: they cannot add a new product.
 */
export function cartLineMerchandiseIds(lines: unknown): string[] {
  if (!Array.isArray(lines)) {
    return [];
  }
  const ids: string[] = [];
  for (const line of lines) {
    const id = (line as { merchandiseId?: unknown } | null)?.merchandiseId;
    if (typeof id === "string" && id && !ids.includes(id)) {
      ids.push(id);
    }
  }
  return ids;
}

/**
 * Which of `merchandiseIds` belong to a request-only product. `nodes` is the
 * Storefront API `nodes(ids: merchandiseIds)` result, which is aligned with
 * the IDs by index. A null node (unknown or non-variant ID) is not blocked
 * here; Shopify rejects invalid merchandise itself.
 */
export function requestOnlyMerchandise(
  merchandiseIds: readonly string[],
  nodes: readonly CartMerchandiseNode[] | null | undefined,
): { merchandiseId: string; handle: string | null }[] {
  const blocked: { merchandiseId: string; handle: string | null }[] = [];
  merchandiseIds.forEach((merchandiseId, i) => {
    const product = nodes?.[i]?.product;
    if (product && isRequestOnly(product)) {
      blocked.push({ merchandiseId, handle: product.handle ?? null });
    }
  });
  return blocked;
}
