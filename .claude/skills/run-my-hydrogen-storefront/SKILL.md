---
name: run-my-hydrogen-storefront
description: Run, start, build, test, screenshot and drive the ModernCre8ve Hydrogen storefront (React Router v7 on Shopify Oxygen) locally. Use when asked to run the dev server, take a screenshot of a page, click through home/collection/product/add-to-cart, or confirm a storefront change works in the real app.
---

# Run the ModernCre8ve Hydrogen storefront

Paths are relative to the repo root. The app is a Hydrogen dev server on **http://localhost:3456** that reads the
**live** Shopify store (`.env` tokens) — no mocked data. It is driven with `driver.mjs` (Playwright from the repo's
`node_modules` + the system Chrome). `chromium-cli` is not installed here. Verified on macOS, Node 25, Chrome installed.

## Prerequisites
- `node_modules` installed and a real `.env` (`PUBLIC_STORE_DOMAIN`, `PUBLIC_STOREFRONT_API_TOKEN`, `SESSION_SECRET`, …).
  In a git worktree neither exists: `ln -s <main-checkout>/node_modules node_modules && ln -s <main-checkout>/.env .env`.
- Google Chrome at `/Applications/Google Chrome.app` (driver uses `channel: "chrome"`, so no `playwright install`).

## Run (agent path)
```bash
CI=1 nohup npm run dev > "$TMPDIR/dev.log" 2>&1 &     # ready in ~10s when the log shows "View Hydrogen app: http://localhost:3456/"
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3456/   # 200

D=.claude/skills/run-my-hydrogen-storefront/driver.mjs
node $D shot /collections /tmp/c.png     # full-page screenshot, prints the <title>
node $D text / h1                        # innerText of a selector
node $D flow /tmp/flow                   # home -> /collections -> /products -> first product -> Add to Cart; writes 1-home.png … 4-cart.png
```
Read the PNGs to confirm the page rendered. After `flow`, the header cart icon should show a `1` badge.
The driver also prints browser console/page errors and any HTTP >= 400; the `%s` prop / `stop-color` React warnings and
`judgeme-review-index` log line are pre-existing noise.

Stop: kill the `npm run dev` process (`pkill -f "shopify hydrogen dev"`), then `git checkout vite.config.ts` (see Gotchas).

## Test
```bash
npm run test:ops                          # 15 pass
node --test tests/product-specs.test.mjs tests/po-definitions.test.mjs tests/logistics.test.mjs tests/production-po.test.mjs tests/po-send.test.mjs   # 44 pass
```
`npm run e2e` (Playwright specs in `tests/`) was not run; its config defaults to port 3000, not 3456.

## Run (human path)
`npm run dev`, open http://localhost:3456. Also `/graphiql` for the Storefront API. Useless headless.

## Gotchas
- **Dev CSP blocks hydration.** `app/utils/csp.ts` sets `scriptSrc` without `'self'`, which replaces Hydrogen's dev default, so Vite's
  `/app/entry.client.tsx` etc. are blocked and the page is static HTML (links work, buttons do nothing). The driver launches
  with `bypassCSP: true`. A normal browser on `localhost:3456` will show the same console errors. Production (nonce'd scripts) is unaffected.
- **Dev POSTs 400 on CSRF.** React Router's origin check compares `Origin: localhost:3456` to a different `Host` seen by the worker, so Add to
  Cart returns `400 Bad Request` ("Something's wrong here."). The driver adds `x-forwarded-host` to same-origin non-GET requests. Curl
  with `-H "Origin: http://localhost:3456" -H "x-forwarded-host: localhost:3456"` to hit `/cart.data` the same way.
- **`flow` really adds to a cart on the live store** (anonymous Storefront-API cart, never checked out). Don't loop it needlessly.
- **`npm run dev` rewrites `vite.config.ts`** (adds `'pako'` to `ssr.optimizeDeps.include` and flips double quotes to single). Revert with `git checkout vite.config.ts`.
- **Flaky error screen after Add to Cart.** One of two runs (after the CSRF fix) ended on the generic "Something's wrong here." page (cart badge still showed 1) with the dev log
  line `The Workers runtime canceled this request because it detected that your Worker's code had hung`. Re-running passed; treat as a dev-only miniflare quirk, not a regression, unless it reproduces consistently.
- `/collections` has no product links in the DOM; the driver goes via `/products`. `/healthcheck` is a skill, not a route (404).
- Product URLs include variant query params (`?Size=…&Material=…`), so use the href the driver prints, not a bare handle.

## Troubleshooting
| Symptom | Fix |
|---|---|
| `Failed to resolve dependency: typographic-…` in the dev log | Harmless Vite optimizeDeps warnings; server still starts. |
| `page.goto: Cannot navigate to invalid URL … 3456undefined` | No product link found (page not hydrated or store empty); check the `/products` screenshot. |
| `Loading the script 'http://localhost:3456/app/…tsx' violates … Content Security Policy` | See CSP gotcha; use the driver (or `bypassCSP`). |
| `POST /cart.data 400` + `Error: Bad Request` in dev log | See CSRF gotcha; send `x-forwarded-host`. |
| `POST /cart.data 500` + `Invariant failed: No cartAction defined` | You curl'd it with a body that isn't a CartForm payload; not an app bug. |
