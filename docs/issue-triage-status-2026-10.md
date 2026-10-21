# Issue triage status — October 2026

**Date:** 2026-10-21 · **Owner:** Rob LaRow
**Scope:** the nine open issues flagged in the 2026-10-19 task-list triage (#6, #7, #27, #29, #30, #32, #33, #34, #59), what was done about each, and what is still open on the repo.

## Summary

| | Count |
|---|---|
| Closed with a verified fix | 4 — #27, #29, #30, #33 (PR #97, follow-up PR #98) |
| Closed with evidence, no code change needed | 4 — #6, #32, #34, #59 |
| Still open from the nine | 1 — #7 (needs Shopify Admin data changes) |
| Follow-ups opened | 2 — #95 (typecheck in CI), seo-truth-layer#1 (Supabase Phase 2) |

The March UX-audit issues #17–#25 were closed on Oct 8 as **duplicates** of #26–#34, not as done. #26 and #28 were finished on Oct 18; the rest are covered below.

## What shipped (PR #97, merged 2026-10-20; PR #98 same day)

| Issue | Change | Where |
|---|---|---|
| #33 nav landmarks | One `Main navigation` landmark instead of one Radix `<nav aria-label="Main">` per mega-menu item plus `role="navigation"` on every dropdown. Footer and mobile menus labelled. | `app/components/layout/desktop-menu.tsx`, `footer.tsx`, `mobile-menu.tsx` |
| #27 accessible names | Social links ("ModernCre8ve on Instagram (opens in a new tab)"), blog share buttons, search / menu / cart / quick-shop buttons named; review stars get `role="img"`. | `scrolling-announcement.tsx`, `blog-post.tsx`, header components, `quick-shop.tsx`, `review-quotes/quote.tsx` |
| #29 alt text | `app/utils/static-image-alt.ts` describes every photo in `public/images/`; sections that take a plain path use it instead of "Placeholder" / "Hotspots image" / the file path. Collection, article, order and search images fall back to their titles. Decorative thumbnails and swatches get `alt=""`. | `app/utils/static-image-alt.ts` + 20 files |
| #30 performance | First-section / first-slide background image loads eagerly with `fetchpriority="high"` (new `ImagePriority` context). YouTube embed is click-to-play (saves ~1 MB of script). Hero JPEGs re-encoded 3.5 MB → 1.8 MB; logos 145 KB → 10 KB each. #98 keeps configured YouTube URLs (nocookie host, `start`, `list`) when the player loads. | `app/hooks/use-image-priority.tsx`, `background-image.tsx`, `slideshow/index.tsx`, `page-builder/renderer.tsx`, `video-embed/video.tsx`, `utils/csp.ts`, `public/` |

### Mobile PageSpeed Insights, homepage (Moto G Power, slow 4G)

| | 2026-10-20 before | 2026-10-21 after |
|---|---|---|
| Performance | 51 | **68** |
| Largest Contentful Paint | 8.8 s | **5.8 s** |
| First Contentful Paint | 4.7 s | 4.4 s |
| Total Blocking Time | 410 ms | **10 ms** |
| Speed Index | 5.9 s | 4.4 s |
| Long main-thread tasks | 12 | 1 |
| Transferred | 4.7 MB | 2.8 MB |
| Accessibility | 84 | **92** |
| Best Practices | 73 | **92** |
| SEO | 100 | 100 |

Remaining PSI findings: ~1 MB of image savings, almost all Shopify CDN product images requested at 1400 px for ~650 px slots (card `sizes` / srcset); two colour-contrast audits; Shopify's own third-party cookies.

## Closed with evidence, no code change

| Issue | Evidence | Caveat recorded on the issue |
|---|---|---|
| #59 typecheck | `tsc --noEmit` exits 0 on `main`; fixed in fa826f6 (PR #94). CLAUDE.md "known failing check" note removed in #97. | CI gate tracked as #95. |
| #6 SEO Truth Layer | Daily pipeline in `moderncre8ve-seo-truth-layer` succeeded every day Oct 14–19. | Supabase history/deltas split out to seo-truth-layer#1. |
| #32 products higher | Live homepage order: hero → highlights → **Best-sellers carousel** → reviews → collections → brand story → video. First card ~2.0 screens down on desktop, ~2.6 on mobile. Independent review of the evidence agreed. | Near the top, not above the fold on mobile; collapsing the highlights strip on mobile would be a separate change. |
| #34 card format | All seven live cards come from `product-card.tsx` and render image → vendor → title → price; no placeholder text or images; no mixed range/flat prices today. Independent review agreed. | The template still shows min–max when variants differ in price (by design). Remaining unevenness is product-title length in Shopify, not the template. |

## Still open

| Issue | Status | Next step |
|---|---|---|
| #7 collections & inventory scope | Blocked in March on a bad Admin token; the token works now. Not checked yet. | Read product counts for "Mid Century Modern Coffee Tables", "Custom Made Furniture", "Housewares"; add products with owner approval. Inventory scope stays off unless stock display is wanted. |
| #91 GA4 zero sessions since Oct 9 | **Not in the triage list but P0-shaped:** consent API fails to load on first page load, so Hydrogen holds back every GA4 event. Opened 2026-10-19. | Should be worked before any further SEO/analytics reporting is trusted. |
| #35 placeholder products / price strings | P0, untouched since Oct 8. | Audit active products in Admin; fix translation strings. |
| #36 Our Story page | P1, untouched since Sep 6. | Needs founder copy and workshop photos. |
| #8 inline TODOs, #4 Biome suggestions | Code quality, low priority. | Batch into a cleanup PR. |
| #95 typecheck in CI | Follow-up from #59. | Add a workflow under `.github/workflows/`. |

Also still to do from #29: product **media** alt text in Shopify Admin (the code side is done; the data side needs an audit and owner approval before writing).

## Links

- PR #97 — https://github.com/rwlarow-ui/moderncre8ve-hydrogen/pull/97
- PR #98 — https://github.com/rwlarow-ui/moderncre8ve-hydrogen/pull/98
- PageSpeed after — https://pagespeed.web.dev/analysis/https-moderncre8ve-com/vlys2ypje9?form_factor=mobile
- Task list: `TASKS.md` (untracked, in the owner's working copy)
