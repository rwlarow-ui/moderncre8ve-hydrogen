import type { AppLoadContext } from "@shopify/remix-oxygen";
import { componentsByType } from "./components";
import { getPageDefinition } from "./pages";
import { generateDataFromSchema } from "./schema";
import type { LoadedPageItem, PageData, PageItem, PageType } from "./types";

export type LoadPageParams = {
  type?: PageType;
  handle?: string;
};

/**
 * Runs a section's `loader`, if it declares one.
 *
 * The loader sees the same merged data the component will render with, so a
 * field that is only present as a schema default is still available to it.
 * A failing loader degrades to a section without `loaderData` rather than
 * taking down the page.
 */
async function runSectionLoader(
  item: PageItem,
  context: AppLoadContext,
  request: Request,
): Promise<LoadedPageItem> {
  const component = componentsByType.get(item.type);
  const loader = component?.loader;
  if (typeof loader !== "function") {
    return item;
  }

  try {
    const loaderData = await loader({
      data: { ...generateDataFromSchema(component.schema), ...item.data },
      context,
      request,
    });
    return { ...item, loaderData };
  } catch (error) {
    console.warn(
      `[page-builder] Loader failed for "${item.type}" (${item.id}):`,
      error,
    );
    return item;
  }
}

/**
 * Resolves a page composition and runs every section loader in parallel.
 *
 * Returns `null` when no composition is defined for `params`, which routes
 * surface as a 404.
 */
export async function loadPage(
  { context, request }: { context: AppLoadContext; request: Request },
  params?: LoadPageParams,
): Promise<PageData | null> {
  const definition = getPageDefinition(params);
  if (!definition) {
    return null;
  }

  const items = await Promise.all(
    definition.items.map((item) => runSectionLoader(item, context, request)),
  );

  return { rootId: definition.rootId, items };
}
