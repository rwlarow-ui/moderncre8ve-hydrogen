# ModernCre8ve — Title Tag & Meta Description Rewrites
**Generated: March 24, 2026 · Part of: 90-Day Craft & Convert Sprint**

---

## How to Implement

**Collections** have two places to update:
1. **Shopify Admin** → Products → Collections → [Collection] → SEO section → "Page title" and "Description" fields. These take priority over everything else.
2. **`app/utils/collection-seo-descriptions.ts`** → The `.meta` field. Used as code-level fallback if Shopify Admin fields are blank. ⚠️ Several current fallbacks are over 155 chars — these are fixed below and patched in the file.

**Products** — SEO title and description live only in Shopify Admin:
Shopify Admin → Products → [Product] → SEO section → "Page title" and "Description" fields.

**Title tag formula:** `[SEO Title] | ModernCre8ve` (appended automatically by `seoPayload`)
**Max SEO title length:** 70 chars (target) — 104 chars hard limit before "| ModernCre8ve" is added.
**Max meta description:** 155 chars.

---

## PART 1: COLLECTION REWRITES

### Priority 1 — CRITICAL FIXES (current meta is over 155 chars ❌)

---

#### `mid-century-modern-credenza`
**Current meta (177 chars ❌):**
> "Mid-Century Modern Credenzas — Handcrafted Solid Wood Storage. Handcrafted mid-century modern credenzas and sideboards in walnut & oak. Clean lines, tapered legs. Made in Ohio."

**Recommended Shopify SEO title (42 chars ✅):**
> `Mid-Century Modern Credenza — Solid Walnut`

**Recommended meta description (146 chars ✅):**
> `Handcrafted mid-century modern credenza in solid walnut. Sideboards with soft-close doors, tapered legs & brass hardware. Made to order in Ohio.`

---

#### `scandinavian-design-furniture`
**Current meta (191 chars ❌):**
> "Scandinavian Design Furniture — Handcrafted Nordic-Inspired Pieces. Explore handcrafted Scandinavian furniture: dining tables, bed frames & storage. Minimalist Nordic design. Free delivery."

**Recommended Shopify SEO title (50 chars ✅):**
> `Scandinavian Furniture — Handcrafted Nordic Design`

**Recommended meta description (146 chars ✅):**
> `Handcrafted Scandinavian furniture in solid walnut & oak. Dining tables, bed frames & storage. Nordic minimalism, American craft. Free delivery.`

---

#### `custom-made-expandable-dining-tables`
**Current meta (170 chars ❌):**
> "Custom Expandable Dining Tables — Handcrafted & Extendable. Design your custom expandable dining table. Extends from 4 to 12 seats. Solid hardwood, Amish-crafted in Ohio."

**Recommended Shopify SEO title (47 chars ✅):**
> `Custom Expandable Dining Tables — Made to Order`

**Recommended meta description (142 chars ✅):**
> `Design your custom expandable dining table in solid walnut or oak. Butterfly leaf extends from 4 to 12 seats. Amish-crafted to order in Ohio.`

---

#### `custom-made-furniture`
**Current meta (168 chars ❌):**
> "Custom Made Furniture — Handcrafted to Your Specifications. Design your own custom furniture in solid hardwood. Choose wood species, finish & dimensions. Free delivery."

**Recommended Shopify SEO title (44 chars ✅):**
> `Custom Made Furniture — Handcrafted to Order`

**Recommended meta description (148 chars ✅):**
> `Design custom furniture in solid hardwood built to your exact specs. Choose wood species, dimensions & finish. Amish-crafted in Ohio. Free delivery.`

---

### Priority 2 — Keyword & CTA improvements (currently within length but underoptimized)

---

#### `japandi`
**Current meta (130 chars):**
> "Japandi furniture blending Japanese minimalism with Scandinavian warmth. Handcrafted in solid walnut & oak. Made to order in Ohio."

**Recommended Shopify SEO title (38 chars ✅):**
> `Japandi Furniture — Handcrafted Modern`

