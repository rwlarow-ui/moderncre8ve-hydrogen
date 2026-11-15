# GA4 Attribution Fix — Daily Verification (2026-06-26)

**VERIFICATION STATUS: 🟡 PARTIAL**

Organic tracking is restored, but purchase revenue is still not recording.

**Reason:** Last 7 days GA4 shows organic sessions > 0 (Organic Shopping = 6 sessions) but purchaseRevenue/transactions remain null (purchase check returned "No data found", conversions = 0 across all channels).

## What's working
The storefront GA4 tag is firing — organic traffic is being attributed again. Channel breakdown (last 7 days): Direct 6 sessions, Organic Shopping 6 sessions, Unassigned 2 sessions. Note traffic lands under **Organic Shopping**, not Organic Search (product/collection-driven organic), so verification queries should filter on that channel going forward.

## What's still broken
No purchase events are reaching GA4: purchaseRevenue and transactions are null, ecommercePurchases empty, conversions = 0 everywhere. The Measurement Protocol purchase path is not yet producing data.

## Most likely missing step (check in this order)
1. **(b) Shopify Customer Events purchase pixel / Measurement Protocol API secret** — most probable cause. Confirm the pixel is published and the MP `api_secret` is valid for property 251836602. Conversions = 0 strongly suggests no purchase hits are arriving.
2. **(c) GA4 'purchase' marked as a Key event** — without it, conversions stay 0 even if events arrive.
3. **(d) `_ga_client_id` cart-attribute bridge appearing on orders** — verify the attribute is present on recent orders so MP events join the right session.
4. (a) Env vars (PUBLIC_GOOGLE_GTM_ID, PUBLIC_CHECKOUT_DOMAIN) appear deployed — organic sessions confirm the storefront tag is live.

## Performance snapshot

Top organic landing pages (Organic Shopping, last 7 days): landing page largely `(not set)` (5 sessions) + `/` (1). None with revenue. Landing-page attribution for Shopping channel is thin — expected until the purchase pixel + client_id bridge populate.

Top GSC pages (last 7 days, clicks):
1. Homepage `/` — 43 clicks, 537 impr, pos 9.7
2. /collections/mid-century-modern-dining-tables — 22 clicks, 3517 impr, pos 16.7
3. /collections/scandinavian-design-furniture — 9 clicks, 1162 impr, pos 26.6
4. /products/scandinavian-dining-table-extendable-dining-table — 8 clicks, 2231 impr, pos 34.6
5. /blogs/.../top-5-modern-mid-century-furniture-companies — 6 clicks, 345 impr, pos 11.8
6. /blogs/.../best-scandinavian-furniture-online — 5 clicks, 1160 impr, pos 24.1

_Not yet verified — keep this daily task running until purchase revenue records, then re-evaluate._
