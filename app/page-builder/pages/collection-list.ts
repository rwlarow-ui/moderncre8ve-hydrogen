import type { PageDefinition } from "../types";

/**
 * Template for `/collections`.
 *
 * Conversion layout: an H1 and a one-line intro, the trust strip (who makes
 * it, lead time, delivery), then a fixed 4:3 grid that leads with dining
 * tables, extendable tables and beds — see `~/utils/collection-list`.
 */
export const collectionList: PageDefinition = {
  rootId: "collection-list-root",
  items: [
    {
      id: "collection-list-root",
      type: "main",
      children: [{ id: "collection-list-section" }],
    },
    {
      id: "collection-list-section",
      type: "collection-list",
      data: { gap: 32 },
      children: [
        { id: "collection-list-heading" },
        { id: "collection-list-intro" },
        { id: "collection-list-items" },
      ],
    },
    {
      id: "collection-list-heading",
      type: "heading",
      // h1: the heading component defaults to h2, which left /collections
      // without an H1.
      data: { content: "Shop Furniture by Collection", as: "h1" },
    },
    {
      id: "collection-list-intro",
      type: "paragraph",
      data: {
        content:
          "Mid-century, Scandinavian and Japandi furniture in solid American hardwood, handcrafted to order by our Amish craftsmen partners in the Midwest. Start with a dining table, an extendable table or a bed frame, or browse every collection below.",
        alignment: "center",
        width: "narrow",
      },
    },
    {
      id: "collection-list-items",
      type: "collections-items",
      data: {
        prevButtonText: "↑ Load previous",
        nextButtonText: "Load more ↓",
        imageAspectRatio: "4/3",
        ctaText: "Shop the collection",
        showTrustStrip: true,
      },
    },
  ],
};
