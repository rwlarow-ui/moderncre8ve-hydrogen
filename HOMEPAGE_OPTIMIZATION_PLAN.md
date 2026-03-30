# Homepage UX + SEO Optimization Plan

**Date:** March 20, 2026
**Site:** moderncre8ve.com (Shopify Hydrogen / Oxygen)
**Baseline:** v1.4.2 deployed March 19, 2026

---

## Current State Summary

### What v1.4.2 Already Addressed
- ✅ Enforced single-H1 page structure site-wide
- ✅ Fixed homepage metadata (title tag)
- ✅ Rewrote priority collection meta descriptions
- ✅ Added smart product image alt text generation
- ✅ Corrected GA4 endpoint loading
- ✅ Added trust sections to product pages (Quality Guarantee, Craftsmanship Process, Customer Gallery)
- ✅ Improved collection card readability (dark overlays, white text)

### What Remains Open on the Homepage

| Issue | Source | Status |
|-------|--------|--------|
| H1 renders as `<h3>` in live DOM (Weaverse slideshow override) | Design critique + site audit | **Open — needs Studio verification** |
| Live Studio layout missing 4 curated sections (highlights, featured products, video, testimonials) | Design critique vs. fallback JSON comparison | **Open** |
| CTA buttons use transparent/ghost styling instead of brand accent color | Design critique DOM analysis | **Open** |
| FAQ accordion on homepage disrupts aspirational flow | Design critique | **Open** |
| Footer renders raw `<p>` HTML tags as visible text | Design critique DOM analysis | **Open** |
| Homepage CTR is 3.3% on 476 impressions (should be 5%+) | Weekly brief (March 11) | **Open** |
| No FAQ schema markup on homepage | Site audit + SEO findings | **Open** |
| No LocalBusiness schema on homepage | Migration audit + site audit | **Open** |
| Header height too compact at 49px for premium brand | Design critique | **Open** |
| Section heading casing inconsistent (mixed caps vs. all-caps) | Design critique | **Open** |
| Color tokens `--color-primary`, `--color-btn-primary-bg` resolve empty | Design critique DOM analysis | **Open** |

### Organic Performance Snapshot (March 1–8, 2026)

| Metric | Homepage | Sitewide |
|--------|----------|----------|
| Organic Clicks | 27 (35% of total) | 77 |
| Impressions | 476 | 20,268 |
| CTR | 3.3% | 0.4% |
| Avg Position | 24.0 | 24.3 |
| Purchase Revenue | $0 | $0 |

The homepage is the #1 organic page by clicks, generating more traffic than any single collection or product page. Optimizing it has outsized impact.

### Post-Migration Context

The March 12 post-deployment analysis rated overall SEO health at **C-**. Median keyword position dropped from #10 to #20. Top-10 keywords fell from 72 to 28. Estimated organic traffic collapsed ~79% (1,885 → 399). Non-branded keywords account for essentially all losses. Recovery is the primary strategic imperative.

---

## Phase 1: Structural Fixes (Week 1)

*Estimated effort: 4–6 hours total. All high-impact, low-effort changes.*

### 1.1 Verify and Fix the Homepage H1

**Problem:** v1.4.2 enforced single-H1 page structure in code, but the live DOM shows the hero headline rendering as an `<h3>` tag. The Weaverse slideshow component's `headingTag` setting in Studio may be overriding the code-level enforcement.

**Action:**
- Open Weaverse Studio → Homepage → Slideshow section → Slide 1
- Set the heading tag to `h1`
- Set slides 2 and 3 heading tags to `h2`
- Verify the H1 text reads: "Handcrafted Mid-Century Modern & Scandinavian Furniture" (or similar keyword-rich text)
- Keep "Furniture for Furniture Fanatics" as a styled subheading or paragraph

**SEO Impact:** The homepage currently has no `<h1>` in the rendered DOM. This is flagged as **Critical** in the March 19 site audit. Google uses the H1 as a primary topical signal for page content.

**UX Impact:** No visible change to users — this is purely structural.

**Status check:** After saving in Studio, inspect the live page's DOM to confirm exactly one `<h1>` exists.

---

### 1.2 Restore the Full Homepage Section Sequence in Weaverse Studio

**Problem:** The curated local fallback JSON (`weaverse-pages/homepage.json`) includes 8 sections in a deliberate conversion flow. The live Weaverse Studio layout has drifted and is missing several key sections:

