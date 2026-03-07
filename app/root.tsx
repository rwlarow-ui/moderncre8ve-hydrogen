import "@fontsource-variable/jost";
import "@fontsource/spectral/400.css";
import spectralWoff2Url from "@fontsource/spectral/files/spectral-latin-400-normal.woff2?url";
import jostWoff2Url from "@fontsource-variable/jost/files/jost-latin-wght-normal.woff2?url";
import { TooltipProvider } from "@radix-ui/react-tooltip";
import type { SeoConfig } from "@shopify/hydrogen";
import { Analytics, useNonce } from "@shopify/hydrogen";
import type {
  LinksFunction,
  LoaderFunctionArgs,
  MetaArgs,
} from "@shopify/remix-oxygen";
import { useThemeSettings, withWeaverse } from "@weaverse/hydrogen";
import type { CSSProperties } from "react";
import {
  isRouteErrorResponse,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useLocation,
  useRouteError,
  useRouteLoaderData,
} from "react-router";
import { Footer } from "./components/layout/footer";
import { Header } from "./components/layout/header";
import { ScrollingAnnouncement } from "./components/layout/scrolling-announcement";
import {
  NewsletterPopup,
  useShouldRenderNewsletterPopup,
} from "./components/newsletter-popup";
import { CustomAnalytics } from "./components/root/custom-analytics";
import { GenericError } from "./components/root/generic-error";
import { GlobalLoading } from "./components/root/global-loading";
import { NotFound } from "./components/root/not-found";
import styles from "./styles/app.css?url";
import { COUNTRIES, DEFAULT_LOCALE } from "./utils/const";
import { loadCriticalData, loadDeferredData } from "./utils/root.server";
import { getEnhancedSeoMeta } from "./utils/enhanced-seo-meta";
import { GlobalStyle } from "./weaverse/style";

export type RootLoader = typeof loader;

export const links: LinksFunction = () => {
  return [
    {
      rel: "preconnect",
      href: "https://cdn.shopify.com",
    },
    {
      rel: "preconnect",
      href: "https://shop.app",
    },
    {
      rel: "preconnect",
      href: "https://challenges.cloudflare.com",
    },
    // Preload self-hosted fonts emitted by Vite to minimize flash
    {
      rel: "preload",
      href: jostWoff2Url as unknown as string,
      as: "font",
      type: "font/woff2",
      crossOrigin: "anonymous",
    },
    {
      rel: "preload",
      href: spectralWoff2Url as unknown as string,
      as: "font",
      type: "font/woff2",
      crossOrigin: "anonymous",
    },
    { rel: "icon", type: "image/svg+xml", href: "/favicon.ico" },
  ];
};

export async function loader(args: LoaderFunctionArgs) {
  // Start fetching non-critical data without blocking time to first byte
  const deferredData = loadDeferredData(args);

  // Await the critical data required to render initial state of the page
  const criticalData = await loadCriticalData(args);

  return {
    ...deferredData,
    ...criticalData,
  };
}

export const meta = ({ data, location }: MetaArgs<typeof loader>) => {
  const origin = "https://moderncre8ve.com";
  const canonicalPath = location.pathname.replace(/\/+$/, "") || "/";
  const canonical = `${origin}${canonicalPath}`;

  return getEnhancedSeoMeta(data?.seo as SeoConfig, { canonicalUrl: canonical });
};

function App() {
  return <Outlet />;
}

export function ErrorBoundary({ error }: { error: Error }) {
  const routeError: { status?: number; data?: any } = useRouteError();
  const isRouteError = isRouteErrorResponse(routeError);

  let pageType = "page";

  if (isRouteError && routeError.status === 404) {
    pageType = routeError.data || pageType;
  }

  return isRouteError ? (
    routeError.status === 404 ? (
      <NotFound type={pageType} />
    ) : (
      <GenericError
        error={{ message: `${routeError.status} ${routeError.data}` }}
      />
    )
  ) : (
    <GenericError error={error instanceof Error ? error : undefined} />
  );
}

const ORIGIN = "https://moderncre8ve.com";

