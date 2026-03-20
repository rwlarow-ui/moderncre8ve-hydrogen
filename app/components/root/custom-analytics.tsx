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

export function CustomAnalytics() {
  const { subscribe } = useAnalytics();
  const nonce = useNonce();
  const rootData = useRouteLoaderData<RootLoader>("root");

  // biome-ignore lint/correctness/useExhaustiveDependencies: subscriptions only need to be set up once
  useEffect(() => {
    subscribe(AnalyticsEvent.PAGE_VIEWED, (data: PageViewPayload) => {
      window.dataLayer?.push({
        event: "page_viewed",
        page_url: data.url,
      });
    });
    subscribe(AnalyticsEvent.PRODUCT_VIEWED, (data: ProductViewPayload) => {
      window.dataLayer?.push({
        event: "product_viewed",
        product_id: data.products?.[0]?.id,
        product_name: data.products?.[0]?.title,
        product_price: data.products?.[0]?.price,
        product_url: data.products?.[0]?.url,
      });
    });
    subscribe(AnalyticsEvent.CART_UPDATED, (data: CartUpdatePayload) => {
      window.dataLayer?.push({
        event: "cart_updated",
        cart_id: data.cart?.id,
        cart_total: data.cart?.cost?.totalAmount?.amount,
        cart_total_quantity: data.cart?.totalQuantity,
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
