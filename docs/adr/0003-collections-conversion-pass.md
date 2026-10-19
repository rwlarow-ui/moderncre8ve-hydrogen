# ADR-0003: Collections index — where merchandising decisions live

**Status:** Accepted — shipped (PR #65, merged 2026-10-09; live on moderncre8ve.com, release 1.5.0)
**Date:** 2026-10-08 · **Updated:** 2026-10-19
**Deciders:** Rob LaRow (owner/ops)
**Repo:** `rwlarow-ui/moderncre8ve-hydrogen` — numbered to follow ADR-0001 (production PO) and ADR-0002 (SEO truth layer).
**Code:** `app/utils/collection-list.ts`, `app/components/trust-strip.tsx`, `app/page-builder/pages/collection-list.ts`,
`app/routes/($locale).collections._index.tsx`

## Status at a glance (2026-10-19)

| Item | State | Evidence |
|---|---|---|
| H1 "Shop Furniture by Collection" + intro | ✅ Live | Live page; `pages/collection-list.ts` sets `as: "h1"` |
| Focus categories first, catch-alls last | ✅ Live | Live order starts Expandable Dining Tables → MCM Dining Tables → Bed Frames; ends New / Best Sellers / Featured / Custom / All |
| One page of 48, no "Load more" | ✅ Live, with guard | 48 per page; `NextLink` still renders if `hasNextPage`, so collection 49+ can't vanish |
| 4:3 cards, "Shop the collection" CTA | ✅ Live | Every card shows the CTA |
| Trust strip (makers · 12–16 weeks · white glove) | ✅ Live | Above the grid and under collection titles |
| Weaverse coupling (old D4/D5 risk) | ✅ Resolved | Weaverse runtime is gone; pages are versioned `PageDefinition`s in `app/page-builder/`. `showTrustStrip` is a repo flag, not a studio setting |
| Lead time has one source | ❌ Open | "12–16 weeks" is hard-coded in 20+ places (trust strip, FAQs, PDP, SEO, JSON-LD, ops hub) |
| Titles cleaned at source | ❌ Open | Shopify still has `BENCHES` and `Japandi Collection - Moderncre8ve`; the render-time helper hides it on this page only |
| Acronym-safe title helper | ⚠️ Latent | No allow-list; no all-caps acronym titles exist today, so nothing is broken yet |
| Duplicate collections | ◐ Partly | Second Piper + Fox removed (25 → 24); `piper-fox-co` unpublished. `all` ("All Products") and `all-products` ("All products: Scandinavian Modern Furniture Collection") both still live |
| Ordering editable without a deploy (Option B) | ❌ Not started | Still the handle list in code |
| GA4 tile-click (`select_promotion`) | ❌ Not started | No promotion events in `app/` — the change is still unmeasured |

## Context

`/collections` showed 13 cards behind "Load more", led with catch-alls ahead of the focus categories (extendable dining
tables, MCM dining tables, bed frames), had no H1, and gave no made-to-order trust signal before the product page.
The conversion pass fixed the UX. This ADR records **where each decision lives**, now that the store's pages are
defined in the repo rather than in the Weaverse studio.

## Decisions

| # | Decision | Lives in |
|---|---|---|
| D1 | Category order | Handle lists in `app/utils/collection-list.ts` (priority / unlisted / catch-all bands, stable sort) |
| D2 | One page of 48 | Route loader; pagination kept as a fallback |
| D3 | Title clean-up | Render-time `getCollectionDisplayTitle()` |
| D4 | Trust strip | `TrustStrip` component, toggled by `showTrustStrip` in the page definition |
| D5 | H1 + intro | `pages/collection-list.ts` |

## Options considered — D1 (ordering), the open decision

**A. Handle list in code (shipped).** Low complexity, reviewable in git, degrades safely (unknown handles land in the
middle band). Every merchandising change needs a deploy, and a renamed handle silently drops out of its band.

**B. Shopify navigation menu (`collections-index`) via `menu(handle:)`.** Editable by drag-and-drop in Shopify admin,
no deploy; fall back to Option A when the menu is missing. One extra query.

**C. `custom.sort_priority` collection metafield.** Order travels with the collection, but numbers are awkward to
manage across 24 collections.

## Trade-off analysis

- **D1:** A was the right first step. B is the right end state now that pages are code: content-like ordering
  shouldn't need a deploy (every push to `main` triggers an Oxygen deploy).
- **D2:** Sound. 24 collections against a cap of 48; the retained `NextLink` is the guard.
- **D3:** Still the weakest decision. Dirty titles reach the collection-page H1, `<title>`, breadcrumbs and Google
  Shopping. "Featured" sits on handle `modern-scandinavian-furniture`, so that URL ranks under a generic title.
  Fix the titles in admin; keep the helper as a fallback.
- **D4:** The coupling risk is gone. The remaining issue is that the lead time is copy duplicated across 20+ files,
  in two phrasings ("Midwest" in the strip, "Cleveland, Ohio" in the header). If lead times move to 14–18 weeks,
  one missed copy becomes an inaccurate promise. Export one constant (or a shop metafield) and reference it.
- **Not hidden after all:** `CollectionCard` returns `null` when the Storefront API returns no products. Housewares
  and Mid Century Modern Coffee Tables have products in admin but don't appear on the live page, most likely
  because those products aren't published to the Hydrogen channel. That's intentional for empty collections, but
  check those two.

## Consequences

- **Easier:** Focus categories lead; every published collection with products is visible; the trust signal now comes
  before the product page; page changes are reviewable diffs.
- **Harder:** Reordering or renaming collections still needs a code change plus a deploy.
- **Unmeasured:** No tile-click events and no recorded pre-launch baseline. Ten days of post-launch data exist now.
  Pull `/collections` → collection-page CTR and add-to-cart from collection pages for 10/09–10/19 against the 10 days before.

## Action items

1. [x] Ship the conversion pass (PR #65, 2026-10-09).
2. [x] Confirm the H1, grid and trust strip render in production (verified on the live page, 2026-10-19).
3. [x] Remove Weaverse runtime coupling (pages now in `app/page-builder/`).
4. [x] Keep a pagination fallback past 48.
5. [ ] One source for "12–16 weeks" (constant or shop metafield); align "Midwest" vs "Cleveland, Ohio".
6. [ ] Fix titles in Shopify admin: `BENCHES` → "Benches", drop "- Moderncre8ve" from Japandi, give
       `modern-scandinavian-furniture` a real title (keep "Featured" only as a card label if wanted).
7. [ ] Merge or redirect `all` vs `all-products`; delete or leave unpublished `piper-fox-co`.
8. [ ] Check why Housewares and MCM Coffee Tables don't render (publishing to the Hydrogen channel).
9. [ ] GA4 `view_promotion` / `select_promotion` on collection tiles; run the before/after comparison above.
10. [ ] Ordering via Shopify menu (Option B), with `collection-list.ts` as fallback.
11. [ ] Acronym allow-list in `getCollectionDisplayTitle()` (cheap insurance).
