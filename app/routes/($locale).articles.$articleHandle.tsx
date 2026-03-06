import { redirect } from "react-router";
import type { LoaderFunctionArgs } from "react-router";

const BLOG_HANDLE = "mid-century-modern-scandi-japandi-design-blog";

/**
 * Redirect old /articles/:slug URLs to /blogs/:blogHandle/:slug
 * These are legacy URLs from the previous Shopify theme that now 404.
 * All 37 article slugs still exist under the blog, so we do a blanket
 * 301 redirect rather than maintaining a lookup table.
 */
export async function loader({ params }: LoaderFunctionArgs) {
  const { articleHandle, locale } = params;
  const prefix = locale ? `/${locale}` : "";
  throw redirect(`${prefix}/blogs/${BLOG_HANDLE}/${articleHandle}`, 301);
}

export default function ArticleRedirect() {
  return null;
}
