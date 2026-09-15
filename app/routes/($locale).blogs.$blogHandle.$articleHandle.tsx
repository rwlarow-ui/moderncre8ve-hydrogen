import type { SeoConfig } from "@shopify/hydrogen";
import { type MetaFunction, useLoaderData } from "react-router";
import type { ArticleQuery } from "storefront-api.generated";
import invariant from "tiny-invariant";
import type { RouteLoaderArgs } from "~/page-builder";
import { loadPage } from "~/page-builder/page.server";
import { PageContent } from "~/page-builder/renderer";
import { routeHeaders } from "~/utils/cache";
import { getEnhancedSeoMeta } from "~/utils/enhanced-seo-meta";
import { redirectIfHandleIsLocalized } from "~/utils/redirect";
import { seoPayload } from "~/utils/seo.server";

export const headers = routeHeaders;

export async function loader(args: RouteLoaderArgs) {
  const { request, params, context } = args;
  const { storefront } = context;
  const { language, country } = storefront.i18n;

  invariant(params.blogHandle, "Missing blog handle");
  invariant(params.articleHandle, "Missing article handle");

  const { blogHandle, articleHandle } = params;

  // Load blog data and the page composition in parallel
  const [{ blog }, pageData] = await Promise.all([
    storefront.query<ArticleQuery>(ARTICLE_QUERY, {
      variables: {
        blogHandle,
        articleHandle,
        language,
      },
    }),
    loadPage({ context, request }, { type: "ARTICLE", handle: articleHandle }),
  ]);

  if (!blog?.articleByHandle) {
    throw new Response(null, { status: 404 });
  }
  redirectIfHandleIsLocalized(
    request,
    {
      handle: articleHandle,
      data: blog.articleByHandle,
    },
    {
      handle: blogHandle,
      data: blog,
    },
  );

  const article = blog.articleByHandle;
  const relatedArticles = blog.articles.nodes.filter(
    (art) => art?.handle !== articleHandle,
  );

  const formattedDate = new Intl.DateTimeFormat(`${language}-${country}`, {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date(article?.publishedAt));

  const seo = seoPayload.article({ article, url: request.url });

  return {
    article,
    blog: {
      handle: blogHandle,
    },
    relatedArticles,
    formattedDate,
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

export default function Article() {
  const { pageData } = useLoaderData<typeof loader>();
  return <PageContent pageData={pageData} />;
}

const ARTICLE_QUERY = `#graphql
  query article(
    $language: LanguageCode
    $blogHandle: String!
    $articleHandle: String!
  ) @inContext(language: $language) {
    blog(handle: $blogHandle) {
      title
      handle
      articleByHandle(handle: $articleHandle) {
        title
        handle
        contentHtml
        publishedAt
        tags
        author: authorV2 {
          name
        }
        image {
          id
          altText
          url
          width
          height
        }
        seo {
          description
          title
        }
      }
      articles (first: 20) {
        nodes {
            ...Article
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
