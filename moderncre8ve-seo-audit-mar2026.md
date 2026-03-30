# ModernCre8ve Full SEO Audit

**Audit Date:** March 18, 2026
**Data Window:** March 1–8, 2026 (GSC + GA4) + full site crawl
**Domain:** moderncre8ve.com
**Auditor:** Claude (automated)

---

## Executive Summary

ModernCre8ve has a **strong technical SEO foundation** — FurnitureStore schema, FAQ structured data, breadcrumbs, and clean URL architecture — but is **severely underperforming on click-through rate**. The site generates **20,268 weekly impressions** across 2,524 unique queries but converts only **77 clicks (0.38% CTR)**, meaning 98.6% of search visibility is wasted. The homepage accounts for 35% of all clicks thanks to branded search, while high-impression collection and product pages get almost nothing.

**Top 3 priorities that will have the most impact:**

1. **Fix CTR on striking-distance keywords** — 133 queries sit on pages 1–2 of Google with near-zero clicks. Rewriting meta titles and descriptions for the top 20 could add 60+ clicks/week.
2. **Create content for educational intent** — 1,017 impressions for "what is scandinavian furniture?" variants hit product pages and bounce. A single blog post could capture 20+ clicks/week.
3. **Resolve GA4/GSC tracking gap** — 22+ pages show GSC clicks but zero GA4 sessions. Without fixing this, you can't measure anything you do.

**Overall assessment:** Strong foundation, critical CTR problem, significant untapped opportunity.

---

## Keyword Opportunity Table

### Top 25 Opportunities (sorted by opportunity score)

| Keyword | Est. Difficulty | Opp. Score | Current Pos. | Intent | Recommended Content |
|---------|----------------|------------|-------------|--------|-------------------|
| nordic design dining table | Moderate | **High** | 9.9 | Commercial | Optimize existing collection meta |
| nightstand pair | Low | **High** | 7.1 | Transactional | Create bundle product page |
| what is scandinavian furniture | Low | **High** | 8.9 | Informational | New blog/style guide |
| what is scandinavian furniture style | Low | **High** | 8.2 | Informational | Same blog (cluster) |
| what is scandinavian furniture design | Low | **High** | 7.9 | Informational | Same blog (cluster) |
| mid century modern dining table | Hard | **High** | 9.3 | Commercial | Optimize collection CTR |
| scandinavian furniture | Hard | **High** | 16.4 | Commercial | Optimize blog CTR |
| mcm dining table | Moderate | **High** | 15.6 | Commercial | Optimize collection meta |
| danish dining table | Moderate | **High** | 8.7 | Commercial | Product page meta rewrite |
| round extendable dining table seats 8 | Low | **High** | 7.7 | Transactional | Product page (already getting clicks) |
| scandinavian dining table extendable | Low | **High** | 10.2 | Transactional | Product page meta rewrite |
| custom cabinetry cleveland | Low | **High** | 10.8 | Local/Transactional | Create dedicated local page |
| mid century dining | Moderate | **Medium** | 15.1 | Commercial | Collection page optimization |
| scandinavian modern | Moderate | **Medium** | 18.9 | Informational | Blog content + collection link |
| swedish furniture | Low | **Medium** | 15.8 | Commercial | Blog optimization (already 3.5% CTR) |
| affordable scandinavian furniture | Moderate | **Medium** | 17.2 | Commercial | Blog + collection targeting |
| japandi bedroom | Moderate | **Medium** | 25.0 | Commercial | New collection page |
| mid century modern coffee table | Hard | **Medium** | 41.3 | Commercial | Consolidate coffee table pages |
| scandinavian bed frame king | Moderate | **Medium** | 23.0 | Transactional | Product page optimization |
| boho bed frame | Moderate | **Medium** | 23.9 | Commercial | Product meta (already have product) |
| mid century modern vs scandinavian | Low | **Medium** | 11.0 | Informational | Existing blog, optimize title |
| custom made furniture | Hard | **Medium** | 33.0 | Commercial | Collection page, needs authority |
| mid century modern nightstand | Moderate | **Medium** | 7.0 | Transactional | Product page meta rewrite |
| scandinavian sofa brands | Moderate | **Medium** | N/A | Commercial | **New collection needed** |
| modern dining chairs | Moderate | **Medium** | N/A | Commercial | **New collection needed** |

---

## On-Page Issues Table

### Critical Issues

