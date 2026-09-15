import type { SeoConfig } from "@shopify/hydrogen";
import { getPaginationVariables } from "@shopify/hydrogen";
import { type MetaFunction, useLoaderData } from "react-router";
import type { CollectionsQuery } from "storefront-api.generated";
import type { RouteLoaderArgs } from "~/page-builder";
import { loadPage } from "~/page-builder/page.server";
import { PageContent } from "~/page-builder/renderer";
import { routeHeaders } from "~/utils/cache";
import { PAGINATION_SIZE } from "~/utils/const";
import { getEnhancedSeoMeta } from "~/utils/enhanced-seo-meta";
import { seoPayload } from "~/utils/seo.server";

export const headers = routeHeaders;

export const loader = async (args: RouteLoaderArgs) => {
  const { request, context } = args;
  const { storefront } = context;
  const variables = getPaginationVariables(request, {
    pageBy: PAGINATION_SIZE,
  });

  // Load collections data and the page composition in parallel
  const [{ collections }, pageData] = await Promise.all([
    storefront.query<CollectionsQuery>(COLLECTIONS_QUERY, {
      variables: {
        ...variables,
        country: storefront.i18n.country,
        language: storefront.i18n.language,
      },
    }),
    loadPage({ context, request }, { type: "COLLECTION_LIST" }),
  ]);

  const seo = seoPayload.listCollections({
    collections,
    url: request.url,
  });

  return {
    collections,
    seo,
    pageData,
  };
};

export const meta: MetaFunction<typeof loader> = ({ data, location }) => {
  const canonical = `https://moderncre8ve.com${location.pathname.replace(/\/+$/, "") || "/"}`;
  return getEnhancedSeoMeta(data?.seo as SeoConfig, {
    canonicalUrl: canonical,
  });
};

export default function Collections() {
  const { pageData } = useLoaderData<typeof loader>();
  return <PageContent pageData={pageData} />;
}

const COLLECTIONS_QUERY = `#graphql
  query collections(
    $country: CountryCode
    $language: LanguageCode
    $first: Int
    $last: Int
    $startCursor: String
    $endCursor: String
  ) @inContext(country: $country, language: $language) {
    collections(first: $first, last: $last, before: $startCursor, after: $endCursor) {
      nodes {
        id
        title
        description
        handle
        seo {
          description
          title
        }
        image {
          id
          url
          width
          height
          altText
        }
        products(first: 1) {
          nodes {
            id
            title
            handle
            media(first: 1) {
              nodes {
                previewImage {
                  id
                  url
                  width
                  height
                  altText
                }
              }
            }
          }
        }
      }
      pageInfo {
        hasPreviousPage
        hasNextPage
        startCursor
        endCursor
      }
    }
  }
` as const;