/**
 * Generates `<link rel="alternate" hreflang="…">` tags for every locale
 * defined in COUNTRIES, plus an `x-default` pointing at the US (default)
 * version.  Rendered inside `<head>` by the Layout component so they
 * appear on every page regardless of child-route meta overrides.
 */
/** All known locale prefixes (e.g. "/en-au", "/en-gb") */
const LOCALE_PREFIXES = Object.keys(COUNTRIES).filter((k) => k !== "default");

function HreflangLinks() {
  const { pathname } = useLocation();

  // Strip the current locale prefix (if any) to get the base path.
  // E.g. "/en-gb/products/foo" → "/products/foo", "/en-gb" → "/"
  let basePath = pathname;
  for (const prefix of LOCALE_PREFIXES) {
    if (pathname === prefix || pathname.startsWith(`${prefix}/`)) {
      basePath = pathname.slice(prefix.length) || "/";
      break;
    }
  }
  // Normalise trailing slashes
  basePath = basePath.replace(/\/+$/, "") || "/";

  // Build alternate links for every locale
  const links: { hreflang: string; href: string }[] = [];

  for (const [prefix, loc] of Object.entries(COUNTRIES)) {
    const lang = loc.language.toLowerCase();
    const country = loc.country.toLowerCase();
    const hreflang = `${lang}-${country}`;

    if (prefix === "default") {
      // Default locale (US) has no prefix
      links.push({ hreflang, href: `${ORIGIN}${basePath}` });
    } else {
      // Prefixed locales: /en-au, /en-ca, etc.
      const localePath =
        basePath === "/" ? prefix : `${prefix}${basePath}`;
      links.push({ hreflang, href: `${ORIGIN}${localePath}` });
    }
  }

  // x-default points to the default (US) version
  links.push({ hreflang: "x-default", href: `${ORIGIN}${basePath}` });

  return (
    <>
      {links.map(({ hreflang, href }) => (
        <link key={hreflang} rel="alternate" hrefLang={hreflang} href={href} />
      ))}
    </>
  );
}

export function Layout({ children }: { children?: React.ReactNode }) {
  const nonce = useNonce();
  const data = useRouteLoaderData<RootLoader>("root");
  const locale = data?.selectedLocale ?? DEFAULT_LOCALE;
  const { topbarHeight, topbarText } = useThemeSettings();
  const shouldShowNewsletterPopup = useShouldRenderNewsletterPopup();

  return (
    <html lang={locale.language}>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <link rel="stylesheet" href={styles} />
        <Meta />
        <Links />
        <HreflangLinks />
        <GlobalStyle />
        {/* Cloudflare Turnstile — anti-spam for newsletter forms */}
        <script
          src="https://challenges.cloudflare.com/turnstile/v0/api.js"
          async
          defer
          nonce={nonce}
        />
      </head>
      <body
        style={
          {
            opacity: 0,
            "--initial-topbar-height": `${topbarText ? topbarHeight : 0}px`,
          } as CSSProperties
        }
        className="bg-background text-body antialiased opacity-100! transition-opacity duration-300"
      >
        {data ? (
          <Analytics.Provider
            cart={data.cart}
            shop={data.shop}
            consent={data.consent}
          >
            <TooltipProvider disableHoverableContent>
              <div
                className="flex min-h-screen flex-col"
                key={`${locale.language}-${locale.country}`}
              >
                <div className="">
                  <a href="#mainContent" className="sr-only">
                    Skip to content
                  </a>
                </div>
                <ScrollingAnnouncement />
                <Header />
                <main id="mainContent" className="grow">
                  {children}
                </main>
                <Footer />
              </div>
              {shouldShowNewsletterPopup && <NewsletterPopup />}
              <CustomAnalytics />
            </TooltipProvider>
          </Analytics.Provider>
        ) : (
          children
        )}
        <GlobalLoading />
        <ScrollRestoration nonce={nonce} />
        <Scripts nonce={nonce} />
      </body>
    </html>
  );
}

export default withWeaverse(App);
