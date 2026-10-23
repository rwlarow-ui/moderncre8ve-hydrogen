import assert from "node:assert/strict";
import test from "node:test";
import { productRelationsJsonLd } from "../app/utils/product-relations.ts";

const origin = "https://moderncre8ve.com";

test("tables link to chairs and claim US origin", () => {
  const ld = productRelationsJsonLd(
    "scandinavian-oval-dining-table-mar-vista",
    origin,
  );
  assert.equal(ld.countryOfOrigin.name, "US");
  assert.deepEqual(
    ld.isRelatedTo.map((r) => r.url),
    [`${origin}/products/the-seymour-modern-dining-chair`],
  );
});

test("imported chair emits no countryOfOrigin", () => {
  const ld = productRelationsJsonLd("the-seymour-modern-dining-chair", origin);
  assert.equal("countryOfOrigin" in ld, false);
  assert.ok(ld.isRelatedTo.length > 1);
});

test("unmapped product gets origin only", () => {
  const ld = productRelationsJsonLd("lareauxs-furniture-wax", origin);
  assert.equal(ld.countryOfOrigin.name, "US");
  assert.equal("isRelatedTo" in ld, false);
});
