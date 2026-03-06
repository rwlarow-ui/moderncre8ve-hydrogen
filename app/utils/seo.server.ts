import type { SeoConfig } from "@shopify/hydrogen";
import type {
  Article,
  Blog,
  Collection,
  Image,
  Page,
  Product,
  ShopPolicy,
} from "@shopify/hydrogen/storefront-api-types";
import type { BreadcrumbList, CollectionPage, Offer } from "schema-dts";
import type { ProductQuery, ShopFragment } from "storefront-api.generated";
import { collectionFaqs } from "~/utils/collection-faqs";

function root({
  shop,
  url,
}: {
  shop: ShopFragment;
  url: Request["url"];
}): SeoConfig {
  return {
    title: shop?.name,
    titleTemplate: "%s | ModernCre8ve",
    description: truncate(
      shop?.description ??
        "Handcrafted modern furniture made in Cleveland, Ohio",
    ),
    handle: "@moderncre8ve",
    url,
    robots: {
      noIndex: false,
      noFollow: false,
    },
    jsonLd: [
      {
        "@context": "https://schema.org",
        "@type": "Organization",
        name: "ModernCre8ve",
        logo: shop.brand?.logo?.image?.url,
        sameAs: [
          "https://www.instagram.com/moderncre8ve",
          "https://www.facebook.com/moderncre8ve",
        ],
        url,
        potentialAction: {
          "@type": "SearchAction",
          target: `${url}search?q={search_term}`,
          query: "required name='search_term'",
        },
      },
      {
        "@context": "https://schema.org",
        "@type": "FurnitureStore",
        name: "ModernCre8ve",
        description:
          "Handcrafted modern furniture made in Cleveland, Ohio. Mid-century, Scandinavian, and Japandi designs by Amish artisans.",
        url,
        telephone: "(216) 502-0755",
        email: "info@moderncre8ve.com",
        address: {
          "@type": "PostalAddress",
          streetAddress: "1400 E 36th Street, Suite 2802A",
          addressLocality: "Cleveland",
          addressRegion: "OH",
          postalCode: "44114",
          addressCountry: "US",
        },
        geo: {
          "@type": "GeoCoordinates",
          latitude: 41.5074,
          longitude: -81.6641,
        },
        openingHoursSpecification: {
          "@type": "OpeningHoursSpecification",
          dayOfWeek: [
            "Monday",
            "Tuesday",
            "Wednesday",
            "Thursday",
            "Friday",
          ],
          opens: "09:00",
          closes: "17:00",
        },
        priceRange: "$$",
        sameAs: [
          "https://www.instagram.com/moderncre8ve",
          "https://www.facebook.com/moderncre8ve",
        ],
      },
    ],
  };
}

function home(): SeoConfig {
  return {
    title: "Home",
    titleTemplate: "%s | ModernCre8ve",
    description: "Handcrafted modern furniture made in Cleveland, Ohio",
    handle: "@moderncre8ve",
    robots: {
      noIndex: false,
      noFollow: false,
    },
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "WebPage",
      name: "Home page",
    },
  };
}

function productJsonLd({
  product: productData,
  selectedVariant,
  url,
}: {
  product: ProductQuery["product"];
  selectedVariant: ProductQuery["product"]["selectedOrFirstAvailableVariant"];
  url: Request["url"];
}): SeoConfig["jsonLd"] {
  const origin = new URL(url).origin;
  const description = truncate(
    productData?.seo?.description ?? productData?.description,
  );

  // Create offers array from adjacent variants
  const offers: Offer[] = [];
  if (productData?.adjacentVariants) {
    for (const variant of productData.adjacentVariants) {
      const variantUrl = new URL(url);
      for (const option of variant.selectedOptions) {
        variantUrl.searchParams.set(option.name, option.value);
      }
      const availability = variant.availableForSale
        ? "https://schema.org/InStock"
        : "https://schema.org/OutOfStock";

      offers.push({
        "@type": "Offer",
        availability,
        price: Number.parseFloat(variant.price.amount),
        priceCurrency: variant.price.currencyCode,
        sku: variant?.sku ?? "",
        url: variantUrl.toString(),
      });
    }
  }

  // If no adjacent variants, add the selected variant
  if (offers.length === 0 && selectedVariant) {
    const availability = selectedVariant.availableForSale
      ? "https://schema.org/InStock"
      : "https://schema.org/OutOfStock";

    offers.push({
      "@type": "Offer",
      availability,
      price: Number.parseFloat(selectedVariant.price.amount),
      priceCurrency: selectedVariant.price.currencyCode,
      sku: selectedVariant?.sku ?? "",
      url,
    });
  }

  return [
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          name: "Products",
          item: `${origin}/products`,
        },
        {
          "@type": "ListItem",
          position: 2,
          name: productData.title,
        },
      ],
    },
    {
      "@context": "https://schema.org",
      "@type": "Product",
      brand: {
        "@type": "Brand",
        name: productData.vendor,
      },
      description,
      image: [selectedVariant?.image?.url ?? ""],
      name: productData.title,
      offers,
      sku: selectedVariant?.sku ?? "",
      url,
    },
  ];
}

