import { createElement, memo, useContext, useMemo } from "react";
import { componentsByType } from "./components";
import {
  SectionContext,
  type SectionInstance,
  type SectionTree,
  SectionTreeContext,
} from "./context";
import { generateDataFromSchema } from "./schema";
import type { PageData } from "./types";

/**
 * Flattens a page definition into instances keyed by id.
 *
 * Each instance's `data` is `schema defaults -> saved data -> loaderData`, which
 * is what the section is ultimately rendered with. Building this once per page
 * keeps the recursive render a plain map lookup.
 */
function buildTree(page: PageData | null | undefined): SectionTree {
  const tree: SectionTree = new Map();
  if (!page?.items?.length) {
    return tree;
  }

  const parentOf = new Map<string, string>();
  for (const item of page.items) {
    for (const child of item.children ?? []) {
      parentOf.set(child.id, item.id);
    }
  }

  for (const item of page.items) {
    const schema = componentsByType.get(item.type)?.schema;
    tree.set(item.id, {
      id: item.id,
      type: item.type,
      parentId: parentOf.get(item.id) ?? "",
      data: {
        ...generateDataFromSchema(schema),
        ...item.data,
        ...(item.loaderData === undefined
          ? null
          : { loaderData: item.loaderData }),
      },
      children: item.children ?? [],
    });
  }

  return tree;
}

const SectionNode = memo(function SectionNode({
  id,
  parentId,
}: {
  id: string;
  parentId: string;
}) {
  const tree = useContext(SectionTreeContext);
  const instance = tree?.get(id);

  const contextValue = useMemo(() => ({ id, parentId }), [id, parentId]);

  if (!instance) {
    return null;
  }

  const element = componentsByType.get(instance.type);
  if (!element?.default) {
    if (import.meta.env.DEV) {
      console.warn(
        `[page-builder] No component registered for type "${instance.type}" (item "${id}").`,
      );
    }
    return null;
  }

  const children = instance.children.map((child, index) =>
    createElement(SectionNode, {
      id: child.id,
      parentId: id,
      key: `${child.id}-${index}`,
    }),
  );

  return (
    <SectionContext.Provider value={contextValue}>
      {createElement(element.default, {
        ...instance.data,
        children: children.length ? children : undefined,
        "data-section-id": id,
        "data-section-type": instance.type,
      })}
    </SectionContext.Provider>
  );
});

/**
 * Renders a page composition.
 *
 * Pass the `pageData` returned by `loadPage()` in the route loader; it is
 * already resolved, so there is no client fetch and no hydration gap.
 */
export const PageContent = memo(function PageContent({
  pageData,
}: {
  pageData: PageData | null | undefined;
}) {
  const tree = useMemo(() => buildTree(pageData), [pageData]);

  if (!pageData?.rootId || !tree.has(pageData.rootId)) {
    return null;
  }

  return (
    <SectionTreeContext.Provider value={tree}>
      <SectionNode id={pageData.rootId} parentId="" />
    </SectionTreeContext.Provider>
  );
});

export type { SectionInstance };
