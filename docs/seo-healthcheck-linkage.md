# SEO Healthcheck Linkage

This note explains what the ModernCre8ve SEO healthcheck is, where it comes from, and how it is currently linked into this repository.

## Primary healthcheck artifact

The main checked-in healthcheck report is:

- `seo-health-check-actions-2026-03-26.md`

That file is a human-readable action sheet summarizing:

- the data period covered by the scan
- the source pipeline used to generate findings
- recommended product, collection, and blog SEO actions
- validation steps and follow-up checks

## Generator behind the healthcheck

The recurring generator is the SEO Truth Layer pipeline in:

- `seo-truth-layer/`

Its orchestrator is:

- `seo-truth-layer/src/main.py`

That pipeline runs these stages:

1. Pull Google Search Console data
2. Pull Google Analytics 4 data
3. Merge both sources into a page-level truth table
4. Generate prioritized SEO actions
5. Write a Markdown brief

Primary outputs:

- `seo-truth-layer/data/gsc_raw.csv`
- `seo-truth-layer/data/ga4_raw.csv`
- `seo-truth-layer/data/seo_truth_merged.csv`
- `seo-truth-layer/data/seo_actions.csv`
- `seo-truth-layer/reports/weekly_brief.md`

## How it is linked into this repo

The SEO healthcheck is linked into the repo mostly through documentation and follow-on scripts, not through the storefront runtime.

### Documentation references

- `CLAUDE.md` documents `seo-truth-layer/` as the weekly pipeline merged into this repo.
- `TODO.md` tracks SEO health tasks and explicitly calls out rerunning the truth-layer pipeline.
- `seo-health-check-actions-2026-03-26.md` cites the SEO Truth Layer pipeline as its source.

### Follow-on implementation scripts

- `scripts/seo-update.mjs` applies title and meta description rewrites to Shopify Admin.
- Additional SEO deliverables in `seo-deliverables/` and `scripts/blog-seo-recommendations.json` support manual follow-up work from healthcheck findings.

## What is not wired today

As of this repo state, the SEO healthcheck is not wired into the main storefront delivery path:

- No `package.json` script runs the truth-layer pipeline.
- No GitHub Actions workflow in this repo runs the SEO pipeline.
- The only checked-in workflow here is the Oxygen deployment workflow.

That means the healthcheck currently behaves like an in-repo analytics subsystem plus checked-in reports, rather than a CI-enforced storefront check.

## Directory caveat

This repo currently contains both:

- `seo-truth-layer/`
- `moderncre8ve-seo-truth-layer/`

They appear to be parallel copies of the same SEO pipeline concept, but they are separate directories. If we want to reduce confusion, a follow-up cleanup PR should decide which one is canonical and either remove or archive the other.
