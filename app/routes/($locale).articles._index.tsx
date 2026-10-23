import { redirect } from "react-router";
import type { Route } from "./+types/($locale).articles._index";

const BLOG_HANDLE = "mid-century-modern-scandi-japandi-design-blog";

/**
 * Redirect /articles (index) to /blogs/:blogHandle
 */
export async function loader({ params }: Route.LoaderArgs) {
  const { locale } = params;
  const prefix = locale ? `/${locale}` : "";
  throw redirect(`${prefix}/blogs/${BLOG_HANDLE}`, 301);
}

export default function ArticlesIndexRedirect() {
  return null;
}
