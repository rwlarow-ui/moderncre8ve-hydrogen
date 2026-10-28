import assert from "node:assert/strict";
import test from "node:test";
import { productClass } from "../app/utils/product-class.ts";

test("Ohio-built furniture is furniture", () => {
  assert.equal(
    productClass({
      handle: "mid-century-modern-extendable-dining-table-santa-monica",
      productType: "Dining Tables",
      vendor: "Moderncre8ve",
    }),
    "furniture",
  );
});

test("wax is housewares by product type, tag or handle", () => {
  // Live Shopify data for the wax: type "Housewares", tag "Wood Care".
  assert.equal(
    productClass({
      handle: "lareauxs-furniture-wax",
      productType: "Housewares",
      tags: ["Wood Care"],
      vendor: "Moderncre8ve",
    }),
    "housewares",
  );
  assert.equal(productClass({ productType: "Furniture Wax" }), "housewares");
  assert.equal(productClass({ tags: ["Wood Care"] }), "housewares");
  assert.equal(
    productClass({ handle: "lareauxs-furniture-wax" }),
    "housewares",
  );
});

test("the made-to-order tripod lamp (type Housewares) stays furniture", () => {
  assert.equal(
    productClass({
      handle: "stylish-modern-tripod-lamp",
      productType: "Housewares",
      tags: ["Housewares"],
      vendor: "Moderncre8ve",
    }),
    "furniture",
  );
});

test("Piper + Fox vendor is imported, in any spelling", () => {
  for (const vendor of ["Piper + Fox Co.", "Piper & Fox", "piper and fox"]) {
    assert.equal(
      productClass({ vendor, productType: "Chairs" }),
      "imported",
      vendor,
    );
  }
});

test("a 'Waxwing' style name is not mistaken for wax", () => {
  assert.equal(
    productClass({ handle: "waxwing-credenza", productType: "Credenza" }),
    "furniture",
  );
});
