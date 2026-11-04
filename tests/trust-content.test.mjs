import assert from "node:assert/strict";
import test from "node:test";
import {
  findAttributionDefaults,
  findSampleAttributions,
  findUnregisteredTypes,
  registeredTypes,
  run,
} from "../scripts/check-trust-content.mjs";

test("the repo has no trust-content findings", () => {
  assert.deepEqual(run(), []);
});

test("catches the Mar 2026 gallery preset that shipped sample names", () => {
  const src = `export let schema = createSchema({
  type: "customer-gallery",
  presets: {
    children: [
      { type: "customer-gallery-item", caption: "Credenza", customerName: "Sarah M., Chicago" },
    ],
  },
});`;
  const findings = findAttributionDefaults(src, "gallery.tsx");
  assert.equal(findings.length, 1);
  assert.match(findings[0].detail, /customerName: "Sarah M\., Chicago"/);
});

test("catches a non-empty author defaultValue", () => {
  const src = `inputs: [{ type: "text", name: "author", label: "Author", defaultValue: "Sarah M." }]`;
  assert.equal(findAttributionDefaults(src, "content.tsx").length, 1);
});

test("an empty author defaultValue passes", () => {
  const src = `inputs: [{ type: "text", name: "author", label: "Author", defaultValue: "" }]`;
  assert.equal(findAttributionDefaults(src, "content.tsx").length, 0);
});

test("the real Etsy attribution is allowed in presets only", () => {
  const preset = `presets: { quote: "Real words", author: "Verified Etsy buyer" }`;
  assert.equal(findAttributionDefaults(preset, "quote.tsx").length, 0);
  const input = `{ name: "author", defaultValue: "Verified Etsy buyer" }`;
  assert.equal(findAttributionDefaults(input, "quote.tsx").length, 1);
});

test("catches sample names attributed in a composition", () => {
  const src = `{
      id: "gallery-1",
      type: "customer-gallery-item",
      data: { caption: "Japandi Dining Table", customerName: "Michael T., Austin" },
    },`;
  assert.equal(findSampleAttributions(src, "default-product.ts").length, 1);
});

test("catches the reviews block whose type was never registered", () => {
  const types = registeredTypes();
  assert.ok(types.has("judgeme-review--index"), "registry resolves real types");
  assert.ok(types.has("slideshow"), "title-first schemas resolve too");
  assert.ok(types.has("main"), "relative imports (./main) resolve too");
  const src = `{
      id: "reviews-index",
      type: "judgeme-review-index",
    },`;
  const findings = findUnregisteredTypes(src, "default-product.ts", types);
  assert.equal(findings.length, 1);
  assert.match(findings[0].detail, /judgeme-review-index/);
});

test("checks inline composition items too", () => {
  const types = registeredTypes();
  const src = `items: [
    { id: "page-root", type: "main", children: [{ id: "page-section" }] },
    { id: "page-section", type: "pagee" },
  ],`;
  const findings = findUnregisteredTypes(src, "page.ts", types);
  assert.deepEqual(
    findings.map((f) => f.detail.match(/type "([^"]+)"/)[1]),
    ["pagee"],
  );
});
