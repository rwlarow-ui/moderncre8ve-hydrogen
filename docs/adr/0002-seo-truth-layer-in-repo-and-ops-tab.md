# ADR-0002: Fold the SEO truth layer into the repo and surface it as an Ops tab

**Status:** Proposed
**Date:** 2026-10-16
**Deciders:** Rob LaRow (owner/ops)

## Context

The SEO truth layer pulls Google Search Console and GA4 daily, merges them into a truth table, derives an action list and emails a brief. It works: 227 runs, all green, latest `2026-10-16T14:05` produced 1,685 GSC rows → 71 truth rows → 22 actions and sent the brief to `rob@moderncre8ve.com`.

But it lives in `github.com/rwlarow-ui/moderncre8ve-seo-truth-layer`, a separate repo, and its only outputs are an email and a CI artifact. Two costs follow:

1. **Split brain.** A copy is vendored at `seo-truth-layer/` in this repo. GitHub only executes workflows under the root `.github/workflows/`, so the vendored `seo-truth-layer/.github/workflows/seo-pipeline.yml` has never run. Edits can land in the copy that does nothing — and one already has (see verified facts).
2. **Invisible output.** 22 action items a day arrive as a Resend email. The ops hub at `/ops` shows live Shopify orders; the SEO data it could sit beside is in an inbox and a zip file.

The ask is to end both: one repo, repo-aware, with the data readable in the ops hub as a new tab.

### Verified facts (2026-10-16)

| Fact | Evidence | Consequence |
|---|---|---|
| All 8 Python modules and `requirements.txt` are **byte-identical** between the vendored copy and live `HEAD` (`2fa1258`) | `diff` across `src/*.py`, `requirements.txt` | The migration is a **move**, not a merge. No reconciliation needed. |
| The **vendored workflow is ahead of the live one**: it has a `Clean up credentials` step (`rm -f service_account.json`) the running repo lacks | `diff` of `seo-pipeline.yml`; commit `fce313b` | A hardening fix landed in the copy that never runs. The split is already costing real fixes. |
| GSC data comes from the Search Console API via the project service account | `pull_gsc.py:15` (`webmasters.readonly`), run log 38912954581 | Nothing here depends on Supermetrics. No licence spend. |
| GA4 returned **8 rows** against GSC's 1,685 | run log 38912954581 | The GA4 side is the weak link. Pre-existing; out of scope for this ADR but worth a ticket. |
| `pull_gsc()` defaults to `days_back=7` | `pull_gsc.py:36` | Tuned for the weekly brief. Wider windows need the arg passed. |
| Oxygen is stateless with no cron, and runs JS workers | ADR-0001; platform | The pipeline **must** stay in CI. Python cannot run on Oxygen. |
| `.github/workflows/oxygen-deployment-1000097972.yml` is `on: [push]` | that file, line 2 | **Any** commit deploys. Committing pipeline output daily means a full Oxygen deploy daily. |
| Ops hub is a nested route: `ops.tsx` → `OpsShell` → `<Outlet/>`, with `noindex` set via `headers`/`meta` on the parent only | `app/routes/ops.tsx:5-14`; child routes export neither | A new child route inherits the chrome and `noindex` by nesting. |
| **Auth is not inherited.** Every ops child calls `requireOpsAccess` itself — `ops._index.tsx:25`, and `ops.orders.$orderId.tsx` at both `:46` (loader) **and** `:66` (action) | those lines | The parent loader is not an authorization boundary: child loaders and actions can be invoked directly, so each must call `requireOpsAccess` on its own. `ops.seo.tsx` must do the same in every loader and action it defines. |
| The ops nav holds exactly one link today | `ops-shell.tsx` (`OpsNavLink to="/ops"`) | "A new tab" is one `OpsNavLink` plus one route file. |
| `OPS_ADMIN_API_TOKEN` scopes are orders/customers only — no `write_metaobjects` | CLAUDE.md | A metaobject write path needs `SHOPIFY_ADMIN_API_TOKEN` in CI, not the ops token. |
| Pipeline secrets (`GA4_PROPERTY_ID`, `GOOGLE_SA_JSON`, `RESEND_API_KEY`, `SITE_URL`) exist only on the other repo | CLAUDE.md | They must be re-created on this repo **before** cutover, and revoked after. |
| A reusable UI kit already exists: `OpsCard`, `OpsPageHeader`, `OpsSectionHeading`, `OpsEmptyState`, `StatusBadge`, `OpsTag` | `app/components/ops/ops-shell.tsx` | The tab needs no new design system work. |

