# Dining-table collection snippet — November 12, 2026

Target: `/collections/mid-century-modern-dining-tables`. The supplied Nov 12 brief reports 2,823 impressions, average position 15.2 and 0.4% CTR. These motivate the rewrite; they are not a forecast. The vendored `seo-truth-layer/reports/weekly_brief.md` is an older snapshot with different figures.

## Rendering trace

1. `app/routes/($locale).collections.$collectionHandle.tsx` queries Shopify's collection `title`, `description` and `seo { title description }`, then passes the collection into `seoPayload.collection`.
2. Previously, `app/utils/seo.server.ts` selected Shopify's SEO title before the collection title. Its description selected `seo.description ?? collection.description ?? collectionSeoDescriptions[handle].meta`. Empty strings count as values under `??`, so even an empty Shopify description could prevent the code fallback from being used. Editing only that fallback would not reliably change the snippet.
3. A reviewed override in `app/utils/collection-seo-descriptions.ts` now precedes Shopify fields for this handle only, for both snippet metadata and CollectionPage JSON-LD. Other collections keep their existing precedence.
4. The route's `meta` export passes root and route SEO through `getEnhancedSeoMeta`, which calls Hydrogen's `getSeoMeta`. The collection's `%s | ModernCre8ve` template appends the brand once. The override supplies an unbranded base title. The existing title and description truncation leave the new copy intact.

Rendered title: **Mid-Century Modern Dining Tables | ModernCre8ve**

Meta description: **Shop solid wood mid-century modern dining tables, handcrafted to order in Ohio. Explore walnut, white oak and extendable designs. Custom sizes by quote.**

## Accuracy and scope

The current in-repo FAQ, collection FAQ and November dining-table article document solid hardwood, Ohio craftsmanship, walnut/white oak, extension options and custom dimensions by quote. `app/page-builder/pages/faq.ts` states a one-year furniture warranty, not a lifetime warranty. Delivery service has access exceptions; the collection's rich fallback no longer promises complimentary delivery, and its delivery FAQ now reflects the documented 95%+ in-home service coverage. The snippet makes no shipping-price or warranty claim.

No Shopify Admin records were changed. This code must be deployed before the storefront serves the revised metadata; search engines choose when to recrawl and may rewrite snippets.

Regression check: `node --test tests/collection-seo.test.mjs` exercises the real SEO payload and Hydrogen metadata renderer with populated, empty and absent Shopify SEO, plus an unrelated collection.
