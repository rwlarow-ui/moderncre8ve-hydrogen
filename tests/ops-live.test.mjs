import assert from "node:assert/strict";
import test from "node:test";
import {
  loadRolloutStatus,
  paidOrderWeek,
  weekStartEastern,
} from "../app/utils/ops-live.server.js";

const env = {
  PUBLIC_STORE_DOMAIN: "test.myshopify.com",
  SHOPIFY_ADMIN_API_TOKEN: "test",
};
test("weekly window starts Monday Eastern across both DST changes", () => {
  assert.equal(
    weekStartEastern(new Date("2026-11-12T19:00:00Z")),
    "2026-11-09T05:00:00.000Z",
  );
  assert.equal(
    weekStartEastern(new Date("2026-03-09T19:00:00Z")),
    "2026-03-09T04:00:00.000Z",
  );
  assert.equal(
    weekStartEastern(new Date("2026-11-02T04:59:59Z")),
    "2026-10-26T04:00:00.000Z",
  );
});
test("paid order value paginates, separates currencies and excludes unpaid/cancelled/out-of-period orders", async (t) => {
  const order = (amount, currencyCode = "USD", extra = {}) => ({
    processedAt: "2026-11-10T12:00:00Z",
    displayFinancialStatus: "PAID",
    cancelledAt: null,
    currentTotalPriceSet: { shopMoney: { amount, currencyCode } },
    ...extra,
  });
  const pages = [
    {
      nodes: [
        order("0.10"),
        order("0.20"),
        order("400", "USD", { displayFinancialStatus: "PARTIALLY_PAID" }),
        order("1000", "USD", { cancelledAt: "2026-11-11" }),
      ],
      pageInfo: { hasNextPage: true, endCursor: "next" },
    },
    {
      nodes: [
        order("5.00", "CAD"),
        order("100", "USD", { processedAt: "2026-11-09T04:59:59Z" }),
        order("100", "USD", { processedAt: "2026-11-13T12:00:00Z" }),
      ],
      pageInfo: { hasNextPage: false },
    },
  ];
  let calls = 0;
  t.mock.method(globalThis, "fetch", async (_url, init) => {
    assert.equal(JSON.parse(init.body).variables.after, calls ? "next" : null);
    return Response.json({ data: { orders: pages[calls++] } });
  });
  const result = await paidOrderWeek(env, new Date("2026-11-12T19:00:00Z"));
  assert.deepEqual(result.totals, [
    { currency: "USD", amount: "0.30", orders: 2 },
    { currency: "CAD", amount: "5.00", orders: 1 },
  ]);
  assert.equal(result.incomplete, false);
});
test("catalog status covers the rollout scope and distinguishes unavailable products", async (t) => {
  t.mock.method(globalThis, "fetch", async (_url, init) => {
    const { ids } = JSON.parse(init.body).variables;
    assert.equal(ids.length, 64);
    return Response.json({
      data: {
        nodes: ids.map((id, i) =>
          i === 0 ? { id, status: "ACTIVE", title: "Test product" } : null,
        ),
      },
    });
  });
  const result = await loadRolloutStatus(env);
  assert.equal(result.rows.length, 64);
  assert.equal(result.rows[0].status, "ACTIVE");
  assert.equal(result.rows[1].status, "UNAVAILABLE");
});
