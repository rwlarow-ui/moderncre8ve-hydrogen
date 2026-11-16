import type { Storefront } from "@shopify/hydrogen";

/**
 * Page handles that 301 elsewhere. A bare handle replaces the page handle
 * (`/pages/about-us-1` → `/pages/about-us`); a value starting with `/` is a
 * site path, kept under the request's locale prefix
 * (`/en-ca/pages/blog` → `/en-ca/blogs/…`).
 */
const PAGE_REDIRECTS: Readonly<Record<string, string>> = {
  "about-us-1": "about-us",
  // Admin stub page duplicating the real blog, which lives under /blogs/.
  blog: "/blogs/mid-century-modern-scandi-japandi-design-blog",
  "contact-and-inquiry": "contact-us",
};

export function getPageRedirectUrl(requestUrl: string, handle: string) {
  if (!Object.hasOwn(PAGE_REDIRECTS, handle)) {
    return null;
  }

  const target = PAGE_REDIRECTS[handle];
  const url = new URL(requestUrl);
  const segments = url.pathname.split("/");
  if (target.startsWith("/")) {
    // Everything before `/pages/:handle` is the (optional) locale prefix.
    url.pathname = segments.slice(0, -2).join("/") + target;
  } else {
    segments[segments.length - 1] = target;
    url.pathname = segments.join("/");
  }
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
