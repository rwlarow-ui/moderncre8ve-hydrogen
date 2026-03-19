# SEO Findings

## Overview

This storefront has a centralized SEO setup built around Hydrogen `SeoConfig` payloads and a shared meta enhancer. The implementation is generally solid, especially around structured data and canonical handling, but a few areas rely on hardcoded assumptions or thin fallbacks.

## Main SEO Entry Points

- [`app/utils/seo.server.ts`](/Users/dev/Desktop/my-hydrogen-storefront/app/utils/seo.server.ts)
  Central SEO payload builder for root, home, product, collection, collections index, page, article, blog, and policy routes.
- [`app/utils/enhanced-seo-meta.ts`](/Users/dev/Desktop/my-hydrogen-storefront/app/utils/enhanced-seo-meta.ts)
  Wraps Hydrogen's `getSeoMeta()` and adds fallback Open Graph, Twitter, and canonical tags.
- [`app/root.tsx`](/Users/dev/Desktop/my-hydrogen-storefront/app/root.tsx)
  Applies global canonical logic and renders `hreflang` alternate links for configured locales.

## Current Behavior

### Metadata

- Route loaders generate `seo` objects with `seoPayload.*(...)` in [`app/utils/seo.server.ts`](/Users/dev/Desktop/my-hydrogen-storefront/app/utils/seo.server.ts).
- Route `meta` functions pass those payloads through [`app/utils/enhanced-seo-meta.ts`](/Users/dev/Desktop/my-hydrogen-storefront/app/utils/enhanced-seo-meta.ts).
- Canonical URLs are normalized to `https://moderncre8ve.com` and strip trailing slashes.
- Query parameters are excluded from canonicals, which helps prevent faceted and variant URLs from becoming duplicate index targets.

### Social Tags

- Shared helper adds:
  - `og:type`
  - `og:site_name`
  - fallback `og:image`
  - `twitter:card`
  - `twitter:image`
  - `twitter:site`
  - `twitter:creator`
- If a route already provides media, Hydrogen handles the image tags and the enhancer fills the gaps.

### Structured Data

- Root emits `Organization` and `FurnitureStore` schema.
- Product pages emit `BreadcrumbList` and `Product` schema with variant-level offers.
- Collection pages emit `BreadcrumbList` and `CollectionPage` schema.
- Collection pages also add `FAQPage` schema when a matching FAQ entry exists in local data.
- Articles emit `Article` schema.
- Pages and blogs emit simpler `WebPage` or `Blog` schema.

### Indexation Controls

- [`app/routes/[robots.txt].tsx`](/Users/dev/Desktop/my-hydrogen-storefront/app/routes/[robots.txt].tsx) defines a custom `robots.txt`.
- It disallows:
  - cart, checkout, account, admin, order paths
  - sorted and filtered collection URLs
  - search result URLs with query params
  - preview and tracking-related URLs
  - `/policies/`
- [`app/routes/($locale).sitemap-html.tsx`](/Users/dev/Desktop/my-hydrogen-storefront/app/routes/($locale).sitemap-html.tsx) provides an indexable HTML sitemap for collections, products, pages, and articles.

## Strong Areas

- SEO logic is centralized rather than duplicated ad hoc across components.
- Canonical handling is consistent across the root and route-level meta exports.
- `hreflang` alternate links are emitted globally.
- Structured data coverage is strong for products and collections.
- Collection SEO content has a clear fallback chain in [`app/sections/collection-seo-block/index.tsx`](/Users/dev/Desktop/my-hydrogen-storefront/app/sections/collection-seo-block/index.tsx):
  - `custom.seo_rich_description` metafield
  - local description map
  - Shopify `descriptionHtml`

## Risks And Gaps

### Hardcoded Production Origin

- Canonicals and alternate links are hardcoded to `https://moderncre8ve.com` in [`app/root.tsx`](/Users/dev/Desktop/my-hydrogen-storefront/app/root.tsx) and multiple route files.
- This is appropriate for production SEO, but it means preview or alternate domains will still advertise the production canonical.

### Thin Fallback Descriptions In Some Content Types

- Some payloads rely heavily on Shopify SEO fields.
- Example: article metadata in [`app/utils/seo.server.ts`](/Users/dev/Desktop/my-hydrogen-storefront/app/utils/seo.server.ts) uses `article.seo.description` first and may not always fall back to richer content unless explicitly coded.
- If Shopify SEO fields are incomplete, meta descriptions may be weak or empty.

### Manual Canonical Repetition

- Canonical computation is repeated in several route files instead of being fully centralized.
- This increases the chance of drift if canonical rules ever need to change.

### Limited Automated SEO Verification

- Test coverage is light and does not appear to validate:
  - meta tags
  - canonical links
  - structured data
  - `hreflang` tags
  - `robots.txt` rules

## Important Files To Revisit

- [`app/utils/seo.server.ts`](/Users/dev/Desktop/my-hydrogen-storefront/app/utils/seo.server.ts)
- [`app/utils/enhanced-seo-meta.ts`](/Users/dev/Desktop/my-hydrogen-storefront/app/utils/enhanced-seo-meta.ts)
- [`app/root.tsx`](/Users/dev/Desktop/my-hydrogen-storefront/app/root.tsx)
- [`app/routes/($locale).products.$productHandle.tsx`](/Users/dev/Desktop/my-hydrogen-storefront/app/routes/($locale).products.$productHandle.tsx)
- [`app/routes/($locale).collections.$collectionHandle.tsx`](/Users/dev/Desktop/my-hydrogen-storefront/app/routes/($locale).collections.$collectionHandle.tsx)
- [`app/routes/($locale).pages.$pageHandle.tsx`](/Users/dev/Desktop/my-hydrogen-storefront/app/routes/($locale).pages.$pageHandle.tsx)
- [`app/routes/($locale).blogs.$blogHandle.$articleHandle.tsx`](/Users/dev/Desktop/my-hydrogen-storefront/app/routes/($locale).blogs.$blogHandle.$articleHandle.tsx)
- [`app/routes/[robots.txt].tsx`](/Users/dev/Desktop/my-hydrogen-storefront/app/routes/[robots.txt].tsx)
- [`app/routes/($locale).sitemap-html.tsx`](/Users/dev/Desktop/my-hydrogen-storefront/app/routes/($locale).sitemap-html.tsx)
- [`app/sections/collection-seo-block/index.tsx`](/Users/dev/Desktop/my-hydrogen-storefront/app/sections/collection-seo-block/index.tsx)

## Suggested Next Steps

- Centralize canonical generation in one helper to reduce repetition.
- Strengthen description fallbacks for articles, pages, and other CMS-driven content.
- Add a lightweight SEO regression check for canonicals, title tags, and JSON-LD on representative routes.
