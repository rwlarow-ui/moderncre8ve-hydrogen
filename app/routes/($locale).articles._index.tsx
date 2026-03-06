import { redirect } from "react-router";
import type { LoaderFunctionArgs } from "react-router";

const BLOG_HANDLE = "mid-century-modern-scandi-japandi-design-blog";

/**
 * Redirect /articles (index) to /blogs/:blogHandle
 */
export async function loader({ params }: LoaderFunctionArgs) {
  const { locale } = params;
  const prefix = locale ? `/${locale}` : "";
  throw redirect(`${prefix}/blogs/${BLOG_HANDLE}`, 301);
}

export default function ArticlesIndexRedirect() {
  return null;
}
