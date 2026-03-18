# ModernCre8ve Conversion Playbook

> **Generated:** 2026-03-17 | **Data window:** Mar 1–8 2026 + full customer history
> **Format:** Agentic task specs — each initiative is self-contained and executable by an AI agent or human operator.
> **Rollout:** Sequential by priority. Each initiative includes gate criteria before proceeding.

---

## Rollout Sequence

| Phase | Initiative | Est. Impact | Effort | Dependency |
|-------|-----------|-------------|--------|------------|
| 1 | Fix Search CTR | +150–300 clicks/wk | Low | None |
| 2 | Reduce Homepage Bounce | +15–25% routing to products | Medium | None |
| 3 | Launch Email Nurture | Revenue from 3,641 subs | Medium | Klaviyo or Shopify Email |
| 4 | Build VIP Repeat Program | +$50K–100K repeat revenue | Medium | Phase 3 email infra |
| 5 | Clean Customer List | Deliverability + data hygiene | Low | Phase 3 email infra |

---

## Initiative 1: Fix Search CTR

**Problem:** 20,268 weekly impressions generating only 77 clicks (0.38% CTR). Industry benchmark is 2–4%.
**Goal:** Raise CTR to ≥1.5% within 30 days → +225 incremental clicks/week.

### Data Backing
- 5,253 unique queries, heavily long-tail furniture terms
- Top impression pages have generic or missing meta titles
- Branded queries (`moderncre8ve`) converting well; non-branded lagging

### Tasks

```
TASK 1.1 — Extract priority page list
  INPUT:  seo-truth-layer/data/seo_truth_merged.csv
  ACTION: Sort by total_impressions DESC, filter pages with CTR < 1%
  OUTPUT: priority-pages.csv (top 20 pages by impression volume with CTR < 1%)
  TOOL:   Python/pandas or spreadsheet

TASK 1.2 — Audit current meta titles + descriptions
  INPUT:  priority-pages.csv
  ACTION: For each page, extract current <title> and <meta description> from live site
          or from route loader's seo() return value in app/utils/seo.server.ts
  OUTPUT: meta-audit.csv with columns: page_path, current_title, current_description,
          impressions, clicks, ctr, top_queries[]
  TOOL:   Shopify Storefront API or direct HTML fetch

TASK 1.3 — Rewrite meta titles + descriptions
  INPUT:  meta-audit.csv
  ACTION: For each page, write new title (≤60 chars) and description (≤155 chars)
          incorporating top search queries naturally. Follow patterns:
          - Product pages: "[Product Name] — [Key Feature] | ModernCre8ve"
          - Collection pages: "[Collection] Furniture — Handcrafted [Style] | ModernCre8ve"
          - Include differentiators: "handcrafted", "12–16 week made-to-order", "white glove delivery"
  OUTPUT: meta-rewrites.csv with old/new title + description pairs
  TOOL:   LLM content generation with brand voice constraints

TASK 1.4 — Implement meta changes
  INPUT:  meta-rewrites.csv
  ACTION: Update SEO metadata via one of:
          a) Shopify Admin API — update product/collection SEO fields
          b) Code change in app/utils/seo.server.ts for template-level changes
          c) Weaverse Studio page-level SEO fields for custom pages
  OUTPUT: Git commit with changes or Admin API confirmation
  TOOL:   Shopify Admin API / code editor

TASK 1.5 — Submit for re-indexing
  INPUT:  List of updated URLs
  ACTION: Submit each URL to Google Search Console for re-indexing via URL Inspection API
  OUTPUT: Indexing confirmation log
  TOOL:   Google Search Console API or manual submission
```

### Success Criteria
- [ ] CTR ≥ 1.5% on rewritten pages within 30 days (measured via GSC)
- [ ] No drop in impression volume (indicating no ranking loss)
- [ ] Click volume ≥ 200/week (up from 77)

### Gate → Phase 2
Proceed to Phase 2 immediately (no dependency). Can run in parallel.

---

## Initiative 2: Reduce Homepage Bounce

**Problem:** 62% homepage bounce rate. 73% of sessions that reach the homepage never view a product. Homepage is a dead end.
**Goal:** Reduce bounce to ≤40% and increase product page routing to ≥50% of homepage sessions.

