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
- [ ] Apply brand color palette to Weaverse theme settings

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
