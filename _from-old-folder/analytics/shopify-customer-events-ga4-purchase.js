/**
 * Shopify Customer Events — GA4 purchase tracking (headless Hydrogen)
 * ------------------------------------------------------------------
 * WHERE THIS GOES: Shopify admin → Settings → Customer events →
 *   "Add custom pixel" → paste this whole file → Save → Connect.
 *
 * WHY: In a headless Hydrogen storefront, checkout happens on Shopify's
 * domain, so storefront gtag cannot see the purchase. This pixel listens
 * for `checkout_completed` and sends a GA4 `purchase` event server-side
 * via the Measurement Protocol — restoring revenue tracking that has been
 * broken since Jan 2024.
 *
 * BEFORE IT WORKS, set the two constants below:
 *   1. GA4_MEASUREMENT_ID — your web stream ID (already filled in).
 *   2. GA4_API_SECRET     — create in GA4: Admin → Data streams →
 *      Moderncre8ve → "Measurement Protocol API secrets" → Create.
 *      Paste the secret value here. (It's write-only; safe in the pixel.)
 *
 * ATTRIBUTION NOTE: For organic/paid channel credit to follow the order,
 * the storefront must pass the GA4 client_id into checkout as a cart
 * attribute named `_ga_client_id` (the companion storefront change).
 * If that attribute is absent, this pixel falls back to Shopify's own
 * visitor id so revenue is still captured — just attributed less precisely.
 */

const GA4_MEASUREMENT_ID = "G-G4Q4Z6MM4B";
const GA4_API_SECRET = "PASTE_YOUR_MEASUREMENT_PROTOCOL_API_SECRET_HERE";

const MP_ENDPOINT = "https://www.google-analytics.com/mp/collect";

/** GA4 expects a client_id like "1234567890.1700000000". */
function fallbackClientId() {
  const rand = Math.floor(Math.random() * 1e10);
  const ts = Math.floor(Date.now() / 1000);
  return `${rand}.${ts}`;
}

function money(m) {
  // Shopify MoneyV2 → number
  if (m == null) return undefined;
  const amt = typeof m === "object" ? m.amount : m;
  const n = Number(amt);
  return Number.isFinite(n) ? n : undefined;
}

analytics.subscribe("checkout_completed", (event) => {
  try {
    const checkout = event?.data?.checkout;
    if (!checkout) return;

    // Prefer the GA4 client_id bridged from the storefront via cart attribute.
    const bridged = (checkout.attributes || []).find(
      (a) => a && a.key === "_ga_client_id",
    )?.value;
    const clientId = bridged || event?.clientId || fallbackClientId();

    const items = (checkout.lineItems || []).map((li, index) => ({
      item_id:
        li?.variant?.product?.id ?? li?.variant?.id ?? li?.id ?? String(index),
      item_name: li?.title ?? li?.variant?.product?.title,
      item_variant: li?.variant?.title,
      price: money(li?.variant?.price),
      quantity: li?.quantity ?? 1,
      index,
    }));

    const coupon = (checkout.discountApplications || [])
      .map((d) => d?.title || d?.code)
      .filter(Boolean)
      .join(", ");

    const payload = {
      client_id: clientId,
      // Stitch to the order so GA4 de-duplicates and ties to the user.
      events: [
        {
          name: "purchase",
          params: {
            transaction_id: checkout.order?.id || checkout.token,
            value: money(checkout.totalPrice),
            currency: checkout.currencyCode,
            tax: money(checkout.totalTax),
            shipping: money(checkout.shippingLine?.price),
            coupon: coupon || undefined,
            items,
            // Mark engagement so GA4 attributes the session correctly.
            engagement_time_msec: 1,
          },
        },
      ],
    };

    const url = `${MP_ENDPOINT}?measurement_id=${encodeURIComponent(
      GA4_MEASUREMENT_ID,
    )}&api_secret=${encodeURIComponent(GA4_API_SECRET)}`;

    fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      keepalive: true,
    });
  } catch (e) {
    // Never let analytics break checkout.
  }
});
