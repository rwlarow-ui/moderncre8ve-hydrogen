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

/**
 * Map Shopify analytics product payloads to GA4 ecommerce `items`.
 * Defensive: payload shapes vary slightly per event, so every field is optional.
 */
function toGa4Items(products?: any[]) {
  if (!products?.length) {
    return [];
  }
  return products.map((p, index) => ({
    item_id: p.productGid ?? p.id ?? p.variantId,
    item_name: p.title ?? p.name,
    item_variant: p.variantTitle,
    item_brand: p.vendor,
    item_category: p.productType,
    price: p.price != null ? Number(p.price) : undefined,
    quantity: p.quantity != null ? Number(p.quantity) : 1,
    index,
  }));
}

function itemsValue(items: ReturnType<typeof toGa4Items>) {
  return items.reduce(
    (sum, i) => sum + (i.price ?? 0) * (i.quantity ?? 1),
    0,
  );
}

export function CustomAnalytics() {
  const { subscribe, canTrack } = useAnalytics();
  const nonce = useNonce();
  const rootData = useRouteLoaderData<RootLoader>("root");
  const id = rootData?.googleGtmID;

  // biome-ignore lint/correctness/useExhaustiveDependencies: subscribe/canTrack are stable for the provider lifetime
  useEffect(() => {
    if (!id) {
      return;
    }

    // Sync Google Consent Mode with Shopify's Customer Privacy state, then send.
    const send = (event: string, params: Record<string, any> = {}) => {
      if (typeof window.gtag !== "function") {
        return;
      }
      const allowed = canTrack();
      window.gtag("consent", "update", {
        analytics_storage: allowed ? "granted" : "denied",
      });
      if (!allowed) {
        return;
      }
      window.gtag("event", event, params);
    };

    // SPA navigations: GA4 config is initialized with send_page_view:false,
    // so each client-side route change must emit its own page_view.
    subscribe(AnalyticsEvent.PAGE_VIEWED, (data: PageViewPayload) => {
      send("page_view", { page_location: data.url });
    });

    subscribe(AnalyticsEvent.PRODUCT_VIEWED, (data: ProductViewPayload) => {
      const items = toGa4Items(data.products);
      send("view_item", { value: itemsValue(items), items });
    });

    subscribe(AnalyticsEvent.COLLECTION_VIEWED, (data: any) => {
      send("view_item_list", {
        item_list_id: data?.collection?.handle,
        item_list_name: data?.collection?.handle,
      });
    });

    subscribe(AnalyticsEvent.PRODUCT_ADD_TO_CART, (data: CartUpdatePayload) => {
      const items = toGa4Items((data as any).products ?? data.cart?.lines?.nodes);
      send("add_to_cart", {
        currency: data.cart?.cost?.totalAmount?.currencyCode,
        value: itemsValue(items),
        items,
      });
    });

    subscribe(AnalyticsEvent.PRODUCT_REMOVED_FROM_CART, (data: CartUpdatePayload) => {
      const items = toGa4Items((data as any).products ?? data.cart?.lines?.nodes);
      send("remove_from_cart", {
        currency: data.cart?.cost?.totalAmount?.currencyCode,
        value: itemsValue(items),
        items,
      });
    });

    subscribe(AnalyticsEvent.CART_VIEWED, (data: CartUpdatePayload) => {
      send("view_cart", {
        currency: data.cart?.cost?.totalAmount?.currencyCode,
        value: data.cart?.cost?.totalAmount?.amount
          ? Number(data.cart.cost.totalAmount.amount)
          : undefined,
        items: toGa4Items(data.cart?.lines?.nodes),
      });
    });

    subscribe(AnalyticsEvent.SEARCH_VIEWED, (data: any) => {
      send("search", { search_term: data?.searchTerm });
    });
  }, [id]);

  if (!id) {
    return null;
  }

  return (
    <>
      {/* Load GA4 (gtag.js) */}
      <Script async src={`https://www.googletagmanager.com/gtag/js?id=${id}`} />

      {/* Initialize gtag with Consent Mode v2 defaults (denied until granted) */}
      <script
        nonce={nonce}
        suppressHydrationWarning
        // biome-ignore lint/security/noDangerouslySetInnerHtml: required to bootstrap gtag
        dangerouslySetInnerHTML={{
          __html: `
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            window.gtag = gtag;
            gtag('consent', 'default', {
              ad_storage: 'denied',
              ad_user_data: 'denied',
              ad_personalization: 'denied',
              analytics_storage: 'denied'
            });
            gtag('js', new Date());
            gtag('config', '${id}', { send_page_view: false });
          `,
        }}
      />
    </>
  );
}
