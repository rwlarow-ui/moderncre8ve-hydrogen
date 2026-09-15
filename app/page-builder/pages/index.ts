import type { PageDefinition, PageType } from "../types";
import { aboutUs } from "./about-us";
import { allProducts } from "./all-products";
import { article } from "./article";
import { assemblyCare } from "./assembly-care";
import { blog } from "./blog";
import { collectionList } from "./collection-list";
import { contact } from "./contact";
import { customOrders } from "./custom-orders";
import { defaultCollection } from "./default-collection";
import { defaultProduct } from "./default-product";
import { faq } from "./faq";
import { homepage } from "./homepage";
import { orderPolicies } from "./order-policies";
import { ourMaterials } from "./our-materials";
import { defaultPage } from "./page";
import { press } from "./press";
import { reviews } from "./reviews";
import { shippingPolicy } from "./shipping-policy";
import { trade } from "./trade";

/**
 * Compositions for handle-addressed content pages (`/pages/:handle`).
 *
 * Several Shopify page handles share one layout — the aliases below are the
 * handles that exist in the admin, mapped to the layout each one renders.
 */
const PAGES: Record<string, PageDefinition> = {
  "about-us": aboutUs,
  "assembly-care": assemblyCare,
  "contact-and-inquiry": contact,
  "contact-us": contact,
  "custom-furniture-crafted-to-perfection": customOrders,
  "custom-orders": customOrders,
  faq,
  "mid-century-modern-press-coverage": press,
  "ordering-policies": orderPolicies,
  "our-materials": ourMaterials,
  reviews,
  "shipping-policy": shippingPolicy,
  "shipping-policy-and-customer-responsibilities": shippingPolicy,
  "trade-1": trade,
};

/**
 * Compositions for resource templates — one layout shared by every resource of
 * that type, with the resource itself supplied by the route loader.
 */
const TEMPLATES: Partial<Record<PageType, PageDefinition>> = {
  ALL_PRODUCTS: allProducts,
  ARTICLE: article,
  BLOG: blog,
  COLLECTION: defaultCollection,
  COLLECTION_LIST: collectionList,
  INDEX: homepage,
  PRODUCT: defaultProduct,
};

/** Every page handle with a bespoke composition. */
export const PAGE_HANDLES = Object.keys(PAGES);

/**
 * Whether `handle` has a bespoke composition of its own, as opposed to falling
 * back to the default page template.
 */
export function hasPageComposition(handle: string | undefined): boolean {
  return Boolean(handle && handle in PAGES);
}

/**
 * Resolves a page composition, or `null` when nothing is defined for it — which
 * callers treat as a 404.
 */
export function getPageDefinition(params?: {
  type?: PageType;
  handle?: string;
}): PageDefinition | null {
  const { type = "INDEX", handle } = params ?? {};
  if (type === "PAGE") {
    // Any other handle renders the Shopify page's own content.
    return (handle && PAGES[handle]) || defaultPage;
  }
  return TEMPLATES[type] ?? null;
}