### Data Backing
- 37 sessions tracked, 23 bounced from homepage
- Only 10 sessions reached a product page (27% of total)
- Homepage → Product is the #1 funnel leak
- Average session duration: 1m 42s (engaged users spend time, but many leave immediately)

### Tasks

```
TASK 2.1 — Audit current homepage above-the-fold
  INPUT:  Live homepage at moderncre8ve-v2-*.o2.myshopify.dev
  ACTION: Screenshot and document current above-the-fold content
          Identify: hero image, CTA placement, navigation clarity, product visibility
          Note what's visible without scrolling on desktop (1440px) and mobile (375px)
  OUTPUT: homepage-audit.md with screenshots + findings
  TOOL:   Browser screenshot / Lighthouse

TASK 2.2 — Design homepage routing strategy
  INPUT:  homepage-audit.md, seo_truth_merged.csv (top performing collections)
  ACTION: Define new above-the-fold layout priorities:
          1. Primary CTA → top-selling collection (identify from data)
          2. Secondary CTAs → 2-3 collection tiles with product imagery
          3. Social proof element (review count, "X happy homes furnished")
          4. Remove or minimize any content that doesn't route to products
  OUTPUT: homepage-wireframe.md with layout spec and CTA copy
  TOOL:   Design tool or markdown wireframe

TASK 2.3 — Identify top collections for homepage featuring
  INPUT:  seo_truth_merged.csv, Shopify Admin API (collection performance)
  ACTION: Rank collections by: revenue, sessions, conversion rate
          Select top 3-4 collections for homepage prominence
          Pull hero product images for each
  OUTPUT: featured-collections.json with collection handles, titles, hero images, CTAs
  TOOL:   Python/pandas + Shopify Admin API

TASK 2.4 — Implement homepage changes in Weaverse
  INPUT:  homepage-wireframe.md, featured-collections.json
  ACTION: Update homepage layout in Weaverse Studio or via fallback JSON:
          - Rebuild hero section with product-forward imagery
          - Add collection grid section below fold
          - Ensure every visible element links to a product or collection
          - Add urgency/scarcity cues ("Handcrafted to order — 12-16 week lead time")
  OUTPUT: Updated Weaverse page data or code changes in app/sections/
  TOOL:   Weaverse Studio / code editor

TASK 2.5 — Add scroll-depth + click tracking
  INPUT:  PUBLIC_GOOGLE_GTM_ID (G-R1KFYYKE48)
  ACTION: Configure GA4 events for:
          - scroll_depth (25%, 50%, 75%, 100%)
          - homepage_cta_click (with CTA label as parameter)
          - collection_tile_click
  OUTPUT: GTM tag configuration or gtag.js event code
  TOOL:   Google Tag Manager / code change in root.tsx
```

### Success Criteria
- [ ] Homepage bounce rate ≤ 40% (down from 62%)
- [ ] Product page views ≥ 50% of homepage sessions (up from 27%)
- [ ] At least 2 homepage CTAs achieving > 5% click-through rate
- [ ] Average session duration ≥ 2m 30s

### Gate → Phase 3
Phase 3 can start in parallel. No hard dependency.

---

## Initiative 3: Launch Email Nurture Flows

**Problem:** 3,641 email-opted-in subscribers sitting dormant. No automated flows. $1,906 AOV means even 1 conversion from email = significant revenue.
**Goal:** Activate subscriber base with welcome + nurture sequences. Target: 5 email-attributed purchases in first 60 days.

### Data Backing
- 79.9% email opt-in rate across 4,555 customers
- 3,641 subscribers, 717 have purchased (19.7% of opted-in)
- 2,924 opted-in subscribers have NEVER purchased
- $1,906 average order value — email ROI is extremely high per conversion
- Klaviyo was removed in v1.3.6; need new email platform decision

### Tasks

