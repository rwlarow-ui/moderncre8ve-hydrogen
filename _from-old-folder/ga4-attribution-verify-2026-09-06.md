# GA4 Attribution Fix — Daily Verification (2026-09-06)

**VERIFICATION STATUS: ⚠️ COULD NOT VERIFY — data source unavailable**

**Reason:** All four Supermetrics queries (GA4 channel, GA4 purchase, GA4 organic landing pages, GSC top pages) failed with `[TRIAL_EXPIRED]` — the Supermetrics free trial on team "Team moderncre8ve" (ID 1796653) expired **2026-07-07**. Authentication is still valid (GA4 property 251836602 shows `AUTHENTICATED`); the license is what's blocking queries. No GA4 or GSC numbers could be pulled, so the pass/fail criteria in this task cannot be evaluated today. This is not a "❌ NOT YET WORKING" result — it is an absence of data, not evidence of zero data.

## Action required to unblock verification

Restore Supermetrics access (buy a subscription at supermetrics.com/pricing) **or** switch this task to a different GA4 source — the GA4 Data API directly, or the GA4 UI. Until then this task will fail every day at the same point. Supermetrics support reference IDs from today's failures: `6a58394c8a61dfdb` (GA4), `44864407bd18558d` (GSC).

## What was checked via other sources

**(d) `_ga_client_id` cart-attribute bridge — still NOT appearing on orders.** Queried the Shopify Admin API for the 10 most recent orders; only two exist, `#1832` (2026-07-25, $460) and `#1831` (2026-07-09, $4,000), and **both have an empty `customAttributes` array**. Order #1832 was placed a month after the June fix, so the client_id bridge is not writing the attribute at checkout. This was item 3 on the previous run's suspect list and is now confirmed broken.

**Order volume caveat for the VERIFIED criterion.** The store's most recent order is 2026-07-25 — six weeks ago. With zero orders in the last 7 days, `purchaseRevenue > 0` is unreachable in GA4 regardless of whether the purchase pixel works. The "VERIFIED" test as written can only pass in a week that contains an actual sale. Suggest changing the purchase criterion to "purchaseRevenue matches Shopify order totals over a window containing ≥1 order" (e.g. last_90_days) rather than a fixed 7-day window.

**Measurement ID discrepancy — worth resolving.** This task specifies `PUBLIC_GOOGLE_GTM_ID=G-G4Q4Z6MM4B` (property 251836602), but `GA4-ANALYTICS-FIX-HANDOFF.md` in the repo labels that ID/property as "❌ Legacy only — site/organic history, no purchases" and instructs deploying `PUBLIC_GOOGLE_GTM_ID=G-08LS6GEXG3` instead. Meanwhile `analytics/shopify-customer-events-ga4-purchase.js` hardcodes `GA4_MEASUREMENT_ID = "G-G4Q4Z6MM4B"`. If the storefront tag sends to one property and the purchase pixel to another — or if verification queries read a property the site no longer writes to — revenue will never reconcile. **Confirm which property is canonical before further debugging.**

Also noted: the local `.env` has `PUBLIC_GOOGLE_GTM_ID` commented out and `PUBLIC_CHECKOUT_DOMAIN=www.weaverse.dev` (the starter default). This is local-only and says nothing about the deployed Oxygen environment, but the production env vars should be confirmed directly in the Oxygen dashboard since we can no longer infer "tag is live" from GA4 session data.

## Checklist status

| Item | Status |
|---|---|
| (a) Production env vars deployed | Unknown — verify in Oxygen dashboard; local `.env` is unset/default |
| (b) Customer Events pixel + valid MP API secret | Unknown — was the top suspect on 2026-06-26, still unconfirmed |
| (c) GA4 `purchase` marked as Key event | Unknown — check in GA4 admin |
| (d) `_ga_client_id` on orders | **❌ Confirmed missing** on order #1832 (post-fix) |

## Performance snapshot

Unavailable — GSC and GA4 queries both blocked. Last known figures are in `ga4-attribution-verify-2026-06-26.md` (top GSC pages: homepage 43 clicks, /collections/mid-century-modern-dining-tables 22 clicks, /collections/scandinavian-design-furniture 9 clicks).

## Recommendation

Keep the task, but it will not produce a verdict until Supermetrics billing is resolved or the task is repointed at another GA4 source. In the meantime the two concrete, checkable items are the `_ga_client_id` bridge (confirmed failing) and the measurement-ID conflict above.
