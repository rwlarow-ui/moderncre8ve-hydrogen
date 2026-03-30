import {
  AnalyticsEvent,
  type CartUpdatePayload,
  type PageViewPayload,
  type ProductViewPayload,
  Script,
  useAnalytics,
  useNonce,
} from "@shopify/hydrogen";
import { useEffect } from "react";
import { useRouteLoaderData } from "react-router";
import type { RootLoader } from "~/root";

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Build a GA4-spec ecommerce item object from a Hydrogen cart line. */
function buildCartLineItem(line: any) {
  return {
    item_id: line.merchandise?.product?.id ?? line.id,
    item_name: line.merchandise?.product?.title ?? "Unknown Product",
    item_variant: line.merchandise?.title ?? "",
    item_brand: line.merchandise?.product?.vendor ?? "ModernCre8ve",
    price: parseFloat(line.merchandise?.price?.amount ?? "0"),
    quantity: line.quantity ?? 1,
  };
}

/**
 * CustomAnalytics
 *
 * Bridges Hydrogen's analytics subscription system into GA4 standard
 * ecommerce events via the GTM dataLayer.
 *
 * Events fired:
 *  - page_viewed         (legacy, keep for GSC/custom reports)
 *  - view_item           (GA4 ecommerce — replaces basic product_viewed)
 *  - product_viewed      (legacy, keep for backward compat)
 *  - add_to_cart         (GA4 ecommerce — fires when cart lines increase)
 *  - remove_from_cart    (GA4 ecommerce — fires when cart lines decrease)
 *  - view_cart           (GA4 ecommerce — fires when cart is opened/viewed)
 *  - cart_updated        (legacy, keep for backward compat)
 *
 * Note: begin_checkout is fired in cart.tsx on the CHECKOUT button click,
 * where the full cart item list is available.
 * Note: purchase events require Shopify's order_status page pixel or
 * Measurement Protocol — not available within the Hydrogen SPA.
 */
export function CustomAnalytics() {
  const { subscribe } = useAnalytics();
  const nonce = useNonce();
  const rootData = useRouteLoaderData<RootLoader>("root");

  // biome-ignore lint/correctness/useExhaustiveDependencies: subscriptions only need to be set up once
  useEffect(() => {
    // ── Page view ─────────────────────────────────────────────────────────────
    subscribe(AnalyticsEvent.PAGE_VIEWED, (data: PageViewPayload) => {
      window.dataLayer?.push({
        event: "page_viewed",
        page_url: data.url,
      });
    });

    // ── Product view → GA4 view_item ──────────────────────────────────────────
    subscribe(AnalyticsEvent.PRODUCT_VIEWED, (data: ProductViewPayload) => {
      const product = data.products?.[0];
      if (!product) return;

      const price = parseFloat(String(product.price ?? 0));

      // Legacy event (backward compat with existing GTM tags / Looker reports)
      window.dataLayer?.push({
        event: "product_viewed",
        product_id: product.id,
        product_name: product.title,
        product_price: price,
        product_url: product.url,
      });

      // GA4 standard ecommerce view_item
      // Always clear ecommerce before pushing a new event (GA4 best practice)
      window.dataLayer?.push({ ecommerce: null });
      window.dataLayer?.push({
        event: "view_item",
        ecommerce: {
          currency: "USD",
          value: price,
          items: [
            {
              item_id: product.id,
              item_name: product.title,
              price,
              quantity: 1,
            },
          ],
        },
      });
    });

    // ── Cart updated → GA4 add_to_cart / remove_from_cart ─────────────────────
    subscribe(AnalyticsEvent.CART_UPDATED, (data: CartUpdatePayload) => {
      const prevLines = data.prevCart?.lines?.nodes ?? [];
      const currentLines = data.cart?.lines?.nodes ?? [];
      const currency =
        currentLines[0]?.cost?.totalAmount?.currencyCode ??
        prevLines[0]?.cost?.totalAmount?.currencyCode ??
        "USD";

      // Items added: line is new OR quantity has increased
      const addedLines = currentLines.filter((line) => {
        const prev = prevLines.find((p) => p.id === line.id);
        return !prev || line.quantity > prev.quantity;
      });

      // Items removed: line is gone OR quantity has decreased
      const removedLines = prevLines.filter((prev) => {
        const current = currentLines.find((c) => c.id === prev.id);
        return !current || prev.quantity > current.quantity;
      });

      if (addedLines.length > 0) {
        const value = addedLines.reduce(
          (sum, line) =>
            sum + parseFloat(line.cost?.totalAmount?.amount ?? "0"),
          0,
        );
        window.dataLayer?.push({ ecommerce: null });
        window.dataLayer?.push({
          event: "add_to_cart",
          ecommerce: {
            currency,
            value,
            items: addedLines.map(buildCartLineItem),
          },
        });
      }

      if (removedLines.length > 0) {
        const value = removedLines.reduce(
          (sum, line) =>
            sum + parseFloat(line.cost?.totalAmount?.amount ?? "0"),
          0,
        );
        window.dataLayer?.push({ ecommerce: null });
        window.dataLayer?.push({
          event: "remove_from_cart",
          ecommerce: {
            currency,
            value,
            items: removedLines.map(buildCartLineItem),
          },
        });
      }

      // Legacy cart_updated (backward compat)
      window.dataLayer?.push({
        event: "cart_updated",
        cart_id: data.cart?.id,
        cart_total: data.cart?.cost?.totalAmount?.amount,
        cart_total_quantity: data.cart?.totalQuantity,
      });
    });

    // ── Cart viewed → GA4 view_cart ───────────────────────────────────────────
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    subscribe(AnalyticsEvent.CART_VIEWED, (data: any) => {
      const lines = data.cart?.lines?.nodes ?? [];
      const currency = data.cart?.cost?.totalAmount?.currencyCode ?? "USD";
      const value = parseFloat(data.cart?.cost?.totalAmount?.amount ?? "0");
      window.dataLayer?.push({ ecommerce: null });
      window.dataLayer?.push({
        event: "view_cart",
        ecommerce: {
          currency,
          value,
          items: lines.map(buildCartLineItem),
        },
      });
    });
  }, []);

  const id = rootData?.googleGtmID;
  if (!id) {
    return null;
  }

  return (
    <>
      {/* Initialize GA4 via gtag.js — deferred to reduce main-thread blocking */}
      <script
        nonce={nonce}
        suppressHydrationWarning
        dangerouslySetInnerHTML={{
          __html: `
              window.dataLayer = window.dataLayer || [];
              function gtag(){ dataLayer.push(arguments) };

              // Defer analytics init until the browser is idle to avoid blocking
              // LCP/TBT and allow document to reach "idle" state faster.
              var initGA = function() {
                gtag('js', new Date());
                gtag('config', "${id}", {
                  page_path: window.location.pathname,
                  send_page_view: true
                });
              };
              if (typeof requestIdleCallback === 'function') {
                requestIdleCallback(initGA, { timeout: 3000 });
              } else {
                setTimeout(initGA, 1500);
              }
          `,
        }}
      />

      {/* Load gtag.js (GA4) — NOT gtm.js which requires a GTM-XXXXXX container ID */}
      <Script async src={`https://www.googletagmanager.com/gtag/js?id=${id}`} />
    </>
  );
}