| Section | In Fallback | On Live Site | Action |
|---------|-------------|-------------|--------|
| Slideshow (3 slides) | ✅ | ✅ (different copy) | Update copy per 1.4 below |
| Highlights badges | ✅ | ❌ Missing | **Restore** |
| Featured Products carousel | ✅ | ❌ Missing | **Restore** |
| Featured Collections grid | ✅ | ✅ ("SHOP THE LOOK") | Keep |
| Image-with-Text (About) | ✅ | ✅ ("MAKE YOURSELF AT HOME") | Keep |
| Video embed | ✅ | ❌ Missing | **Restore** (when video ready) |
| Testimonials | ✅ | ❌ Missing | **Restore** |
| Newsletter | ✅ | ✅ (in footer) | Keep |
| FAQ accordion | ❌ Not in fallback | ✅ On live site | **Remove from homepage** |

**Action:**
- In Weaverse Studio, add the missing sections: Highlights, Featured Products, Testimonials
- Remove the FAQ accordion from the homepage layout
- Link the FAQ text to `/pages/faq` from the footer instead
- Video can be added later when workshop footage is ready

**SEO Impact:** More indexable content on the homepage. The highlights badges introduce semantically rich phrases ("American hardwood," "custom furniture," "Built to Your Specs"). Testimonials add E-E-A-T signals that Google values for YMYL-adjacent purchase decisions. Featured products create internal links to high-priority product pages. The current live homepage is light on body text, limiting long-tail ranking potential.

**UX Impact:** Restores social proof (testimonials), product discovery (featured products), and trust signals (highlights). The FAQ on the homepage creates a jarring tonal shift from aspirational to transactional and signals anxiety rather than confidence — removing it improves flow.

---

### 1.3 Wire CTA Buttons to Brand Accent Color

**Problem:** The brand palette includes Emerald Green (`#2CBF96`) as the accent/CTA color, but no CTA button on the homepage uses it. Hero CTAs render as transparent/ghost buttons (invisible text on some slide backgrounds). CSS custom properties `--color-btn-primary-bg` and `--color-btn-primary-text` resolve to empty strings.

**Action:**
- In `app/weaverse/schema.server.ts`, set the `defaultValue` for button color tokens:
  - `--color-btn-primary-bg`: `#2CBF96`
  - `--color-btn-primary-text`: `#FFFFFF`
- Alternatively, update these values in Weaverse Studio → Theme Settings → Colors
- Verify hero slide CTAs render with the emerald green fill

**SEO Impact:** Indirect — higher click-through on CTAs leads to better engagement signals. Ghost buttons on photography fail WCAG AA contrast requirements, which Google factors into page experience.

**UX Impact:** Consistent, high-contrast CTAs visible across all slides. Eliminates the legibility risk of white text on light photography backgrounds.

---

### 1.4 Differentiate Slide CTAs and Copy

**Problem:** All three hero slides say "Shop Collections" and link generically. The curated fallback had differentiated labels and destinations:

| Slide | Live CTA | Recommended CTA | Destination |
|-------|----------|----------------|-------------|
| 1 | "Shop Collections" → /collections | "Explore the Collection" → /collections | Keep generic |
| 2 | "Shop Collections" → /collections | "Shop Dining" → /collections/mid-century-modern-dining-tables | Target top collection |
| 3 | "Shop Collections" → /collections | "View Scandinavian" → /collections/scandinavian-design-furniture | Target striking distance |

**Action:** Update slide CTAs in Weaverse Studio with unique text and destination URLs.

**SEO Impact:** Creates 3 distinct internal links from the homepage to high-priority collection pages, each with unique anchor text. Internal link equity distribution is a ranking signal. The mid-century dining tables collection and Scandinavian design collection both appear in the weekly brief's action items for striking distance optimization.

**UX Impact:** Each slide feels purposeful. A user landing on slide 2 sees a clear path to dining furniture rather than a generic prompt.

---

### 1.5 Fix Footer HTML Rendering Bug

**Problem:** The footer copyright line renders as `<p>© 2026 Moderncre8ve. All rights reserved.</p>` — raw HTML tags visible as text.

**Action:** In the footer component or Weaverse Studio theme settings, check whether the copyright field contains HTML that's being escaped. Replace with plain text: `© 2026 Moderncre8ve. All rights reserved.` — or fix the component to render HTML rather than escape it.

**UX Impact:** Currently looks unprofessional and undermines the premium brand positioning.

---

### 1.6 Add LocalBusiness Schema

**Problem:** Flagged in both the migration audit and the March 19 site audit. The store has a physical address in Cleveland that should be marked up for local search visibility. `seo.server.ts` already has Organization + FurnitureStore schema but no LocalBusiness.

