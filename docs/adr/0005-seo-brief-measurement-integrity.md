# ADR-0005: SEO brief measurement integrity — assessment of the Nov 3 handoff

**Status:** Proposed
**Date:** 2026-11-03
**Deciders:** Rob LaRow (owner/ops)

## Context

A Codex investigation (handoff dated 2026-11-03) found that the daily SEO brief from `rwlarow-ui/moderncre8ve-seo-truth-layer` reports misleading numbers, and opened [PR #3](https://github.com/rwlarow-ui/moderncre8ve-seo-truth-layer/pull/3) (`fix/seo-brief-ctr-ga4-coverage`, head `bfebf0e`, 2 files, open, mergeable, no CI checks). This ADR assesses each of the handoff's suggestions against the live source and the live storefront, and sets an order for doing them.

### Verified facts (2026-11-03)

| Fact | Evidence | Consequence |
|---|---|---|
| Page CTR is `mean(row ctr)` across query×device×country rows, not `sum(clicks)/sum(impressions)` | live `src/merge_truth.py`, `avg_ctr=("ctr","mean")` | Confirmed defect. The CTR column and every "low CTR" action in `src/actions.py:63-77` are built on it. |
| GSC window ends run-day − 3; GA4 window ends run-day − 1. Both use `start = end − 7`, so each covers **8** inclusive days | `pull_gsc.py:49-50`, `pull_ga4.py` (`end_date … - timedelta(days=1)`) | GSC and GA4 rows never describe the same days. |
| An empty GA4 pull is zero-filled and printed as `GA4 Sessions 0` / `$0.00` | `merge_truth.py` (`if ga4.empty:` branch), `report.py` Overview table | "Not measured" is shown as "measured zero". |
| GA4 has recorded **no storefront pages** in any pull since at least Oct 20. The Oct 28–31 snapshots hold only one checkout's 4 `/checkouts/cn/…` paths; Nov 1–2 are empty. The March 2026 snapshot had storefront paths (`/`, `/cart`, …) | `git log -- data/ga4_raw.csv` in the live repo | The GA4 gap is in **collection or property routing**, not only in the brief's logic. |
| On the live site today (US region, clean session): `canTrack()` is `true`, no banner, `gtag.js?id=G-G4Q4Z6MM4B` loads, and `consent update` → `page_view` reaches `dataLayer` | built-in browser on `moderncre8ve.com` | Consent is **not** what blocks US visitors. The tag gets as far as `dataLayer`. |
| The CSP blocks a Google tag request: `img-src` refuses `https://www.googletagmanager.com/a?…&cid=G-G4Q4Z6MM4B` | browser console; `app/utils/csp.ts` (`imgSrc` has no Google hosts) | Google's CSP guidance for GA4 lists `*.google-analytics.com` and `*.googletagmanager.com` under `img-src`. Whether this blocks `/g/collect` hits as well couldn't be proven in this browser (it doesn't surface third-party requests). It's cheap to fix either way. |
| After client-side navigations (home → collection, collection → home), no new `page_view` reached `dataLayer` | same session | Possible undercount of SPA page views. Needs a clean repro before anyone acts on it. |
| The vendored `seo-truth-layer/` has diverged from the live repo. Live has `deltas.py`, `history.py` and `pull_bing.py`; the vendored copy has `pull_shopify.py` and `tracking_health.py` (`edc6e58`, Oct 23), and those never run | `ls` of both `src/` | The split ADR-0002 warned about is costing work again. PR #3 belongs **only** in the live repo. |

## Decision

1. **Merge PR #3 as is** (owner's call, since the user pushes `main`). Both changes are correct and contained.
2. **Verify collection before any more GA4 work in the pipeline.** Run a manual check in GA4 (Realtime / DebugView) and, in this repo, add Google hosts to the CSP's `img-src`.
3. **Then fix the pipeline's data model in one PR:** a shared date window, GA4 pulled by landing page and organic sessions, and impression-weighted position.
4. **Leave consent and attribution settings alone.** The handoff says so, and the evidence above doesn't call for changing them.

## Assessment of each handoff suggestion

| # | Suggestion | Verdict | Notes |
|---|---|---|---|
| 1 | CTR = clicks / impressions (`merge_truth.py`) | **Accept: merge** | Correct, and the rounding change is fine because the report formats with `:.1%`. Expect a one-time **step change** in CTR week-over-week deltas, since `history.db` stores the old mean-based values. The low-CTR actions will reshuffle on the next run. That's intended. |
| 2 | Show GA4 as N/A when input is empty or dates differ; label the scope (`report.py`) | **Accept: merge, aware of one effect** | The window check compares GA4 dates with GSC dates. Those **never match** while the extractors use different offsets, so after this PR the brief shows N/A **permanently** until #3 below lands, even once tracking works. That's the honest output, but it makes #3 a prerequisite for ever seeing GA4 numbers again. |
| 3 | Align GSC and GA4 extraction dates | **Accept: next pipeline PR** | Compute one `(start, end)` in `main.py` (end = run-day − 3, the GSC lag) and pass it to `pull_gsc`, `pull_ga4`, `pull_ga4_ai_referrers` and `pull_bing`. Make it a true 7-day window (`start = end − 6`), which also ends the overlapping 8-day windows the handoff noted. |
| 4 | Session-scoped landing-page / channel metrics | **Accept: same PR as #3, after collection is verified** | `pull_ga4` now groups **all-channel** sessions by `pagePath`, so a page's "sessions" counts every session that viewed it. Pull `landingPagePlusQueryString` filtered to `sessionDefaultChannelGroup = Organic Search` instead, strip the query string, and join that to GSC pages. Reworking this query against zero rows would be untestable, so verify collection first. |
| 5 | Verify the deployed measurement ID → property 251836602 | **Accept: manual, now** | The repo can't settle this. CLAUDE.md and memory say `G-G4Q4Z6MM4B` is the only stream of 251836602, and Realtime was verified Oct 13 and 19, yet the Data API shows nothing from the storefront since Oct 20. Check in GA4: Realtime and DebugView while browsing `moderncre8ve.com` in a normal browser, Admin → Data streams (stream ID 2149185054 = `G-G4Q4Z6MM4B`), and Admin → **Data filters** (an active internal or developer traffic filter, or a hostname filter, would produce exactly this pattern). |
| 6 | Inspect consent / event readiness without bypassing consent | **Done for US; one storefront fix** | For US visitors, consent is granted and events reach `dataLayer` (see facts). The actionable storefront item is the CSP `img-src` gap. The SPA page-view gap is a follow-up to reproduce and fix. |
| 7 | Regenerate action scoring with corrected CTR | **Automatic** | The next daily run after the merge does it. No separate work. |
| 8 | Unweighted average position | **Accept: same PR as #3** | Use `sum(position × impressions) / sum(impressions)` per page, as Search Console does. |
| 9 | Revised brief wording | **Accept as a one-off note** | Fine for a reply to the email thread. Don't hard-code it into `report.py`, because #2 already produces equivalent warnings from the data. |

## Options considered for the GA4 gap

### Option A: Fix the brief only (PR #3), and treat GA4 as unavailable
| Dimension | Assessment |
|---|---|
| Complexity | Low (done) |
| Cost | None |
| Outcome | Honest brief, but no organic conversion insight |

### Option B: PR #3, then verify collection, then rework the pipeline's data model (**chosen**)
| Dimension | Assessment |
|---|---|
| Complexity | Low, then medium (one storefront CSP line, then one pipeline PR of about 4 files) |
| Cost | About 15 minutes of manual GA4 checks |
| Outcome | Comparable GSC and GA4 windows and a real organic landing-page join, tested against real data |

### Option C: Rework the pipeline now, in parallel with the measurement check
**Rejected.** The query changes in #4 can't be checked against an empty property. If the cause turns out to be a data filter or the wrong property, the GA4 side of the pipeline is all that changes.

## Consequences

- **Easier:** the brief stops presenting placeholders as results. CTR and the low-CTR actions become trustworthy right after the merge.
- **Harder for a while:** GA4 lines read N/A until the date windows are aligned. CTR history shows a discontinuity at the merge date.
- **To revisit:** ADR-0002 (fold the pipeline into this repo) is still Proposed while the two copies drift further apart. Either act on it or delete the vendored copy, so that fixes like `tracking_health.py` stop landing where nothing runs them.

## Action items

1. [ ] Owner: review and merge [PR #3](https://github.com/rwlarow-ui/moderncre8ve-seo-truth-layer/pull/3) in the **live** repo. Don't port it to the vendored `seo-truth-layer/`.
2. [ ] Owner: GA4 checks: Realtime/DebugView on `moderncre8ve.com`, Admin → Data filters, and the stream → measurement ID mapping.
3. [ ] This repo: add `*.google-analytics.com` and `*.googletagmanager.com` to `imgSrc` in `app/utils/csp.ts`, then confirm in a normal browser that no CSP violations mention Google hosts.
4. [ ] This repo: reproduce the missing SPA `page_view` (`app/components/root/custom-analytics.tsx` subscriber) and fix it if confirmed.
5. [ ] Truth-layer repo, after 2 confirms data is flowing: shared window in `main.py`, organic landing-page GA4 pull, and impression-weighted position (suggestions 3, 4 and 8).
6. [ ] Decide ADR-0002: migrate the pipeline here or remove the vendored copy.
