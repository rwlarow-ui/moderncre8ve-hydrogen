# ModernCre8ve Post-Deployment SEO Analysis (Updated)

**Date:** 2026-03-12  
**Analyst:** Codex  
**Scope:** Updated SEO health assessment after deployment, using repo-available ranking/keyword exports and current redirect/configuration files.

---

## 1) Method + Constraints

### Data sources used
- `moderncre8ve_overview_2026-03-06_16-25-49.csv` (584 tracked keywords with previous vs current position/traffic fields).
- `moderncre8ve-gsc-keywords-history_2026-03-06_16-18-51.csv` (daily history for 5 priority queries).
- `redirects-for-shopify.csv` (84 redirect mappings currently tracked in repo).
- Runtime SEO configuration in app routes (`app/root.tsx`, robots/sitemap route files).

### Important limitation
I attempted to run live HTTP validation against `https://moderncre8ve.com` and `https://amp.moderncre8ve.com`, but this environment cannot reach those hosts due proxy/connect restrictions (`CONNECT tunnel failed: 403` and direct connect failures). So this update is based on available exported SEO datasets + code/redirect configuration, not a fresh live crawl.

---

## 2) Executive Post-Deploy Readout

### Overall direction
- **Visibility trend is down across tracked keywords** in the overview export:
  - Median ranking moved from **#10 → #20**.
  - Avg ranking moved from **17.10 → 27.05**.
  - Top-10 keywords fell from **72 → 28**.
  - Top-3 keywords fell from **39 → 10**.
  - Estimated traffic sum dropped from **1885 → 399** (Δ **-1486**).

### What’s still working
- **Branded intent remains resilient** (`moderncre8ve` stays #1 and gains est. traffic).
- A few commercial product terms improved sharply (example: `walnut extendable dining table` moved **#62 → #6**).

### Main concern
- Core non-branded furniture head terms experienced major declines and/or dropped out of visible rankings (examples below), which is consistent with migration-era URL/content consolidation side effects.

---

## 3) KPI Snapshot (from overview export)

| KPI | Previous | Current | Change |
|---|---:|---:|---:|
| Tracked keywords (rows) | 584 | 584 | — |
| Median position | 10.0 | 20.0 | ▼ 10 |
| Avg position | 17.10 | 27.05 | ▼ 9.95 |
| Top-10 count | 72 | 28 | ▼ 44 |
| Top-3 count | 39 | 10 | ▼ 29 |
| Est. traffic sum | 1885 | 399 | ▼ 1486 |
| Improved keywords | 13 | — | — |
| Declined keywords | 47 | — | — |

### Segment view
- **Non-branded keywords:** net est. traffic change **-1480** (dominant share of losses).
- **Local keywords:** mostly flat overall (small total change, about **-8**), so local relevance appears less affected than national non-brand discovery.

---

## 4) Biggest Winners / Losers Since Deploy Window

### Notable gains
- `moderncre8ve`: position stable at #1 with est. traffic gain (+44).
- `walnut extendable dining table`: **#62 → #6** (+56 positions; +15 est. traffic).
- `mid century modern cleveland`: **#12 → #2** (+10 positions; +12 est. traffic).

### Notable losses
- `modern dining table`: previously high visibility, now no current ranking in export (est. **-360** traffic).
- `mid century dining table`: similarly dropped out (est. **-306** traffic).
- `mid century modern dining table`: **#6 → #12** (est. **-174**).
- `mid century dining tables`: **#2 → #62** (est. **-65**).
- `boho bed frame`: **#11 → #20** (est. **-50**).

### Interpretation
The loss profile is concentrated on high-volume, high-intent non-branded terms tied to category/product relevance. This pattern usually points to one or more of:
1) URL target changes (or diluted topical target),
2) missing/weak 1:1 redirects for legacy winners,
3) thinner category-page content compared with prior ranking pages,
4) internal linking shifts toward fewer hub URLs.

---

## 5) Query-History File (5 Tracked Terms) — What It Adds

From the historical file:
- `modern cre8ve`: clicks +84, impressions +192 (brand variant up).
- `moderncre8ve`: clicks -9 but impressions +76 (brand still strong, CTR/position variance).
- `scandinavian furniture`: impressions +3416 with avg position improving substantially (still not yet translating proportionally into clicks).
- Two terms show current-period nulls/zeros (`sophisticated custom furniture pieces`, `modern custom furniture designs`), suggesting either ranking disappearance or no reportable current visibility during the sampled period.

**Conclusion:** Branded demand is stable-to-strong; non-branded performance is volatile and down overall.

---

## 6) Technical SEO Configuration Check (Code-Level)

Based on current code in repo:
- Canonical handling is explicitly generated from `https://moderncre8ve.com` + normalized path in `app/root.tsx`.
- Hreflang alternates are rendered from locale map + x-default in root layout.
- `robots.txt` route is implemented with Shopify-like disallow rules and includes sitemap declaration.
- Sitemap index route is implemented and cacheable.

**Assessment:** Foundational technical SEO plumbing exists in code and appears directionally correct. The larger issue appears to be **ranking equity transfer/content targeting**, not missing basic tags/routes.

---

## 7) Redirect Posture (Repo CSV)

- Repo currently includes **84 redirects**.
- There are strong signs of consolidation patterns (multiple legacy collections/pages pointed into fewer destinations like `/collections/all` or replacement pages).

**Risk implication:** If legacy high-performing landing pages were consolidated too aggressively (instead of preserving intent with closest 1:1 equivalent), this can explain part of the non-branded traffic decline.

---

## 8) Prioritized Action Plan (Next 14 Days)

1. **Run live URL-level validation in production (highest priority).**
   - Validate top 50 historical landing URLs (status, final URL, canonical, indexability).
   - Confirm no redirect chains/soft-404 behavior.

2. **Protect top lost queries with intent-matched landing pages.**
   - Rebuild/strengthen pages tied to: `modern dining table`, `mid century dining table(s)`, and other top-loss terms.
   - Ensure each has unique copy, rich internal links, and supporting schema where appropriate.

3. **Redirect QA sweep.**
   - Audit all high-traffic old URLs for strict 1-hop 301 to most relevant equivalent.
   - Avoid funneling diverse intents to generic `/collections/all` unless no better substitute exists.

4. **Recrawl + reindex acceleration.**
   - Submit updated sitemaps, request indexing for repaired targets, monitor coverage + canonical reports in GSC.

5. **Weekly recovery dashboard.**
   - Track top-3/top-10 counts, non-brand clicks, and URL-level winners/losers every 7 days for 6 weeks.

---

## 9) Current SEO Status Grade (provisional)

- **Technical readiness:** B+ (good code-level foundations in repo).
- **Post-migration ranking retention:** D (major non-brand visibility loss in export snapshot).
- **Brand resilience:** B (brand queries hold reasonably well).
- **Overall post-deploy SEO health (today):** **C-**, with recovery potential if URL-intent alignment and redirect precision are corrected quickly.

---

## 10) Commands Used for This Update

- `python` analysis on `moderncre8ve_overview_2026-03-06_16-25-49.csv` (utf-16 + tab parsing).
- `python` analysis on `moderncre8ve-gsc-keywords-history_2026-03-06_16-18-51.csv`.
- `python` inspection of `redirects-for-shopify.csv`.
- `curl`/`python requests` attempts to live domain endpoints (blocked by environment connectivity/proxy constraints).

