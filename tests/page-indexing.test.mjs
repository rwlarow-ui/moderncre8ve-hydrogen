import assert from "node:assert/strict";
import test from "node:test";
import { getSitemap } from "@shopify/hydrogen";
import {
  getPageRedirectUrl,
  isIndexablePageHandle,
  storefrontForSitemap,
} from "../app/utils/page-indexing.ts";

test("duplicate pages redirect within the requested locale and keep query parameters", () => {
  assert.equal(
    getPageRedirectUrl(
      "https://moderncre8ve.com/en-ca/pages/about-us-1?utm_source=google",
      "about-us-1",
    ),
    "https://moderncre8ve.com/en-ca/pages/about-us?utm_source=google",
  );
  assert.equal(
    getPageRedirectUrl(
      "https://moderncre8ve.com/pages/contact-and-inquiry",
      "contact-and-inquiry",
    ),
    "https://moderncre8ve.com/pages/contact-us",
  );
  assert.equal(
    getPageRedirectUrl("https://moderncre8ve.com/pages/faq", "faq"),
    null,
  );
  assert.equal(
    getPageRedirectUrl(
      "https://moderncre8ve.com/pages/constructor",
      "constructor",
    ),
    null,
  );
});

test("page sitemaps omit redirects and error content without changing the cached data", async () => {
  const items = [
    "about-us",
    "about-us-1",
    "contact-us",
    "contact-and-inquiry",
    "wrong-turn",
    "faq",
  ].map((handle) => ({ handle, updatedAt: "2026-11-03T00:00:00Z" }));
  const data = { sitemap: { resources: { items } } };
  const storefront = { query: async () => data };
  const response = await getSitemap({
    storefront: storefrontForSitemap(storefront, "pages"),
    request: new Request("https://moderncre8ve.com/sitemap/pages/1.xml"),
    params: { type: "pages", page: "1" },
    locales: ["EN-CA"],
    getLink: ({ baseUrl, handle, locale }) =>
      `${baseUrl}${locale ? "/en-ca" : ""}/pages/${handle}`,
  });
  const xml = await response.text();
  assert.equal(response.status, 200);
  assert.equal((xml.match(/<loc>/g) || []).length, 3);
  assert.match(xml, /en-ca\/pages\/about-us/);
  assert.doesNotMatch(xml, /about-us-1|contact-and-inquiry|wrong-turn/);
  assert.equal(data.sitemap.resources.items.length, 6);
  assert.equal(storefrontForSitemap(storefront, "products"), storefront);
  assert.equal(isIndexablePageHandle("cleveland-workshop-showroom"), true);
});
