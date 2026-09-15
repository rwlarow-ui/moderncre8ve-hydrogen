import type { PageDefinition } from "../types";

/** Template for a blog index, `/blogs/:blogHandle`. */
export const blog: PageDefinition = {
  rootId: "blog-root",
  items: [
    { id: "blog-root", type: "main", children: [{ id: "blog-section" }] },
    { id: "blog-section", type: "blogs" },
  ],
};
