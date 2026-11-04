# Postmortem: Placeholder customer names on product pages

**Date:** 2026-11-03 | **Exposure:** ~7 months (2026-03-19 → 2026-10-28) | **Severity:** SEV3
**Authors:** Rob LaRow, Claude | **Status:** Final draft (blameless)

## Summary

A product-page section meant to show customer photos ("In Your Home") went live with sample content: four invented names and cities, with captions but no photos, on every product page, including Lareaux's Furniture Wax. Beside it, a "What Our Customers Say" heading rendered with nothing under it because its reviews component was never registered. Nothing errored, so no check or alert caught it. The Oct 27 SEO audit found it, and [#132](https://github.com/rwlarow-ui/moderncre8ve-hydrogen/pull/132) fixed it on Oct 28.

## Impact

- **Who:** every visitor to any product page.
- **What they saw:** captions credited to customers who don't exist, e.g. "Sarah M., Chicago" under a "Mid-Century Walnut Credenza", and a "Scandinavian Bookshelf", which isn't a product.
- **Risk:** credibility and trust. Crediting invented people as customers can also create consumer-protection exposure.
- **Business impact:** none of this broke anything, and there's no way to quantify the effect on sales.

## Timeline (ET)

| Date | Event |
|---|---|
| 2026-03-19 | `c1b561f` adds the `customer-gallery` section, with four sample names in its presets, plus a reviews block to the product template. |
| 2026-09-15 | `c920015` moves the template from Weaverse into the repo. The gallery and reviews block are kept as-is, because the move preserved existing output on purpose. |
| 2026-10-21 | The fresh-pull memo flags the "Sarah M., Chicago" attributions as possible placeholders. |
| 2026-10-27 | The SEO audit confirms the names are hard-coded and the reviews heading is empty, and rates it Critical. |
| 2026-10-28 08:52 | Fix committed (`4d813eb`); PR #132 opened. |
| 2026-10-28 16:42 | #132 merged; production deploy succeeds. |
| 2026-11-03 | `main` confirmed fixed; postmortem written. |
| 2026-11-04 | Follow-up PR removes the remaining invented attribution defaults and adds `npm run check:trust` to CI. |

## Root cause

Sample content written to make a section look finished in the editor was used as real page content, with no real photos or customer data behind it. Separately, the reviews block referenced the type `judgeme-review-index`, but the registered component is `judgeme-review--index`, so the renderer silently drew nothing and only the heading showed.

## 5 Whys

1. **Why did invented names appear on every product?** The shared product template held four gallery items with names and captions but no images.
2. **Why did the template hold sample items?** They came from the section's editor presets and were never replaced with real customer content.
3. **Why wasn't that noticed?** On the page, sample text looks exactly like real content, and no check looks for it.
4. **Why did it survive the move into the repo?** The migration's goal was identical output, so placeholders were carried over as if they were authored content.
5. **Why does no check look for it?** The content checks covered broken pages and data, not claims about customers. **Root cause:** nothing required trust content (names, quotes, ratings, photos) to come from real data.

## What went well

- The audit found both problems and traced them to exact files.
- The fix was small and tested, and shipped the same day.

## What went poorly

- It was live for about seven months.
- The Oct 21 memo flagged it only as a possibility, and confirming it took another week.
- Nobody checked the live page after the deploy.

## Action items

| Action | Owner | Priority | Status |
|---|---|---|---|
| Check the wax and Santa Monica Ext pages on the live site | Rob | P0 | Open |
| Remove invented default quotes and authors from section schemas: testimonials ("Sarah M."), review-quotes, and videos ("Alexia Jacquot", the theme's demo author) | Claude | P2 | Done in the follow-up PR |
| Add `npm run check:trust` (`scripts/check-trust-content.mjs`), run in CI. It flags attribution defaults, known sample names, and composition items whose type isn't registered. | Claude | P2 | Done in the follow-up PR |
| Confirm the furniture trust claims ("Lifetime Structural Warranty", "30-Day Satisfaction Guarantee") match actual policy | Rob | P1 | Open |
| Decide whether to show real Judge.me reviews on product pages | Rob | P2 | Open |
| Bring the gallery back only with real customer photos, each with permission | Rob | P3 | Open |

## Lessons learned

Anything that speaks for a customer (a name, a quote, a rating, a photo) must come from real data. A section with no data behind it should not render at all, rather than fall back to sample content.
