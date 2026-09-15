import type { SeoConfig } from "@shopify/hydrogen";
import { getPaginationVariables } from "@shopify/hydrogen";
import type { LoaderFunctionArgs } from "@shopify/remix-oxygen";
import { type MetaFunction, useLoaderData } from "react-router";
import invariant from "tiny-invariant";
import { PRODUCT_CARD_FRAGMENT } from "~/graphql/fragments";
import { loadPage } from "~/page-builder/page.server";
import { PageContent } from "~/page-builder/renderer";
import { routeHeaders } from "~/utils/cache";
import { maybeFilterOutCombinedListingsQuery } from "~/utils/combined-listings";
import { PAGINATION_SIZE } from "~/utils/const";
import { getEnhancedSeoMeta } from "~/utils/enhanced-seo-meta";
import { seoPayload } from "~/utils/seo.server";

export const headers = routeHeaders;

export async function loader({ request, context }: LoaderFunctionArgs) {
  const { storefront } = context;
  const variables = getPaginationVariables(request, {
    pageBy: PAGINATION_SIZE,
  });

  // Load products data and the page composition in parallel
  const [data, pageData] = await Promise.all([
    storefront.query(ALL_PRODUCTS_QUERY, {
      variables: {
        ...variables,
        country: storefront.i18n.country,
        language: storefront.i18n.language,
        query: maybeFilterOutCombinedListingsQuery,
      },
    }),
    loadPage({ context, request }, { type: "ALL_PRODUCTS" }),
  ]);

  invariant(data, "No data returned from Shopify API");

  const seo = seoPayload.collection({
    url: request.url,
    collection: {
      id: "all-products",
      title: "All Products",
      handle: "products",
      descriptionHtml: "All the store products",
      description: "All the store products",
      seo: {
        title: "All Products",
        description: "All the store products",
      },
      metafields: [],
      products: data.products,
      updatedAt: "",
    },
  });

  return {
    products: data.products,
    seo,
    pageData,
  };
}

export const meta: MetaFunction<typeof loader> = ({ data, location }) => {
  const canonical = `https://moderncre8ve.com${location.pathname.replace(/\/+$/, "") || "/"}`;
  return getEnhancedSeoMeta(data.seo as SeoConfig, { canonicalUrl: canonical });
};
export default function AllProducts() {
  const { pageData } = useLoaderData<typeof loader>();
  return <PageContent pageData={pageData} />;
}

const ALL_PRODUCTS_QUERY = `#graphql
  query allProducts(
    $country: CountryCode
    $language: LanguageCode
    $first: Int
    $last: Int
    $startCursor: String
    $endCursor: String
    $query: String
  ) @inContext(country: $country, language: $language) {
    products(first: $first, last: $last, before: $startCursor, after: $endCursor, query: $query) {
      nodes {
        ...ProductCard
      }
      pageInfo {
        hasPreviousPage
        hasNextPage
        startCursor
        endCursor
      }
    }
  }
  ${PRODUCT_CARD_FRAGMENT}
` as const;
