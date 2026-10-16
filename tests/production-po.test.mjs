import assert from "node:assert/strict";
import test from "node:test";
import { toCartAttributes, validateLogistics } from "../app/utils/logistics.js";
import {
  applySpecEdits,
  buildLineSpecs,
  buildSnapshot,
  canTransition,
  checkTransition,
  daysSince,
  initialPoState,
  parsePoFields,
  resolveLogistics,
  reviewBlockers,
  stateAfterLogisticsRefresh,
} from "../app/utils/production-po.js";

const validLogistics = validateLogistics({
  dwelling: "house",
  address1: "12 Maple St",
  city: "Lancaster",
  state: "PA",
  zip: "17601",
  phone: "7175550100",
  stairs: "none",
  elevator: "none",
  doorwayWidthIn: "32",
  hallwayWidthIn: "36",
}).value;

const lineItem = {
  id: "gid://shopify/LineItem/1",
  name: "Walnut Table - 72 / Walnut",
  quantity: 2,
  product: { title: "Walnut Table", metafield: { value: "Natural" } },
  variant: {
    selectedOptions: [
      { name: "Size", value: '72"' },
      { name: "Material", value: "Walnut" },
      { name: "Leaf", value: "No Leaf" },
      { name: "Color", value: "Brown" },
    ],
  },
};

const completeSnapshot = {
  status: "complete",
  logistics: validLogistics,
};

test("state graph: sent is terminal, cancelled unreachable from sent", () => {
  assert.equal(canTransition("ready_for_review", "approved"), true);
  assert.equal(canTransition("approved", "sent"), true);
  assert.equal(canTransition("sent", "cancelled"), false);
  assert.equal(canTransition("cancelled", "approved"), false);
  assert.equal(canTransition("awaiting_logistics", "approved"), false);
});

test("initial and refreshed state follow logistics status", () => {
  assert.equal(initialPoState("complete"), "ready_for_review");
  assert.equal(initialPoState("later"), "awaiting_logistics");
  assert.equal(initialPoState("none"), "awaiting_logistics");
  assert.equal(
    stateAfterLogisticsRefresh("awaiting_logistics", "complete"),
    "ready_for_review",
  );
  assert.equal(
    stateAfterLogisticsRefresh("ready_for_review", "none"),
    "awaiting_logistics",
  );
});

test("approved, sent and cancelled POs are never moved by a refresh", () => {
  for (const state of ["approved", "sent", "cancelled"]) {
    assert.equal(stateAfterLogisticsRefresh(state, "none"), state);
    assert.equal(stateAfterLogisticsRefresh(state, "complete"), state);
  }
});

test("builds line specs from order line items", () => {
  const [spec] = buildLineSpecs([lineItem]);
  assert.equal(spec.product, "Walnut Table");
  assert.equal(spec.quantity, 2);
  assert.equal(spec.size, '72"');
  assert.equal(spec.species, "Walnut");
  assert.equal(spec.leaf, "No Leaf");
  assert.equal(spec.finish, "Natural");
  assert.equal(spec.otherOptions, "Color: Brown");
});

test("missing finish and options are left blank, not guessed", () => {
  const [spec] = buildLineSpecs([
    {
      id: "x",
      name: "Wax",
      quantity: 1,
      product: { title: "Wax", metafield: null },
      variant: { selectedOptions: [{ name: "Title", value: "Default Title" }] },
    },
  ]);
  assert.equal(spec.finish, "");
  assert.equal(spec.size, "");
  assert.equal(spec.otherOptions, "");
});

test("approval is blocked until logistics and every spec are complete", () => {
  const specs = buildLineSpecs([lineItem]);
  assert.deepEqual(
    reviewBlockers({
      state: "ready_for_review",
      lineSpecs: specs,
      snapshot: completeSnapshot,
    }),
    [],
  );

  const noLogistics = reviewBlockers({
    state: "awaiting_logistics",
    lineSpecs: specs,
    snapshot: { status: "later", logistics: null },
  });
  assert.equal(noLogistics.length, 1);
  assert.match(noLogistics[0], /logistics/i);

  const noFinish = reviewBlockers({
    state: "ready_for_review",
    lineSpecs: [{ ...specs[0], finish: "" }],
    snapshot: completeSnapshot,
  });
  assert.match(noFinish.join(" "), /finish is missing/);
});

