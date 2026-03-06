import type { SeoConfig } from "@shopify/hydrogen";
import { getSeoMeta } from "@shopify/hydrogen";

/** Default OG image used when no product/collection image is available */
const DEFAULT_OG_IMAGE =
  "https://cdn.shopify.com/s/files/1/1015/2577/files/moderncre8ve_logo_full_RGB1024x1024_f9c5d104-770f-4882-aa07-acce48896eb5.png?v=1692116185";

/**
 * Enhanced wrapper around Hydrogen's `getSeoMeta()` that adds
 * missing OG and Twitter Card tags that `getSeoMeta` doesn't generate:
 *
 * - `og:type` (website)
 * - `og:site_name` (ModernCre8ve)
 * - `twitter:card` (summary_large_image when image present, summary otherwise)
 * - `twitter:image` (mirrors og:image)
 * - Fallback `og:image` when no product/collection image exists
 * - `twitter:site` / `twitter:creator` when not already set
 *
 * Drop-in replacement for `getSeoMeta()` in route meta functions.
 * Lives outside `.server.ts` so it can be used in client-side meta exports.
 */
/**
 * Options bag for extras that `getSeoMeta` can't derive from `SeoConfig`.
 * Pass as the **last** argument (it's detected by the presence of the
 * `canonicalUrl` key, so it won't collide with SeoConfig objects).
 */
interface EnhancedSeoOptions {
  /** Canonical URL to inject if `getSeoMeta` didn't already produce one. */
  canonicalUrl?: string;
}

function isOptions(
  v: SeoConfig | EnhancedSeoOptions | undefined,
): v is EnhancedSeoOptions {
  return v !== undefined && "canonicalUrl" in v;
}

export function getEnhancedSeoMeta(
  ...args: (SeoConfig | EnhancedSeoOptions | undefined)[]
): Record<string, string>[] {
  // Separate the optional options bag from the SeoConfig entries
  const last = args[args.length - 1];
  const options: EnhancedSeoOptions = isOptions(last) ? last : {};
  const configs = (isOptions(last) ? args.slice(0, -1) : args) as (
    | SeoConfig
    | undefined
  )[];

  const seoMeta = getSeoMeta(
    ...configs.filter(Boolean),
  ) as Record<string, string>[];

  const hasOgImage = seoMeta.some(
    (tag) => tag.property === "og:image" || tag.property === "og:image:url",
  );

  const hasTwitterSite = seoMeta.some(
    (tag) => tag.property === "twitter:site",
  );

  const extra: Record<string, string>[] = [
    { property: "og:type", content: "website" },
    { property: "og:site_name", content: "ModernCre8ve" },
    {
      property: "twitter:card",
      content: hasOgImage ? "summary_large_image" : "summary",
    },
  ];

  // Add twitter:site + twitter:creator if not already set
  if (!hasTwitterSite) {
    extra.push(
      { property: "twitter:site", content: "@moderncre8ve" },
      { property: "twitter:creator", content: "@moderncre8ve" },
    );
  }

  // Add fallback OG image for pages without product/collection images
  if (!hasOgImage) {
    extra.push(
      { property: "og:image", content: DEFAULT_OG_IMAGE },
      { property: "og:image:width", content: "1024" },
      { property: "og:image:height", content: "1024" },
      { property: "og:image:alt", content: "ModernCre8ve" },
    );
  }

  // Always add twitter:image (getSeoMeta never generates this)
  const ogImageTag = seoMeta.find(
    (tag) => tag.property === "og:image" || tag.property === "og:image:url",
  );
  extra.push({
    property: "twitter:image",
    content: ogImageTag?.content ?? DEFAULT_OG_IMAGE,
  });

  // Ensure exactly one canonical link exists
  const hasCanonical = seoMeta.some(
    (tag) => tag.tagName === "link" && tag.rel === "canonical",
  );
  if (!hasCanonical && options.canonicalUrl) {
    extra.push({
      tagName: "link",
      rel: "canonical",
      href: options.canonicalUrl,
    } as unknown as Record<string, string>);
  }

  return [...seoMeta, ...extra];
}
