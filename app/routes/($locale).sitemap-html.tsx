import type { SeoConfig } from "@shopify/hydrogen";
import type { LoaderFunctionArgs } from "@shopify/remix-oxygen";
import type { MetaFunction } from "react-router";
import { Link, useLoaderData } from "react-router";
import { routeHeaders } from "~/utils/cache";
import { getEnhancedSeoMeta } from "~/utils/enhanced-seo-meta";

export const headers = routeHeaders;

interface SitemapItem {
  title: string;
  url: string;
}

interface SitemapData {
  collections: SitemapItem[];
  products: SitemapItem[];
  pages: SitemapItem[];
  articles: SitemapItem[];
}

export async function loader({ request, context }: LoaderFunctionArgs) {
  const { storefront } = context;

  const [collectionsResult, productsResult, pagesResult, articlesResult] =
    await Promise.all([
      storefront.query(COLLECTIONS_QUERY),
      storefront.query(PRODUCTS_QUERY),
      storefront.query(PAGES_QUERY),
      storefront.query(ARTICLES_QUERY),
    ]);

  const collections: SitemapItem[] =
    collectionsResult.collections.nodes.map(
      (c: { title: string; handle: string }) => ({
        title: c.title,
        url: `/collections/${c.handle}`,
      }),
    );

  const products: SitemapItem[] = productsResult.products.nodes.map(
    (p: { title: string; handle: string }) => ({
      title: p.title,
      url: `/products/${p.handle}`,
    }),
  );

  const pages: SitemapItem[] = pagesResult.pages.nodes.map(
    (p: { title: string; handle: string }) => ({
      title: p.title,
      url: `/pages/${p.handle}`,
    }),
  );

  const articles: SitemapItem[] = articlesResult.articles.nodes.map(
    (a: { title: string; handle: string; blog: { handle: string } }) => ({
      title: a.title,
      url: `/blogs/${a.blog.handle}/${a.handle}`,
    }),
  );

  const url = new URL(request.url);
  const canonical = `https://moderncre8ve.com${url.pathname.replace(/\/+$/, "")}`;

  const seo: SeoConfig = {
    title: "Sitemap",
    titleTemplate: "%s | ModernCre8ve",
    description:
      "Browse all pages, collections, products, and articles on ModernCre8ve.",
    robots: { noIndex: false, noFollow: false },
  };

  return {
    collections,
    products,
    pages,
    articles,
    seo,
    canonical,
  };
}

export const meta: MetaFunction<typeof loader> = ({ data, location }) => {
  const canonical = `https://moderncre8ve.com${location.pathname.replace(/\/+$/, "") || "/"}`;
  return getEnhancedSeoMeta(data?.seo as SeoConfig, {
    canonicalUrl: canonical,
  });
};

function SitemapSection({
  title,
  items,
}: {
  title: string;
  items: SitemapItem[];
}) {
  if (!items.length) return null;
  return (
    <section className="mb-10">
      <h2 className="mb-4 font-sans text-xl font-semibold">{title}</h2>
      <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => (
          <li key={item.url}>
            <Link
              to={item.url}
              className="text-body/80 underline-offset-2 hover:underline"
              prefetch="intent"
            >
              {item.title}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

export default function HtmlSitemap() {
  const { collections, products, pages, articles } =
    useLoaderData<typeof loader>();

  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
      <h1 className="mb-8 font-sans text-3xl font-bold">Sitemap</h1>
      <SitemapSection title="Collections" items={collections} />
      <SitemapSection title="Products" items={products} />
      <SitemapSection title="Pages" items={pages} />
      <SitemapSection title="Articles" items={articles} />
    </div>
  );
}

const COLLECTIONS_QUERY = `#graphql
  query SitemapCollections(
    $country: CountryCode
    $language: LanguageCode
  ) @inContext(country: $country, language: $language) {
    collections(first: 250, sortKey: TITLE) {
      nodes {
        title
        handle
      }
    }
  }
` as const;

const PRODUCTS_QUERY = `#graphql
  query SitemapProducts(
    $country: CountryCode
    $language: LanguageCode
  ) @inContext(country: $country, language: $language) {
    products(first: 250, sortKey: TITLE) {
      nodes {
        title
        handle
      }
    }
  }
` as const;

const PAGES_QUERY = `#graphql
  query SitemapPages(
    $country: CountryCode
    $language: LanguageCode
  ) @inContext(country: $country, language: $language) {
    pages(first: 250, sortKey: TITLE) {
      nodes {
        title
        handle
      }
    }
  }
` as const;

const ARTICLES_QUERY = `#graphql
  query SitemapArticles(
    $country: CountryCode
    $language: LanguageCode
  ) @inContext(country: $country, language: $language) {
    articles(first: 250, sortKey: TITLE) {
      nodes {
        title
        handle
        blog {
          handle
        }
      }
    }
  }
` as const;
