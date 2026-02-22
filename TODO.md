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

## Shopify Admin (Optional)

- [ ] Add products to "Mid Century Modern Coffee Tables" collection
- [ ] Add products to "Custom Made Furniture" collection
- [ ] Add products to "Housewares" collection
- [ ] Enable `unauthenticated_read_product_inventory` scope if stock display is needed
