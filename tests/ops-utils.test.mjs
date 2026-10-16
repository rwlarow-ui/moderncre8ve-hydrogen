import assert from "node:assert/strict";
import test from "node:test";
import { requireOpsAccess } from "../app/utils/ops-auth.server.js";
import {
  buildOpsNoteMutation,
  buildOrderSearchQuery,
  diffTags,
  isCurrentOrder,
  listCurrentOrders,
  normalizeOpsFilters,
  OPS_REQUIRED_SCOPES,
} from "../app/utils/ops-dashboard.server.js";
import {
  checkThrottle,
  clearFailures,
  FREE_ATTEMPTS,
  lockSecondsForFailures,
  MAX_LOCK_SECONDS,
  recordFailure,
  safeEqual,
} from "../app/utils/ops-login-throttle.server.js";

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
  const mutation = buildOpsNoteMutation(
    "gid://shopify/Order/123",
    " Follow up ",
  );

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

function stubOrderPages(pages) {
  const calls = [];
  const original = globalThis.fetch;
  let index = 0;
  globalThis.fetch = async (_url, init) => {
    calls.push(JSON.parse(init.body).variables);
    const page = pages[index++];
    return new Response(JSON.stringify({ data: { orders: page } }));
  };
  return { calls, restore: () => (globalThis.fetch = original) };
}

function orderNode(n, overrides = {}) {
  return {
    id: `gid://shopify/Order/${n}`,
    legacyResourceId: String(n),
    name: `#${n}`,
    processedAt: new Date(Date.now() - 10 * 86400000).toISOString(),
    displayFulfillmentStatus: "UNFULFILLED",
    displayFinancialStatus: "PAID",
    tags: [],
    customer: null,
    ...overrides,
  };
}

const config = {
  PUBLIC_STORE_DOMAIN: "x.myshopify.com",
  SHOPIFY_ADMIN_API_TOKEN: "t",
};

test("buildOrderSearchQuery pushes only the date window", () => {
  assert.match(buildOrderSearchQuery(), /^processed_at:>=\d{4}-\d{2}-\d{2}$/);
});

test("listCurrentOrders follows cursors so no order is dropped past 100", async () => {
  const stub = stubOrderPages([
    {
      nodes: [orderNode(1), orderNode(2)],
      pageInfo: { hasNextPage: true, endCursor: "c1" },
    },
    {
      nodes: [orderNode(3, { tags: ["vip"] })],
      pageInfo: { hasNextPage: false, endCursor: null },
    },
  ]);
  try {
    const result = await listCurrentOrders(config, { tag: "vip", limit: 1 });
    assert.equal(stub.calls.length, 2);
    assert.equal(stub.calls[1].after, "c1");
    assert.equal(result.scanned, 3);
    assert.equal(result.total, 1);
    assert.equal(result.scanCapped, false);
    assert.deepEqual(result.facets.tags, ["vip"]);
  } finally {
    stub.restore();
  }
});

test("listCurrentOrders reports true total, not the sliced count", async () => {
  const stub = stubOrderPages([
    {
      nodes: [orderNode(1), orderNode(2), orderNode(3)],
      pageInfo: { hasNextPage: false, endCursor: null },
    },
  ]);
  try {
    const result = await listCurrentOrders(config, { limit: 2 });
    assert.equal(result.orders.length, 2);
    assert.equal(result.total, 3);
  } finally {
    stub.restore();
  }
});

test("listCurrentOrders flags scanCapped when pages run out", async () => {
  const pages = Array.from({ length: 10 }, (_, i) => ({
    nodes: [orderNode(i + 1)],
    pageInfo: { hasNextPage: true, endCursor: `c${i}` },
  }));
  const stub = stubOrderPages(pages);
  try {
    const result = await listCurrentOrders(config, {});
    assert.equal(stub.calls.length, 10);
    assert.equal(result.scanCapped, true);
  } finally {
    stub.restore();
  }
});

function memoryCache() {
  const store = new Map();
  return {
    match: async (req) => store.get(req.url)?.clone(),
    put: async (req, res) => void store.set(req.url, res),
    delete: async (req) => store.delete(req.url),
  };
}

test("lockSecondsForFailures allows free attempts then backs off to a cap", () => {
  assert.equal(lockSecondsForFailures(FREE_ATTEMPTS), 0);
  assert.equal(lockSecondsForFailures(FREE_ATTEMPTS + 1), 15);
  assert.equal(lockSecondsForFailures(FREE_ATTEMPTS + 2), 30);
  assert.equal(lockSecondsForFailures(50), MAX_LOCK_SECONDS);
});

test("throttle locks after repeated failures and clears on success", async () => {
  const cache = memoryCache();
  const now = Date.now();
  for (let i = 0; i < FREE_ATTEMPTS; i += 1) {
    await recordFailure(cache, "1.2.3.4", now);
  }
  assert.equal((await checkThrottle(cache, "1.2.3.4", now)).locked, false);

  await recordFailure(cache, "1.2.3.4", now);
  const locked = await checkThrottle(cache, "1.2.3.4", now);
  assert.equal(locked.locked, true);
  assert.equal(locked.retryAfterSeconds, 15);
  assert.equal((await checkThrottle(cache, "9.9.9.9", now)).locked, false);
  assert.equal(
    (await checkThrottle(cache, "1.2.3.4", now + 16000)).locked,
    false,
  );

  await clearFailures(cache, "1.2.3.4");
  assert.equal((await recordFailure(cache, "1.2.3.4", now)).failures, 1);
});

test("safeEqual compares strings of any length", async () => {
  assert.equal(await safeEqual("hunter2", "hunter2"), true);
  assert.equal(await safeEqual("hunter2", "hunter3"), false);
  assert.equal(await safeEqual("a", "a-much-longer-value"), false);
});

test("ops hub prefers OPS_ADMIN_API_TOKEN and falls back to the general token", async () => {
  const seen = [];
  const original = globalThis.fetch;
  globalThis.fetch = async (_url, init) => {
    seen.push(init.headers["X-Shopify-Access-Token"]);
    return new Response(
      JSON.stringify({
        data: { orders: { nodes: [], pageInfo: { hasNextPage: false } } },
      }),
    );
  };
  try {
    await listCurrentOrders(
      { ...config, OPS_ADMIN_API_TOKEN: "ops-token" },
      {},
    );
    await listCurrentOrders(config, {});
    assert.deepEqual(seen, ["ops-token", "t"]);
  } finally {
    globalThis.fetch = original;
  }
});

test("OPS_REQUIRED_SCOPES covers the 140-day window and tag/note writes", () => {
  for (const scope of ["read_all_orders", "write_orders", "write_customers"]) {
    assert.ok(OPS_REQUIRED_SCOPES.includes(scope));
  }
});
