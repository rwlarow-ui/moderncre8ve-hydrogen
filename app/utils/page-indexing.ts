import type { Storefront } from "@shopify/hydrogen";

const PAGE_REDIRECTS: Readonly<Record<string, string>> = {
  "about-us-1": "about-us",
  "contact-and-inquiry": "contact-us",
};

export function getPageRedirectUrl(requestUrl: string, handle: string) {
  if (!Object.hasOwn(PAGE_REDIRECTS, handle)) {
    return null;
  }

  const url = new URL(requestUrl);
  const segments = url.pathname.split("/");
  segments[segments.length - 1] = PAGE_REDIRECTS[handle];
  url.pathname = segments.join("/");
  return url.toString();
}

export function isIndexablePageHandle(handle: string | undefined) {
  return Boolean(
    handle && handle !== "wrong-turn" && !Object.hasOwn(PAGE_REDIRECTS, handle),
  );
}

interface PageSitemapData {
  sitemap?: {
    resources?: {
      items?: { handle?: string }[];
    };
  };
}

/** Filter page resources before Hydrogen serializes URLs and alternates. */
export function storefrontForSitemap(storefront: Storefront, type: string) {
  if (type !== "pages") {
    return storefront;
  }

  const query: Storefront["query"] = async (...args) => {
    const result = await storefront.query(...args);
    const sitemap = (result as PageSitemapData)?.sitemap;
    if (!sitemap?.resources?.items) {
      return result;
    }

    return {
      ...result,
      sitemap: {
        ...sitemap,
        resources: {
          ...sitemap.resources,
          items: sitemap.resources.items.filter(({ handle }) =>
            isIndexablePageHandle(handle),
          ),
        },
      },
    };
  };

  return { ...storefront, query };
}
