# SEO Health Check Actions — March 26, 2026

**Data period:** March 16–23, 2026
**Source:** SEO Truth Layer pipeline (GSC + GA4)
**Actions completed:** 10 priority items across 7 pages

---

## Code Changes (Ready to Deploy)

### Products — Title & Meta Rewrites (`scripts/seo-update.mjs`)

| # | Product | Before Title | After Title | Chars |
|---|---------|-------------|-------------|-------|
| 1 | `scandinavian-danish-modern-dining-table` | Scandinavian Dining Table — Solid Walnut & Oak | **Scandinavian Dining Table — Handcrafted Minimalist Design** | 57 |
| 2 | `the-santa-monica-mid-century-modern-dining-table` | Mid-Century Modern Dining Table — Solid Walnut & Oak | **Santa Monica Mid-Century Dining Table — Solid Walnut** | 51 |
| 3 | `mid-century-modern-walnut-nightstand` | *(no entry — NEW)* | **Solid Walnut Nightstand — Mid-Century Modern Design** | 52 |

| # | Product | Before Meta | After Meta | Chars |
|---|---------|------------|------------|-------|
| 1 | `scandinavian-danish-modern-dining-table` | Scandinavian dining table in solid walnut or oak. Extended proportions seat 8–10. Nordic lines, Amish craftsmanship. Made in Ohio. | **Handcrafted Scandinavian dining table in solid walnut or oak. Seats 8–10 with aesthetic Nordic lines. Made to order in Ohio. Free white glove delivery.** | 152 |
| 2 | `the-santa-monica-mid-century-modern-dining-table` | Handcrafted mid-century modern dining table in solid walnut or oak. Tapered legs, beveled top. Made to order in Ohio. Free white glove delivery. | **The Santa Monica dining table: tapered legs, beveled solid walnut top, seats 4–8. Handcrafted to order in Ohio. Free white glove delivery. Shop now.** | 150 |
| 3 | `mid-century-modern-walnut-nightstand` | *(none)* | **Handcrafted solid walnut nightstand with round modern design. Sold individually or as a pair. Made to order in Ohio. Free white glove delivery.** | 143 |

### Collections — Title & Meta Rewrites (`scripts/seo-update.mjs` + `collection-seo-descriptions.ts`)

| # | Collection | Before Title | After Title | Chars |
|---|-----------|-------------|-------------|-------|
| 4 | `mid-century-modern-dining-tables` | Mid-Century Modern Dining Tables — Solid Walnut & Oak | **Mid-Century Modern Dining Tables — Round, Oval & Extendable** | 60 |
| 5 | `custom-made-furniture` | Custom Made Furniture — Handcrafted to Order | **Custom Furniture — Solid Walnut & Oak, Made to Order** | 52 |

| # | Collection | Before Meta | After Meta | Chars |
|---|-----------|------------|------------|-------|
| 4 | `mid-century-modern-dining-tables` | Handcrafted mid-century modern dining tables in walnut, oak & cherry. Extendable options. White glove delivery. Made to order in Ohio. | **Handcrafted MCM dining tables in solid walnut & oak. Round, oval & extendable designs seating 4–12. Made to order in Ohio. Free white glove delivery.** | 151 |
| 5 | `custom-made-furniture` | Design custom furniture in solid hardwood built to your exact specs. Choose wood species, dimensions & finish. Amish-crafted in Ohio. Free delivery. | **Custom dining tables, credenzas & bed frames in solid walnut & oak. Choose dimensions, wood & finish. 12–16 week lead time. Handcrafted in Ohio.** | 144 |

---

## Blog Recommendations (Manual Action Required)

### Blog 1: "Best Scandinavian Furniture Online"
**File:** `seo-deliverables/agent-1-blog-scandinavian.md`

| Element | Recommendation | Chars |
|---------|---------------|-------|
| SEO Title | Affordable Scandinavian Furniture Brands — 2026 Buyer's Guide | 59 |
| Meta Description | Discover the best affordable Scandinavian furniture brands for 2026. Handcrafted dining tables, bed frames & more in solid wood. Shop Nordic design made in the USA. | 155 |

