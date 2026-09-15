import type { SeoConfig } from "@shopify/hydrogen";
import { type MetaFunction, useLoaderData } from "react-router";
import type { PageDetailsQuery } from "storefront-api.generated";
import invariant from "tiny-invariant";
import type { RouteLoaderArgs } from "~/page-builder";
import { loadPage } from "~/page-builder/page.server";
import { hasPageComposition } from "~/page-builder/pages";
import { PageContent } from "~/page-builder/renderer";
import { routeHeaders } from "~/utils/cache";
import { getEnhancedSeoMeta } from "~/utils/enhanced-seo-meta";
import { redirectIfHandleIsLocalized } from "~/utils/redirect";
import { seoPayload } from "~/utils/seo.server";

export const headers = routeHeaders;

export async function loader({ request, params, context }: RouteLoaderArgs) {
  invariant(params.pageHandle, "Missing page handle");
  const { storefront } = context;

  // Load page data and the page composition in parallel
  const [{ page }, pageData] = await Promise.all([
    storefront.query<PageDetailsQuery>(PAGE_QUERY, {
      variables: {
        handle: params.pageHandle,
        language: storefront.i18n.language,
      },
    }),
    loadPage({ context, request }, { type: "PAGE", handle: params.pageHandle }),
  ]);

  if (!page) {
    // No Shopify page — only render if this handle has a composition of its
    // own. Otherwise 404 so Shopify's URL redirects can fire
    // (e.g. /pages/contact → /pages/contact-us).
    if (!hasPageComposition(params.pageHandle)) {
      throw new Response(null, { status: 404 });
    }
    const title = params.pageHandle
      .replace(/-/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase());
    return {
      page: null,
      seo: seoPayload.page({
        page: { title, seo: { title, description: "" } },
        url: request.url,
      }),
      pageData,
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
    pageData,
  };
}

export const meta: MetaFunction<typeof loader> = ({ data, location }) => {
  const canonical = `https://moderncre8ve.com${location.pathname.replace(/\/+$/, "") || "/"}`;
  return getEnhancedSeoMeta(data?.seo as SeoConfig, {
    canonicalUrl: canonical,
  });
};

export default function Page() {
  const { pageData } = useLoaderData<typeof loader>();
  return <PageContent pageData={pageData} />;
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