**Action:** In `app/utils/seo.server.ts`, add to the `home()` function's JSON-LD:

```json
{
  "@type": "LocalBusiness",
  "name": "ModernCre8ve",
  "image": "https://moderncre8ve.com/logo.png",
  "address": {
    "@type": "PostalAddress",
    "streetAddress": "1400 E 36th Street, Suite 2802A",
    "addressLocality": "Cleveland",
    "addressRegion": "OH",
    "postalCode": "44114",
    "addressCountry": "US"
  },
  "telephone": "+12165020755",
  "url": "https://moderncre8ve.com",
  "email": "info@moderncre8ve.com",
  "priceRange": "$$$$"
}
```

**SEO Impact:** Strengthens local search signals. ModernCre8ve already ranks #2 for "mid century modern cleveland" — LocalBusiness schema reinforces this and enables Knowledge Panel eligibility.

---

## Phase 2: Content & On-Page Optimization (Weeks 2–3)

*Estimated effort: 8–12 hours total. High-impact, medium-effort changes.*

### 2.1 Rewrite Hero Copy for Keyword Targeting

**Problem:** Current slide headlines are strong brand copy but weak for SEO. The H1 should work double duty — voice AND keywords.

**Action:**
- Slide 1 H1: "Handcrafted Mid-Century Modern Furniture" (visible) with "Furniture for Furniture Fanatics" as a styled tagline `<span>` above or below
- Slide 1 subheading: Keep "Handcrafted in American hardwood. Designed to outlast trends." — it naturally contains target keywords
- Slide 2 H2: "Mid-Century Modern Dining Tables" or "Solid Wood Dining Furniture"
- Slide 3 H2: "Scandinavian & Japandi Design Furniture"

**SEO Impact:** Aligns the homepage H1 and H2 headings with the top keyword clusters from the SEO strategy document (mid-century modern dining table = 5,300/mo, scandinavian dining table = 1,500/mo).

---

### 2.2 Expand Highlights Badges with Keyword-Rich Copy

**Problem:** The highlights badges from the fallback are short labels. Adding a brief sentence under each introduces indexable body text and surfaces long-tail keywords.

**Action:**

| Badge | Heading | Add Under |
|-------|---------|-----------|
| 1 | "Designed, Not Decorated" | "Every detail is intentional — from the grain direction to the joint. Each piece of mid-century modern furniture is drawn in Cleveland and refined until it's right." |
| 2 | "Real Hardwood, No Shortcuts" | "Solid walnut, white oak, maple, and cherry — sourced from American mills. No particle board. No veneer. No MDF." |
| 3 | "Built to Your Specs" | "60% of our orders are custom. Dimensions, wood species, finish — handcrafted to order with 12–16 week lead times because quality can't be rushed." |

**SEO Impact:** Adds ~100 words of semantically rich content to the homepage. Introduces "solid walnut," "white oak," "mid-century modern furniture," "handcrafted to order," and "12–16 week lead times" — all target phrases from the keyword opportunity table.

**UX Impact:** Addresses the lead time expectation gap. The announcement bar alludes to wait times ("Made by Hand, Worth the Wait") but never quantifies them. The badge copy frames 12–16 weeks as a quality signal, not a drawback.

---

### 2.3 Add FAQ Schema Markup to Homepage

**Problem:** If the FAQ accordion stays on the homepage (or moves to /pages/faq), it should have structured data. FAQ rich results increase SERP real estate and CTR. The infrastructure already exists in `seo.server.ts` for collection pages.

**Action:**
- Add FAQPage schema to the `home()` function in `seo.server.ts`
- Include the 4 current FAQ items (payment methods, return policy, shipping, fees)
- Consider adding 2 more high-value FAQ items: "How long does custom furniture take?" and "What wood species do you offer?"

**SEO Impact:** FAQ rich results can add 2–4 additional lines to the homepage SERP snippet. The keyword "how long does custom furniture take" has search volume and aligns with a key purchase objection. Currently flagged in the site audit as missing.

---

### 2.4 Populate Color Design Tokens

**Problem:** CSS custom properties `--color-primary`, `--color-btn-primary-bg`, `--color-secondary`, and others resolve empty in the live DOM. This means components are either using inline Tailwind classes or falling back to browser defaults, bypassing the theme token system.