```
TASK 3.1 — Select and configure email platform
  INPUT:  Store requirements: Shopify integration, automation flows, segment builder
  ACTION: Evaluate options:
          a) Shopify Email (free tier, native integration, limited automation)
          b) Klaviyo (re-integrate, best Shopify automation, cost scales with list size)
          c) Omnisend (middle ground, good automation, Shopify native)
  DECISION CRITERIA: Automation capability > cost > ease of setup
  OUTPUT: Platform decision document with rationale
  TOOL:   Research + decision matrix

TASK 3.2 — Segment customer list
  INPUT:  customer_data/customers_export.csv
  ACTION: Create segments:
          SEGMENT A — "VIP Buyers" (total_spent ≥ $2,000) → 370 customers
          SEGMENT B — "One-Time Buyers" (total_orders = 1, total_spent > 0) → 632 customers
          SEGMENT C — "Warm Prospects" (opted in, total_orders = 0, valid email) → ~2,900 customers
          SEGMENT D — "Spam/Invalid" (email contains shopify-email-will-never-arrive) → ~1,280 customers
  OUTPUT: 4 segment CSV files ready for import
  TOOL:   Python/pandas

TASK 3.3 — Build Welcome Flow (new subscribers)
  INPUT:  Brand voice (Jost/Spectral, warm/premium tone), product catalog
  ACTION: Design 4-email welcome sequence:
          Email 1 (immediate): "Welcome to ModernCre8ve" — brand story, craftsmanship ethos
          Email 2 (Day 3): "How We Build" — behind-the-scenes, 12-16 week process explained
          Email 3 (Day 7): "Our Most-Loved Pieces" — top 3 products with lifestyle imagery
          Email 4 (Day 14): "Your Space, Reimagined" — social proof + soft CTA with lead time framing
  OUTPUT: 4 email drafts (subject line, preview text, body copy, CTA) in markdown
  TOOL:   LLM content generation with brand constraints

TASK 3.4 — Build Nurture Flow (prospects who haven't bought)
  INPUT:  Segment C list, product catalog, collection data
  ACTION: Design 6-email nurture sequence (bi-weekly cadence):
          Email 1: Style quiz / preference survey (gather data)
          Email 2: Curated collection based on browsing/quiz data
          Email 3: Customer story / testimonial spotlight
          Email 4: "The Investment Piece" — value proposition + longevity messaging
          Email 5: Limited availability / new arrival announcement
          Email 6: Personal note from founder + exclusive offer
  OUTPUT: 6 email drafts with subject lines, conditional logic notes
  TOOL:   LLM content generation

TASK 3.5 — Build Post-Purchase Flow (buyers)
  INPUT:  Segment A + B lists, typical delivery timeline (12-16 weeks)
  ACTION: Design post-purchase sequence:
          Email 1 (Day 1): Order confirmation + what to expect
          Email 2 (Week 4): Production update + care guide preview
          Email 3 (Week 10): "Your piece is almost ready" + delivery prep
          Email 4 (Post-delivery +7): Care instructions + review request
          Email 5 (Post-delivery +30): Complementary pieces recommendation
  OUTPUT: 5 email drafts with timing logic
  TOOL:   LLM content generation

TASK 3.6 — Implement and launch flows
  INPUT:  All email drafts, segment CSVs, chosen platform
  ACTION: Build flows in email platform, import segments, configure triggers
          Set up tracking: opens, clicks, revenue attribution
          QA: Send test emails to internal addresses
  OUTPUT: Live flows with monitoring dashboard
  TOOL:   Email platform admin
```

### Success Criteria
- [ ] All 3 flows live within 14 days of platform selection
- [ ] Welcome flow open rate ≥ 40% (furniture/premium benchmark)
- [ ] Nurture flow generates ≥ 5 purchases in first 60 days ($9,500+ revenue)
- [ ] Unsubscribe rate < 0.5% per send
- [ ] Post-purchase flow review collection rate ≥ 10%

### Gate → Phase 4
Phase 4 requires email infrastructure from Phase 3. Begin Phase 4 after flows are live.

---

## Initiative 4: Build VIP Repeat Program

**Problem:** 370 whale customers ($2K+ lifetime spend) drive 82% of revenue ($1.27M) but repeat rate is only 11.9%. These customers are undertapped.
**Goal:** Increase repeat purchase rate among VIPs to 20% within 90 days. Target: 30 repeat purchases × $1,906 AOV = $57K incremental revenue.

### Data Backing
- 370 customers at $2K+ tier = $1.27M (82% of $1.56M total)
- Only 85 of 717 buyers (11.9%) have made repeat purchases
- Furniture replacement cycle: 3-7 years, but cross-sell opportunity is immediate
- No loyalty program, no VIP treatment, no post-purchase engagement currently

### Tasks

