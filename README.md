# ModernCre8ve SEO Truth Layer

Automated weekly SEO intelligence pipeline for the ModernCre8ve Hydrogen storefront. Pulls Google Search Console + Google Analytics 4 data, merges them into a single source of truth, generates prioritized actions, and delivers a weekly brief.

## What You Get Every Monday

| Output | Description |
|--------|-------------|
| `data/gsc_raw.csv` | Raw Search Console data (queries, pages, clicks, impressions, position) |
| `data/ga4_raw.csv` | Raw GA4 data (page sessions, revenue, bounce rate, engagement) |
| `data/seo_truth_merged.csv` | Merged truth table — every page's ranking + revenue in one view |
| `data/seo_actions.csv` | Prioritized action items with scores and specific recommendations |
| `reports/weekly_brief.md` | Human-readable weekly brief with tables and highlights |

## Action Types

| Type | What It Means |
|------|---------------|
| `STRIKING_DISTANCE` | Ranking 4-20, push to page 1 with content + links |
| `HIGH_IMPRESSIONS_LOW_CTR` | Visible but not clicked — rewrite title/meta |
| `REVENUE_OPPORTUNITY` | Product/collection getting clicks but $0 revenue — CRO fix |
| `THIN_CONTENT` | Page ranking for very few queries — expand content |
| `QUICK_WIN` | Already page 1 but CTR below benchmark — snippet optimization |

## Setup

### 1. Google Cloud

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create project: `moderncre8ve-seo-truth`
3. Enable APIs:
   - **Google Search Console API**
   - **Google Analytics Data API**
4. Create service account: `seo-truth-agent`
5. Create JSON key and download it

### 2. Grant Access

**Search Console:**
- Go to [Search Console](https://search.google.com/search-console/) → Settings → Users and permissions
- Add the service account email (e.g. `seo-truth-agent@moderncre8ve-seo-truth.iam.gserviceaccount.com`)
- Grant **Full** access

**GA4:**
- Go to GA4 Admin → Account access management
- Add the service account email as **Viewer** or **Analyst**

### 3. GitHub Secrets

Go to your repo → Settings → Secrets and variables → Actions → New repository secret:

| Secret | Value |
|--------|-------|
| `GOOGLE_SERVICE_ACCOUNT_JSON` | Paste the full JSON key contents |
| `GA4_PROPERTY_ID` | Your GA4 property ID (numeric, e.g. `123456789`) |
| `SITE_URL` | `https://moderncre8ve.com/` |

### 4. Run It

**Automatic:** Runs every Monday at 11:00 UTC (~6 AM ET)

**Manual:** Go to Actions tab → "SEO Truth Layer — Weekly Pipeline" → Run workflow

**Local:**
```bash
# Copy your service account JSON to the repo root
cp ~/path/to/key.json service_account.json

# Create .env
cat > .env << EOF
SITE_URL=https://moderncre8ve.com/
GA4_PROPERTY_ID=your_property_id
GOOGLE_SA_PATH=service_account.json
EOF

# Install and run
pip install -r requirements.txt
python -m src.main
```

## Architecture

```
src/
├── main.py          # Orchestrator — runs the full pipeline in order
├── pull_gsc.py      # Step 1: Pull Search Console data (7-day window)
├── pull_ga4.py      # Step 2: Pull GA4 data (7-day window)
├── transform.py     # Normalize paths, classify page types, clean data
├── merge_truth.py   # Step 3: Join GSC (query-level) + GA4 (page-level)
├── actions.py       # Step 4: Score and prioritize SEO actions
└── report.py        # Step 5: Generate Markdown weekly brief
```

**Data flow:**
```
GSC API ──→ gsc_raw.csv ──┐
                           ├──→ seo_truth_merged.csv ──→ seo_actions.csv
GA4 API ──→ ga4_raw.csv ──┘                          └──→ weekly_brief.md
```

## Phase 2: Supabase (30-45 days)

The pipeline is designed to be extended with persistent storage:
- Historical trendlines (rank/CTR/revenue week-over-week)
- Delta reporting (biggest movers, new queries appearing)
- Dashboard integration
- Shopify automation triggers

Tables planned: `gsc_rows`, `ga4_rows`, `seo_truth`, `seo_actions`

## Connected Projects

| Project | Repo | Purpose |
|---------|------|---------|
| Hydrogen Storefront | `moderncre8ve-hydrogen` | The site being tracked |
| Options Wall Scanner | `options-wall-scanner` | Backend (separate project) |
| OWS Next.js | `options-wall-scanner-next` | Trading dashboard (separate project) |
