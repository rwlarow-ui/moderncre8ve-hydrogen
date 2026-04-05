import { getSitemap } from "@shopify/hydrogen";
import type { LoaderFunctionArgs } from "@shopify/remix-oxygen";
import {
  normalizePathname,
  STOREFRONT_LOCALE_PREFIXES,
  SUPPORTED_STOREFRONT_LOCALES,
} from "~/utils/const";

const BLOG_HANDLE = "mid-century-modern-scandi-japandi-design-blog";

export async function loader({
  request,
  params,
  context: { storefront },
}: LoaderFunctionArgs) {
  const response = await getSitemap({
    storefront,
    request,
    params,
    locales: SUPPORTED_STOREFRONT_LOCALES,
    getLink: ({ type, baseUrl, handle, locale }) => {
      const pathPrefix = locale ? STOREFRONT_LOCALE_PREFIXES[locale] ?? "" : "";
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
