---
name: healthcheck
description: Repo-shape-aware health check for the ModernCre8ve Hydrogen storefront (or any similar Node repo). Discovers what the repo contains (package scripts, biome, tsc, tests, CI, .env, CLAUDE.md/AGENTS.md) and runs only the checks that apply, tiered static / env / live, then reports PASS, FAIL, WARN, BASELINE or SKIP per check. Use whenever the user asks for a healthcheck, health check, "is the repo healthy", "sanity check", "pre-deploy check", "what's broken", "does everything still build and pass", or wants to verify the repo, docs and live site are in a good state, even if they do not say "healthcheck".
---

# healthcheck

Answers one question: is this repo, and the site it deploys, in a state I can trust right now? It discovers the repo's shape first and derives the checks from that, so it stays correct as scripts and docs change and still works if copied to another repo.

## How to run

Run the bundled script from the repo root. It is read-only and dependency-free.

```bash
node .claude/skills/healthcheck/scripts/healthcheck.mjs --tier static   # default: no env, no network
node .claude/skills/healthcheck/scripts/healthcheck.mjs --tier env      # needs .env, read-only Shopify calls
node .claude/skills/healthcheck/scripts/healthcheck.mjs --tier live     # HEAD/GET against production
node .claude/skills/healthcheck/scripts/healthcheck.mjs --tier all --fast   # --fast skips the slow build
```

Also available as `npm run healthcheck` (static tier). Flags: `--url <host>`, `--typecheck-baseline <n>`, `--json`.

Pick the tier from the ask: a quick "is it healthy" means `static --fast`; "ready to deploy" means `static` then `live`; "is production up" means `live` only. Run `env` only when the user wants Shopify data checked, because those scripts talk to the store.

## What each tier checks

- **static**: lockfile and node_modules, `biome`, `typecheck` against a baseline (runs `react-router typegen` first when `.react-router/` is absent, as in a fresh clone or CI), `build`, every `test` / `test:*` script, `.env.example` covering the docs' Required env names, `package.json` version matching the top CHANGELOG entry, backticked file paths in CLAUDE.md existing, CLAUDE.md vs AGENTS.md drift, and `.env` / `.claude/settings.local.json` not tracked by git.
- **env**: allowlisted scripts that are read-only against Shopify (`check:collections`, `audit:content`; the latter writes a local report under `reports/`). Skips cleanly with "needs .env". Never runs `sync:*`, `seo-*`, or `debug:admin-auth` (it prints a token prefix), and nothing that writes to Admin.
- **live**: `HEAD` of the Hydrogen host from the docs (expects 200 and `powered-by` containing Hydrogen), then `check:homepage` with `BASE_URL` set explicitly, because that script defaults to port 3000 while dev runs on 3456.

## Reading the results

| Status | Meaning |
|--------|---------|
| PASS | Check ran and is clean |
| BASELINE | Failing, but not worse than the documented known failure (typecheck's known errors). Not a regression |
| WARN | Drift worth fixing, does not block |
| FAIL | Regression or broken invariant; exit code 1 |
| SKIP | Not applicable here, or a prerequisite is missing; the reason is shown |

Typecheck is judged against a baseline (parsed from the "reports N ... errors" line in CLAUDE.md) so it is not permanently red. Green at the baseline, red only if the count grows. When the known errors get fixed, remove that line from CLAUDE.md so the baseline drops to 0.

## Reporting back

Lead with the verdict, then list only non-PASS lines grouped by tier, each with its reproduce command, and say which tiers you did not run. Do not paste the full output when everything passed. For a FAIL, look at the cause before reporting: read the failing command's tail and state the likely culprit, not just the status.

## Safety rules

- Never print env values or token contents. The script redacts command output, but do not read `.env` or `.claude/settings.local.json` to "help"; presence and tracked-ness are all this skill needs. Those files hold live Shopify tokens.
- The live tier is GET/HEAD only. Do not extend it with mutations, deploys, or domain changes. The primary domain of the Hydrogen storefront must never be touched (see CLAUDE.md Domains).
- Do not try to settle doc-vs-memory disagreements here (for example which GA4 ID is live). Surface the facts and let the user decide.

## Extending

Checks live in `scripts/healthcheck.mjs`, grouped by tier, each guarded by a discovery test (a script exists, a file exists). Add a check by adding a guarded block and a `SKIP` branch with the reason. Keep new `env` checks on the allowlist and read-only.
