import type { SeoConfig } from "@shopify/hydrogen";
import { AnalyticsPageType } from "@shopify/hydrogen";
import type { LoaderFunctionArgs } from "@shopify/remix-oxygen";
import { type MetaFunction, useLoaderData } from "react-router";
import type { ShopQuery } from "storefront-api.generated";
import type { PageType } from "~/page-builder";
import { loadPage } from "~/page-builder/page.server";
import { PageContent } from "~/page-builder/renderer";
import { routeHeaders } from "~/utils/cache";
import { getEnhancedSeoMeta } from "~/utils/enhanced-seo-meta";
import { seoPayload } from "~/utils/seo.server";

export const headers = routeHeaders;

export async function loader(args: LoaderFunctionArgs) {
  const { params, context, request } = args;
  const { pathPrefix } = context.storefront.i18n;
  const locale = pathPrefix.slice(1);
  let type: PageType = "INDEX";

  if (params.locale && params.locale.toLowerCase() !== locale) {
    // Not a locale prefix, so it is probably a custom page handle
    type = "CUSTOM";
  }

  // Calculate seo payload synchronously
  const seo = seoPayload.home();

  // Load async data in parallel for better performance
  const [pageData, { shop }] = await Promise.all([
    loadPage({ context, request }, { type }),
    context.storefront.query<ShopQuery>(SHOP_QUERY),
  ]);

  // A page type with no composition (e.g. an unknown custom handle) is a 404.
  if (!pageData) {
    throw new Response(null, { status: 404 });
  }

  return {
    shop,
    pageData,
    analytics: {
      pageType: AnalyticsPageType.home,
    },
    seo,
  };
}

export const meta: MetaFunction<typeof loader> = ({ data, location }) => {
  const canonical = `https://moderncre8ve.com${location.pathname.replace(/\/+$/, "") || "/"}`;
  return getEnhancedSeoMeta(data?.seo as SeoConfig, {
    canonicalUrl: canonical,
  });
};
export default function Homepage() {
  const { pageData } = useLoaderData<typeof loader>();
  return <PageContent pageData={pageData} />;
}

const SHOP_QUERY = `#graphql
  query shop($country: CountryCode, $language: LanguageCode)
  @inContext(country: $country, language: $language) {
    shop {
      name
      description
    }
  }
` as const;