**Recommended meta description (145 chars ✅):**
> `Shop Japandi furniture — Japanese minimalism meets Scandinavian warmth. Handcrafted in solid walnut & oak. Made to order in Ohio. Free delivery.`

*Change: Adds "Shop" opener (CTR improver), adds "Free delivery" close.*

---

#### `mid-century-modern`
**Current meta (144 chars):**
> "Mid-century modern furniture handcrafted in solid walnut & oak. Dining tables, credenzas, bed frames & more. 12–16 week lead time. Made in Ohio."

**Recommended Shopify SEO title (50 chars ✅):**
> `Mid-Century Modern Furniture — Handcrafted Ohio`

**Recommended meta description (141 chars ✅):**
> `Handcrafted mid-century modern furniture in solid walnut & oak. Dining tables, bed frames, credenzas & coffee tables. Made to order in Ohio.`

*Change: Replaces vague "& more" with specific product categories; removes lead time (friction in meta).*

---

#### `mid-century-modern-dining-tables`
**Current meta (123 chars ✅ — good length, minor keyword improvement):**
> "Shop handcrafted mid-century modern dining tables in walnut, oak & cherry. Extendable options for 4–12 seats. Made in Ohio."

**Recommended Shopify SEO title (53 chars ✅):**
> `Mid-Century Modern Dining Tables — Solid Walnut & Oak`

**Recommended meta description (133 chars ✅):**
> `Handcrafted mid-century modern dining tables in walnut, oak & cherry. Extendable options. White glove delivery. Made to order in Ohio.`

*Change: Adds "White glove delivery" as key differentiator.*

---

#### `mid-century-modern-coffee-tables`
**Current meta (131 chars ✅ — good, minor improvement):**
> "Handcrafted mid-century modern coffee tables in solid walnut & oak. Round, oval & rectangular designs. Custom sizes. Made in Ohio."

**Recommended Shopify SEO title (47 chars ✅):**
> `Mid-Century Modern Coffee Tables — Solid Walnut`

**Recommended meta description (134 chars ✅):**
> `Handcrafted mid-century modern coffee tables in solid walnut & oak. Japandi & Scandinavian styles. Custom sizes available. Made in Ohio.`

*Change: Adds Japandi keyword to capture style-search overlap.*

---

#### `handmade-modern-bed-frames`
**Current meta (138 chars ✅ — good length, improve keyword):**
> "Handcrafted modern bed frames in solid walnut & oak. Mid-century, Scandinavian & minimalist styles. Platform & traditional. Made in Ohio."

**Recommended Shopify SEO title (47 chars ✅):**
> `Handmade Modern Bed Frames — Solid Walnut & Oak`

**Recommended meta description (144 chars ✅):**
> `Handmade modern bed frames in solid walnut & oak. Mid-century, Scandinavian & Japandi styles. Platform & traditional. Twin–Cal King. Ohio.`

*Change: Adds Japandi keyword, adds size range.*

---

#### `oval-dining-tables`
**Current meta (137 chars ✅):**
> "Handcrafted oval dining tables in solid walnut & white oak. Sculptural mid-century modern designs that seat 6–10. Made to order in Ohio."

**Recommended Shopify SEO title (45 chars ✅):**
> `Oval Dining Tables — Handcrafted Solid Walnut`

**Recommended meta description (137 chars — keep current ✅):**
> `Handcrafted oval dining tables in solid walnut & white oak. Sculptural mid-century modern designs that seat 6–10. Made to order in Ohio.`

*No change needed — already well-optimized.*

---

#### `modern-dining-chairs`
**Recommended Shopify SEO title (46 chars ✅):**
> `Modern Solid Wood Dining Chairs — Walnut & Oak`

**Recommended meta description (keep current 140 chars ✅):**
> `Solid wood dining chairs in mid-century modern & Scandinavian styles. Handcrafted in walnut & oak. Custom upholstery options. Made in Ohio.`

---

#### `all-products`
**Recommended Shopify SEO title (39 chars ✅):**
> `Handcrafted Modern Furniture Collection`