function product({
  product: productData,
  url,
}: {
  product: ProductQuery["product"];
  url: Request["url"];
}): SeoConfig {
  const description = truncate(
    productData?.seo?.description ?? productData?.description ?? "",
  );
  const selectedVariant = productData?.selectedOrFirstAvailableVariant;
  return {
    title: stripBrandSuffix(productData?.seo?.title) || productData?.title,
    description,
    handle: "@moderncre8ve",
    url,
    media: selectedVariant?.image,
    jsonLd: productJsonLd({ product: productData, selectedVariant, url }),
  };
}

type CollectionRequiredFields = Omit<
  Collection,
  "products" | "descriptionHtml" | "metafields" | "image" | "updatedAt"
> & {
  products: { nodes: Pick<Product, "handle">[] };
  image?: null | Pick<Image, "url" | "height" | "width" | "altText">;
  descriptionHtml?: null | Collection["descriptionHtml"];
  updatedAt?: null | Collection["updatedAt"];
  metafields?: null | Collection["metafields"];
};

function collectionJsonLd({
  url,
  collection: collectionData,
}: {
  url: Request["url"];
  collection: CollectionRequiredFields;
}): SeoConfig["jsonLd"] {
  const origin = new URL(url).origin;
  const itemListElement: CollectionPage["mainEntity"] =
    collectionData.products.nodes.map((prod, index) => {
      return {
        "@type": "ListItem",
        position: index + 1,
        url: `${origin}/products/${prod.handle}`,
      };
    });

  const jsonLdItems: SeoConfig["jsonLd"] = [
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          name: "Collections",
          item: `${origin}/collections`,
        },
        {
          "@type": "ListItem",
          position: 2,
          name: collectionData.title,
        },
      ],
    },
    {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      name:
        stripBrandSuffix(collectionData?.seo?.title) ||
        stripBrandSuffix(collectionData?.title) ||
        collectionData?.title ||
        "",
      description: truncate(
        collectionData?.seo?.description ?? collectionData?.description ?? "",
      ),
      image: collectionData?.image?.url,
      url: `${origin}/collections/${collectionData.handle}`,
      mainEntity: {
        "@type": "ItemList",
        itemListElement,
      },
    },
  ];

  // Inject FAQPage schema if FAQs exist for this collection
  const faqs = collectionFaqs[collectionData.handle];
  if (faqs?.length) {
    (jsonLdItems as any[]).push({
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: faqs.map((faq) => ({
        "@type": "Question",
        name: faq.question,
        acceptedAnswer: {
          "@type": "Answer",
          text: faq.answer,
        },
      })),
    });
  }

  return jsonLdItems;
}

function collection({
  collection: collectionData,
  url,
}: {
  collection: CollectionRequiredFields;
  url: Request["url"];
}): SeoConfig {
  return {
    title:
      stripBrandSuffix(collectionData?.seo?.title) ||
      stripBrandSuffix(collectionData?.title) ||
      collectionData?.title,
    description: truncate(
      collectionData?.seo?.description ?? collectionData?.description ?? "",
    ),
    titleTemplate: "%s | ModernCre8ve",
    url,
    media: {
      type: "image",
      url: collectionData?.image?.url,
      height: collectionData?.image?.height,
      width: collectionData?.image?.width,
      altText: collectionData?.image?.altText,
    },
    jsonLd: collectionJsonLd({ collection: collectionData, url }),
  };
}

type CollectionListRequiredFields = {
  nodes: Omit<CollectionRequiredFields, "products">[];
};

function collectionsJsonLd({
  url,
  collections,
}: {
  url: Request["url"];
  collections: CollectionListRequiredFields;
}): SeoConfig["jsonLd"] {
  const origin = new URL(url).origin;
  const itemListElement: CollectionPage["mainEntity"] = collections.nodes.map(
    (col, index) => {
      return {
        "@type": "ListItem",
        position: index + 1,
        url: `${origin}/collections/${col.handle}`,
      };
    },
  );

  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Collections",
    description: "All collections",
    url,
    mainEntity: {
      "@type": "ItemList",
      itemListElement,
    },
  };
}

function listCollections({
  collections,
  url,
}: {
  collections: CollectionListRequiredFields;
  url: Request["url"];
}): SeoConfig {
  return {
    title: "Collections",
    titleTemplate: "%s | ModernCre8ve",
    description: "All collections",
    url,
    jsonLd: collectionsJsonLd({ collections, url }),
  };
}