## Decision

Move the pipeline into this repo **as-is** (Python, no rewrite), run it from a root workflow, publish a compact JSON snapshot to a Shopify metaobject, and add `/ops/seo` as a second ops tab reading that metaobject. Archive the external repo once a run succeeds from here.

Two sub-decisions carry the weight: **how the Oxygen worker reads pipeline output**, and **whether to keep Python**.

## Options considered — transport

This is the real decision. Oxygen can't run the pipeline, so output has to cross from CI to a JS worker.

### Option A: Commit a JSON snapshot; the ops route imports it

| Dimension | Assessment |
|---|---|
| Complexity | Low |
| Cost | **A full Oxygen deploy every day** |
| Freshness | Only as fresh as the last deploy |
| Failure mode | Benign — stale data, never broken |

**Pros:** No new infrastructure. Data is versioned, so you get history and diffs for free. Trivially testable — the route imports a file.
**Cons:** `on: [push]` means each daily data commit triggers a build and deploy. That is a deploy a day for a number that changed, plus a commit a day of churn in `main`'s history. It also couples content freshness to deploy health: a broken build freezes the SEO data.

### Option B: Write to a Shopify metaobject; the ops loader reads it ← **recommended**

| Dimension | Assessment |
|---|---|
| Complexity | Medium |
| Cost | One metaobject definition; one Admin API write per run |
| Freshness | Daily, no deploy |
| Failure mode | Needs handling — read can fail or return nothing |

**Pros:** Decouples data from deploys entirely. Uses infrastructure already in play — the store has metaobject definitions, the repo already reads metaobjects, and the ops loader already calls the Admin API through `ops-dashboard.server.js`. Fresh data with no build. No new vendor.
**Cons:** Needs `SHOPIFY_ADMIN_API_TOKEN` (full write) as a CI secret, since the ops token lacks `write_metaobjects`. **The read side needs a decision of its own** — the ops token lacks `read_metaobjects` too, so the storefront must read via the Storefront API or the ops token must gain that scope (action item 9); the full admin token must not go into Oxygen. Adds a Shopify-shaped dependency to a pipeline that is otherwise pure Google. Metafield values have a size ceiling — 71 truth rows and 22 actions sit well inside it, but **verify the current limit against the Admin API before relying on it**, and store a summary rather than the raw 1,685 GSC rows.

### Option C: Query GSC and GA4 live from the Oxygen worker; no pipeline

| Dimension | Assessment |
|---|---|
| Complexity | High |
| Cost | Per-request API quota |
| Freshness | Real-time |
| Failure mode | Severe — the tab breaks when Google is slow |

**Pros:** No pipeline, no transport, no staleness. One less moving part in principle.
**Cons:** Requires signing a service-account JWT in a worker via Web Crypto — doable but fiddly, and it puts a Google private key in Oxygen env. Throws away the merge/actions logic that is the actual value here, or forces a port of it into the request path. Page loads become hostage to Google latency. **Rejected.**

### Option D: Fetch the CI artifact at runtime

| Dimension | Assessment |
|---|---|
| Complexity | Medium |
| Cost | A GitHub token in Oxygen |
| Freshness | Daily |
| Failure mode | Artifacts expire |

**Pros:** No change to what the pipeline already produces.
**Cons:** Puts a GitHub PAT in the storefront worker to read a private repo's artifacts, and artifacts expire on a retention clock. Worst security-to-benefit ratio of the four. **Rejected.**

