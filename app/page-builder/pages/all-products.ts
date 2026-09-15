import type { PageDefinition } from "../types";

/**
 * Template for `/products`.
 *
 * `all-products` is the only section declaring `enabledOn: ["ALL_PRODUCTS"]`;
 * everything it renders comes from schema defaults and the route loader.
 */
export const allProducts: PageDefinition = {
  rootId: "all-products-root",
  items: [
    {
      id: "all-products-root",
      type: "main",
      children: [{ id: "all-products-section" }],
    },
    {
      id: "all-products-section",
      type: "all-products",
    },
  ],
};
