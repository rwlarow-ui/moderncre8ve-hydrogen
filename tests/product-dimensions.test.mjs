import assert from "node:assert/strict";
import test from "node:test";
import {
  parseProductDimensions,
  productDimensionsJsonLd,
} from "../app/utils/product-dimensions.ts";

test("emits width/depth/height as QuantitativeValue in inches", () => {
  const dims = parseProductDimensions([
    { key: "height_in", value: "30" },
    { key: "width_in", value: "72.5" },
    { key: "depth_in", value: "36" },
  ]);
  assert.deepEqual(productDimensionsJsonLd(dims), {
    width: { "@type": "QuantitativeValue", value: 72.5, unitCode: "INH" },
    depth: { "@type": "QuantitativeValue", value: 36, unitCode: "INH" },
    height: { "@type": "QuantitativeValue", value: 30, unitCode: "INH" },
  });
});

test("emits nothing without data and skips invalid values", () => {
  assert.deepEqual(productDimensionsJsonLd(parseProductDimensions(null)), {});
  assert.deepEqual(
    productDimensionsJsonLd(
      parseProductDimensions([
        { key: "width_in", value: "abc" },
        { key: "depth_in", value: "0" },
        { key: "height_in", value: null },
      ]),
    ),
    {},
  );
});