function article({
  article: articleData,
  url,
}: {
  article: Pick<
    Article,
    "title" | "contentHtml" | "seo" | "publishedAt" | "excerpt"
  > & {
    image?: null | Pick<
      NonNullable<Article["image"]>,
      "url" | "height" | "width" | "altText"
    >;
  };
  url: Request["url"];
}): SeoConfig {
  return {
    title: stripBrandSuffix(articleData?.seo?.title) || articleData?.title,
    description: truncate(articleData?.seo?.description ?? ""),
    titleTemplate: "%s | ModernCre8ve",
    url,
    media: {
      type: "image",
      url: articleData?.image?.url,
      height: articleData?.image?.height,
      width: articleData?.image?.width,
      altText: articleData?.image?.altText,
    },
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "Article",
      alternativeHeadline: articleData.title,
      articleBody: articleData.contentHtml,
      datePublished: articleData?.publishedAt,
      description: truncate(
        articleData?.seo?.description || articleData?.excerpt || "",
      ),
      headline: articleData?.seo?.title || "",
      image: articleData?.image?.url,
      url,
      author: {
        "@type": "Organization",
        name: "ModernCre8ve",
        url: "https://moderncre8ve.com",
      },
      publisher: {
        "@type": "Organization",
        name: "ModernCre8ve",
        url: "https://moderncre8ve.com",
      },
    },
  };
}

function blog({
  blog: blogData,
  url,
}: {
  blog: Pick<Blog, "seo" | "title">;
  url: Request["url"];
}): SeoConfig {
  return {
    title: stripBrandSuffix(blogData?.seo?.title) || blogData?.title,
    description: truncate(blogData?.seo?.description || ""),
    titleTemplate: "%s | ModernCre8ve",
    url,
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "Blog",
      name: blogData?.seo?.title || blogData?.title || "",
      description: blogData?.seo?.description || "",
      url,
    },
  };
}

function page({
  page: pageData,
  url,
}: {
  page: Pick<Page, "title" | "seo">;
  url: Request["url"];
}): SeoConfig {
  return {
    description: truncate(pageData?.seo?.description || ""),
    title: stripBrandSuffix(pageData?.seo?.title) || pageData?.title,
    titleTemplate: "%s | ModernCre8ve",
    url,
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "WebPage",
      name: pageData.title,
    },
  };
}

function policy({
  policy: policyData,
  url,
}: {
  policy: Pick<ShopPolicy, "title" | "body">;
  url: Request["url"];
}): SeoConfig {
  return {
    description: truncate(policyData?.body ?? ""),
    title: policyData?.title,
    titleTemplate: "%s | ModernCre8ve",
    url,
  };
}

function policies({
  policies: policiesData,
  url,
}: {
  policies: Pick<ShopPolicy, "title" | "handle">[];
  url: Request["url"];
}): SeoConfig {
  const origin = new URL(url).origin;
  const itemListElement: BreadcrumbList["itemListElement"] = policiesData
    .filter(Boolean)
    .map((pol, index) => {
      return {
        "@type": "ListItem",
        position: index + 1,
        name: pol.title,
        item: `${origin}/policies/${pol.handle}`,
      };
    });
  return {
    title: "Policies",
    titleTemplate: "%s | ModernCre8ve",
    description: "ModernCre8ve store policies",
    jsonLd: [
      {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement,
      },
      {
        "@context": "https://schema.org",
        "@type": "WebPage",
        description: "ModernCre8ve store policies",
        name: "Policies",
        url,
      },
    ],
  };
}

export const seoPayload = {
  article,
  blog,
  collection,
  home,
  listCollections,
  page,
  policies,
  policy,
  product,
  root,
};

/**
 * Strip trailing brand-name suffix from Shopify SEO titles to avoid
 * duplication when the titleTemplate already appends "| ModernCre8ve".
 * Handles variations like "| Moderncre8ve", "- ModernCre8ve",
 * "from Moderncre8ve", "by moderncre8ve".
 */
function stripBrandSuffix(title: string | undefined | null): string {
  if (!title) {
    return "";
  }
  const cleaned = title
    // 1. Strip trailing brand after a separator: "… | Moderncre8ve"
    .replace(/\s*[|\-–—]\s*modern\s*cre8ve\s*$/i, "")
    // 2. Strip trailing "from/by Moderncre8ve"
    .replace(/\s+(?:from|by)\s+modern\s*cre8ve\s*$/i, "")
    // 3. Strip mid-string brand between separators:
    //    "… | MODERNCRE8VE | …" or "… | MODERNCRE8VE: …"
    .replace(
      /\s*[|\-–—]\s*modern\s*cre8ve\s*[:||\-–—]\s*/i,
      " | ",
    )
    // 4. Strip leading brand with separator: "MODERNCRE8VE: …" or "MODERNCRE8VE | …"
    .replace(/^modern\s*cre8ve\s*[:||\-–—]\s*/i, "")
    .trim();
  // If after stripping the entire title is just the brand name, discard it
  // so the fallback (e.g. collection.title) is used instead.
  if (/^modern\s*cre8ve$/i.test(cleaned)) {
    return "";
  }
  return cleaned;
}

/**
 * Truncate a string to a given length, adding an ellipsis if it was truncated
 * @param str - The string to truncate
 * @param num - The maximum length of the string
 * @returns The truncated string
 * @example
 * ```js
 * truncate('Hello world', 5) // 'Hello...'
 * ```
 */
function truncate(str: string, num = 155): string {
  if (typeof str !== "string") {
    return "";
  }
  if (str.length <= num) {
    return str;
  }
  return `${str.slice(0, num - 3)}...`;
}