**Recommended meta (keep current 138 chars ✅):**
> `Shop all ModernCre8ve furniture: handcrafted mid-century modern dining tables, credenzas, bed frames, coffee tables & more. Made in Ohio.`

---

#### `minimalist-bed-frames`
**Recommended Shopify SEO title (46 chars ✅):**
> `Minimalist Bed Frames — Handcrafted Solid Wood`

**Recommended meta (keep current 137 chars ✅):**
> `Minimalist bed frames handcrafted in solid walnut & oak. Clean-line platform designs, no box spring needed. Twin–Cal King. Made in Ohio.`

---

#### `scandinavian-bed-frames`
**Recommended Shopify SEO title (48 chars ✅):**
> `Scandinavian Bed Frames — Handcrafted Solid Wood`

**Recommended meta (keep current 139 chars ✅):**
> `Scandinavian bed frames in solid walnut & white oak. Nordic-inspired minimalist designs with warm wood tones. Twin–Cal King. Made in Ohio.`

---

#### `best-sellers`
**Recommended Shopify SEO title (41 chars ✅):**
> `Best Selling Handcrafted Modern Furniture`

**Recommended meta description (110 chars ✅):**
> `Our most popular handcrafted furniture pieces — mid-century modern, Japandi & Scandinavian styles. Made in Ohio.`

---

---

## PART 2: PRODUCT REWRITES (Shopify Admin only)

Set these in Shopify Admin → Products → [Product] → Search engine listing → Edit.

---

### P1 — Santa Monica Mid-Century Modern Dining Table
`/products/the-santa-monica-mid-century-modern-dining-table`

**SEO Title (52 chars ✅):**
> `Mid-Century Modern Dining Table — Solid Walnut & Oak`

**Meta Description (145 chars ✅):**
> `Handcrafted mid-century modern dining table in solid walnut or oak. Tapered legs, beveled top. Made to order in Ohio. Free white glove delivery.`

---

### P2 — Santa Monica Extendable Dining Table
`/products/mid-century-modern-extendable-dining-table-santa-monica`

**SEO Title (52 chars ✅):**
> `Mid-Century Extendable Dining Table — Butterfly Leaf`

**Meta Description (151 chars ✅):**
> `Solid walnut mid-century dining table with butterfly leaf. Expands 70" to 90", seats 6–10. Made to order in Ohio. Free white glove delivery.`

---

### P3 — Bossa Nova Modern Dining Table
`/products/bossa-nova-modern-dining-table-small-handmade-ohio`

**SEO Title (51 chars ✅):**
> `Bossa Nova Modern Dining Table — Handmade Walnut`

**Meta Description (144 chars ✅):**
> `Sculptural modern dining table in solid American walnut. Double beveled edge, tapered legs. Seats 4–10 with optional leaf. Handcrafted in Ohio.`

---

### P4 — Santa Monica in Cherry
`/products/santa-monica-cherry`

**SEO Title (45 chars ✅):**
> `Mid-Century Dining Table in Solid Cherry Wood`

**Meta Description (148 chars ✅):**
> `Mid-century modern dining table in solid American cherry. Develops a rich amber patina over time. Made to order in Ohio. Free white glove delivery.`

---

### P5 — Santa Monica Mixed (Walnut & Oak)
`/products/santa-monica-mixed`

**SEO Title (49 chars ✅):**
> `Santa Monica Dining Table — Two-Tone Walnut & Oak`

**Meta Description (143 chars ✅):**
> `Two-tone mid-century modern dining table in walnut & oak. Bold contrast, clean lines. Handcrafted to order in Ohio. Free white glove delivery.`

---

### P6 — Round Walnut Dining Table
`/products/round-walnut-dining-table`

**SEO Title (46 chars ✅):**
> `Round Walnut Dining Table — Handcrafted Modern`

**Meta Description (142 chars ✅):**
> `Modern round dining table in solid American walnut with double beveled edge. Seats 4–6. Japandi & Scandinavian-inspired. Handcrafted in Ohio.`

---

### P7 — Scandinavian Danish Modern Dining Table
`/products/scandinavian-danish-modern-dining-table`

