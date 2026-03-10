# Changelog

All notable changes to the ModernCre8ve SEO Truth Layer.

## [1.0.0] — 2026-02-23

### Phase 1: GitHub Actions "Truth Layer" v1

**Initial release** — automated weekly SEO intelligence pipeline for the ModernCre8ve Hydrogen storefront.

#### Pipeline Scripts
- `pull_gsc.py` — Pulls Google Search Console data (7-day window, paginated, 25k row limit)
- `pull_ga4.py` — Pulls GA4 page-level metrics (sessions, revenue, bounce rate, engagement)
- `transform.py` — Normalizes paths, classifies Hydrogen page types (product, collection, page, blog, homepage), extracts handles
- `merge_truth.py` — Joins GSC query-level data with GA4 page-level data into single truth table; computes revenue-per-click and click-to-session ratio
- `actions.py` — Scores and prioritizes 5 action types:
  - `STRIKING_DISTANCE` — Pages ranking 4-20 with push-to-page-1 potential
  - `HIGH_IMPRESSIONS_LOW_CTR` — Visible but under-clicked, title/meta rewrite needed
  - `REVENUE_OPPORTUNITY` — Product/collection pages with clicks but $0 revenue
  - `THIN_CONTENT` — Pages ranking for very few queries, content expansion needed
  - `QUICK_WIN` — Already page 1 but CTR below position benchmark
- `report.py` — Generates Markdown weekly brief with overview stats, top pages, revenue pages, page type breakdown, and prioritized action items
- `main.py` — Orchestrator that runs all 5 steps in sequence

#### GitHub Actions Workflow
- `seo-truth.yml` — Runs every Monday at 11:00 UTC (~6 AM ET)
- Manual trigger via `workflow_dispatch`
- Uploads CSVs + weekly brief as GitHub Actions artifacts (90-day retention)
- Credentials handled securely via GitHub Secrets + temp file cleanup

#### Outputs (weekly)
- `data/gsc_raw.csv`
- `data/ga4_raw.csv`
- `data/seo_truth_merged.csv`
- `data/seo_actions.csv`
- `reports/weekly_brief.md`

#### Configuration
- Service account auth via JSON key (file or env var)
- Hydrogen route classification: `/products/*`, `/collections/*`, `/pages/*`, `/blogs/*`, `/cart`, `/search`, `/policies/*`
- GA4 metric: `purchaseRevenue` (Shopify purchase revenue)
- GSC data lag: 3 days (Google's processing delay)

#### Connected Projects
- **Hydrogen Storefront:** `moderncre8ve-hydrogen` (the site being tracked)
- **Shopify Store:** moderncre8ve.myshopify.com (26 active + 3 draft products, 16 collections)
- **Oxygen URL:** https://moderncre8ve-v2-6aebe5cb62e16d9300dd.o2.myshopify.dev

---

## Planned

### [1.5.0] — Phase 2: Supabase (30-45 days)
- Supabase PostgreSQL for persistent storage
- Historical trendlines (rank, CTR, revenue week-over-week)
- Delta reporting (biggest movers, new queries, revenue winners/losers)
- Tables: `gsc_rows`, `ga4_rows`, `seo_truth`, `seo_actions`
- Dashboard-ready API endpoints
