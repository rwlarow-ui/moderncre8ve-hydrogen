import type {
  HydrogenComponentData,
  HydrogenPageData,
  WeaverseClient,
  WeaverseLoaderData,
} from "@weaverse/hydrogen";
import { getRequestQueries } from "@weaverse/hydrogen";
import type { PageType } from "@weaverse/schema";

/**
 * Static import map — explicit lambdas so Vite can tree-shake and
 * bundle each JSON for the Oxygen edge runtime.
 */
const JSON_LOADERS: Record<string, () => Promise<{ default: any }>> = {
  INDEX: () => import("../../weaverse-pages/homepage.json"),
  "PAGE:about-us": () => import("../../weaverse-pages/about-us.json"),
  "PAGE:contact-us": () => import("../../weaverse-pages/contact.json"),
  "PAGE:contact-and-inquiry": () => import("../../weaverse-pages/contact.json"),
  "PAGE:faq": () => import("../../weaverse-pages/faq.json"),
  "PAGE:custom-furniture-crafted-to-perfection": () =>
    import("../../weaverse-pages/custom-orders.json"),
  "PAGE:custom-orders": () => import("../../weaverse-pages/custom-orders.json"),
  "PAGE:our-materials": () => import("../../weaverse-pages/our-materials.json"),
  "PAGE:assembly-care": () => import("../../weaverse-pages/assembly-care.json"),
  "PAGE:shipping-policy-and-customer-responsibilities": () =>
    import("../../weaverse-pages/shipping-policy.json"),
  "PAGE:shipping-policy": () =>
    import("../../weaverse-pages/shipping-policy.json"),
  "PAGE:ordering-policies": () =>
    import("../../weaverse-pages/order-policies.json"),
  "PAGE:trade-1": () => import("../../weaverse-pages/trade.json"),
  "PAGE:mid-century-modern-press-coverage": () =>
    import("../../weaverse-pages/press.json"),
  "PAGE:reviews": () => import("../../weaverse-pages/reviews.json"),
  PRODUCT: () => import("../../weaverse-pages/default-product.json"),
  COLLECTION: () => import("../../weaverse-pages/default-collection.json"),
};

const PREFER_LOCAL_PAGE_KEYS = new Set(
  Object.keys(JSON_LOADERS).filter((key) => key.startsWith("PAGE:")),
);

const HOMEPAGE_LINK_PATCHES: Record<string, string> = {
  "/faq/about-us-1": "/pages/about-us",
  "/pages/about-us-1": "/pages/about-us",
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
  const isDesignMode =
    result?.configs?.requestInfo?.queries?.isDesignMode;
  const key = getLookupKey(params?.type, params?.handle);
  const shouldPreferLocalPageFallback =
    !isDesignMode &&
    params?.type === "PAGE" &&
    PREFER_LOCAL_PAGE_KEYS.has(key);

  // For mapped content pages, prefer the repo fallback on the published site.
  // This keeps known-good curated JSON authoritative when Studio assignments drift.
  if (shouldPreferLocalPageFallback) {
    return buildLocalFallbackResponse(weaverse, key, result);
  }

  // If Studio returned a real (non-fallback) page, apply runtime patches then use it.
  if (result?.page?.id && !result.page.id.includes("fallback")) {
    if (key === "INDEX" && result.page?.items && !isDesignMode) {
      result.page.items = patchHomepageItems(result.page.items);
    }
    return result;
  }

  return buildLocalFallbackResponse(weaverse, key, result);
}

async function buildLocalFallbackResponse(
  weaverse: WeaverseClient,
  key: string,
  result: WeaverseLoaderData | null,
): Promise<WeaverseLoaderData | null> {
  const loader = JSON_LOADERS[key];
  if (!loader) {
    return result;
  }

  const json = await loader();
  const pageJson = json.default ?? json;

  const page: HydrogenPageData = {
    id: `local_${key.replace(/[^a-zA-Z0-9]/g, "_")}`,
    name: key,
    items: pageJson.items ?? [],
    rootId: pageJson.rootId,
  };

  const itemsWithData = await Promise.all(
    page.items.map((item: HydrogenComponentData) =>
      weaverse.execComponentLoader(item),
    ),
  );
  page.items = key === "INDEX" ? patchHomepageItems(itemsWithData) : itemsWithData;

  const configs =
    result?.configs ??
    ({
      ...(weaverse as any).basePageConfigs,
      requestInfo: {
        i18n: (weaverse as any).storefront.i18n,
        queries: getRequestQueries((weaverse as any).request),
        pathname: new URL((weaverse as any).request.url).pathname,
        search: new URL((weaverse as any).request.url).search,
      },
    } as any);

  return {
    configs,
    page,
    project:
      result?.project ??
      ({
        id: configs.projectId ?? "",
        name: "ModernCre8ve",
        weaverseShopId: "",
      } as any),
    pageAssignment: result?.pageAssignment,
  };
}

/**
 * Patches homepage page items returned by Weaverse Studio to enforce
 * SEO-critical properties that Studio data may override incorrectly.
 *
 * Runs server-side on production only (skipped in design mode so Studio
 * editing isn't affected). Patches applied:
 *
 * 1. First slideshow-slide gets headingTagName: "h1" (SEO: homepage must have one H1)
 * 2. Subsequent slideshow-slides get headingTagName: "h2"
 * 3. Slide CTAs get differentiated text and destination URLs
 * 4. Hero heading copy updated for keyword targeting
 */
function patchHomepageItems(
  items: HydrogenComponentData[],
): HydrogenComponentData[] {
  let slideIndex = 0;

  // Slide-level SEO patches: heading tags + differentiated CTAs
  const slidePatch: Record<
    number,
    Partial<HydrogenComponentData["data"]>
  > = {
    0: {
      headingTagName: "h1",
      headingContent: "Handcrafted Mid-Century Modern Furniture",
      subheadingContent: "Furniture for People Who Notice",
      buttonContent: "Explore the Collection",
      to: "/collections",
    },
    1: {
      headingTagName: "h2",
      buttonContent: "Shop Dining Tables",
      to: "/collections/mid-century-modern-dining-tables",
    },
    2: {
      headingTagName: "h2",
      buttonContent: "View Scandinavian Collection",
      to: "/collections/scandinavian-design-furniture",
    },
  };

  return items.map((item) => {
    if (item.type === "slideshow-slide") {
      const patch = slidePatch[slideIndex];
      slideIndex++;
      if (patch) {
        return {
          ...item,
          data: { ...item.data, ...patch },
        };
      }
    }

    if (typeof item.data?.to === "string") {
      const patchedTo = HOMEPAGE_LINK_PATCHES[item.data.to];
      if (patchedTo) {
        return {
          ...item,
          data: { ...item.data, to: patchedTo },
        };
      }
    }

    return item;
  });
}
