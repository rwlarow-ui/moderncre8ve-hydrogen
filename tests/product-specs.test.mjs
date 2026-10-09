import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  PRODUCT_SPEC_DEFINITIONS,
  parseProductSpecs,
  productSpecsJsonLd,
} from "../app/utils/product-specs.ts";
import {
  METAFIELD_TYPES,
  METAOBJECT_ENTRIES,
  PRODUCT_PLAN,
} from "../scripts/product-attributes.plan.mjs";

const ref = (label) => ({
  handle: label.toLowerCase(),
  label: { value: label },
});

test("parseProductSpecs orders by definition, drops nulls and dedupes", () => {
  const specs = parseProductSpecs([
    { key: "color-pattern", references: { nodes: [ref("Brown")] } },
    null,
    {
      key: "furniture-fixture-material",
      references: { nodes: [ref("Walnut wood"), ref("Walnut wood"), {}] },
    },
    { key: "extension-mechanism", references: { nodes: [] } },
  ]);
  assert.deepEqual(specs, [
    {
      key: "furniture-fixture-material",
      label: "Material",
      values: ["Walnut wood"],
    },
    { key: "color-pattern", label: "Color", values: ["Brown"] },
  ]);
});

test("productSpecsJsonLd maps to schema.org material/color/size", () => {
  const ld = productSpecsJsonLd([
    {
      key: "furniture-fixture-material",
      label: "Material",
      values: ["Walnut wood", "Oak wood"],
    },
    { key: "color-pattern", label: "Color", values: ["Brown"] },
    { key: "bedding-size", label: "Bed sizes", values: ["Queen", "King"] },
    {
      key: "extension-mechanism",
      label: "Extension",
      values: ["Butterfly leaf"],
    },
  ]);
  assert.equal(ld.material, "Walnut wood, Oak wood");
  assert.equal(ld.color, "Brown");
  assert.equal(ld.size, "Queen, King");
  assert.equal(ld.additionalProperty.length, 4);
  assert.deepEqual(productSpecsJsonLd([]), {});
});

test("PRODUCT_QUERY requests every spec definition (codegen needs a static list)", () => {
  const query = readFileSync(
    new URL("../app/graphql/queries.ts", import.meta.url),
    "utf8",
  );
  for (const { key } of PRODUCT_SPEC_DEFINITIONS) {
    assert.ok(
      query.includes(`{ namespace: "shopify", key: "${key}" }`),
      `PRODUCT_QUERY is missing shopify.${key}`,
    );
  }
});

test("attribute plan only references known metafields and metaobject entries", () => {
  for (const [handle, { attrs }] of Object.entries(PRODUCT_PLAN)) {
    for (const [key, values] of Object.entries(attrs)) {
      const type = METAFIELD_TYPES[key];
      assert.ok(type, `${handle}: unknown metafield ${key}`);
      assert.ok(
        PRODUCT_SPEC_DEFINITIONS.some((d) => d.key === key),
        `${key} is assigned but never rendered`,
      );
      for (const v of values) {
        assert.ok(
          METAOBJECT_ENTRIES[type].entries[v],
          `${handle}: ${type} has no entry "${v}"`,
        );
      }
    }
  }
});
