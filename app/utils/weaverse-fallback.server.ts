import type {
  HydrogenComponentData,
  HydrogenPageData,
  WeaverseClient,
  WeaverseLoaderData,
} from "@weaverse/hydrogen";
import type { PageType } from "@weaverse/schema";

/**
 * Static import map — explicit lambdas so Vite can tree-shake and
 * bundle each JSON for the Oxygen edge runtime.
 */
const JSON_LOADERS: Record<string, () => Promise<{ default: any }>> = {
  INDEX: () => import("../../weaverse-pages/homepage.json"),
  "PAGE:about-us": () => import("../../weaverse-pages/about-us.json"),
  "PAGE:contact": () => import("../../weaverse-pages/contact.json"),
  "PAGE:faq": () => import("../../weaverse-pages/faq.json"),
  "PAGE:custom-furniture-crafted-to-perfection": () =>
    import("../../weaverse-pages/custom-orders.json"),
  "PAGE:our-materials": () => import("../../weaverse-pages/our-materials.json"),
  "PAGE:assembly-care": () => import("../../weaverse-pages/assembly-care.json"),
  "PAGE:shipping-policy-and-customer-responsibilities": () =>
    import("../../weaverse-pages/shipping-policy.json"),
  "PAGE:ordering-policies": () =>
    import("../../weaverse-pages/order-policies.json"),
  "PAGE:mid-century-modern-press-coverage": () =>
    import("../../weaverse-pages/press.json"),
  "PAGE:reviews": () => import("../../weaverse-pages/reviews.json"),
  PRODUCT: () => import("../../weaverse-pages/default-product.json"),
  COLLECTION: () => import("../../weaverse-pages/default-collection.json"),
};

function getLookupKey(type?: PageType, handle?: string): string {
  if (type === "PAGE" && handle) return `PAGE:${handle}`;
  return type ?? "INDEX";
}

/**
 * Wraps `weaverse.loadPage()` with a local JSON fallback.
 *
 * When Weaverse Studio has no page configured (the returned page id
 * contains "fallback"), we substitute a locally-authored JSON file.
 * Studio pages always take priority. Design/preview mode is unaffected.
 */
export async function loadPageWithFallback(
  weaverse: WeaverseClient,
  params?: { type?: PageType; handle?: string },
): Promise<WeaverseLoaderData | null> {
  const result = await weaverse.loadPage(params);

  // If Studio returned a real page, use it
  if (result?.page?.id && !result.page.id.includes("fallback")) {
    return result;
  }

  // Design mode should always use Studio data
  if (result?.configs?.requestInfo?.queries?.isDesignMode) {
    return result;
  }

  // Look up the local JSON
  const key = getLookupKey(params?.type, params?.handle);
  const loader = JSON_LOADERS[key];
  if (!loader) {
    // No local JSON for this route — return the original result
    return result;
  }

  const json = await loader();
  const pageJson = json.default ?? json;

  // Build a HydrogenPageData from the local JSON
  const page: HydrogenPageData = {
    id: `local_${key.replace(/[^a-zA-Z0-9]/g, "_")}`,
    name: key,
    items: pageJson.items ?? [],
    rootId: pageJson.rootId,
  };

  // Run component loaders (for sections that fetch data, e.g. featured-products)
  const itemsWithData = await Promise.all(
    page.items.map((item: HydrogenComponentData) =>
      weaverse.execComponentLoader(item),
    ),
  );
  page.items = itemsWithData;

  return {
    configs: result?.configs ?? ({} as any),
    page,
    project: result?.project ?? ({} as any),
    pageAssignment: result?.pageAssignment,
  };
}
