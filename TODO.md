# ModernCre8ve Hydrogen — TODO

## Phase 5: Launch (Pending)

- [ ] Assign `moderncre8ve.com` domain in Shopify Admin
- [ ] Verify all pages, redirects, and SEO on production
- [ ] Remove password protection from old site
- [ ] DNS cutover

## Code Quality

- [ ] Review 20 Biome lint suggestions (see CHANGELOG.md v1.2.2)
  - 4x `noReactForwardRef` — migrate `forwardRef` to React 19 ref-as-prop pattern
  - 5x `useConsistentTypeDefinitions` — convert `type` to `interface`
  - 5x `useBlockStatements` — wrap inline `if` returns in block `{}`
  - 3x `noImplicitCoercions` — replace `!!val` with `Boolean(val)`
  - 5x `noMagicNumbers` — extract numeric literals to named constants
  - 1x `useExhaustiveDependencies` — fix missing `useEffect` dependency
  - 1x `noNoninteractiveElementInteractions` — add a11y role to click handler element

## Visual Polish

- [ ] Assign hero/slide background images from Shopify media library
- [ ] Apply brand color palette to theme settings

## SEO Health (from 2026-04-07 scan)

### Rechecked Against Production (2026-11-03)

- [x] Crawl all 87 current sitemap URLs: all return 200. The earlier July inventory has 27 URLs now returning 404 (25 products + two collections), all absent from today's sitemap. See `reports/seo-404-recheck-2026-11-03.md` and its URL CSV.
- [x] Repo fix: 301 `about-us-1` to `about-us` and `contact-and-inquiry` to `contact-us`; exclude both aliases and `wrong-turn` from XML/HTML sitemaps; noindex `wrong-turn`. Deployment pending.
- [ ] Import `reports/redirects-ready-2026-11-03.csv` in Shopify Admin; overwrite the existing malformed coffee-table redirect.
- [ ] Decide whether to restore the 19 draft products or retire them. Four Santa Monica redirects are prepared separately for confirmed retirement; do not republish products just to silence old alerts.
- [ ] After deployment and Admin changes, recheck affected URLs and validate the July 3 Search Console issues in both properties. The alert emails contain no URL examples, so the current crawl cannot identify Google's exact July 3 sample set.

### High-Impact CTR Fixes (rewrite title tags + meta descriptions)

- [ ] Product: Scandinavian Danish Modern Dining Table — 0% CTR at pos 10, 2,206 impressions
- [ ] Collection: Mid-Century Modern Dining Tables — 0.2% CTR at pos 19, 2,571 impressions
- [ ] Product: Mid-Century Modern Walnut Nightstand — 0% CTR at pos 25, 1,670 impressions
- [ ] Product: Santa Monica MCM Dining Table — 0% CTR at pos 18, 1,358 impressions
- [ ] Collection: Scandinavian Design Furniture — 0.1% CTR at pos 28, 854 impressions
- [ ] Product: Van Aiken Boho Bed Frame — 0% CTR at pos 10, 294 impressions

### Striking Distance Content (optimize + add internal links to push to page 1)

- [ ] Blog: "Best Scandinavian Furniture Online" — pos 15, 2,286 imp, query: "scandinavian furniture"
- [ ] Blog: "Scandi Modern Furniture Style Differences" — pos 11, 1,347 imp, query: "mid century modern vs scandinavian"
- [ ] Product: Scandinavian Danish Dining Table — pos 10, 2,206 imp, query: "aesthetic dining table"
- [ ] Collection: Japandi Scandi MCM Furniture — pos 10, 222 imp, query: "japandi mcm"

### Technical SEO Fixes

- [ ] Add Twitter card meta tags in `app/utils/seo.server.ts`
- [ ] If restoring Capri, rename `capri-modern-dining-table-set_` to `capri-modern-dining-table-set`, activate and publish to Hydrogen; replace the existing clean-handle redirect to `/`, then import the deferred cleanup CSV.
- [ ] If restoring Santa Monica Bench, rename `copy-of-santa-monica-bench-modern-walnut-bench` to `santa-monica-bench-modern-walnut-bench`, activate and publish to Hydrogen, then import the deferred cleanup CSV.
- [ ] Resolve Van Aiken: neither `van-aiken-boho-bed-fram` nor `van-aiken-boho-bed-frame` exists in the Admin handle lookup; the old variant ID also returns null. Restore the actual listing before adding a redirect, or leave the retired URL 404.
- [x] Consolidate duplicate pages in the app: `about-us-1` → `about-us` (deployment pending)
- [x] Consolidate contact pages in the app: `contact-and-inquiry` → `contact-us` (deployment pending)
- [ ] Expand homepage meta description from 126 to ~155 chars
- [ ] Audit all product images for missing alt text
- [ ] Re-run SEO truth layer pipeline (last report: 2026-03-11, nearly a month stale)

## SEO Truth Layer

Repo: [moderncre8ve-seo-truth-layer](https://github.com/rwlarow-ui/moderncre8ve-seo-truth-layer)

- [x] Create Google Cloud project (`mindful-quasar-486518-r9`) and enable Search Console + GA4 Data APIs
- [x] Create service account (`moderncre8ve-829`) and download JSON key
- [x] Grant service account access to Search Console (Full) and GA4 (Viewer)
- [x] Run pipeline locally — 5,551 GSC rows, 111 GA4 rows, 57 actions generated
- [ ] Add GitHub Secrets: `GOOGLE_SERVICE_ACCOUNT_JSON`, `GA4_PROPERTY_ID`, `SITE_URL`
- [ ] Run GitHub Actions workflow manually to verify
- [ ] Phase 2: Supabase integration for historical trendlines and delta reporting

## Shopify Admin (Optional)

- [ ] Add products to "Mid Century Modern Coffee Tables" collection
- [ ] Add products to "Custom Made Furniture" collection
- [ ] Add products to "Housewares" collection
- [ ] Enable `unauthenticated_read_product_inventory` scope if stock display is needed
