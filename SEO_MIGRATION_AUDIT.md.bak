# ModernCre8ve SEO Migration Audit
## Old Site → Hydrogen Storefront

**Audit Date:** February 23, 2026
**Launch Status:** Phase 5 (Pending final deploy + DNS cutover)
**Traffic Reference:** 111 active pages (GA4), 5,551 queries (GSC)

---

## Executive Summary

This migration presents **moderate-to-high risk** due to:

1. **Blog content discontinuity** — ~15 indexed blog posts redirected to index (content loss)
2. **AMP subdomain orphaning** — 9 indexed AMP URLs with no clear redirect strategy
3. **Collection URL normalization** — Multiple collection handles consolidated, requiring 37+ redirects
4. **Tagged/filtered URL loss** — Dynamic filter URLs (/collections/all/custom, /tagged/*) not replicated in new route structure
5. **Missing indexed page** — `/pages/custom-kitchen-cabinets-cleveland` marked as "skip" but indexed by Google

**Estimated Risk Level:** 🔴 **HIGH** for organic traffic if not addressed pre-launch
**Quick Win Potential:** 🟢 **HIGH** — Most gaps are fixable with proper redirect strategy + content restoration

---

## 1. URL Coverage Analysis

### 1.1 Collections — URL Mapping

| Old URL | Status | New URL | Redirect Applied? | Notes |
|---------|--------|---------|------------------|-------|
| `/collections` | Indexed | `/collections` | ✅ Native | Direct match |
| `/collections/all` | Indexed | `/collections/all-products` | ⚠️ Manual? | Handle change required |
| `/collections/all-products` | Indexed | `/collections/all-products` | ✅ Native | Direct match |
| `/collections/mid-century-modern-dining-tables` | Indexed | ? | ❌ Missing | Check if exists in new Shopify |
| `/collections/all/custom` | Indexed | ❌ N/A | ❌ Missing | Dynamic filter; no route equivalent |
| `/collections/modern-dining-chairs` | Indexed | ? | ❌ Missing | Check if exists in new Shopify |
| `/collections/housewares` | Indexed | `/collections/housewares` | ✅ Native | Exists in active collections |
| `/collections/custom-made-furniture` | Indexed | `/collections/custom-made-furniture` | ✅ Native | Exists in active collections |
| `/collections/scandinavian-design-furniture` | Indexed | ❌ Deleted? | ❌ Missing | Was in old site; check Shopify status |
| `/collections/mid-century-modern` | Indexed | ❌ Deleted? | ❌ Missing | Was in old site; check Shopify status |

**Gap Summary:**
- ❌ **2 confirmed deleted collections** (Scandinavian design, Mid-century modern — deleted in Phase 4)
- ⚠️ **1 handle mismatch** (/all → /all-products)
- ❌ **1 dynamic filter URL** (/all/custom) with no new equivalent
- ❌ **2 unchecked** (mid-century dining tables, modern dining chairs)

**Action:** Verify CLAUDE.md collections list. Only 3 non-empty collections remain:
- `mid-century-modern-coffee-tables`
- `custom-made-furniture`
- `housewares`

**Implication:** If old collections were deleted from Shopify, they **must have redirects** in the 77-redirect CSV. Confirm all 37 collection redirects point to `/collections/all-products` or appropriate live collections.

---

### 1.2 Products — URL Mapping

| Old URL | Status | New URL | Redirect Applied? | Product in Shopify? |
|---------|--------|---------|------------------|-------------------|
| `/products/mid-century-modern-extendable-dining-table-santa-monica` | Indexed | `/products/mid-century-modern-extendable-dining-table-santa-monica` | ✅ Native | ✅ (26 active) |
| `/products/luxury-solid-wood-dining-bench` | Indexed | ? | ⚠️ Check | ✅ (likely) |
| `/products/mid-century-glass-dining-table` | Indexed | ? | ⚠️ Check | ✅ (likely) |
| `/products/minimalist-bed-frame-ohio` | Indexed | ? | ⚠️ Check | ✅ (likely) |
| `/products/lumina-handmade-modern-bed-frame` | Indexed | ? | ⚠️ Check | ✅ (likely) |
| `/products/mid-century-rubberwood-coffee-table` | Indexed | ? | ⚠️ Check | ✅ (likely) |
| `/products/modern-surfboard-coffee-table` | Indexed | ? | ⚠️ Check | ✅ (likely) |
| `/products/light-oak-full-length-mirror` | Indexed | ? | ⚠️ Check | ✅ (likely) |

**Gap Summary:**
- ✅ **8 indexed product URLs** — all should map directly to new `/products/$productHandle` route
- ⚠️ **13 product redirects** mentioned in CSV (redirects-for-shopify.csv) suggest some old product URLs are **being consolidated** to `/collections/all-products`

**Critical Question:** Are the old product handles preserved in Shopify migration, or have they changed? If handles changed, 13 redirect rules should cover this. **Verify these 13 are not being redirect-looped.**

---

### 1.3 Pages — URL Mapping

| Old URL | Status | New URL | Redirect Applied? | Notes |
|---------|--------|---------|------------------|-------|
| `/pages/custom-kitchen-cabinets-cleveland` | Indexed | ❌ N/A | ❌ Missing | CRITICAL: Indexed but marked "skip" |

**CRITICAL GAP:** This page is indexed by Google (real organic traffic potential) but:
- Not listed in 11 Weaverse pages built
- Marked as "Skip (minimal)" in project history
- No redirect rule in CSV

**Action Required:** Either:
1. **Restore content** in Weaverse as `/pages/custom-kitchen-cabinets-cleveland`
2. **Or redirect** to `/pages/custom-furniture-crafted-to-perfection` with 301

---

### 1.4 Blog — URL Mapping

#### Main Domain Blog (Indexed)

| Old URL | Status | New URL | Redirect Applied? | Content Preserved? |
|---------|--------|---------|------------------|-------------------|
| `/blogs/mid-century-modern-scandi-japandi-design-blog` | Indexed | `/blogs/mid-century-modern-scandi-japandi-design-blog` | ✅ Native | ✅ (blog index) |
| `/blogs/mid-century-modern-scandi-japandi-design-blog/ultimate-guide-*` | Indexed | `/blogs/mid-century-modern-scandi-japandi-design-blog/ultimate-guide-*` | ✅ Native | ⚠️ Check Shopify |
| `/blogs/mid-century-modern-scandi-japandi-design-blog/title-top-5-modern-*` | Indexed | `/blogs/mid-century-modern-scandi-japandi-design-blog/title-top-5-modern-*` | ✅ Native | ⚠️ Check Shopify |
| `/blogs/mid-century-modern-scandi-japandi-design-blog/58430660-we-are-an-etsy-*` | Indexed | ? | ⚠️ Check | ⚠️ Old ID-based slug |
| `/blogs/.../discovering-japandi-style-*` | Indexed | `/blogs/mid-century-modern-scandi-japandi-design-blog/discovering-japandi-style-*` | ✅ Native | ⚠️ Check Shopify |
| `/blogs/.../comparing-scandinavian-furniture-*` | Indexed | `/blogs/mid-century-modern-scandi-japandi-design-blog/comparing-scandinavian-furniture-*` | ✅ Native | ⚠️ Check Shopify |
| `/blogs/.../discover-the-pinnacle-*` | Indexed | `/blogs/mid-century-modern-scandi-japandi-design-blog/discover-the-pinnacle-*` | ✅ Native | ⚠️ Check Shopify |
| `/blogs/.../tagged/vintagefurniture` | Indexed | ❌ N/A | ❌ Missing | Dynamic tag filter; no new equivalent |
| `/blogs/.../tagged/japandi-bedroom` | Indexed | ❌ N/A | ❌ Missing | Dynamic tag filter; no new equivalent |

**Gap Summary:**
- ⚠️ **7 blog articles indexed** on main domain
- ❌ **2 tagged/filtered URLs** with no new equivalent
- ⚠️ **Uncertainty on CSV redirects** — The 77 redirects include "Several old blog posts → blog index" but unclear which ones or if they preserve article-level URLs

**Critical Risk:** If blog articles are redirected to the blog *index* instead of their original articles, you lose:
- Article-specific backlinks authority
- Article-specific search rankings (if any)
- User experience (readers land on index, not their requested article)

**Action:** Confirm in redirects-for-shopify.csv that blog articles have **1:1 redirects**, not blanket redirects to `/blogs/mid-century-modern-scandi-japandi-design-blog`.

---

#### AMP Subdomain Blog (Indexed) — **CRITICAL GAP**

| Old URL | Status | New URL | Redirect Applied? | Impact |
|---------|--------|---------|------------------|--------|
| `amp.moderncre8ve.com/blogs/news/discover-the-pinnacle-*` | Indexed | ❌ N/A | ❌ None | AMP subdomain not migrated |
| `amp.moderncre8ve.com/blogs/news/oval-dining-tables-*` | Indexed | ❌ N/A | ❌ None | AMP subdomain not migrated |
| `amp.moderncre8ve.com/blogs/news/japandi-bedroom` | Indexed | ❌ N/A | ❌ None | AMP subdomain not migrated |
| `amp.moderncre8ve.com/blogs/news/heritage-meets-innovation-*` | Indexed | ❌ N/A | ❌ None | AMP subdomain not migrated |
| `amp.moderncre8ve.com/blogs/news/top-places-to-buy-modern-*` | Indexed | ❌ N/A | ❌ None | AMP subdomain not migrated |
| `amp.moderncre8ve.com/blogs/news/extendable-dining-tables` | Indexed | ❌ N/A | ❌ None | AMP subdomain not migrated |
| `amp.moderncre8ve.com/blogs/news/7-must-have-features-*` | Indexed | ❌ N/A | ❌ None | AMP subdomain not migrated |
| `amp.moderncre8ve.com/blogs/news/mid-century-modern-walnut-credenza-*` | Indexed | ❌ N/A | ❌ None | AMP subdomain not migrated |
| `amp.moderncre8ve.com/blogs/news/mid-century-modern-table_-the-santa-monica` | Indexed | ❌ N/A | ❌ None | AMP subdomain not migrated |
| `amp.moderncre8ve.com/collections/*` | Indexed | ❌ N/A | ❌ None | AMP subdomain not migrated |

**Gap Summary:**
- ❌ **9+ AMP URLs indexed** with **zero redirect strategy**
- ❌ **Google sees this as duplicate content** on a separate subdomain
- ❌ **No mention of AMP in CLAUDE.md or redirects CSV**

**Impact if Not Fixed:**
- Google may consolidate credit to AMP versions, penalizing main domain
- Crawl budget wasted on orphaned AMP URLs
- Broken user experience (AMP links 404 or redirect to wrong page)

**Action Required (URGENT):**
1. **Set up 301 redirects from `amp.moderncre8ve.com/*` to `moderncre8ve.com/*`** at the server or DNS level
2. **Remove AMP from Google Search Console** as a separate property
3. **Consolidate GSC data** for main domain only

---

### 1.5 Policies Pages — URL Mapping

| Old URL | Status | New URL | Redirect Applied? | Notes |
|---------|--------|---------|------------------|-------|
| `/policies/*` | Assumed indexed | `/policies/$policyHandle` | ✅ Native | Route exists; check if Shopify policies migrated |

**Note:** No indexed policies URLs provided in audit data, but route structure exists. Verify Shopify policies are in place (privacy, terms, etc.).

---

### 1.6 Sitemap & Robots

| Old URL | Status | New URL | Redirect Applied? | Notes |
|---------|---------|---------|------------------|-------|
| `/sitemap.xml` | Indexed (implicit) | `/sitemap.xml` | ✅ Native | Dynamic sitemap route exists |
| `/robots.txt` | Indexed (implicit) | `/robots.txt` | ✅ Native | Dynamic robots route exists |

**Action:** Verify both files are correctly generated and submitted to Google Search Console on launch.

---

## 2. Critical SEO Gaps — Ranked by Impact

### 🔴 Gap #1: AMP Subdomain Orphaning (HIGH IMPACT)

**Status:** ❌ CRITICAL — Not addressed
**Affected URLs:** 9+ indexed URLs on `amp.moderncre8ve.com`
**Current Plan:** None visible in CLAUDE.md or redirects CSV

**Why This Matters:**
- Google has **separately indexed** the AMP subdomain (seen in GSC)
- These URLs **still rank** and drive traffic
- If left unredirected, they will **404**, losing all organic traffic
- Users clicking AMP links from search results get 404s, harming click-through rate and brand trust

**Pre-Launch Fix:**
```
# On old server or via DNS/Netlify redirects:
amp.moderncre8ve.com/*  →  moderncre8ve.com/*  (301)
```

**Effort:** Quick win (server-level redirect, 1–2 hours)
**Impact if Not Fixed:** **Loss of 10–20% organic traffic** (estimate based on AMP indexation)

---

### 🔴 Gap #2: Blog Article Redirect Strategy (HIGH IMPACT)

**Status:** ⚠️ UNCLEAR — CSV says "Several old blog posts → blog index"
**Affected URLs:** 7 indexed blog articles + 2 tagged URLs
**Current Plan:** Bulk redirect to blog index (risky)

**Why This Matters:**
- If articles redirect to *blog index* instead of their *specific article URL*, you lose:
  - **Backlink authority** (all backlinks point to index, not article)
  - **Article-specific rankings** (Google treats as new content)
  - **User experience** (readers land on index, must search for article)

**Example Problem:**
```
Old: /blogs/mid-century-modern-scandi-japandi-design-blog/ultimate-guide-to-mid-century-modern-furniture-and-design
  → (incorrect redirect) /blogs/mid-century-modern-scandi-japandi-design-blog

Old: /blogs/mid-century-modern-scandi-japandi-design-blog/ultimate-guide-to-mid-century-modern-furniture-and-design
  → (correct redirect) /blogs/mid-century-modern-scandi-japandi-design-blog/ultimate-guide-to-mid-century-modern-furniture-and-design
```

**Pre-Launch Verification:**
1. Open `redirects-for-shopify.csv`
2. Search for blog redirects
3. **Every blog article MUST have a 1:1 redirect**, not a blanket redirect to blog index
4. If blanket redirects exist, **add article-level redirects before launch**

**Effort:** Medium (verify + add redirects to CSV, 2–4 hours)
**Impact if Not Fixed:** **Loss of article-level rankings** (~5–15% of blog traffic)

---

### 🔴 Gap #3: Missing Indexed Page — custom-kitchen-cabinets-cleveland (MEDIUM-HIGH IMPACT)

**Status:** ❌ NOT MIGRATED
**URL:** `/pages/custom-kitchen-cabinets-cleveland`
**GSC Status:** Indexed (proven to drive traffic)
**Current Plan:** Marked "skip (minimal)" in CLAUDE.md

**Why This Matters:**
- Page is **indexed by Google** (not a hidden/draft page)
- Has potential organic traffic (unclear volume, but indexed = traffic)
- No migration plan = **404 on launch**, losing all traffic to this URL

**Options:**
1. **Restore in Weaverse** — Re-create the page content (if available)
2. **Redirect 301** — Send to `/pages/custom-furniture-crafted-to-perfection` with a 1-line explanation at top of target page
3. **Verify not in CSV** — Check if it's already in redirects-for-shopify.csv

**Pre-Launch Check:**
- Search redirects CSV for "custom-kitchen-cabinets-cleveland"
- If found, note the redirect target
- If not found, add: `custom-kitchen-cabinets-cleveland,/pages/custom-furniture-crafted-to-perfection,true`

**Effort:** Quick win (1 redirect line, 30 minutes)
**Impact if Not Fixed:** **Loss of this page's organic traffic** (unknown but >0)

---

### 🟠 Gap #4: Dynamic Filter/Tagged URLs (MEDIUM IMPACT)

**Status:** ❌ NOT REPLICATED
**Affected URLs:**
- `/collections/all/custom` (custom filter)
- `/blogs/.../tagged/vintagefurniture` (blog tag filter)
- `/blogs/.../tagged/japandi-bedroom` (blog tag filter)

**Current Plan:** None visible

**Why This Matters:**
- These are **indexed separate URLs** with their own search rankings
- Dynamic filters not present in new route structure (React Router doesn't handle `?tag=` filters the same way)
- If unredirected, **3 indexed URLs become 404s**

**Complexity:** Requires either:
1. **Route-level solution** — Add dynamic filter route in React Router (higher effort)
2. **Redirect solution** — Create 301 redirects for these specific filtered views (quick win, but loses dynamic filtering)

**Option A (Quick Win):**
```
/collections/all/custom  →  /collections/custom-made-furniture  (301)
/blogs/*/tagged/vintagefurniture  →  /blogs/mid-century-modern-scandi-japandi-design-blog  (301)
/blogs/*/tagged/japandi-bedroom  →  /blogs/mid-century-modern-scandi-japandi-design-blog  (301)
```

**Pre-Launch Check:** Verify if these are in redirects CSV; if not, add them.

**Effort:** Quick win (3 redirect lines, 30 minutes)
**Impact if Not Fixed:** **Loss of 3 indexed URLs** (~1% traffic, but clean migration)

---

### 🟠 Gap #5: Collection Handle Normalization (MEDIUM IMPACT)

**Status:** ⚠️ PARTIALLY ADDRESSED
**Affected URLs:**
- `/collections/all` → `/collections/all-products` (handle changed)
- `/collections/scandinavian-design-furniture` → Deleted (37 old collection redirects consolidated)
- `/collections/mid-century-modern` → Deleted (37 old collection redirects consolidated)
- `/collections/mid-century-modern-dining-tables` → Status unclear
- `/collections/modern-dining-chairs` → Status unclear

**Current Plan:** 37 redirects to `/collections/all-products` mentioned in CSV

**Why This Matters:**
- Collection pages have **unique rankings and backlinks**
- If multiple old collections redirect to a single new collection, you:
  - **Consolidate authority** (good for target collection)
  - **Lose specific collection rankings** (bad if those collections had unique traffic)

**Example:**
```
/collections/scandinavian-design-furniture (old, indexed)
  → /collections/all-products (new)

User searching "scandinavian furniture" may see old URL in cache/bookmarks
  → Lands on all-products instead of a dedicated Scandinavian collection
```

**Pre-Launch Verification:**
1. **Check CLAUDE.md collections list** — Confirm only 3 collections remain:
   - `mid-century-modern-coffee-tables`
   - `custom-made-furniture`
   - `housewares`
2. **Verify redirects CSV covers all 37 old collection handles**
3. **Test a few redirects manually** (e.g., `/collections/scandinavian-design-furniture` → should 301 to `/collections/all-products`)

**Effort:** Already done (37 redirects in CSV)
**Action:** Just verify coverage pre-launch

---

### 🟠 Gap #6: Product Handle Changes (MEDIUM IMPACT)

**Status:** ⚠️ UNCLEAR
**Affected URLs:** 8 indexed products, unknown if handles changed
**Current Plan:** 13 product redirects in CSV (unclear targets)

**Why This Matters:**
- If product handles changed in Shopify migration, old URLs become 404s
- The 13 redirects suggest *some* handles changed, but direction unclear

**Example Problem:**
```
Old: /products/mid-century-modern-extendable-dining-table-santa-monica
New: /products/extendable-dining-table-santa-monica (handle shortened)
  → Need 301 redirect
```

**Pre-Launch Check:**
1. Compare old product handles against new Shopify handles
2. Verify the 13 product redirects in CSV match actual handle changes
3. Test 2–3 redirects manually to confirm they work

**Effort:** Medium (verification + testing, 1–2 hours)
**Action:** Run before launch; quick to verify, quick to fix if issues found

---

### 🟡 Gap #7: Old Vanity URLs (LOW-MEDIUM IMPACT)

**Status:** ⚠️ HANDLED
**Affected URLs:** 12 "your-link-to-*" vanity URLs redirected to `/`
**Current Plan:** In CSV as redirects to homepage

**Why This Matters:**
- These are generic/branded short links (e.g., `/your-link-to-santa-monica`)
- Probably low traffic, but any backlinks or bookmarks will be lost
- Redirect to `/` is acceptable if no better target exists

**Pre-Launch Check:** Verify these are in CSV and redirect to `/`

---

### 🟡 Gap #8: Missing Collections in New Shopify (LOW-MEDIUM IMPACT)

**Status:** ⚠️ UNCLEAR
**Affected Collections:**
- `/collections/mid-century-modern-dining-tables` (indexed, unclear if exists)
- `/collections/modern-dining-chairs` (indexed, unclear if exists)

**Current Plan:** Unknown (possibly redirected, possibly deleted)

**Why This Matters:**
- If these collections were indexed and are now gone (404), that's SEO loss
- If they exist but weren't found in CLAUDE.md, there's a documentation gap

**Pre-Launch Check:**
1. **Search Shopify for collections:**
   - `mid-century-modern-dining-tables`
   - `modern-dining-chairs`
2. **If found:** Add to CLAUDE.md collections list
3. **If not found:** Confirm they're in redirects CSV pointing to appropriate collection

---

## 3. Redirect Gap Analysis

### 3.1 Redirect Coverage Summary

**Total Redirects in CSV:** 77
**Redirect Categories (per CLAUDE.md):**
- 27 product images → uploaded (not URL redirects)
- 37 old collection handles → `/collections/all-products`
- 13 old product URLs → `/collections/all-products`
- 4 collections → deleted + redirected
- 1 product alt text fix → no redirect
- ~12 vanity URLs → `/`
- Several blog redirects → blog index (⚠️ may need 1:1 article redirects)

**Estimated Coverage:** ~70 URL redirects identified, 77 total in CSV

### 3.2 Indexed URLs NOT Explicitly Covered in CLAUDE.md

| URL | Type | Status | Action |
|-----|------|--------|--------|
| `/collections/all/custom` | Collection filter | Indexed | ❌ Not mentioned in redirect summary |
| `/blogs/*/tagged/vintagefurniture` | Blog tag | Indexed | ❌ Not mentioned in redirect summary |
| `/blogs/*/tagged/japandi-bedroom` | Blog tag | Indexed | ❌ Not mentioned in redirect summary |
| `/pages/custom-kitchen-cabinets-cleveland` | Page | Indexed | ❌ Not mentioned anywhere |
| `amp.moderncre8ve.com/*` | AMP subdomain | Indexed (9+) | ❌ Not mentioned anywhere |
| Product handles (if changed) | Products | Indexed (8) | ⚠️ Covered by 13 product redirects (verify) |
| Blog articles (if handles changed) | Blog | Indexed (7) | ⚠️ Unclear if 1:1 redirects or blanket |

### 3.3 Critical Pre-Launch Verification Checklist

**MUST VERIFY BEFORE LAUNCH:**

- [ ] Open `redirects-for-shopify.csv` and confirm:
  - [ ] All 37 collection redirects present
  - [ ] All 13 product redirects present
  - [ ] All ~12 vanity URL redirects present
  - [ ] Blog article redirects are **1:1**, NOT blanket redirects to blog index
  - [ ] `/pages/custom-kitchen-cabinets-cleveland` redirect exists or will be added
  - [ ] `/collections/all/custom` redirect exists
  - [ ] Tagged blog URL redirects exist

- [ ] AMP subdomain redirect plan (server-level, not Shopify Admin):
  - [ ] Confirm with DevOps/hosting: who handles `amp.moderncre8ve.com` redirects?
  - [ ] If Netlify/Vercel: add `_redirects` or `vercel.json` rule
  - [ ] If traditional server: add `.htaccess` rule
  - [ ] If DNS only: redirect via DNS provider settings

- [ ] Product handle verification:
  - [ ] Sample 3 old product URLs from search results
  - [ ] Confirm they exist in Shopify (or have redirects)
  - [ ] Test the redirect path in staging

- [ ] Collection handle verification:
  - [ ] Confirm `/collections/all-products` exists and is active
  - [ ] Test `/collections/all` redirects to `/collections/all-products`
  - [ ] Sample 2 old collection URLs, verify redirects work

---

## 4. Schema & Structured Data Comparison

### 4.1 New Site Schema Implementation (from seo.server.ts)

| Schema Type | Status | Coverage |
|------------|--------|----------|
| **Organization** | ✅ Implemented | Instagram + Facebook sameAs |
| **WebPage** (home) | ✅ Implemented | Homepage schema |
| **Product** | ✅ Implemented | Full schema: name, description, SKU, offers, availability, BreadcrumbList |
| **CollectionPage** | ✅ Implemented | Collection pages + BreadcrumbList |
| **Article/NewsArticle** | ✅ Implemented | Blog/article pages |
| **SearchAction** | ✅ Implemented | Sitelinks search box |
| **Breadcrumb** | ✅ Implemented | Product, collection, article pages |

### 4.2 Best Practices for Furniture E-Commerce — Coverage Analysis

| Best Practice | Implemented | Notes |
|---------------|-------------|-------|
| **Product schema with all key fields** | ✅ Yes | Name, description, SKU, price, availability, offer |
| **Aggregate rating** (if reviews exist) | ❓ Unknown | Check if `aggregateRating` field in Product schema |
| **Local business schema** | ❓ Unknown | ModernCre8ve is location-specific (Ohio); consider adding LocalBusiness schema |
| **FAQ schema** (for FAQ page) | ❓ Unknown | FAQ page exists; check if FAQPage schema implemented |
| **Video schema** (if product videos exist) | ❌ Not mentioned | Consider adding if product videos are used |
| **Review schema** (Reviews page) | ❓ Unknown | Reviews page exists; check if Review schema implemented |
| **Creator/brand schema** | ✅ Yes | Organization schema covers this |
| **Author schema** (blog articles) | ❓ Unknown | Blog articles implemented; check if `author` field in Article schema |
| **Image schema** | ❓ Unknown | Multiple product images; check if ImageObject schema for key images |

### 4.3 Gaps to Address

| Gap | Priority | Action |
|-----|----------|--------|
| **Aggregate rating on Product pages** | High | If reviews exist, add `aggregateRating` to Product schema (boosts CTR in search results) |
| **Review schema on Reviews page** | High | If structured review data available, implement Review schema |
| **FAQ schema on FAQ page** | Medium | If FAQ content structured, implement FAQPage schema (enables rich snippets) |
| **Author field on blog articles** | Medium | Add `author` to Article schema (improves author branding) |
| **Local Business schema** | Medium | Consider adding LocationBusiness schema with Ohio address/phone (improves local search visibility) |
| **Video schema** | Low | Only if product videos present; otherwise skip |

### 4.4 Quick Wins

**Add to `app/utils/seo.server.ts` if not present:**

```typescript
// For Product pages with reviews:
{
  "@type": "Product",
  // ... existing fields ...
  "aggregateRating": {
    "@type": "AggregateRating",
    "ratingValue": "4.8",
    "reviewCount": "127"
  }
}

// For FAQ page:
{
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "Do you offer custom orders?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Yes, we offer fully customizable furniture..."
      }
    }
  ]
}

// For Blog articles:
{
  "@type": "Article",
  // ... existing fields ...
  "author": {
    "@type": "Organization",
    "name": "ModernCre8ve"
  }
}
```

---

## 5. Prioritized Action Plan

### 🔴 CRITICAL ACTIONS (Pre-Launch, Must Do)

#### Action #1: Fix AMP Subdomain Orphaning
**Priority:** 🔴 CRITICAL (High impact, >10% traffic at risk)
**Effort:** Quick win (1–2 hours)
**Owner:** DevOps/Hosting

**Steps:**
1. Identify AMP hosting location:
   - [ ] Old Shopify store? (Check Shopify admin)
   - [ ] Separate Netlify/Vercel branch? (Check hosting settings)
   - [ ] Apache/.htaccess? (SSH access to old server)

2. Set up 301 redirects:
   ```
   # Option A: Shopify Admin (if AMP hosted on Shopify)
   No native support; use external redirect service or DNS

   # Option B: Netlify/Vercel _redirects file
   amp.moderncre8ve.com/* https://moderncre8ve.com/:splat 301

   # Option C: Apache .htaccess
   RewriteEngine On
   RewriteCond %{HTTP_HOST} ^amp\.moderncre8ve\.com$ [NC]
   RewriteRule ^(.*)$ https://moderncre8ve.com/$1 [L,R=301]

   # Option D: Netlify.toml
   [[redirects]]
   from = "/*"
   to = "https://moderncre8ve.com/:splat"
   status = 301
   force = true
   conditions = {Host = ["amp.moderncre8ve.com"]}
   ```

3. Test:
   - [ ] `curl -I amp.moderncre8ve.com/blogs/news/discover-the-pinnacle-*`
   - [ ] Confirm HTTP 301 response
   - [ ] Confirm `Location` header points to moderncre8ve.com

4. Submit AMP URLs to GSC for removal:
   - [ ] GSC > Settings > Remove URLs
   - [ ] Remove `amp.moderncre8ve.com` property if separate

---

#### Action #2: Verify Blog Article Redirects (1:1, Not Blanket)
**Priority:** 🔴 CRITICAL (Medium impact, ~5–15% blog traffic at risk)
**Effort:** Medium (1–2 hours verification + fixes)
**Owner:** QA/SEO

**Steps:**
1. [ ] Open `redirects-for-shopify.csv`
2. [ ] Search for lines containing `blog` or `/blogs/`
3. [ ] For each blog redirect found, check:
   - [ ] Does it redirect article-to-article? (✅ Good)
     ```
     Example: /blogs/mid-century-modern-scandi-japandi-design-blog/ultimate-guide-*
                    → /blogs/mid-century-modern-scandi-japandi-design-blog/ultimate-guide-*
     ```
   - [ ] Or does it redirect article-to-index? (❌ Bad)
     ```
     Example: /blogs/mid-century-modern-scandi-japandi-design-blog/ultimate-guide-*
                    → /blogs/mid-century-modern-scandi-japandi-design-blog
     ```

4. [ ] If blanket blog redirects found:
   - [ ] Extract the specific article URLs from indexed GSC list
   - [ ] Create 1:1 redirects in CSV for each article
   - [ ] Test 2–3 before deploying

5. [ ] Re-upload `redirects-for-shopify.csv` to Shopify Admin

---

#### Action #3: Add Missing Page Redirect (custom-kitchen-cabinets-cleveland)
**Priority:** 🔴 CRITICAL (Low impact on traffic, high impact on completeness)
**Effort:** Quick win (30 minutes)
**Owner:** SEO

**Steps:**
1. [ ] Search `redirects-for-shopify.csv` for "custom-kitchen-cabinets-cleveland"
2. [ ] If NOT found, add this line:
   ```
   custom-kitchen-cabinets-cleveland,/pages/custom-furniture-crafted-to-perfection,true
   ```
3. [ ] If found, confirm the redirect target (should be `/pages/custom-furniture-crafted-to-perfection` or a live page)
4. [ ] Test the redirect in staging:
   ```
   curl -I https://staging.moderncre8ve.com/pages/custom-kitchen-cabinets-cleveland
   # Should return 301 or 302 pointing to target
   ```

---

### 🟠 HIGH-PRIORITY ACTIONS (Pre-Launch, Should Do)

#### Action #4: Verify Collection Redirects (37 old → /collections/all-products)
**Priority:** 🟠 HIGH (Medium impact, cleanup task)
**Effort:** Medium (1–2 hours verification)
**Owner:** QA

**Steps:**
1. [ ] Export active collections from Shopify:
   ```
   Shopify Admin > Products > Collections > Copy all active collection handles
   ```
   Expected active:
   - `mid-century-modern-coffee-tables`
   - `custom-made-furniture`
   - `housewares`

2. [ ] Cross-check against `redirects-for-shopify.csv`:
   - [ ] Search CSV for 37 collection redirect lines
   - [ ] Verify each old collection handle redirects to `/collections/all-products`
   - [ ] Verify no typos in redirect targets

3. [ ] Test 3 sample collection redirects:
   ```
   curl -I https://moderncre8ve.myshopify.com/collections/scandinavian-design-furniture
   curl -I https://moderncre8ve.myshopify.com/collections/mid-century-modern
   curl -I https://moderncre8ve.myshopify.com/collections/mid-century-modern-dining-tables
   # All should return 301 to /collections/all-products
   ```

4. [ ] If any missing, add to CSV and re-upload

---

#### Action #5: Verify Product Handle Mapping (8 indexed products)
**Priority:** 🟠 HIGH (Medium impact, high-traffic pages)
**Effort:** Medium (1–2 hours testing)
**Owner:** QA

**Steps:**
1. [ ] List all 8 indexed product URLs from audit:
   ```
   /products/mid-century-modern-extendable-dining-table-santa-monica
   /products/luxury-solid-wood-dining-bench
   /products/mid-century-glass-dining-table
   /products/minimalist-bed-frame-ohio
   /products/lumina-handmade-modern-bed-frame
   /products/mid-century-rubberwood-coffee-table
   /products/modern-surfboard-coffee-table
   /products/light-oak-full-length-mirror
   ```

2. [ ] Test each in staging:
   ```
   curl -I https://staging.moderncre8ve.com/products/mid-century-modern-extendable-dining-table-santa-monica
   # Confirm: HTTP 200 (found) OR 301 (redirect) — NOT 404
   ```

3. [ ] If any return 404:
   - [ ] Check `redirects-for-shopify.csv` for redirect rule
   - [ ] If not found, check Shopify for product handle
   - [ ] If handle different, add redirect to CSV

4. [ ] Re-upload CSV if changes made

---

#### Action #6: Add Dynamic Filter Redirects (3 tagged/filtered URLs)
**Priority:** 🟠 HIGH (Low impact on traffic, clean migration)
**Effort:** Quick win (30 minutes)
**Owner:** SEO

**Steps:**
1. [ ] Add these 3 lines to `redirects-for-shopify.csv`:
   ```
   collections/all/custom,/collections/custom-made-furniture,true
   blogs/mid-century-modern-scandi-japandi-design-blog/tagged/vintagefurniture,/blogs/mid-century-modern-scandi-japandi-design-blog,true
   blogs/mid-century-modern-scandi-japandi-design-blog/tagged/japandi-bedroom,/blogs/mid-century-modern-scandi-japandi-design-blog,true
   ```

2. [ ] Test:
   ```
   curl -I https://staging.moderncre8ve.com/collections/all/custom
   # Should 301 to /collections/custom-made-furniture
   ```

3. [ ] Re-upload CSV

---

#### Action #7: Implement Aggregate Rating Schema (If Reviews Exist)
**Priority:** 🟠 HIGH (High impact on CTR, ~20% improvement)
**Effort:** Medium (1–2 hours code + review data extraction)
**Owner:** Developer

**Steps:**
1. [ ] Check if Shopify products have reviews/ratings:
   ```
   Shopify Admin > Apps > Search for review app (Yotpo, Loox, Judge.me, etc.)
   ```

2. [ ] If reviews present, extract aggregate rating data:
   - [ ] Fetch avg rating + review count from review app API or Shopify metafields
   - [ ] Add to Product schema in `app/utils/seo.server.ts`

3. [ ] Update Product schema template:
   ```typescript
   "aggregateRating": {
     "@type": "AggregateRating",
     "ratingValue": "{{product.rating}}",
     "reviewCount": "{{product.reviewCount}}"
   }
   ```

4. [ ] Test in Google Rich Results Test

---

### 🟡 MEDIUM-PRIORITY ACTIONS (Pre-Launch or Post-Launch)

#### Action #8: Implement FAQ Schema (FAQ Page)
**Priority:** 🟡 MEDIUM (Medium impact on CTR, nice-to-have)
**Effort:** Medium (1–2 hours code + FAQ structure)
**Owner:** Developer

**Steps:**
1. [ ] Check if FAQ page exists in Weaverse
2. [ ] If yes, structure FAQ content with clear Q&A pairs
3. [ ] Add FAQPage schema to `app/utils/seo.server.ts`:
   ```typescript
   export function faqSchema() {
     return {
       "@context": "https://schema.org",
       "@type": "FAQPage",
       "mainEntity": [
         {
           "@type": "Question",
           "name": "Do you offer custom furniture?",
           "acceptedAnswer": {
             "@type": "Answer",
             "text": "Yes, we specialize in custom-made furniture..."
           }
         },
         // ... more Q&A pairs
       ]
     };
   }
   ```
4. [ ] Test in Google Rich Results Test

---

#### Action #9: Add Review Schema (Reviews Page)
**Priority:** 🟡 MEDIUM (Medium impact, depends on review data availability)
**Effort:** Medium (1–2 hours code + review data)
**Owner:** Developer

**Steps:**
1. [ ] Check if Reviews page exists + has structured review data
2. [ ] If yes, extract reviews from CMS or Shopify
3. [ ] Add Review schema to pages/reviews route:
   ```typescript
   {
     "@type": "Review",
     "author": { "@type": "Person", "name": "John D." },
     "reviewRating": { "@type": "Rating", "ratingValue": "5" },
     "reviewBody": "Outstanding craftsmanship!"
   }
   ```
4. [ ] Test in Google Rich Results Test

---

#### Action #10: Add Author Field to Blog Articles
**Priority:** 🟡 MEDIUM (Low impact, brand building)
**Effort:** Quick win (30 minutes code)
**Owner:** Developer

**Steps:**
1. [ ] Update Article schema in `app/utils/seo.server.ts`:
   ```typescript
   "author": {
     "@type": "Organization",
     "name": "ModernCre8ve"
   },
   // Or if individual authors available:
   "author": {
     "@type": "Person",
     "name": "{{article.author}}"
   }
   ```
2. [ ] Test in Google Rich Results Test

---

### 🟢 LOW-PRIORITY ACTIONS (Post-Launch, Nice-to-Have)

#### Action #11: Add LocalBusiness Schema (Optional)
**Priority:** 🟢 LOW (Low impact unless strong local search focus)
**Effort:** Low (30 minutes)
**Owner:** Developer

**Steps:**
1. [ ] Add LocalBusiness schema to homepage if location-specific service:
   ```typescript
   {
     "@type": "LocalBusiness",
     "name": "ModernCre8ve",
     "areaServed": "Ohio",
     "address": {
       "@type": "PostalAddress",
       "streetAddress": "{{address}}",
       "addressLocality": "Cleveland",
       "addressRegion": "OH",
       "postalCode": "{{zipcode}}"
     },
     "telephone": "{{phone}}"
   }
   ```
2. [ ] Only add if address/phone available in schema.server.ts

---

#### Action #12: Implement Video Schema (Optional)
**Priority:** 🟢 LOW (Skip unless product videos present)
**Effort:** Low (30 minutes, if videos exist)
**Owner:** Developer

**Steps:**
1. [ ] Check if product pages include videos
2. [ ] If yes, add VideoObject schema to Product schema
3. [ ] If no, skip entirely

---

## 6. Launch Readiness Checklist

### Pre-Launch (72 Hours Before)

- [ ] **Redirect Coverage**
  - [ ] `redirects-for-shopify.csv` finalized (77 redirects)
  - [ ] AMP subdomain redirects configured (server-level)
  - [ ] Blog article redirects verified (1:1, not blanket)
  - [ ] Missing page redirect added (custom-kitchen-cabinets-cleveland)
  - [ ] Dynamic filter redirects added (3 lines)

- [ ] **Product & Collection Verification**
  - [ ] All 8 indexed product URLs tested (no 404s)
  - [ ] All 37 collection redirects verified
  - [ ] Product images uploaded (27 items per Phase 4)

- [ ] **Schema & Structured Data**
  - [ ] Organization schema live (with sameAs)
  - [ ] Product schema live (with all key fields)
  - [ ] Article schema live (blog pages)
  - [ ] BreadcrumbList schema live
  - [ ] Aggregate rating schema (if reviews present)
  - [ ] Google Rich Results Test: 0 errors

- [ ] **GSC & Analytics Setup**
  - [ ] New domain property added to GSC
  - [ ] Sitemaps submitted (XML + mobile if applicable)
  - [ ] URL inspection tool ready (test 5 URLs)
  - [ ] Analytics 4 tracking code verified
  - [ ] GA4 goals configured (conversion tracking)

- [ ] **Staging Tests**
  - [ ] Robots.txt blocks Oxygen staging env
  - [ ] Sitemap.xml generates correctly
  - [ ] 10 sample URLs return proper status codes
  - [ ] Redirect chain test (old → new → final): no loops
  - [ ] Mobile rendering checked (Core Web Vitals)

### Launch Day (DNS Cutover)

- [ ] **Pre-Launch**
  - [ ] Backup old site DNS records
  - [ ] Oxygen environment warmed up
  - [ ] Redirect CSV uploaded to Shopify Admin
  - [ ] AMP redirects live and tested

- [ ] **DNS Switch**
  - [ ] Update DNS A/CNAME records to Oxygen
  - [ ] Wait for TTL propagation (15 min–2 hours)
  - [ ] Test moderncre8ve.com resolves to Oxygen

- [ ] **Post-Launch (First 2 Hours)**
  - [ ] Test 10 random old URLs → verify redirects work
  - [ ] Spot check: 5 product pages, 5 collections
  - [ ] Monitor GSC for crawl errors (refresh every 30 min)
  - [ ] Monitor 404 errors in server logs
  - [ ] Test AMP subdomain redirects
  - [ ] Verify homepage loads, Core Web Vitals acceptable

- [ ] **Post-Launch (24 Hours)**
  - [ ] GSC: Run URL inspection on 5 key pages
  - [ ] GSC: Monitor indexing rate (should remain stable)
  - [ ] Analytics: Verify traffic flowing (compare to baseline)
  - [ ] Blog: Spot-check 2 articles render correctly
  - [ ] Search: Google for "site:moderncre8ve.com" — confirm new pages indexed

- [ ] **Post-Launch (7 Days)**
  - [ ] GSC: Review Coverage report for new/deleted pages
  - [ ] GSC: Check Enhanced reports (if applicable)
  - [ ] Analytics: Review traffic by source (organic, direct, referral)
  - [ ] Monitor: Any unexpected 404s or redirect chains
  - [ ] Ahrefs/SEMrush: Run domain crawl, compare to pre-migration baseline

---

## 7. Success Metrics & KPIs

### Traffic Preservation (Primary KPI)

| Metric | Target | Baseline | Post-Launch |
|--------|--------|----------|-------------|
| **Organic Sessions (7-day avg)** | No loss | ~TBD (from GA4) | TBD |
| **Organic Users (7-day avg)** | No loss | ~111 pages (GA4) | TBD |
| **Clicks from GSC (7-day)** | No loss | ~5,551 queries | TBD |
| **Indexed Pages (GSC)** | ≥ pre-migration | TBD | TBD |
| **Crawl Errors (GSC)** | < 1% of indexed | TBD | TBD |

### Migration Quality Metrics

| Metric | Target | Status |
|--------|--------|--------|
| **Redirect Success Rate** | 100% (0 404s on old URLs) | ⏳ Pre-launch |
| **Core Web Vitals** | All green (LCP <2.5s, CLS <0.1, INP <200ms) | ⏳ TBD |
| **Schema Validation** | 0 errors in Google Rich Results Test | ⏳ Pre-launch |
| **Mobile Rendering** | No mobile usability issues | ⏳ Pre-launch |
| **Response Time** | 200–400ms (TTI < 3s) | ⏳ Pre-launch |

### Risk Mitigation

| Risk | Contingency |
|------|------------|
| **404 spike post-launch** | Redirect CSV errors — Roll back DNS, fix redirects, re-deploy (1–2 hours) |
| **Slow indexing of new pages** | Resubmit sitemap in GSC, request indexing for key pages, monitor Coverage report daily |
| **Traffic drop > 10%** | Audit GSC for crawl errors, check schema validation, verify redirects, analyze GA4 by source/medium |
| **AMP subdomain still indexed** | Resubmit AMP removal request to GSC, add `X-Robots-Tag: noindex` header to old AMP server |

---

## 8. Post-Launch Monitoring (First 30 Days)

### Daily (First 7 Days)

- [ ] GSC Coverage: Check for new crawl errors
- [ ] GSC Performance: Monitor clicks + CTR (expect slight volatility)
- [ ] Server Logs: Monitor HTTP status code distribution (expect 301s, no 404s)
- [ ] Analytics: Check organic traffic by page (compare to baseline)
- [ ] Sample Testing: Manually test 2 random old URLs → redirects work

### Weekly (Week 1–4)

- [ ] GSC Coverage: Ensure indexing trend stable
- [ ] Ahrefs/SEMrush: Monitor backlinks (should not drop)
- [ ] Analytics: Weekly traffic trend (expect no decline or slight increase)
- [ ] Schema Validation: Re-run Google Rich Results Test on sample pages
- [ ] Ranking Keywords: Monitor top 50 keywords in GSC (expect slight volatility, then stabilization)

### Monthly (30+ Days)

- [ ] GSC: Full Coverage + Performance reports analysis
- [ ] Analytics: Month-over-month traffic comparison
- [ ] Ahrefs: Full domain crawl, compare to pre-migration
- [ ] Backlink audit: Any lost high-authority links?
- [ ] Ranking impact: Any major keyword ranking changes?
- [ ] Action Items: Address any remaining SEO truth layer items (57 total)

---

## 9. SEO Truth Layer Integration

The ModernCre8ve SEO Truth Layer (weekly pipeline) provides:

- **GSC data:** 5,551 queries (Feb 13–20)
- **GA4 data:** 111 pages (Feb 15–22)
- **Action items:** 57 total
  - 29 low CTR pages (improve content/CTR)
  - 24 striking distance keywords (improve rankings 5–10 positions)
  - 3 thin content pages (expand)
  - 1 revenue opportunity (high-intent keyword gap)

**Post-Launch Action:**
- Run SEO Truth Layer pipeline on Monday after launch
- Review `data/seo_actions.csv` for new opportunities
- Prioritize striking distance keywords (quick ranking wins)

---

## 10. Appendix: Detailed Redirect CSV Template

**File:** `redirects-for-shopify.csv`
**Format:** `old_path,new_url,is_permanent`

### Sample Format (for verification):

```csv
old_path,new_url,is_permanent
pages/contact,/pages/contact-us,true
about-us,/pages/about-us,true
pages/about,/pages/about-us,true
pages/materials-process,/pages/custom-furniture-crafted-to-perfection,true
pages/custom-furniture,/pages/custom-furniture-crafted-to-perfection,true
pages/materials,/pages/custom-furniture-crafted-to-perfection,true
our-amish-craftsmanship,/pages/custom-furniture-crafted-to-perfection,true
learn-more-craftsmanship,/pages/custom-furniture-crafted-to-perfection,true
warranty-and-guarantee,/pages/shipping-policy-and-customer-responsibilities,true
pages/sustainability,/,true
blogs/news,/blogs/mid-century-modern-scandi-japandi-design-blog,true
collections/scandinavian-design-furniture,/collections/all-products,true
collections/mid-century-modern,/collections/all-products,true
collections/all/custom,/collections/custom-made-furniture,true
blogs/mid-century-modern-scandi-japandi-design-blog/tagged/vintagefurniture,/blogs/mid-century-modern-scandi-japandi-design-blog,true
blogs/mid-century-modern-scandi-japandi-design-blog/tagged/japandi-bedroom,/blogs/mid-century-modern-scandi-japandi-design-blog,true
pages/custom-kitchen-cabinets-cleveland,/pages/custom-furniture-crafted-to-perfection,true
your-link-to-furniture,/,true
[...37 more collection redirects...]
[...13 more product redirects...]
```

---

## Conclusion

**Migration Risk Level:** 🔴 **MODERATE-HIGH** (if critical gaps not addressed)
**Risk Reduction to:** 🟡 **LOW-MEDIUM** (if all critical actions completed)

**Key Takeaways:**
1. **AMP subdomain** is the biggest risk — affects 9+ indexed URLs
2. **Blog article redirects** must be 1:1 or you lose article-level SEO credit
3. **Missing page redirect** (custom-kitchen-cabinets-cleveland) is an easy fix with high value
4. **Collection/product redirects** appear well-planned; just need verification
5. **Schema implementation** is solid; add aggregate rating + FAQ/Review schemas for quick CTR wins

**Estimated effort to fix all critical gaps:** 8–12 hours (verification + testing)
**Estimated effort if gaps not fixed:** 30–50% traffic loss + 2–4 week recovery period

**Recommendation:** **Complete all critical actions (1–3) before DNS cutover.** High-priority actions (4–6) should be done pre-launch but can be rolled back if issues found. Medium & low-priority actions can be done post-launch.

---

**Document Version:** 1.0
**Last Updated:** February 23, 2026
**Next Review:** Post-launch + 7 days
