import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";

let server;
let seoPayload;
let getEnhancedSeoMeta;

before(async () => {
  server = await createServer({
    configFile: false,
    server: { middlewareMode: true },
    resolve: {
      alias: { "~": fileURLToPath(new URL("../app", import.meta.url)) },
    },
  });
  ({ seoPayload } = await server.ssrLoadModule("/app/utils/seo.server.ts"));
  ({ getEnhancedSeoMeta } = await server.ssrLoadModule(
    "/app/utils/enhanced-seo-meta.ts",
  ));
});

after(async () => server?.close());

function collection(handle, seo) {
  return {
    handle,
    title: "Dining Tables | ModernCre8ve",
    description: "Old collection description",
    seo,
    products: { nodes: [] },
  };
}

test("reviewed dining-table snippet overrides populated Shopify SEO and renders one brand", () => {
  const data = collection("mid-century-modern-dining-tables", {
    title: "Old dining tables | ModernCre8ve",
    description: "Free shipping and a lifetime warranty",
  });
  const seo = seoPayload.collection({
    collection: data,
    url: `https://moderncre8ve.com/collections/${data.handle}`,
  });
  const tags = getEnhancedSeoMeta(seo);
  assert.equal(
    tags.find((tag) => tag.title)?.title,
    "Mid-Century Modern Dining Tables | ModernCre8ve",
  );
  const description = tags.find((tag) => tag.name === "description")?.content;
  assert.equal(
    description,
    "Shop solid wood mid-century modern dining tables, handcrafted to order in Ohio. Explore walnut, white oak and extendable designs. Custom sizes by quote.",
  );
  assert.ok(description.length <= 155);
  assert.doesNotMatch(JSON.stringify(tags), /free shipping|lifetime warranty/i);
  const schema = seo.jsonLd.find((item) => item["@type"] === "CollectionPage");
  assert.equal(schema.name, seo.title);
  assert.equal(schema.description, description);
});

test("reviewed snippet also applies when Shopify SEO is empty or absent", () => {
  for (const fields of [null, { title: "", description: "" }]) {
    const data = collection("mid-century-modern-dining-tables", fields);
    const seo = seoPayload.collection({
      collection: data,
      url: "https://moderncre8ve.com",
    });
    assert.equal(seo.title, "Mid-Century Modern Dining Tables");
    assert.match(seo.description, /^Shop solid wood/);
  }
});

test("other collections retain Shopify SEO precedence and brand normalization", () => {
  const data = collection("scandinavian-design-furniture", {
    title: "Scandinavian Furniture | ModernCre8ve",
    description: "Existing Shopify description",
  });
  const seo = seoPayload.collection({
    collection: data,
    url: "https://moderncre8ve.com",
  });
  assert.equal(seo.title, "Scandinavian Furniture");
  assert.equal(seo.description, data.seo.description);
});