**Additional actions:**
- Add 5 internal links (Scandinavian collection, dining table, bed frames, extendable table, Japandi cross-link)
- Replace retailer-name H2s with keyword-rich headings
- Add `rel="nofollow"` to competitor outbound links

### Blog 2: "Solid Wood Furniture Care Guide"
**File:** `seo-deliverables/agent-4-blog-care-guide.md`

| Element | Recommendation | Chars |
|---------|---------------|-------|
| SEO Title | How to Care for Solid Wood Furniture — Expert Cleaning Guide | 60 |
| Meta Description | Learn how to clean and protect solid wood furniture. Expert walnut and oak care tips, best finishes for tables, and products to avoid. By ModernCre8ve. | 151 |
| URL Handle | Shorten to `solid-wood-furniture-care-guide` (redirect confirmed in `scripts/import-new-redirects.mjs`) | — |

**Additional actions:**
- Add 5 internal links (Lareaux's wax, mid-century collection, walnut nightstand, dining tables, credenza)
- Add new section: "Products to Avoid on Solid Wood Furniture" (targets "can i use clorox wipes on wood furniture")
- Add new section: "Best Finish for a Dining Table Top" (targets "best varnish for table top")
- Add FAQ schema with 4 Q&As for rich snippet eligibility

**Machine-readable recommendations:** `scripts/blog-seo-recommendations.json`

---

## Validation Results

| Check | Status |
|-------|--------|
| `node --check scripts/seo-update.mjs` | Pass |
| `scripts/blog-seo-recommendations.json` valid JSON | Pass |
| TypeScript typecheck | Pass |
| All titles ≤70 chars | Pass (max: 60) |
| All metas ≤155 chars | Pass (max: 152) |
| No duplicate titles | Pass |
| No keyword cannibalization | Pass — product titles name specific products, collection titles describe ranges |

---

## Execution Checklist

### Automated (code changes — deploy now)
- [ ] Run `node scripts/seo-update.mjs` to push product + collection SEO to Shopify Admin
- [ ] Deploy to Oxygen: `npx shopify hydrogen deploy --env production`

### Manual (blog changes — Shopify Admin)
- [ ] Update blog 1 SEO title + meta in Shopify Admin blog editor
- [ ] Update blog 2 SEO title + meta in Shopify Admin blog editor
- [ ] Verify blog 2 handle is `solid-wood-furniture-care-guide` (check redirect)
- [ ] Add internal links to both blog posts per deliverable recommendations
- [ ] Replace blog 1 H2 headings with keyword-rich versions
- [ ] Add `rel="nofollow"` to competitor links in blog 1
- [ ] Add "Products to Avoid" + "Best Finish" sections to blog 2
- [ ] Add FAQ schema to blog 2

### Follow-up (7 days)
- [ ] Re-run SEO health check on April 2, 2026
- [ ] Compare CTR and position changes for all 7 pages
- [ ] Expected: +0.5–1.0% CTR improvement on products/collections, blog pages may take 2–4 weeks to re-index

---

## Files Modified

| File | Changes |
|------|---------|
| `scripts/seo-update.mjs` | Updated 4 entries + added 1 new product entry |
| `app/utils/collection-seo-descriptions.ts` | Updated 2 collection entries (meta + rich for custom-made-furniture) |
| `seo-deliverables/agent-1-blog-scandinavian.md` | NEW — Blog 1 SEO recommendations |
| `seo-deliverables/agent-4-blog-care-guide.md` | NEW — Blog 2 SEO recommendations |
| `scripts/blog-seo-recommendations.json` | NEW — Machine-readable blog SEO data |

---

_Generated by 5-agent SEO sprint — ModernCre8ve SEO Truth Layer v1.0_
_Data sources: Google Search Console, Google Analytics 4_
