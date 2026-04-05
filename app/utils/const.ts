import type { I18nLocale, Localizations } from "~/types/locale";

export const COUNTRIES: Localizations = {
  default: {
    label: "United States - USD",
    language: "EN",
    country: "US",
    currency: "USD",
  },
  "/en-au": {
    label: "Australia - AUD",
    language: "EN",
    country: "AU",
    currency: "AUD",
  },
  "/en-ca": {
    label: "Canada - CAD",
    language: "EN",
    country: "CA",
    currency: "CAD",
  },
  "/en-cn": {
    label: "China - CNY",
    language: "EN",
    country: "CN",
    currency: "CNY",
  },
  "/en-de": {
    label: "Germany - EUR",
    language: "EN",
    country: "DE",
    currency: "EUR",
  },
  "/en-es": {
    label: "Spain - EUR",
    language: "EN",
    country: "ES",
    currency: "EUR",
  },
  "/en-fr": {
    label: "France - EUR",
    language: "EN",
    country: "FR",
    currency: "EUR",
  },
  "/en-gb": {
    label: "United Kingdom - GBP",
    language: "EN",
    country: "GB",
    currency: "GBP",
  },
  "/en-it": {
    label: "Italy - EUR",
    language: "EN",
    country: "IT",
    currency: "EUR",
  },
  "/en-jp": {
    label: "Japan - JPY",
    language: "EN",
    country: "JP",
    currency: "JPY",
  },

  "/en-nl": {
    label: "Netherlands - EUR",
    language: "EN",
    country: "NL",
    currency: "EUR",
  },
  "/en-vn": {
    label: "Vietnam - VND",
    language: "EN",
    country: "VN",
    currency: "VND",
  },
};

export const PAGINATION_SIZE = 16;

export const DEFAULT_LOCALE: I18nLocale = Object.freeze({
  ...COUNTRIES.default,
  pathPrefix: "",
});

function toLocaleCode(locale: { language: string; country: string }) {
  return `${locale.language}-${locale.country}`.toUpperCase();
}

export const SUPPORTED_STOREFRONT_LOCALES = Array.from(
  new Set(
    Object.values(COUNTRIES).map((locale) => {
      return toLocaleCode(locale);
    }),
  ),
);

export const STOREFRONT_HREFLANGS = [
  {
    hrefLang: toLocaleCode(COUNTRIES.default).toLowerCase(),
    pathPrefix: "",
  },
  ...Object.entries(COUNTRIES)
    .filter(([prefix]) => prefix !== "default")
    .map(([prefix, locale]) => {
      return {
        hrefLang: toLocaleCode(locale).toLowerCase(),
        pathPrefix: prefix,
      };
    }),
];

export function normalizePathname(pathname: string) {
  return pathname.replace(/\/+$/, "") || "/";
}

export function getLocaleAlternatePath(
  basePath: string,
  pathPrefix: string = "",
) {
  const normalizedBasePath = normalizePathname(basePath);

  if (!pathPrefix) {
    return normalizedBasePath;
  }

  if (
    normalizedBasePath === pathPrefix ||
    normalizedBasePath.startsWith(`${pathPrefix}/`)
  ) {
    return normalizedBasePath;
  }

  return normalizedBasePath === "/"
    ? pathPrefix
    : `${pathPrefix}${normalizedBasePath}`;
}