**Action:**
- In Weaverse Studio Theme Settings → Colors, set:
  - Primary: `#2CBF96` (Emerald Green)
  - Secondary: `#F2AC29` (Amber Gold)
  - Background: `#FFFFFF` or `#F2EBD5` (Warm Cream)
  - Foreground: `#323640` (Dark Charcoal)
  - Button Primary BG: `#2CBF96`
  - Button Primary Text: `#FFFFFF`
  - Link: `#2CBF96`
- Verify in `app/weaverse/style.tsx` that these tokens are being applied correctly

**UX Impact:** All CTAs, links, and accent elements across the site inherit from a single source of truth. Future color changes require only one edit.

---

## Phase 3: Performance & Technical (Weeks 3–4)

*Estimated effort: 6–10 hours. Medium-to-high impact.*

### 3.1 Diagnose and Fix Page-Load Idle State

**Problem:** The page never reaches `document_idle` — persistent analytics/GTM scripts keep the page in a perpetual loading state. This was observed during the design critique (all screenshot tools failed due to idle timeout). This likely affects Google's Largest Contentful Paint (LCP) and Total Blocking Time (TBT) measurements.

**Action:**
- Audit the GTM container (`G-R1KFYYKE48`) for unnecessary or duplicate tags
- Ensure hero slideshow images use `<link rel="preload" fetchpriority="high">`
- Verify Swiper JS is code-split and not blocking initial render
- Check for any infinite polling or keepalive scripts
- Run a Lighthouse audit to get CWV baseline scores
- Consider deferring GTM load with `requestIdleCallback` or `setTimeout`

**SEO Impact:** Core Web Vitals are a ranking factor. A page that never reaches idle will score poorly on TBT and potentially INP (Interaction to Next Paint).

---

### 3.2 Improve Navigation Structure

**Problem:** Header has only 3 items (COLLECTIONS, FURNITURE, ABOUT US) — ambiguous overlap between the first two. At 49px the header feels too compact for a premium furniture brand.

**Action:**
- Increase `--height-nav` to 64–72px
- Restructure nav items:
  - "Shop by Room" → Living Room, Dining, Bedroom, Office
  - "Shop by Style" → Mid-Century Modern, Scandinavian, Japandi
  - "About" → Our Story, Craftsmanship, FAQ
- Ensure dropdown links target specific collection URLs for maximum internal link equity

**SEO Impact:** Navigation links carry significant PageRank. Exposing 6–9 collection URLs in the sitewide nav distributes authority to pages that need ranking recovery (mid-century dining tables, Scandinavian furniture, Japandi collection).

**UX Impact:** Better wayfinding for a 26-product, 16-collection catalog. Users can self-select by room or by style preference without guessing what "Collections" vs. "Furniture" means.

---

### 3.3 Fix Section Heading Hierarchy and Casing

**Problem:** Heading levels skip (H2 → H5 for "Handmade... Nuff Said.") and casing is inconsistent (some all-caps, some mixed case).

**Action:**
- Ensure heading progression: H1 → H2 → H3 (no skipping)
- Standardize on mixed case for all section headings (better readability than all-caps)
- All-caps reserved only for short labels or badge text

**SEO Impact:** Clean heading hierarchy helps search engines understand content structure. The skipped H5 was flagged in the March 19 site audit.

---

## Phase 4: Content Strategy — Homepage-Adjacent (Weeks 4–8)

*These actions don't modify the homepage directly but improve what the homepage links to, which in turn strengthens the homepage's authority.*

### 4.1 Refresh Striking Distance Blog Posts

The SEO truth layer's top two scoring actions are both blog pages within reach of page 1:

| Page | Position | Impressions | Top Query | Action |
|------|----------|-------------|-----------|--------|
| /blogs/.../best-scandinavian-furniture-online | 15.4 | 2,286 | "scandinavian furniture" | Update with 2026 content, add internal links to Scandinavian collections |
| /blogs/.../scandi-modern-furniture-style-differences-explained | 11.0 | 1,347 | "mid century modern vs scandinavian" | Expand content, add comparison table, link to MCM and Scandi collections |

**SEO Impact:** These two pages are the lowest-hanging fruit in the entire pipeline. Small content improvements could push them from page 2 to page 1, adding an estimated 200–400 monthly clicks.

---

### 4.2 Create "Oval Dining Table" Collection Page

**Problem:** The single biggest content gap is "oval dining table" at 15,000 monthly searches and KD 3. ModernCre8ve sells the Mar Vista which is oval.

**Action:** Create `/collections/oval-dining-tables` with 300+ words of unique content targeting this keyword. Link from the homepage featured collections grid.

