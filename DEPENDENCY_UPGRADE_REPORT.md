# Dependency Outdated Scan & Safe Upgrade Proposal

## What I ran

```bash
npm outdated --long
npm view react version
python -m pip index versions requests | head
```

## Scan result

Automated online outdated checks are currently blocked in this environment:

- `npm` commands against the npm registry fail with `403 Forbidden`.
- `pip` index lookups fail with proxy tunnel `403 Forbidden`.

Because of that, I could not retrieve current latest versions from upstream registries in this run.

## Safe upgrade proposal (low-risk first)

Given the lock-style pinning in this repo, the safest path is to apply upgrades in phases.

### Phase 1: patch/minor-only for leaf packages

Prioritize packages with low coupling to framework internals and UI runtime:

- `clsx`, `colord`, `tiny-invariant`, `tailwind-merge`
- `react-country-flag`, `react-share`, `react-use`
- `@phosphor-icons/react`
- `swiper`
- `schema-dts`

**Rule:** allow only patch/minor bumps and run typecheck + e2e smoke after each batch.

### Phase 2: Radix and UI ecosystem packages

Upgrade the Radix packages together to reduce peer mismatch risk:

- `@radix-ui/react-accordion`
- `@radix-ui/react-checkbox`
- `@radix-ui/react-collapsible`
- `@radix-ui/react-dialog`
- `@radix-ui/react-dropdown-menu`
- `@radix-ui/react-navigation-menu`
- `@radix-ui/react-popover`
- `@radix-ui/react-scroll-area`
- `@radix-ui/react-select`
- `@radix-ui/react-slider`
- `@radix-ui/react-tooltip`
- `@radix-ui/react-visually-hidden`

### Phase 3: platform/core stack (highest impact)

Upgrade cautiously and one subsystem at a time:

- `@shopify/hydrogen`, `@shopify/remix-oxygen`, `@shopify/cli`, `@shopify/mini-oxygen`
- `react`, `react-dom`, `react-router`, `@react-router/*`
- `vite`, `typescript`, `@types/react*`

**Rule:** only move one core family per PR (for example, all Shopify packages together), and execute full regression checks.

### Python (`seo-truth-layer`) safe upgrades

Current requirements are strictly pinned (`==`).

Low-risk approach:

1. Keep major versions fixed.
2. Bump to latest patch/minor within current major for:
   - `google-api-python-client`
   - `google-auth`
   - `google-analytics-data`
   - `pandas`
   - `python-dotenv`
3. Run script smoke tests in `seo-truth-layer/src` after each bump.

## Recommended commands once registry access is available

```bash
# JS/TS
npm outdated --long
npx npm-check-updates --target minor

# Python
python -m pip install -r seo-truth-layer/requirements.txt
python -m pip list --outdated
```

## Suggested validation checklist per upgrade PR

```bash
npm run typecheck
npm run build
npm run e2e
```

For Python updates:

```bash
python -m pip install -r seo-truth-layer/requirements.txt
python seo-truth-layer/src/main.py --help
```