test("a snapshot claiming complete without logistics still blocks", () => {
  const blockers = reviewBlockers({
    state: "ready_for_review",
    lineSpecs: buildLineSpecs([lineItem]),
    snapshot: { status: "complete", logistics: null },
  });
  assert.ok(blockers.length);
});

test("checkTransition enforces graph and approval gate", () => {
  const specs = buildLineSpecs([lineItem]);
  assert.equal(
    checkTransition({
      state: "ready_for_review",
      to: "approved",
      lineSpecs: specs,
      snapshot: completeSnapshot,
    }).ok,
    true,
  );
  assert.equal(
    checkTransition({
      state: "awaiting_logistics",
      to: "approved",
      lineSpecs: specs,
      snapshot: completeSnapshot,
    }).ok,
    false,
  );
  const blocked = checkTransition({
    state: "ready_for_review",
    to: "approved",
    lineSpecs: [{ ...specs[0], size: "" }],
    snapshot: completeSnapshot,
  });
  assert.equal(blocked.ok, false);
  assert.match(blocked.reason, /size is missing/);
  assert.equal(checkTransition({ state: "draft", to: "nope" }).ok, false);
});

test("spec edits only touch editable fields and sanitize text", () => {
  const [spec] = buildLineSpecs([lineItem]);
  const [edited] = applySpecEdits(
    [spec],
    [
      {
        finish: "Onyx\u0000 stain",
        notes: "  rush  ",
        quantity: 99,
        product: "Hacked",
        lineItemId: "other",
      },
    ],
  );
  assert.equal(edited.finish, "Onyx  stain");
  assert.equal(edited.notes, "rush");
  assert.equal(edited.quantity, 2);
  assert.equal(edited.product, "Walnut Table");
  assert.equal(edited.lineItemId, spec.lineItemId);
});

test("resolveLogistics prefers a valid metafield and revalidates both", () => {
  const attributes = toCartAttributes(validLogistics);
  assert.equal(
    resolveLogistics({ metafieldValue: null, attributes }).status,
    "complete",
  );
  assert.equal(
    resolveLogistics({
      metafieldValue: JSON.stringify(validLogistics),
      attributes: [],
    }).status,
    "complete",
  );
  assert.equal(
    resolveLogistics({
      metafieldValue: JSON.stringify({ city: "x" }),
      attributes: [],
    }).status,
    "none",
  );
  assert.equal(
    resolveLogistics({
      metafieldValue: null,
      attributes: toCartAttributes({ later: true }),
    }).status,
    "later",
  );
});

test("snapshot carries order context and parses back from fields", () => {
  const snapshot = buildSnapshot({
    order: {
      id: "gid://shopify/Order/9",
      name: "#1009",
      processedAt: "2026-10-01T00:00:00Z",
      customerName: "Pat",
      customerEmail: "pat@example.com",
    },
    logistics: { status: "complete", value: validLogistics },
    now: new Date("2026-10-14T00:00:00Z"),
  });
  const po = parsePoFields([
    { key: "order_id", value: "gid://shopify/Order/9" },
    { key: "order_name", value: "#1009" },
    { key: "state", value: "ready_for_review" },
    { key: "revision", value: "1" },
    { key: "line_specs", value: JSON.stringify(buildLineSpecs([lineItem])) },
    { key: "logistics_snapshot", value: JSON.stringify(snapshot) },
  ]);
  assert.equal(po.state, "ready_for_review");
  assert.equal(po.snapshot.order.customerName, "Pat");
  assert.equal(po.lineSpecs.length, 1);
  assert.equal(
    parsePoFields([{ key: "state", value: "bogus" }]).state,
    "draft",
  );
  assert.deepEqual(
    parsePoFields([{ key: "line_specs", value: "{bad" }]).lineSpecs,
    [],
  );
});

test("daysSince handles bad input", () => {
  assert.equal(
    daysSince("2026-10-01T00:00:00Z", new Date("2026-10-14T12:00:00Z")),
    13,
  );
  assert.equal(daysSince(null), 0);
  assert.equal(daysSince("nope"), 0);
});
