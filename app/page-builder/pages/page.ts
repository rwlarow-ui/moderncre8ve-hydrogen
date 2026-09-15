import type { PageDefinition } from "../types";

/**
 * Default template for `/pages/:handle`.
 *
 * Used for any Shopify page that has no bespoke composition: the `page` section
 * renders the title and body authored in the Shopify admin.
 */
export const defaultPage: PageDefinition = {
  rootId: "page-root",
  items: [
    { id: "page-root", type: "main", children: [{ id: "page-section" }] },
    { id: "page-section", type: "page" },
  ],
};