```
TASK 4.1 — Profile VIP segment
  INPUT:  customer_data/customers_export.csv
  ACTION: Deep analysis of 370 VIP customers:
          - Geographic distribution (city, state — identify clusters)
          - Purchase frequency distribution
          - Average time between orders (for repeat buyers)
          - Product category preferences (cross-reference with Shopify orders API)
          - Tag analysis (existing tags on VIP accounts)
  OUTPUT: vip-profile.md with demographic + behavioral summary
  TOOL:   Python/pandas + Shopify Admin API

TASK 4.2 — Design VIP program structure
  INPUT:  vip-profile.md, product catalog, pricing data
  ACTION: Define VIP program:
          TIER 1 "Collector" ($2K-5K lifetime): Early access to new pieces + care kit
          TIER 2 "Patron" ($5K-10K lifetime): Above + complimentary design consultation
          TIER 3 "Founder's Circle" ($10K+ lifetime): Above + custom piece priority + annual home visit
          Benefits should emphasize ACCESS and EXPERIENCE over discounts (premium brand)
  OUTPUT: vip-program-spec.md with tier definitions, benefits, communication plan
  TOOL:   Strategy document

TASK 4.3 — Build VIP email sequences
  INPUT:  vip-program-spec.md, Segment A from Task 3.2
  ACTION: Create VIP-specific email flows:
          - VIP Welcome: "You're one of our most valued clients" (warm, personal)
          - Quarterly: New collection early access (48hr window before public)
          - Annual: "Your home with ModernCre8ve" — anniversary of first purchase
          - Cross-sell: Based on what they own, recommend complementary pieces
  OUTPUT: Email sequence drafts with personalization tokens
  TOOL:   LLM content generation + email platform
  DEPENDENCY: Phase 3 email infrastructure

TASK 4.4 — Implement cross-sell recommendation engine
  INPUT:  Product catalog relationships, VIP purchase history
  ACTION: Build product affinity map:
          - Which products are commonly bought together?
          - Which collections complement each other?
          - Map "if bought X, recommend Y" rules
          Implement as: email dynamic content blocks or on-site recommendation section
  OUTPUT: Product affinity matrix + recommendation logic
  TOOL:   Python/pandas + Shopify Admin API

TASK 4.5 — Launch and measure
  INPUT:  All VIP program components
  ACTION: Soft launch to top 50 VIPs first (highest lifetime value)
          Monitor: email engagement, site revisits, repeat purchases
          Iterate based on 2-week data before full 370-customer rollout
  OUTPUT: Launch report with initial metrics
  TOOL:   Email platform + GA4 tracking
```

### Success Criteria
- [ ] VIP repeat purchase rate ≥ 20% within 90 days (up from 11.9%)
- [ ] ≥ 30 repeat purchases from VIP segment in 90 days
- [ ] VIP email open rate ≥ 50% (personal, high-relevance content)
- [ ] Zero VIP unsubscribes in first 30 days
- [ ] ≥ $57K incremental revenue attributed to VIP program

### Gate → Phase 5
Phase 5 can begin in parallel once email platform is configured (Phase 3, Task 3.1).

---

## Initiative 5: Clean Customer List

**Problem:** 84% of 4,555 customer records have zero purchases. 1,280 records contain `shopify-email-will-never-arrive` spam-protected addresses. List hygiene directly impacts email deliverability and data quality.
**Goal:** Reduce list to verified, engaged contacts. Remove or suppress invalid records. Improve deliverability score.

### Data Backing
- 4,555 total records → 717 paying (15.7%) → 3,838 non-paying (84.3%)
- 1,280 records with spam-protected/invalid emails (~28% of total)
- 2,597 records: opted in, zero purchases, but potentially valid emails
- SMS opt-in: only 38 customers (0.8%) — untapped channel
- Dirty list will tank deliverability for Phase 3 + 4 email campaigns

### Tasks