| Page | Issue | Severity | Recommended Fix |
|------|-------|----------|-----------------|
| Homepage | Title is "Home \| ModernCre8ve" — generic, wastes primary SERP real estate | **Critical** | Change to "Handcrafted Mid-Century Modern Furniture \| ModernCre8ve" |
| Homepage | Meta description is generic: "Handcrafted modern furniture made in Cleveland, Ohio" — doesn't differentiate | **Critical** | Rewrite: "Handcrafted mid-century modern, Scandinavian & Japandi furniture. Made by Amish artisans in Ohio. 12–16 week lead times, white glove delivery." |
| Homepage | Multiple H1 tags ("The Mansfield", "A Homage to Minimalist Design", "Timeless and Sustainable Craftsmanship") | **Critical** | Consolidate to single H1: "Handcrafted Modern Furniture" |
| /pages/about-us | H1 is "CONTACT US" — wrong heading for an About page | **Critical** | Fix H1 to "About ModernCre8ve" or "Our Story" |
| /pages/about-us | Only ~200 words of content — too thin for authority building | **High** | Expand to 800+ words: founding story, craftsmanship process, Amish artisan partnerships, Cleveland roots |
| All product pages | Image alt text uses filenames ("IMG_2589.jpg") instead of descriptive text | **High** | Update to descriptive: "Mid-century modern walnut dining table, seats 8, handcrafted in Ohio" |
| Product pages | No review/rating schema despite having Product JSON-LD | **High** | Add aggregateRating to Product schema when reviews exist |
| /collections/scandinavian-design-furniture | Thin collection description — mostly product cards | **Medium** | Add 200+ word collection intro with keyword-rich description |
| /blogs/.../best-scandinavian-furniture-online | H2s are retailer names, not keyword-rich | **Medium** | Add keyword subheadings: "Best Scandinavian Dining Furniture", "Affordable Nordic Sofas" etc. |
| /blogs/.../best-scandinavian-furniture-online | Links to competitor sites may dilute link equity | **Medium** | Add `rel="nofollow"` to competitor outbound links |
| Sitemap | No `<lastmod>` timestamps on any sub-sitemap | **Low** | Add lastmod dates to help Google prioritize crawling |
| All pages | No explicit `<link rel="canonical">` visible in homepage HTML | **Low** | Verify canonical tags render in all page heads |

### Homepage-Specific SEO Code Issues

From `seo.server.ts`, the `home()` function currently returns:

```typescript
title: "Home",  // ← Generic, wasted opportunity
description: "Handcrafted modern furniture made in Cleveland, Ohio"  // ← Too short (48 chars)
```

**Recommended fix:**
```typescript
title: "Handcrafted Mid-Century Modern & Scandinavian Furniture",
description: "Shop handcrafted mid-century modern, Scandinavian & Japandi furniture. Made by Amish artisans in solid hardwoods. 12–16 week lead times. Free white glove delivery."
```

---

## Content Gap Recommendations

### High Priority

| Topic / Keyword | Why It Matters | Format | Priority | Effort |
|----------------|---------------|--------|----------|--------|
| "What is Scandinavian furniture?" (1,017 combined impr, pos 8.2) | Educational intent currently hitting product pages, 0% CTR | Blog pillar page (2,000+ words) | **High** | Moderate (half day) |
| Nightstand pairs / bundles (766 impr, pos 7.1, 0 clicks) | Searchers want sets; site only shows singles | Product bundle page + collection | **High** | Quick win (2 hrs) |
| Scandinavian sofas & couches (13+ queries, no page) | Multiple queries with zero landing page | New collection page | **High** | Moderate (half day) |
| Modern dining chairs (23+ impr for chair queries) | Only scattered product pages, no collection | New collection page | **High** | Moderate (half day) |

### Medium Priority

| Topic / Keyword | Why It Matters | Format | Priority | Effort |
|----------------|---------------|--------|----------|--------|
| Japandi bedroom (98 impr, 0 clicks) | Growing style trend, no dedicated page | New collection page | **Medium** | Quick win (2 hrs) |
| Scandinavian bedroom sets (107 bedroom queries) | Bed frames exist but no cohesive collection | New collection bundling beds + nightstands | **Medium** | Quick win (2 hrs) |
| Coffee table consolidation (116 queries across 4 pages) | Fragmented across multiple URLs dilutes authority | Consolidate to single strong collection | **Medium** | Moderate (half day) |
| Cleveland custom furniture (78 impr, pos 10.8) | Local intent with no dedicated local page | Location-specific landing page | **Medium** | Quick win (2 hrs) |

### Lower Priority

| Topic / Keyword | Why It Matters | Format | Priority | Effort |
|----------------|---------------|--------|----------|--------|
| Mid-century modern style guide (existing blog needs SEO) | "MCM vs Scandinavian" blog exists but underperforming | Optimize existing blog title + meta | **Low** | Quick win (1 hr) |
| Furniture care guides (154 impr for care/cleaning queries) | Existing content not capturing clicks | Optimize existing blog SEO | **Low** | Quick win (1 hr) |
| Home office furniture | Minimal query volume currently | Monitor, create later if demand grows | **Low** | Defer |

