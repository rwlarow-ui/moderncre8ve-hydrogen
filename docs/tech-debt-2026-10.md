# Tech debt register — moderncre8ve.com

**Date:** 2026-10-19 · **Owner:** Rob LaRow
**Scope:** where the storefront's code, docs and decisions live, plus debt found while checking the collections ADR.
**Score:** Priority = (Impact + Risk) × (6 − Effort), each scored 1–5. Max 50.

## The split, in one table

| Place | What it holds | Last change | Problem |
|---|---|---|---|
| GitHub `rwlarow-ui/moderncre8ve-hydrogen` `main` | **What's deployed.** Release 1.5.0, Weaverse removed, ops hub, ADR-0001/0002 | 2026-10-19 | None. This is the source of truth |
| GitHub `rwlarow-ui/moderncre8ve-storefront` | Older fork with a half-finished Weaverse exit | 2026-10-06 | Already **archived** on GitHub, which is correct |
| Your Mac `~/my-hydrogen-storefront` | A clone of the **archived** repo (branch `feat/remove-weaverse-runtime`), plus a `.env`, an untracked ADR and `Claude outputs/` (Santa Monica shop drawings) | 2026-10-06 code | Linked to Claude by default, so sessions that work "on your site" read and write this stale copy |
| Your Mac `~/Desktop/my-hydrogen-storefront` | **A clone of the live repo** on `main` (2 commits behind), with untracked `TASKS.md`, `memory/`, `dashboard.html`, `.thumbs-tmp/`, `Claude outputs/`, plus 1 old stash (`WIP on 47a3b79`) | 2026-10-19 | Fine once it's the folder you link. The two folders have the **same name**, so it's easy to link the wrong one |
| Claude Project "Moderncre8ve" docs | 152 files uploaded 2026-10-12 from that same stale folder (Weaverse-era code, `package-lock.json`, generated GraphQL types) **and** a GitHub sync of `moderncre8ve-hydrogen` | 2026-10-12 | Knowledge base is **1,999,951 / 2,000,000** bytes full. Search returns old and new code side by side, so answers can cite Weaverse code that no longer exists |

## Prioritized list

| # | Item | Type | I | R | E | Score | Why it matters to the business |
|---|---|---|---|---|---|---|---|
| 1 | Two same-named folders on the Mac; the one linked by default is the archived repo | Infrastructure | 5 | 5 | 1 | **50** | Changes made there never reach the site. It already stranded ADR-0003, and the next fix could be stranded the same way, or reviewed against the wrong code |
| 2 | Project docs are a stale snapshot and the knowledge base is full | Documentation | 5 | 4 | 1 | **45** | Every chat in the Project can be grounded in dead code. Because it's full, nothing new (ADRs, research) can be added |
| 3 | "12–16 weeks" hard-coded in 20+ files, with two maker locations ("Midwest" vs "Cleveland, Ohio") | Code | 3 | 4 | 2 | **28** | Lead time is a customer promise. If it changes, a missed copy on a PDP, FAQ or JSON-LD becomes an inaccurate claim |
| 4 | Every push to **any** branch runs the Oxygen deploy (`on: [push]`, no branch filter); pushes to `main` deploy production, including docs-only commits (e.g. the wax-oil recipe, PR #89) | Infrastructure | 3 | 3 | 2 | **24** | Unneeded production deploys, a preview build for every scratch branch, and a noisy deploy history when you need to find a bad release |
| 5 | Repo root has 52 loose files: reports, CSV exports, a `.docx`, HTML dashboards, blog drafts, `SEO_MIGRATION_AUDIT.md.bak`, a wax recipe | Documentation | 3 | 2 | 2 | **20** | Business documents live in the deploy repo, so every edit to them redeploys (see #4). The code is hard to find |
| 6 | 31 remote branches: 22 already merged, 9 unmerged (4 copies of `feat/ops-hub-ui-restyle`), oldest from February | Code | 2 | 2 | 1 | **20** | It's hard to tell which branch holds live work. The collections PR and the old Weaverse branch were confused this way |
| 7 | Collection titles fixed at render time instead of in Shopify (`BENCHES`, `Japandi Collection - Moderncre8ve`, "Featured" on `modern-scandinavian-furniture`) | Data | 2 | 2 | 1 | **20** | Dirty titles still reach collection H1s, `<title>`, breadcrumbs and Google Shopping |
| 8 | Vendored `seo-truth-layer/` copy whose workflow never runs | Architecture | 3 | 3 | 3 | **18** | Already decided in ADR-0002. Listed here so it isn't double-counted |
| 9 | No GA4 promotion events on collection tiles | Test/measurement | 3 | 3 | 3 | **18** | The collections conversion pass (and any future merchandising change) can't be measured |

## Remediation plan

**Phase 0: this week, about 1 hour, no code**
1. **Link only `~/Desktop/my-hydrogen-storefront`.** It's already the live repo. `git pull`, then decide on the untracked files (commit `TASKS.md` if wanted; add `memory/`, `.thumbs-tmp/`, `dashboard.html` and `Claude outputs/` to `.gitignore`) and drop or apply the old stash. (#1)
2. **Retire the old folder.** Move `Claude outputs/` (shop drawings) to Documents, then rename `~/my-hydrogen-storefront` to `~/_archived-moderncre8ve-storefront` so nobody links it by accident. (#1)
3. ~~Land ADR-0003 in `moderncre8ve-hydrogen`.~~ Done in the PR that added this register. (#1)
4. **Clean the Project.** Delete the 152 `my-hydrogen-storefront/…` docs and keep the GitHub sync as the only source of code. Add `/package-lock.json`, `*.generated.d.ts` and `/seo-truth-layer/data/` to the sync's exclude filters so the budget goes to code and docs. (#2)

**Phase 1: with the next feature PRs (each ≤ ½ day)**
5. `app/utils/brand-facts.ts` exports `LEAD_TIME = "12–16 weeks"` and `MAKERS`. Replace the 20+ literals, and settle on one phrase for Midwest/Cleveland. (#3)
6. Deploy workflow: add `paths-ignore: ["**/*.md", "docs/**", "reports/**", "research_notes/**", "*.csv"]` to the push trigger, and decide whether non-`main` branches should keep getting Oxygen previews (if not, add `branches: [main]`). (#4)
7. Fix the three collection titles in Shopify admin. (#7)
8. Delete the 22 merged branches; decide on the 9 unmerged ones, keeping at most one `ops-hub-ui-restyle`. (#6)

**Phase 2: this quarter**
9. Move non-code documents out of the repo root: business documents to Drive or the Project, and anything still worth versioning into `docs/research/`. Delete the `.bak`. (#5)
10. Carry out ADR-0002 (move `seo-truth-layer` into the repo's real workflows). (#8)
11. GA4 `view_promotion` / `select_promotion` on collection tiles, then a before/after comparison of the conversion pass. (#9)

## Guardrails so the split doesn't come back
- One rule in `CLAUDE.md`: *the source of truth is `rwlarow-ui/moderncre8ve-hydrogen` `main`; never edit an archived repo.*
- The Project holds code **only** through the GitHub sync, never through manual uploads of a folder.
- ADRs live in `docs/adr/` of the deployed repo and are numbered there.
