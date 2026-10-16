/// <reference types="vite/client" />
/// <reference types="@shopify/remix-oxygen" />
/// <reference types="@shopify/oxygen-workers-types" />

// Enhance TypeScript's built-in typings.
import "@total-typescript/ts-reset";
import type { HydrogenEnv, HydrogenSessionData } from "@shopify/hydrogen";
import type { createAppLoadContext } from "./server";

declare global {
  /**
   * A global `process` object is only available during build to access NODE_ENV.
   */
  const process: { env: { NODE_ENV: "production" | "development" } };

  interface Env extends HydrogenEnv {
    // declare additional Env parameter use in the fetch handler and Remix loader context here
    PUBLIC_GOOGLE_GTM_ID: string;
    SHOPIFY_ADMIN_API_TOKEN?: string;
    /** Narrowly scoped token for the ops hub; preferred over SHOPIFY_ADMIN_API_TOKEN. */
    OPS_ADMIN_API_TOKEN?: string;
    /** Production PO email (ADR-0001). Set as Oxygen env vars, never committed. */
    RESEND_API_KEY?: string;
    /** Verified Resend sender, e.g. "ModernCre8ve Orders <orders@moderncre8ve.com>". */
    PO_FROM_EMAIL?: string;
    /** Production partner address that receives approved POs. */
    PO_PARTNER_EMAIL?: string;
    /** Optional copy to the shop; also used as Reply-To. */
    PO_CC_EMAIL?: string;
    JUDGEME_PRIVATE_API_TOKEN: string;
    CUSTOM_COLLECTION_BANNER_METAFIELD: string;
    METAOBJECT_COLORS_TYPE: string;
    METAOBJECT_COLOR_NAME_KEY: string;
    METAOBJECT_COLOR_VALUE_KEY: string;
    OPS_DASHBOARD_PASSWORD?: string;
    PUBLIC_SHOPIFY_INBOX_SHOP_ID: string;
    PUBLIC_TURNSTILE_SITE_KEY?: string;
    TURNSTILE_SECRET_KEY?: string;
  }
}

declare module "react-router" {
  interface AppLoadContext
    extends Awaited<ReturnType<typeof createAppLoadContext>> {
    // to change context type, change the return of createAppLoadContext() instead
  }

  // TODO: remove this once we've migrated our loaders to `Route.LoaderArgs`
  interface LoaderFunctionArgs {
    context: AppLoadContext;
  }

  // TODO: remove this once we've migrated our loaders to `Route.ActionArgs`
  interface ActionFunctionArgs {
    context: AppLoadContext;
  }

  interface SessionData extends HydrogenSessionData {
    // declare local additions to the Remix session data here
    opsAuthenticated?: boolean;
  }
}

declare global {
  interface Window {
    dataLayer: any[];
    gtag?: (...args: any[]) => void;
  }
}
