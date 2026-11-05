import assert from "node:assert/strict";
import test from "node:test";
import { productRelationsJsonLd } from "../app/utils/product-relations.ts";

const origin = "https://moderncre8ve.com";

test("tables omit held chair destinations and keep US origin", () => {
  const ld = productRelationsJsonLd(
    "scandinavian-oval-dining-table-mar-vista",
    origin,
  );
  assert.equal(ld.countryOfOrigin.name, "US");
  assert.equal("isRelatedTo" in ld, false);
});

test("imported chair emits no countryOfOrigin", () => {
  const ld = productRelationsJsonLd("the-seymour-modern-dining-chair", origin);
  assert.equal("countryOfOrigin" in ld, false);
  assert.ok(ld.isRelatedTo.length > 1);
  assert.deepEqual(
    ld.isRelatedTo.map((r) => r.url),
    [
      `${origin}/products/the-santa-monica-mid-century-modern-dining-table`,
      `${origin}/products/bossa-nova-modern-dining-table-small-handmade-ohio`,
      `${origin}/products/payne-oval-extendable-dining-table-for-6-8`,
    ],
  );
});

test("unmapped product gets origin only", () => {
  const ld = productRelationsJsonLd("lareauxs-furniture-wax", origin);
  assert.equal(ld.countryOfOrigin.name, "US");
  assert.equal("isRelatedTo" in ld, false);
});

test("imported table emits no countryOfOrigin or held relations", () => {
  const ld = productRelationsJsonLd(
    "scandinavian-oval-dining-table-mar-vista",
    origin,
    { imported: true },
  );
  assert.equal("countryOfOrigin" in ld, false);
  assert.equal("isRelatedTo" in ld, false);
});