**SEO Impact:** This one page could capture more organic traffic than the entire current site. At KD 3 and 15,000/mo volume, even a page 2 ranking would add 100–300 monthly visits.

---

### 4.3 Improve Collection Page CTR (Truth Layer HIGH_IMPRESSIONS_LOW_CTR)

The weekly brief flags 26 pages with high impressions but low CTR. The top homepage-relevant ones:

| Page | Impressions | CTR | Expected CTR | Fix |
|------|-------------|-----|-------------|-----|
| /collections/mid-century-modern-dining-tables | 2,571 | 0.2% | ~1.0% | Rewrite title tag + meta description with value props |
| /products/scandinavian-danish-modern-dining-table | 2,206 | 0.0% | ~2.0% | Rewrite title + add compelling meta description |
| /collections/scandinavian-design-furniture | 854 | 0.1% | ~1.0% | Rewrite title tag, add "Solid Wood" or "Handcrafted" |

v1.4.2 rewrote some collection meta descriptions, but these specific pages still show near-zero CTR in the March 1–8 data window (data may predate the v1.4.2 deploy on March 19). Monitor in the next weekly brief to confirm whether the rewrites have taken effect.

---

## Priority Matrix

| # | Action | UX | SEO | Effort | Phase |
|---|--------|-----|------|--------|-------|
| 1 | Verify/fix H1 tag in Studio | — | **Critical** | 15 min | 1 |
| 2 | Restore full homepage section sequence | **High** | **High** | 1–2 hrs | 1 |
| 3 | Wire CTA brand colors | **High** | Low | 30 min | 1 |
| 4 | Differentiate slide CTAs | **Med** | **Med** | 30 min | 1 |
| 5 | Fix footer HTML bug | **Med** | — | 15 min | 1 |
| 6 | Add LocalBusiness schema | — | **Med** | 1 hr | 1 |
| 7 | Rewrite hero copy for keywords | **Med** | **High** | 1 hr | 2 |
| 8 | Expand highlights with keyword-rich copy | Low | **Med** | 1 hr | 2 |
| 9 | Add FAQ schema to homepage | — | **Med** | 1–2 hrs | 2 |
| 10 | Populate color design tokens | **Med** | — | 1 hr | 2 |
| 11 | Fix page-load / CWV performance | **High** | **High** | 3–4 hrs | 3 |
| 12 | Restructure navigation | **High** | **Med** | 3–4 hrs | 3 |
| 13 | Fix heading hierarchy and casing | Low | **Med** | 30 min | 3 |
| 14 | Refresh striking distance blog posts | — | **High** | 3–4 hrs | 4 |
| 15 | Create oval dining table collection | — | **Very High** | 2–3 hrs | 4 |
| 16 | Monitor collection CTR improvements | — | **High** | Ongoing | 4 |

---

## Success Metrics (4-Week Targets)

| Metric | Current | Target | Source |
|--------|---------|--------|--------|
| Homepage H1 | Missing (`<h3>`) | Exactly 1 `<h1>` with target keywords | DOM inspection |
| Homepage organic CTR | 3.3% | 5.0%+ | GSC weekly brief |
| Homepage organic clicks/week | 27 | 40+ | GSC weekly brief |
| Top-10 keywords (sitewide) | 28 | 45+ | Ahrefs / overview CSV |
| Sitewide avg position | 24.3 | 18.0 | GSC weekly brief |
| Core Web Vitals (LCP) | Unknown | < 2.5s | Lighthouse |
| Core Web Vitals (TBT) | Likely poor (idle issue) | < 200ms | Lighthouse |
| Sitewide organic clicks/week | 77 | 120+ | GSC weekly brief |

---

## Data Sources

All findings in this plan are grounded in repository data:

- **Design Critique (March 20)** — Live DOM analysis via Chrome DevTools
- **SEO Audit (March 19)** — `seo-audit-moderncre8ve.md`
- **Post-Deployment Analysis (March 12)** — `SEO_POST_DEPLOYMENT_ANALYSIS_2026-03-12.md`
- **Weekly SEO Brief (March 11)** — `seo-truth-layer/reports/weekly_brief.md`
- **SEO Strategy (Feb 2026)** — `seo-truth-layer/docs/SEO-Strategy-Feb2026.md`
- **Migration Audit (Feb 23)** — `SEO_MIGRATION_AUDIT.md`
- **SEO Technical Findings** — `SEO_FINDINGS.md`
- **CHANGELOG** — `CHANGELOG.md` (v1.4.2 change record)
- **Homepage Fallback JSON** — `weaverse-pages/homepage.json`
