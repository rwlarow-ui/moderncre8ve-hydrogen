import type { SeoConfig } from "@shopify/hydrogen";
import { redirect } from "@shopify/remix-oxygen";
import type { RouteLoaderArgs } from "@weaverse/hydrogen";
import type { MetaFunction } from "react-router";
import type { PageDetailsQuery } from "storefront-api.generated";
import invariant from "tiny-invariant";

import { routeHeaders } from "~/utils/cache";
import { getEnhancedSeoMeta } from "~/utils/enhanced-seo-meta";
import { redirectIfHandleIsLocalized } from "~/utils/redirect";
import { seoPayload } from "~/utils/seo.server";
import { loadPageWithFallback } from "~/utils/weaverse-fallback.server";
import { validateWeaverseData, WeaverseContent } from "~/weaverse";

export const headers = routeHeaders;

const PAGE_REDIRECTS: Record<string, string> = {
  "about-us-1": "/pages/about-us",
  "custom-kitchen-cabinets-cleveland":
    "/pages/custom-furniture-crafted-to-perfection",
};

export async function loader({ request, params, context }: RouteLoaderArgs) {
  invariant(params.pageHandle, "Missing page handle");

  const redirectTo = PAGE_REDIRECTS[params.pageHandle];
  if (redirectTo) {
    const url = new URL(request.url);
    const localePrefix = params.locale ? `/${params.locale}` : "";
    url.pathname = `${localePrefix}${redirectTo}`;
    throw redirect(url.toString(), 301);
  }

  const { storefront } = context.weaverse;

  // Load page data and weaverseData in parallel
  const [{ page }, weaverseData] = await Promise.all([
    storefront.query<PageDetailsQuery>(PAGE_QUERY, {
      variables: {
        handle: params.pageHandle,
        language: storefront.i18n.language,
      },
    }),
    loadPageWithFallback(context.weaverse, {
      type: "PAGE",
      handle: params.pageHandle,
    }),
  ]);

  if (!page) {
    // No Shopify page — only render if we have a local Weaverse fallback
    // (page ID starts with "local_"). Otherwise 404 so Shopify's URL
    // redirects can fire (e.g. /pages/contact → /pages/contact-us).
    if (!weaverseData?.page?.id?.startsWith("local_")) {
      throw new Response(null, { status: 404 });
    }
    validateWeaverseData(weaverseData);
    const title = params.pageHandle
      .replace(/-/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase());
    return {
      page: null,
      seo: seoPayload.page({
        page: { title, seo: { title, description: "" } },
        url: request.url,
      }),
      weaverseData,
    };
  }
  redirectIfHandleIsLocalized(request, {
    handle: params.pageHandle,
    data: page,
  });

  const seo = seoPayload.page({ page, url: request.url });

  return {
    page,
    seo,
    weaverseData,
  };
}

export const meta: MetaFunction<typeof loader> = ({ data, location }) => {
  const canonical = `https://moderncre8ve.com${location.pathname.replace(/\/+$/, "") || "/"}`;
  return getEnhancedSeoMeta(data?.seo as SeoConfig, {
    canonicalUrl: canonical,
  });
};

export default function Page() {
  return <WeaverseContent />;
}

const PAGE_QUERY = `#graphql
  query PageDetails($language: LanguageCode, $handle: String!)
  @inContext(language: $language) {
    page(handle: $handle) {
      id
      title
      handle
      body
      seo {
        description
        title
      }
    }
  }
`;
