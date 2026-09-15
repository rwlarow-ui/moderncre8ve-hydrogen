/**
 * Content Security Policy directives for the storefront.
 *
 * Shopify's own hosts are required for the CDN and the Storefront API; the rest
 * are the third parties the storefront embeds — YouTube and Vimeo for video
 * sections, Cloudflare Turnstile for the newsletter forms, and Google Tag
 * Manager / Analytics.
 */
const SHOPIFY_HOSTS = ["*.shopify.com", "*.myshopify.com"];

export function getContentSecurityPolicy() {
  return {
    defaultSrc: [...SHOPIFY_HOSTS],
    // `'self'` is required for the images served out of `public/` — Hydrogen
    // merges its own `'self'` default into default-src and style-src, but not
    // into img-src, so an img-src we set here replaces it outright.
    imgSrc: ["'self'", "data:", ...SHOPIFY_HOSTS],
    mediaSrc: ["*.youtube.com", "*.youtu.be", "*.vimeo.com", ...SHOPIFY_HOSTS],
    frameSrc: [
      "*.youtube.com",
      "*.youtu.be",
      "*.vimeo.com",
      "challenges.cloudflare.com",
      ...SHOPIFY_HOSTS,
    ],
    scriptSrc: [
      "*.googletagmanager.com",
      "*.google-analytics.com",
      "challenges.cloudflare.com",
      ...SHOPIFY_HOSTS,
    ],
    connectSrc: [
      "vimeo.com",
      "*.google-analytics.com",
      "*.googletagmanager.com",
      "challenges.cloudflare.com",
      ...SHOPIFY_HOSTS,
    ],
    styleSrc: [...SHOPIFY_HOSTS],
  };
}