## Options considered — language

**Keep Python (recommended).** The merge, transform and action-scoring logic is proven across 227 runs and leans on pandas. Rewriting working analytics code to match the house toolchain is risk taken for tidiness. CI can run Python regardless of what Oxygen runs — the two never meet.

**Port to Node.** Attractive on paper: one toolchain, Biome covers it, the logic becomes reusable from `scripts/` and testable with `node --test` along`tests/ops-utils.test.mjs`. But it is a rewrite of five non-trivial modules with no behavioural gain, and it would land at the same time as a transport change and a new UI — three risky things at once. **Defer.** Revisit only if the Python becomes a maintenance burden in practice.

## Trade-off analysis

The decision hinges on one number: `on: [push]`.

Without that, Option A would win outright — committing data is simpler, versioned and almost impossible to break. With it, every refresh costs a production deploy, which inverts the cost model: the simplest option becomes the one with the heaviest operational footprint and the tightest coupling between "the SEO number is current" and "the build is green."

Option B's extra complexity buys that coupling back. It needs a metaobject definition and a privileged CI secret — both real costs, the token especially, since it is the full-scope admin token rather than the deliberately narrowed ops one. That is the one place this design gives something up, and it is worth stating plainly: the pipeline gains write access it does not strictly need in order to avoid a daily deploy.

A reasonable middle path, if the token bothers you: **Option A with a weekly cadence**, accepting a weekly deploy and weekly data. For 22 action items that nobody acts on hourly, that may be enough — and it is the cheaper decision to reverse.

## "Repo-aware" — two readings

The phrase in the request is load-bearing and ambiguous:

- **R1 — co-located.** The pipeline lives in the repo instead of beside it. That is the move described above.
- **R2 — aware of repo state.** The pipeline reads the storefront's actual code to make its actions concrete: cross-reference GSC pages against real route files and collection handles, flag pages with impressions but no bespoke composition in `app/page-builder/pages/`, check whether a query's landing page has a hand-written description in `app/utils/collection-seo-descriptions.ts`. Today the pipeline sees URLs and nothing else, so "improve this page" can't name the file to edit.

R2 is where the actual value is, and it is only possible once R1 is done. It is also the part worth building carefully rather than fast. **Flagging for your call:** the plan below treats R1+UI as phases 1–3 and R2 as phase 4, but if R2 is what you actually meant by the request, say so and I'll weight the design toward it rather than toward the metaobject transport.

## Consequences

**Easier**
- One repo, one place to fix things. The lost `Clean up credentials` fix stops being a category of problem.
- SEO actions sit next to the orders they should influence.
- The pipeline can finally read repo state (phase 4).
- `npm run healthcheck` can cover the SEO pipeline, which it cannot reach today.

**Harder**
- This repo gains a Python toolchain in CI next to the Node one. Two `pip install` lines in a JS repo invites "why is this here" — the ADR is the answer.
- The daily workflow becomes this repo's responsibility, including its failures.
- `SHOPIFY_ADMIN_API_TOKEN` in CI widens the blast radius of a leaked Actions secret, running counter to the ops-token narrowing in CLAUDE.md.

**To revisit**
- Metafield size ceiling if the truth table grows past a summary.
- GA4's 8 rows against GSC's 1,685 — likely a property or dimension problem, not addressed here.
- Whether the Resend email survives once the data is on screen, or becomes redundant.

## Action items

**Phase 1 — consolidate (no behaviour change)**
1. [ ] Re-create the four secrets on `moderncre8ve-hydrogen`: `GOOGLE_SA_JSON`, `GA4_PROPERTY_ID`, `RESEND_API_KEY`, `SITE_URL`.
2. [ ] Promote the vendored workflow to `.github/workflows/seo-pipeline.yml`, keeping its `Clean up credentials` step and the `0 14 * * *` cron. Confirm it does not collide with the Oxygen deploy workflow.
   **Re-path it while moving.** The vendored copy assumes the truth layer *is* the checkout root, which stops being true here: `pip install -r requirements.txt` and `python -m src.main` must run with `working-directory: seo-truth-layer` (or equivalent), the `Write service account file` / `Clean up credentials` steps must target `seo-truth-layer/service_account.json`, and the `upload-artifact` paths must become `seo-truth-layer/data/` and `seo-truth-layer/reports/`. A straight copy produces a workflow that fails on step one.
