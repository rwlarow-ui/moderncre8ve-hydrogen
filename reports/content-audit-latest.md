# Content Audit

Generated: 2026-11-22T13:11:00.242Z

## Summary

- Audited URLs: 92
- Flagged live URLs: 9
- Source-only findings: 6
- Severity counts: critical 0, high 2, medium 11, low 3

## Highest Priority Live Findings

- [high] page https://moderncre8ve.com/pages/legal -> demo_or_placeholder_copy
  Evidence: Visible marker hits: \bcopy of\b | Main text sample: The policies that cover your visit and your order Legal & Policies Every ModernCre8ve piece is handcrafted to order, so we want the terms behind your purchase to be as clear as the craftsmanship. Each policy below opens... | Storefront page "Legal" exists with body length 0.
  Source: Mapped page definition: app/page-builder/pages/legal; published page route
  Fix: Replace demo or placeholder copy with production content and remove any temporary merchandising language from the published page.
- [high] page https://moderncre8ve.com/pages/my-personal-data -> empty_or_thin_live_content
  Evidence: Rendered <main> text length: 142 | Section markers: 3 | Image count inside <main>: 0 | Page body is unusually thin for a CMS page. | Storefront page "My Personal Data" exists with body length 233. | Admin page "My Personal Data" last updated 2023-07-06T14:12:22Z with body length 233.
  Source: No mapped local fallback JSON; published page route
  Fix: Populate the page definition so the route renders meaningful body content server-side.
- [medium] product https://moderncre8ve.com/products/copy-of-santa-monica-bench-modern-walnut-bench -> suspicious_handle_or_slug
  Evidence: Handle `copy-of-santa-monica-bench-modern-walnut-bench` still contains a copy-of prefix. | Storefront product "The Santa Monica Bench - Modern Walnut Bench" exists with description length 1794.
  Source: Published product route
  Fix: Confirm the published handle is intentional. If not, create a clean canonical handle and redirect the old URL.
- [low] page https://moderncre8ve.com/pages/trade-1 -> suspicious_handle_or_slug
  Evidence: Handle `trade-1` looks like a duplicate page slug. | Storefront page "TRADE" exists with body length 0.
  Source: Mapped page definition: app/page-builder/pages/trade; published page route
  Fix: Confirm the published handle is intentional. If not, create a clean canonical handle and redirect the old URL.

## Source Risks

- [medium] https://moderncre8ve.com/pages/cleveland-workshop-showroom -> no_repo_fallback
  Evidence: Page handle `cleveland-workshop-showroom` is present in the live sitemap but not mapped in app/page-builder/pages/index.ts. | Storefront page "Visit Our Cleveland Workshop & Showroom" exists with body length 2761.
  Fix: Either add a page definition for this handle or confirm the default page template is intended.
- [medium] https://moderncre8ve.com/pages/custom-kitchen-cabinets-cleveland -> no_repo_fallback
  Evidence: Page handle `custom-kitchen-cabinets-cleveland` is present in the live sitemap but not mapped in app/page-builder/pages/index.ts. | Storefront page "Cleveland Custom Cabinets | Tailored to Your Style and Space" exists with body length 865.
  Fix: Either add a page definition for this handle or confirm the default page template is intended.
- [medium] https://moderncre8ve.com/pages/my-personal-data -> no_repo_fallback
  Evidence: Page handle `my-personal-data` is present in the live sitemap but not mapped in app/page-builder/pages/index.ts. | Storefront page "My Personal Data" exists with body length 233.
  Fix: Either add a page definition for this handle or confirm the default page template is intended.
- [medium] https://moderncre8ve.com/pages/privacy-policy -> no_repo_fallback
  Evidence: Page handle `privacy-policy` is present in the live sitemap but not mapped in app/page-builder/pages/index.ts. | Storefront page "Privacy Policy" exists with body length 60295.
  Fix: Either add a page definition for this handle or confirm the default page template is intended.
- [medium] https://moderncre8ve.com/pages/request-personal-data -> no_repo_fallback
  Evidence: Page handle `request-personal-data` is present in the live sitemap but not mapped in app/page-builder/pages/index.ts. | Storefront page "Request Personal Data" exists with body length 931.
  Fix: Either add a page definition for this handle or confirm the default page template is intended.
- [medium] https://moderncre8ve.com/pages/terms-of-service -> no_repo_fallback
  Evidence: Page handle `terms-of-service` is present in the live sitemap but not mapped in app/page-builder/pages/index.ts. | Storefront page "Terms of Service" exists with body length 22044.
  Fix: Either add a page definition for this handle or confirm the default page template is intended.
- [medium] app/page-builder/pages/homepage.ts -> page_definition_empty_fields
  Evidence: app/page-builder/pages/homepage.ts contains 1 empty string field(s). | Empty field: product
  Fix: Fill or remove empty content fields so mapped pages do not render blank components.
- [medium] app/page-builder/pages/press.ts -> page_definition_empty_fields
  Evidence: app/page-builder/pages/press.ts contains 9 empty string field(s). | Empty field: content | Empty field: content | Empty field: content | Empty field: content | Empty field: content | Empty field: content | Empty field: content | Empty field: content | Empty field: content
  Fix: Fill or remove empty content fields so mapped pages do not render blank components.
- [medium] app/sections/image-with-text/image.tsx -> source_placeholder_image_fallback
  Evidence: app/sections/image-with-text/image.tsx:60 contains "IMAGES_PLACEHOLDERS.image".
  Fix: Require a real image for published sections or render nothing instead of a placeholder asset.
- [medium] app/sections/slideshow/slide.tsx -> source_placeholder_image_fallback
  Evidence: app/sections/slideshow/slide.tsx:466 contains "IMAGES_PLACEHOLDERS.banner_1".
  Fix: Guard published slideshow slides so missing images do not fall back to placeholder banners.
- [low] app/page-builder/pages/default-product.ts -> page_definition_demo_markers
  Evidence: app/page-builder/pages/default-product.ts contains marker hits: \bplaceholder\b.
  Fix: Confirm these marker strings are not production-facing copy, then remove or replace them if they are placeholders.
- [low] app/page-builder/pages/legal.ts -> page_definition_demo_markers
  Evidence: app/page-builder/pages/legal.ts contains marker hits: \bcopy of\b.
  Fix: Confirm these marker strings are not production-facing copy, then remove or replace them if they are placeholders.

## Flagged URL Inventory

- product https://moderncre8ve.com/products/copy-of-santa-monica-bench-modern-walnut-bench
  Findings: suspicious_handle_or_slug
- page https://moderncre8ve.com/pages/my-personal-data
  Findings: no_repo_fallback, empty_or_thin_live_content
- page https://moderncre8ve.com/pages/request-personal-data
  Findings: no_repo_fallback
- page https://moderncre8ve.com/pages/legal
  Findings: demo_or_placeholder_copy
- page https://moderncre8ve.com/pages/custom-kitchen-cabinets-cleveland
  Findings: no_repo_fallback
- page https://moderncre8ve.com/pages/terms-of-service
  Findings: no_repo_fallback
- page https://moderncre8ve.com/pages/privacy-policy
  Findings: no_repo_fallback
- page https://moderncre8ve.com/pages/trade-1
  Findings: suspicious_handle_or_slug
- page https://moderncre8ve.com/pages/cleveland-workshop-showroom
  Findings: no_repo_fallback

