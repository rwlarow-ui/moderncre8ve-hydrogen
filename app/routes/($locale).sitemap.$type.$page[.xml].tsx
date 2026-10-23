import { getSitemap } from "@shopify/hydrogen";
import {
  normalizePathname,
  STOREFRONT_LOCALE_PREFIXES,
  SUPPORTED_STOREFRONT_LOCALES,
} from "~/utils/const";
import type { Route } from "./+types/($locale).sitemap.$type.$page[.xml]";

const BLOG_HANDLE = "mid-century-modern-scandi-japandi-design-blog";

export async function loader({
  request,
  params,
  context: { storefront },
}: Route.LoaderArgs) {
  const response = await getSitemap({
    storefront,
    request,
    params,
    locales: SUPPORTED_STOREFRONT_LOCALES,
    getLink: ({ type, baseUrl, handle, locale }) => {
      const pathPrefix = locale
        ? (STOREFRONT_LOCALE_PREFIXES[locale] ?? "")
        : "";
      const basePath =
        type === "articles"
          ? `/blogs/${BLOG_HANDLE}/${handle}`
          : `/${type}/${handle}`;

      if (!pathPrefix) {
        return `${baseUrl}${normalizePathname(basePath)}`;
      }

      return `${baseUrl}${pathPrefix}${normalizePathname(basePath)}`;
    },
  });

  response.headers.set("Cache-Control", `max-age=${60 * 60 * 24}`);

  return response;
}
