import { getSitemap } from "@shopify/hydrogen";
import type { LoaderFunctionArgs } from "@shopify/remix-oxygen";
import { SUPPORTED_STOREFRONT_LOCALES } from "~/utils/const";

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
      const segments = [];

      if (!locale) {
        if (type === "articles") {
          return `${baseUrl}/blogs/${BLOG_HANDLE}/${handle}`;
        }
        return `${baseUrl}/${type}/${handle}`;
      }

      segments.push(baseUrl, locale.toLowerCase());

      if (type === "articles") {
        segments.push("blogs", BLOG_HANDLE, handle);
      } else {
        segments.push(type, handle);
      }

      return segments.join("/");
    },
  });

  response.headers.set("Cache-Control", `max-age=${60 * 60 * 24}`);

  return response;
}
