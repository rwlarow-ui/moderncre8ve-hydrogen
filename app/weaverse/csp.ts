import type { AppLoadContext } from "react-router";

export function getWeaverseCsp(request: Request, context: AppLoadContext) {
  const url = new URL(request.url);
  // Get weaverse host from query params
  const weaverseHost =
    url.searchParams.get("weaverseHost") || context.env.WEAVERSE_HOST;
  const isDesignMode = url.searchParams.get("weaverseHost");
  const weaverseHosts = ["*.weaverse.io", "*.shopify.com", "*.myshopify.com"];
  if (weaverseHost) {
    weaverseHosts.push(weaverseHost);
  }
  const updatedCsp: {
    [x: string]: string[] | string | boolean;
  } = {
    defaultSrc: [...weaverseHosts],
    imgSrc: [
      "data:",
      ...weaverseHosts,
    ],
    mediaSrc: [
      "*.youtube.com",
      "*.youtu.be",
      "*.vimeo.com",
      ...weaverseHosts,
    ],
    frameSrc: [
      "*.youtube.com",
      "*.youtu.be",
      "*.vimeo.com",
      "challenges.cloudflare.com",
      ...weaverseHosts,
    ],
    scriptSrc: [
      "*.googletagmanager.com",
      "*.google-analytics.com",
      "challenges.cloudflare.com",
      ...weaverseHosts,
    ],
    connectSrc: [
      "vimeo.com",
      "*.google-analytics.com",
      "*.googletagmanager.com",
      "challenges.cloudflare.com",
      ...weaverseHosts,
    ],
    styleSrc: weaverseHosts,
  };
  if (isDesignMode) {
    updatedCsp.frameAncestors = ["*"];
  }
  return updatedCsp;
}
