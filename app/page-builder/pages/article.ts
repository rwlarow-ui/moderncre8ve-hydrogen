import type { PageDefinition } from "../types";

/** Template for a single article, `/blogs/:blogHandle/:articleHandle`. */
export const article: PageDefinition = {
  rootId: "article-root",
  items: [
    {
      id: "article-root",
      type: "main",
      children: [{ id: "article-post" }, { id: "article-related" }],
    },
    { id: "article-post", type: "blog-post" },
    { id: "article-related", type: "related-articles" },
  ],
};
