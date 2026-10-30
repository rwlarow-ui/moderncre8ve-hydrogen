import { HOUSEWARES_LEAD_TIME, type ProductClass } from "~/utils/product-class";
import type { PageData } from "./types";

/**
 * Sections in the shared PRODUCT composition whose copy only holds for
 * Ohio-built furniture: one-year warranty and white glove delivery
 * (`product-guarantee`), "Handcrafted in Ohio / Made in the USA"
 * (`product-highlights`), solid-hardwood / zero-veneer materials and the
 * 12–16 week delivery accordion (`product-specs`), and the Amish build process
 * ending in white glove delivery (`product-process`).
 */
export const FURNITURE_ONLY_SECTIONS = [
  "product-guarantee",
  "product-highlights",
  "product-specs",
  "product-process",
] as const;

/**
 * Tailors the shared PRODUCT composition to what is true for this product.
 * Furniture renders unchanged. Housewares get their 3–5 day shipping line in
 * place of the furniture lead time; imported products get no lead-time line
 * (it is not known here). Both drop the furniture-only sections.
 */
export function adaptProductPage(
  pageData: PageData | null,
  cls: ProductClass,
): PageData | null {
  if (!pageData || cls === "furniture") {
    return pageData;
  }

  const drop = new Set<string>(FURNITURE_ONLY_SECTIONS);
  const items = pageData.items
    .filter((item) => !drop.has(item.id))
    .map((item) => {
      if (item.children?.some((child) => drop.has(child.id))) {
        item = {
          ...item,
          children: item.children.filter((child) => !drop.has(child.id)),
        };
      }
      if (item.type === "main-product") {
        item = {
          ...item,
          data: {
            ...item.data,
            ...(cls === "housewares"
              ? { showLeadTime: true, leadTimeText: HOUSEWARES_LEAD_TIME }
              : { showLeadTime: false }),
          },
        };
      }
      return item;
    });

  return { ...pageData, items };
}
