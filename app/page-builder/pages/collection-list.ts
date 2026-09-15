import type { PageDefinition } from "../types";

/**
 * Template for `/collections`.
 *
 * Mirrors the `collection-list` section's own `presets`, which is what the
 * section is seeded with when it is added to a page.
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
      data: { gap: 60 },
      children: [
        { id: "collection-list-heading" },
        { id: "collection-list-items" },
      ],
    },
    {
      id: "collection-list-heading",
      type: "heading",
      data: { content: "Collections" },
    },
    {
      id: "collection-list-items",
      type: "collections-items",
      data: {
        prevButtonText: "↑ Load previous",
        nextButtonText: "Load more ↓",
        imageAspectRatio: "adapt",
        enableOverlay: true,
        overlayColor: "#000",
        overlayOpacity: 30,
      },
    },
  ],
};