3. [ ] Add a `paths-ignore` guard to the Oxygen deploy workflow, or otherwise ensure pipeline-only commits don't deploy.
4. [ ] Run once via `workflow_dispatch` and match the output against run 38912954581 (1,685 / 8 / 71 / 22).
5. [ ] Archive `rwlarow-ui/moderncre8ve-seo-truth-layer` and **revoke its copies of the secrets**. Update CLAUDE.md's SEO Truth Layer section, which currently documents the external repo as the executor.

**Phase 2 — transport**
6. [ ] Create the `seo_truth_snapshot` metaobject definition (fields: `generated_at`, `window`, `summary` JSON, `actions` JSON).
7. [ ] Add a `publish_snapshot.py` step writing a **summary**, not raw rows, and verify the payload against the live metafield size limit.
8. [ ] Add `SHOPIFY_ADMIN_API_TOKEN` as a CI secret, scoped as narrowly as a metaobject write allows.

**Phase 3 — the tab**
9. [ ] **Settle the runtime read path before building the route.** The transport above only supplies a CI *writer*. The ops hub's own reader cannot read a metaobject as things stand: `getConfig()` prefers `OPS_ADMIN_API_TOKEN` (`ops-dashboard.server.js:372-376`), and that token is minted with `read_orders,read_all_orders,write_orders,read_customers,write_customers` only (`scripts/get-admin-token.mjs:38-39`) — no `read_metaobjects`, so an Admin API read returns 403. Pick one, and **do not put the full admin token in Oxygen**:
   - **Storefront API read (preferred).** Publish the metaobject to the Hydrogen channel and read it with the existing `PUBLIC_STOREFRONT_API_TOKEN`. No new secret, no admin scope, and it is the path the storefront already uses for metaobjects.
   - **Ops-token scope bump.** Add `read_metaobjects` to the ops app and re-authorize, updating `get-admin-token.mjs`. Widens the ops token slightly but keeps one reader.
10. [ ] `app/routes/ops.seo.tsx` — **every loader and action calls `requireOpsAccess` itself** (auth is not inherited from `ops.tsx`; see verified facts), reads the snapshot, degrades to `OpsEmptyState` when absent or stale.
11. [ ] Add `<OpsNavLink to="/ops/seo">SEO</OpsNavLink>` to the nav in `ops-shell.tsx`.
12. [ ] Build the view from the existing kit: `OpsPageHeader`, `OpsCard`, `OpsSectionHeading`, `StatusBadge` for action severity, `OpsTag` for queries. No new components.
13. [ ] Confirm `noindex` applies on `/ops/seo` — it comes from the parent's `headers`/`meta` only, so verify with `curl -sI`, and add a `headers` export if it does not inherit.
14. [ ] Show snapshot age prominently. A stale number with no date is worse than no number.
15. [ ] Extend `tests/ops-utils.test.mjs` for the snapshot parser, and add the route to the Playwright ops run.

**Phase 4 — repo-aware (R2), pending your call**
16. [ ] Resolve GSC `page_path` values against real route files and collection handles.
17. [ ] Flag high-impression pages with no bespoke composition in `app/page-builder/pages/`.
18. [ ] Name the file to edit in each action item.

## Open questions

1. **R1 or R2?** Co-location only, or should the pipeline read repo state? Changes where the effort goes.
2. **Metaobject or weekly commit?** Trades a privileged CI token against a weekly deploy and weekly data.
3. **Keep the Resend email** once the tab exists?
4. **Who may read `/ops/seo`** — same single `requireOpsAccess` gate as orders, or does SEO data warrant a separate grant?
