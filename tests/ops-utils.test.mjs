import assert from "node:assert/strict";
import test from "node:test";

import {
  buildOpsNoteMutation,
  diffTags,
  isCurrentOrder,
  normalizeOpsFilters,
} from "../app/utils/ops-dashboard.server.js";
import { requireOpsAccess } from "../app/utils/ops-auth.server.js";

test("normalizeOpsFilters trims strings and clamps invalid limits", () => {
  const filters = normalizeOpsFilters({
    search: "  cherry  ",
    fulfillmentStatus: "  UNFULFILLED ",
    financialStatus: "PAID  ",
    tag: " priority ",
    limit: 200,
  });

  assert.deepEqual(filters, {
    search: "cherry",
    fulfillmentStatus: "UNFULFILLED",
    financialStatus: "PAID",
    tag: "priority",
    limit: 100,
  });
});

test("diffTags computes add and remove deltas", () => {
  const diff = diffTags(
    ["priority", "white-glove", "vip"],
    ["priority", "production", "vip"],
  );

  assert.deepEqual(diff, {
    addTags: ["production"],
    removeTags: ["white-glove"],
  });
});

test("buildOpsNoteMutation returns metafieldsSet payload for a non-empty note", () => {
  const mutation = buildOpsNoteMutation("gid://shopify/Order/123", " Follow up ");

  assert.equal(mutation.mode, "set");
  assert.deepEqual(mutation.metafields[0], {
    key: "internal_note",
    namespace: "codex_ops",
    ownerId: "gid://shopify/Order/123",
    type: "multi_line_text_field",
    value: "Follow up",
  });
});

test("buildOpsNoteMutation returns metafieldsDelete payload when clearing a note", () => {
  const mutation = buildOpsNoteMutation("gid://shopify/Customer/456", "");

  assert.equal(mutation.mode, "delete");
  assert.deepEqual(mutation.metafields[0], {
    key: "internal_note",
    namespace: "codex_ops",
    ownerId: "gid://shopify/Customer/456",
  });
});

test("isCurrentOrder excludes fulfilled and refunded orders", () => {
  assert.equal(
    isCurrentOrder({
      displayFulfillmentStatus: "UNFULFILLED",
      displayFinancialStatus: "PAID",
    }),
    true,
  );

  assert.equal(
    isCurrentOrder({
      displayFulfillmentStatus: "FULFILLED",
      displayFinancialStatus: "PAID",
    }),
    false,
  );

  assert.equal(
    isCurrentOrder({
      displayFulfillmentStatus: "UNFULFILLED",
      displayFinancialStatus: "REFUNDED",
    }),
    false,
  );
});

test("requireOpsAccess redirects unauthenticated users to the login route", async () => {
  const request = new Request("https://moderncre8ve.com/ops?tag=priority");
  const context = {
    session: {
      get() {
        return undefined;
      },
    },
  };

  await assert.rejects(
    () => requireOpsAccess(request, context),
    (error) => {
      assert.equal(error.status, 302);
      assert.equal(
        error.headers.get("Location"),
        "/ops/login?redirectTo=%2Fops%3Ftag%3Dpriority",
      );
      return true;
    },
  );
});

