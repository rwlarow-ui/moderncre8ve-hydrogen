import assert from "node:assert/strict";
import test from "node:test";
import {
  METAFIELD_DEFINITIONS,
  planDefinitions,
} from "../scripts/create-po-definitions.mjs";

const empty = {
  metaobjectDefinitionByType: null,
  orderDefs: { nodes: [] },
  productDefs: { nodes: [] },
};

test("plans everything on an empty store", () => {
  const plan = planDefinitions(empty);
  assert.equal(plan.createMetaobject, true);
  assert.equal(plan.metafields.length, METAFIELD_DEFINITIONS.length);
  assert.ok(plan.metafields.every((m) => !m.exists));
});

test("is idempotent when definitions already exist", () => {
  const plan = planDefinitions({
    metaobjectDefinitionByType: { id: "gid://shopify/MetaobjectDefinition/1" },
    orderDefs: {
      nodes: ["po", "logistics", "logistics_status"].map((key) => ({
        namespace: "moderncre8ve",
        key,
      })),
    },
    productDefs: { nodes: [{ namespace: "custom", key: "finish" }] },
  });
  assert.equal(plan.createMetaobject, false);
  assert.ok(plan.metafields.every((m) => m.exists));
});

test("does not confuse owner types", () => {
  const plan = planDefinitions({
    ...empty,
    orderDefs: { nodes: [{ namespace: "custom", key: "finish" }] },
  });
  const finish = plan.metafields.find((m) => m.def.key === "finish");
  assert.equal(finish.exists, false);
});
