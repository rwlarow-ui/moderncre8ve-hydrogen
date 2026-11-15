# GA4 / Analytics Fix — Handoff & Implementation Notes

**Store:** moderncre8ve.com (Shopify Hydrogen + Weaverse, headless)
**Date:** 2026-06-24
**Owner:** rob@moderncre8ve.com

---

## TL;DR — the root cause

Your **live site sends all analytics to `G-R1KFYYKE48`** — the **Weaverse template's demo Measurement ID** that was never replaced at launch. Verified live: the only Google tag firing on moderncre8ve.com is `gtag/js?id=G-R1KFYYKE48`, the cookie is `_ga_R1KFYYKE48`, and the page_view hit returns **HTTP 503** (the demo property rejects the data).

Everything else we chased (null revenue, collapsed sessions, split properties) traces back to this: the real funnel data was never reaching a property you own.

**The fix:** repoint the live storefront from the demo `G-R1KFYYKE48` to your real consolidated property **`G-08LS6GEXG3`**.

---

## The three Measurement IDs (don't mix them up)

| ID | What it is | Use it? |
|----|-----------|---------|
| `G-R1KFYYKE48` | Weaverse **demo** ID (in `.env.example`) — currently live, returning 503s | ❌ Remove |
| `G-G4Q4Z6MM4B` | Old GA4 property `251836602` (site/organic history, no purchases) | ❌ Legacy only |
| **`G-08LS6GEXG3`** | **Real property** — Google Ads (`4107624583`) + Merchant Center (`100665022`) + purchases via the Google & YouTube app | ✅ **Source of truth** |

**Decision:** consolidate everything onto **`G-08LS6GEXG3`** (changing the storefront ID is trivial; moving Ads + Merchant Center is risky).

---

## Architecture (final)

- **Storefront browsing** (page_view, view_item, add_to_cart, sessions) → fired by the Hydrogen storefront's gtag → **`G-08LS6GEXG3`**.
- **Purchases + Ads conversions** → handled by the **Google & YouTube app** at checkout → **`G-08LS6GEXG3`**.
- **Do NOT** run a custom purchase pixel — the app already owns purchases on this property. A second source would **double-count revenue**.

---

## What's already changed in this repo

1. **`app/components/root/custom-analytics.tsx`** — rewritten to load GA4 directly via `gtag/js`, fire `page_view` on every client-side navigation, send ecommerce engagement events (`view_item`, `view_item_list`, `add_to_cart`, `remove_from_cart`, `view_cart`, `search`), with **Consent Mode v2** wired to Shopify's Customer Privacy (`canTrack()`). It reads the ID from the `PUBLIC_GOOGLE_GTM_ID` env var — no hardcoded ID. Renders nothing if the env var is unset.
2. **`env.d.ts`** — added `window.gtag` typing.
3. **`app/routes/($locale).cart.tsx`** — reverted to original (the client_id cart-attribute bridge was removed, since the app owns purchases).
4. **`analytics/shopify-customer-events-ga4-purchase.js`** — a standalone Customer Events purchase pixel. **SHELVED / do not install** while the Google & YouTube app owns purchases. Keep only as a fallback if app-side attribution proves inadequate.

All changes typecheck clean (`npm run typecheck` — the only remaining errors are pre-existing and unrelated: predictive-search, product-card, collection-list, weaverse/index).

---

## Remaining fixes to apply

### 1. Repoint the live site to the real property (the core fix)
Find where production sets `G-R1KFYYKE48` and change it to `G-08LS6GEXG3`.

- If production deploys from this codebase: set the production env var (Oxygen/Vercel — **not** the demo `.env` in this folder):
  ```
  PUBLIC_GOOGLE_GTM_ID=G-08LS6GEXG3
  PUBLIC_CHECKOUT_DOMAIN=moderncre8ve.myshopify.com
  ```
- ⚠️ **Confirm the production injection point first.** The live tag loads via `gtag/js` while the *original* repo code used `gtm.js`, and this folder's `.env` points at the Weaverse demo store (`weaverse-hydrogen.myshopify.com`). So verify whether the live `G-R1KFYYKE48` comes from this env var, a Weaverse Studio setting, or a separate build — and change it there.

### 2. Configure GA4 cross-domain (for attribution)
In GA4 Admin → Data Streams → (G-08LS6GEXG3 web stream) → Configure tag settings → **Configure your domains**: add both `moderncre8ve.com` and `moderncre8ve.myshopify.com`. This preserves `client_id` across the storefront → checkout hop so organic/paid sessions get purchase credit.

### 3. Grant reporting access
GA4 Admin (on `G-08LS6GEXG3`) → Property Access Management → add `rob@moderncre8ve.com` as **Administrator**, so the property shows up in your GA4 picker and in Supermetrics. (Currently your login + Supermetrics only see the old `251836602`.)

### 4. Retire the demo property tracking
After the cutover, remove any remaining `G-R1KFYYKE48` references so nothing keeps pinging the demo property.

---

## Verify it worked

After deploying the env change:

1. Reload moderncre8ve.com → DevTools → Network → filter `collect`. The request should now show **`tid=G-08LS6GEXG3`** with a **200** (not 503, not `R1KFYYKE48`).
2. GA4 → Admin → **DebugView** (or Realtime) on `G-08LS6GEXG3`: confirm `page_view`, `view_item`, `add_to_cart`, and — from a test order — `purchase` with revenue.
3. **Watch for duplicates.** Because Hydrogen forwards events to Shopify Customer Events, the Google & YouTube app pixel may *also* send some storefront events to `G-08LS6GEXG3`. If DebugView shows double `page_view` / `view_item`, trim the storefront gtag in `custom-analytics.tsx` to only the events the app does **not** send (likely keep `page_view`, drop the ecommerce events). Purchase must come from exactly **one** source (the app).

---

## Still open (separate from analytics)

- **Google Merchant Center: 671 products, all "Not Approved" (0 approved).** Your Shopping / free listings aren't serving. Worth a dedicated investigation (likely a feed/policy issue) — directly impacts paid performance.
- **GSC vs GA4 gap:** Search Console shows ~400+ organic clicks / 28 days while GA4 shows far fewer organic sessions. Once tracking is on the right property, re-check; if the gap persists it points to consent/cookie blocking or bot filtering.
- **Scheduled task:** the daily verification task currently targets the old property `251836602`. Repoint it to `G-08LS6GEXG3` once you have reporting access + Supermetrics reconnected.

---

## SEO context (from earlier analysis)

Your organic demand is real and winnable — top money pages sit on page 3–5 with heavy impressions:

- `/products/scandinavian-danish-modern-dining-table` — 26,008 impressions, avg pos 24.6
- `/products/the-santa-monica-mid-century-modern-dining-table` — 24,060 impressions, avg pos 32.6
- `/products/scandinavian-dining-table-extendable` — 19,627 impressions, avg pos 42.5

Best query: **"mid century modern dining table"** (pos 9). Strongest page: the mid-century-modern-dining-tables collection (pos 15.8). Once analytics is trustworthy, prioritize on-page optimization of those high-impression / low-position product pages. (Full plan: `SEO-PLAN-2026.md`.)