---

## Technical SEO Checklist

| Check | Status | Details |
|-------|--------|---------|
| HTTPS | **Pass** | Full HTTPS with no mixed content |
| Robots.txt | **Pass** | Standard Shopify robots.txt, sitemap referenced, appropriate blocking of admin/checkout paths |
| XML Sitemap | **Warning** | 5 sub-sitemaps present (products, pages, collections, articles, blogs) but **no `<lastmod>` dates** on any entry |
| Structured Data — Organization | **Pass** | Full Organization + FurnitureStore schema with address, phone, hours, geo coordinates |
| Structured Data — Product | **Pass** | Product schema with offers, pricing, SKU, availability on all product pages |
| Structured Data — Collection | **Pass** | CollectionPage + BreadcrumbList schema on collection pages |
| Structured Data — FAQ | **Pass** | FAQPage schema on collection pages with relevant Q&A |
| Structured Data — Reviews | **Fail** | No aggregateRating in Product schema — missing rich snippet opportunity |
| Canonical Tags | **Warning** | Present on crawled pages, but verify consistency across all templates |
| Mobile Responsiveness | **Pass** | Responsive design confirmed; mobile CTR (0.50%) outperforms desktop (0.31%) |
| Page Speed | **Warning** | Cannot run Lighthouse from sandbox; furniture hero images likely large — recommend lazy loading audit |
| H1 Tag Structure | **Fail** | Homepage has 3+ H1 tags; About page has wrong H1 ("Contact Us" instead of About) |
| Image Alt Text | **Fail** | Product images use filenames (IMG_2589.jpg) instead of descriptive alt text |
| Internal Linking | **Warning** | Navigation links are adequate (50+) but blog posts lack systematic internal links to product/collection pages |
| URL Structure | **Pass** | Clean, readable URLs with keywords; proper use of `/collections/`, `/products/`, `/blogs/` hierarchy |
| Duplicate Content | **Warning** | Collection pages with `?constraint=` parameters create near-duplicate URLs (e.g., `/custom-made-furniture?constraint=danish-modern-table`). Robots.txt blocks some but not all. |
| GA4/GSC Linkage | **Fail** | 22+ pages show GSC clicks with zero GA4 sessions — tracking is broken or misconfigured |
| Crawl Budget | **Warning** | Ahrefs and MJ12bot have 10-second crawl delays; verify this isn't slowing Ahrefs audit data |

---

## Competitor Comparison Summary

Based on web research, the two closest competitors in the handcrafted MCM furniture space are **Casara Modern** (custom MCM, Huntington Beach CA) and **Vermont Woods Studios** (handcrafted MCM, Vermont). **Article** is included as the dominant DTC mid-century brand.

| Dimension | ModernCre8ve | Casara Modern | Vermont Woods Studios | Article |
|-----------|-------------|---------------|----------------------|---------|
| **Positioning** | Handcrafted MCM/Scandi/Japandi, Amish-made in Ohio | Custom MCM sofas & daybeds, made in California | Sustainable MCM, handcrafted in Vermont | Mass DTC modern furniture |
| **Content Depth** | 10+ blog posts, 16 collections | Minimal blog, product-focused | Extensive blog + style guides + "MCM 101" pillar | Very deep content, buying guides, room inspiration |
| **Collection Pages** | 16 collections with FAQ schema | Basic shop categories | Room-based + style-based collections | Hundreds of curated collections |
| **Structured Data** | Organization + FurnitureStore + FAQ + Product + Breadcrumb | Basic | Standard e-commerce | Comprehensive with reviews |
| **Product Review Schema** | Missing | Unknown | Present | Present with star ratings |
| **Blog/Content Marketing** | Moderate (10+ articles, some high-impression) | Minimal | Strong (style guides, history, care) | Very strong (magazine-quality content) |
| **Local SEO** | Address + geo in schema, but no dedicated local pages | Yelp presence, physical showroom | Vermont-centric branding | No local play (DTC only) |
| **Estimated Keyword Coverage** | ~2,500 queries appearing for | Narrower (sofas/daybeds focus) | Broader (full home furniture) | Very broad (10,000+ keywords likely) |
| **Key Advantage** | Amish craftsmanship + Ohio local + Japandi niche | California custom + MCM purity | Sustainability story + Vermont brand + 15K customers | Scale + brand recognition + price accessibility |
| **Key Weakness** | 0.38% CTR, thin content, broken analytics | Limited online presence | Higher price point | Not truly handcrafted/custom |
| **Winner** | — | — | — | Content depth |

### Competitive Moat Opportunities