```
TASK 5.1 — Categorize all non-purchasing records
  INPUT:  customer_data/customers_export.csv
  ACTION: Classify 3,838 non-purchasing records:
          CAT A — "Spam/Invalid": email contains 'shopify-email-will-never-arrive'
                  or matches known disposable email domains → SUPPRESS
          CAT B — "Unengaged Opt-In": valid email, opted in, no purchases,
                  no site activity in 90+ days → SUNSET CANDIDATE
          CAT C — "Recent Prospect": valid email, opted in, created in last 90 days → KEEP
          CAT D — "Opted Out": email marketing = false → SUPPRESS from marketing
  OUTPUT: customer-hygiene.csv with category assignments
  TOOL:   Python/pandas

TASK 5.2 — Validate email addresses
  INPUT:  CAT B + CAT C records from Task 5.1
  ACTION: Run email validation on remaining "valid" addresses:
          - Check MX records exist
          - Identify role-based addresses (info@, admin@)
          - Flag high-risk domains
          Options: ZeroBounce, NeverBounce, or Kickbox API
  OUTPUT: validated-emails.csv with deliverability scores
  TOOL:   Email validation API

TASK 5.3 — Execute suppression in Shopify
  INPUT:  customer-hygiene.csv (CAT A records)
  ACTION: For 1,280 spam-protected records:
          - Tag as "suppressed-spam" in Shopify
          - Remove email marketing consent via Admin API
          - Do NOT delete records (preserve for order history if any exist)
  OUTPUT: Suppression confirmation log
  TOOL:   Shopify Admin API (customerUpdate mutation)

TASK 5.4 — Run sunset flow for unengaged subscribers
  INPUT:  CAT B records from Task 5.1
  ACTION: Before suppressing, run a 2-email re-engagement sequence:
          Email 1: "We miss you — here's what's new at ModernCre8ve"
          Email 2 (Day 7 if no open): "Last chance to stay connected"
          If no engagement after Email 2 → suppress from marketing
          If any engagement → move to Phase 3 nurture flow
  OUTPUT: Re-engagement flow results + final suppression list
  TOOL:   Email platform (requires Phase 3 infra)
  DEPENDENCY: Phase 3, Task 3.1

TASK 5.5 — Establish ongoing hygiene process
  INPUT:  Learnings from Tasks 5.1–5.4
  ACTION: Document and automate:
          - Monthly: Flag new spam-protected records → auto-suppress
          - Quarterly: Run email validation on full list
          - Automated: Tag customers by engagement recency (active/dormant/churned)
          - Dashboard: List health metrics (deliverability score, engagement %, suppression rate)
  OUTPUT: hygiene-process.md + automation rules in email platform
  TOOL:   Email platform automation + documentation
```

### Success Criteria
- [ ] ≥ 1,280 spam records suppressed within 7 days
- [ ] Email list deliverability score ≥ 95% (post-validation)
- [ ] Re-engagement flow recovers ≥ 5% of CAT B contacts
- [ ] Ongoing hygiene automation running monthly
- [ ] Clean list size documented (expected: ~2,500 marketable contacts)

---

## Execution Summary

| Week | Actions |
|------|---------|
| 1 | Start Phase 1 (meta rewrites) + Phase 2 (homepage audit) in parallel |
| 2 | Implement Phase 1 changes, design Phase 2 layout, select email platform (Phase 3) |
| 3 | Deploy Phase 2 homepage, begin Phase 3 email flow builds, start Phase 5 list cleaning |
| 4 | Launch Phase 3 welcome + nurture flows, complete Phase 5 suppression |
| 5–6 | Monitor Phase 1–3 metrics, begin Phase 4 VIP program design |
| 7–8 | Soft launch Phase 4 VIP program to top 50 customers |
| 9–12 | Full Phase 4 rollout, run Phase 5 sunset flow, measure all initiatives |

## Revenue Impact Model

| Initiative | Conservative | Optimistic | Timeframe |
|-----------|-------------|-----------|-----------|
| Fix Search CTR | +150 clicks/wk → 2 purchases/mo | +300 clicks/wk → 5 purchases/mo | 30 days |
| Reduce Homepage Bounce | +3 purchases/mo | +8 purchases/mo | 45 days |
| Email Nurture | 5 purchases / 60 days | 15 purchases / 60 days | 60 days |
| VIP Repeat | 30 repeats / 90 days | 50 repeats / 90 days | 90 days |
| Clean List | Enables 3 + 4 | Enables 3 + 4 | 14 days |
| **Total @ $1,906 AOV** | **~$76K / quarter** | **~$149K / quarter** | **90 days** |

---

*This playbook is designed for agentic execution. Each task block includes explicit INPUT, ACTION, OUTPUT, and TOOL fields. An AI agent can pick up any task, verify its inputs exist, execute the action, and validate the output against success criteria. Human review is recommended at each phase gate.*
