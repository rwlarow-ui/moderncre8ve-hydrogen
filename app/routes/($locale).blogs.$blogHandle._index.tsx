import type { SeoConfig } from "@shopify/hydrogen";
import { flattenConnection } from "@shopify/hydrogen";
import { data, type LoaderFunctionArgs } from "@shopify/remix-oxygen";
import { type MetaFunction, useLoaderData } from "react-router";
import type { BlogQuery } from "storefront-api.generated";
import invariant from "tiny-invariant";
import { loadPage } from "~/page-builder/page.server";
import { PageContent } from "~/page-builder/renderer";
import { routeHeaders } from "~/utils/cache";
import { PAGINATION_SIZE } from "~/utils/const";
import { getEnhancedSeoMeta } from "~/utils/enhanced-seo-meta";
import { redirectIfHandleIsLocalized } from "~/utils/redirect";
import { seoPayload } from "~/utils/seo.server";

export const headers = routeHeaders;

export const loader = async (args: LoaderFunctionArgs) => {
  const { params, request, context } = args;
  const storefront = context.storefront;
  const { language, country } = storefront.i18n;

  invariant(params.blogHandle, "Missing blog handle");

  // Load blog data and the page composition in parallel
  const [{ blog }, pageData] = await Promise.all([
    storefront.query<BlogQuery>(BLOGS_QUERY, {
      variables: {
        blogHandle: params.blogHandle,
        pageBy: PAGINATION_SIZE,
        language,
      },
    }),
    loadPage({ context, request }, { type: "BLOG", handle: params.blogHandle }),
  ]);

  if (!blog?.articles) {
    throw new Response("Not found", { status: 404 });
  }
  redirectIfHandleIsLocalized(request, {
    handle: params.blogHandle,
    data: blog,
  });

  const articles = flattenConnection(blog.articles).map((article) => {
    const { publishedAt } = article;
    return {
      ...article,
      publishedAt: new Intl.DateTimeFormat(`${language}-${country}`, {
        year: "numeric",
        month: "long",
        day: "numeric",
      }).format(new Date(publishedAt)),
    };
  });

  const seo = seoPayload.blog({ blog, url: request.url });

  return data({
    blog,
    articles,
    seo,
    pageData,
  });
};

export const meta: MetaFunction<typeof loader> = ({
  data: loaderData,
  location,
}) => {
  const canonical = `https://moderncre8ve.com${location.pathname.replace(/\/+$/, "") || "/"}`;
  return getEnhancedSeoMeta(loaderData?.seo as SeoConfig, {
    canonicalUrl: canonical,
  });
};

export default function Blogs() {
  const { pageData } = useLoaderData<typeof loader>();
  return <PageContent pageData={pageData} />;
}

const BLOGS_QUERY = `#graphql
  query blog(
    $language: LanguageCode
    $blogHandle: String!
    $pageBy: Int!
    $cursor: String
  ) @inContext(language: $language) {
    blog(handle: $blogHandle) {
      title
      handle
      seo {
        title
        description
      }
      articles(first: $pageBy, after: $cursor) {
        edges {
          node {
            ...Article
          }
        }
      }
    }
  }

  fragment Article on Article {
    author: authorV2 {
      name
    }
    contentHtml
    excerpt
    excerptHtml
    handle
    id
    image {
      id
      altText
      url
      width
      height
    }
    publishedAt
    title
  }
` as const;