ModernCre8ve has three differentiation angles competitors aren't owning:

1. **Japandi niche** — neither Casara nor Vermont Woods targets Japandi. You're showing for these queries already (410 impressions). Own this space with dedicated content.
2. **Amish craftsmanship story** — your partnership with Amish artisans is unique. Vermont Woods has Vermont craftsmen, but the Amish angle is more compelling and search-worthy.
3. **Cleveland/Ohio local** — no competitor targets local Cleveland furniture search. "Cleveland modern furniture", "custom cabinets cleveland" etc. are yours to dominate.

---

## Prioritized Action Plan

### Quick Wins (Do This Week) — Expected: +40–60 clicks/week

| # | Action | Impact | Effort | How |
|---|--------|--------|--------|-----|
| 1 | **Fix homepage title + meta** in `seo.server.ts` → `home()` function | High | 15 min | Change `title: "Home"` to `"Handcrafted Mid-Century Modern & Scandinavian Furniture"`. Rewrite description to 155 chars with differentiators. |
| 2 | **Rewrite meta for top 5 zero-click pages** | High | 2 hrs | Update Shopify SEO fields for: mid-century-modern-dining-tables, scandinavian-design-furniture, custom-made-furniture, and the top 2 product pages |
| 3 | **Fix homepage H1** — consolidate multiple H1s to one | High | 30 min | Edit Weaverse section to use single H1; demote others to H2 |
| 4 | **Fix About page H1** from "Contact Us" to "About ModernCre8ve" | Medium | 15 min | Edit Weaverse About section heading |
| 5 | **Fix product image alt text** on top 10 products | Medium | 1 hr | Update in Shopify Admin: "Handcrafted walnut mid-century dining table" format |
| 6 | **Audit GA4/GSC linkage** — verify events fire on all page types | High | 1 hr | Check GA4 Admin → Data Sources; test with GA4 Debugger extension |

### Strategic Investments (Plan This Quarter) — Expected: +80–150 clicks/week

| # | Action | Impact | Effort | Dependencies |
|---|--------|--------|--------|-------------|
| 1 | **Create "Scandinavian Furniture Style Guide" blog post** (2,000+ words targeting 1,017 combined impressions) | High | Half day | None |
| 2 | **Create 3 missing collection pages**: Scandinavian Sofas, Modern Dining Chairs, Japandi Bedroom | High | 1 day | Product availability |
| 3 | **Create nightstand bundle/pair product** to match "nightstand pair" query intent (766 impressions) | High | 2 hrs | Shopify product setup |
| 4 | **Add aggregateRating to Product schema** in `seo.server.ts` — enables star ratings in SERP | High | 2 hrs | Need review data source (Judge.me, Loox, etc.) |
| 5 | **Build Cleveland local landing page** targeting "custom furniture cleveland", "custom cabinets cleveland" | Medium | Half day | None |
| 6 | **Consolidate coffee table pages** — redirect fragments to single strong `/collections/mid-century-modern-coffee-tables` | Medium | 2 hrs | 301 redirect setup |
| 7 | **Rewrite meta titles + descriptions for all 16 collections** using GSC top-query data | High | 1 day | GSC data (already have) |
| 8 | **Add `<lastmod>` to sitemap** entries | Low | 1 hr | Shopify/Hydrogen config |
| 9 | **Internal linking overhaul** — add systematic product cross-links in blog posts | Medium | Half day | Content audit |
| 10 | **Expand About page** to 800+ words with founding story, Amish partnership, process photos | Medium | Half day | Content/copywriting |

### Revenue Impact Model

| Scenario | Current Weekly | Projected Weekly | Monthly Gain | Annual Gain |
|----------|---------------|-----------------|-------------|------------|
| Quick wins only | 77 clicks | 120 clicks | +172 sessions | +2,064 sessions |
| Quick wins + strategic | 77 clicks | 200+ clicks | +492 sessions | +5,900 sessions |
| At $1,906 AOV, 2.7% conversion | — | — | +$25K–50K/yr | conservative |

---

## Data Sources Referenced

- **Google Search Console:** 5,253 query rows, 2,524 unique queries (Mar 1–8, 2026)
- **Google Analytics 4:** 19 page-level engagement rows (Mar 3–10, 2026)
- **SEO Truth Layer:** 122 merged page-level rows combining GSC + GA4
- **Live site crawl:** Homepage, collections, products, blog, about, sitemap, robots.txt
- **Competitor research:** Web search for handcrafted MCM furniture brands
- **Code audit:** `app/utils/seo.server.ts` (SEO config), structured data implementation

---

*Full keyword analysis with all 133 striking-distance keywords and 47 zero-click queries available in `SEO_ANALYSIS_REPORT.md`.*