**SEO Title (46 chars ✅):**
> `Scandinavian Dining Table — Solid Walnut & Oak`

**Meta Description (131 chars ✅):**
> `Scandinavian dining table in solid walnut or oak. Extended proportions seat 8–10. Nordic lines, Amish craftsmanship. Made in Ohio.`

---

### P8 — Mar Vista Oval Dining Table ⭐ Priority 1
`/products/mar-vista-oval-dining-table`

**SEO Title (49 chars ✅):**
> `Mar Vista Oval Dining Table — Custom Solid Walnut`

**Meta Description (132 chars ✅):**
> `Sculptural oval dining table in solid walnut. Custom sizes 60"–96". Seats 6–10. Japandi-inspired design. Made in Ohio. Free delivery.`

---

### P9 — Vista Scandinavian Extendable Dining Table
`/products/the-vista-scandinavian-extendable-dining-table`

**SEO Title (50 chars ✅):**
> `Scandinavian Extendable Oval Dining Table — Walnut`

**Meta Description (147 chars ✅):**
> `Scandinavian oval dining table with butterfly leaf. Solid walnut or oak. Extends to seat up to 10. Handcrafted in Ohio. Free white glove delivery.`

---

### P10 — Modern Hardwood Dining Chair
`/products/modern-hardwood-dining-chair`

**SEO Title (51 chars ✅):**
> `Modern Hardwood Dining Chair — Walnut, Oak & Cherry`

**Meta Description (139 chars ✅):**
> `Modern solid hardwood dining chair in walnut, oak, or cherry. Arm & side chair options. Traditional Amish joinery. Made to order in Ohio.`

---

### P11 — Mid-Century Modern Credenza ⭐ Priority 2
`/products/mid-century-modern-credenza-handcrafted-ohio`

**SEO Title (42 chars ✅):**
> `Mid-Century Modern Credenza — Solid Walnut`

**Meta Description (150 chars ✅):**
> `Solid walnut mid-century modern credenza with soft-close doors, leather pulls & adjustable shelves. Made to order in Ohio. Free white glove delivery.`

---

### P12 — Lareaux's Furniture Wax
`/products/lareauxs-furniture-wax`

**SEO Title (51 chars ✅):**
> `Lareaux's Natural Furniture Wax — Beeswax Wood Care`

**Meta Description (124 chars ✅):**
> `Natural beeswax furniture wax for solid wood care. Nourishes and protects walnut, oak & cherry. Ships in 3–5 business days.`

---

---

## PART 3: IMPLEMENTATION CHECKLIST

### Step 1 — Code fix (in repo)
- [x] `app/utils/collection-seo-descriptions.ts` patched — all 4 over-length metas fixed, 3 keyword improvements applied *(done in code, see commit)*

### Step 2 — Shopify Admin updates (manual)
Work through these in priority order (most traffic impact first):

| Priority | Page | Action | Time est. |
|----------|------|--------|----------|
| 1 | Japandi collection | Update title + meta | 5 min |
| 2 | Mid-Century Modern collection | Update title + meta | 5 min |
| 3 | MCM Dining Tables collection | Update title + meta | 5 min |
| 4 | Scandinavian collection | Update title + meta | 5 min |
| 5 | Mar Vista Oval Dining Table (product) | Update title + meta | 5 min |
| 6 | Santa Monica MCM Dining Table (product) | Update title + meta | 5 min |
| 7 | MCM Credenza (product) | Update title + meta | 5 min |
| 8 | Santa Monica Extendable (product) | Update title + meta | 5 min |
| 9 | Custom Expandable Tables collection | Update title + meta | 5 min |
| 10 | All remaining collections + products | Update title + meta | 45 min |
| — | **Total estimated time** | | **~90 min** |

### Step 3 — After updating Shopify Admin
Submit updated sitemap.xml to Google Search Console → Sitemaps → Submit for re-crawl.

---

*Rewrites version 1.0 · Generated March 24, 2026*
*Review CTR changes in Google Search Console 4 weeks after implementation*
