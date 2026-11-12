import register from "../../docs/catalog-rollout-2026-11/register.json" with {
  type: "json",
};
import { adminGraphql } from "./ops-dashboard.server.js";

export const CATALOG_STATUS_QUERY = `query OpsCatalogStatus($ids: [ID!]!) {
  nodes(ids: $ids) { ... on Product { id title handle status updatedAt } }
}`;
export const PAID_WEEK_QUERY = `query OpsPaidWeek($query: String!, $after: String) {
  orders(first: 100, after: $after, query: $query, sortKey: PROCESSED_AT) {
    nodes { id processedAt cancelledAt test displayFinancialStatus currentTotalPriceSet { shopMoney { amount currencyCode } } }
    pageInfo { hasNextPage endCursor }
  }
}`;
export async function loadRolloutStatus(env) {
  const scope = [
    ...register.entries,
    ...register.protectedProducts.map((p) => ({
      ...p,
      disposition: "protected",
      blocker: "",
      wave: 0,
    })),
  ];
  const { nodes } = await adminGraphql(env, CATALOG_STATUS_QUERY, {
    ids: scope.map((p) => p.id),
  });
  return {
    checkedAt: new Date().toISOString(),
    rows: scope.map((entry) => {
      const live = nodes.find((p) => p?.id === entry.id);
      return {
        id: entry.id,
        title: live?.title || entry.title,
        handle: live?.handle || entry.handle,
        status: live?.status || "UNAVAILABLE",
        updatedAt: live?.updatedAt || null,
        disposition: entry.disposition,
        blocker: entry.blocker,
        wave: entry.wave,
        discrepancy: Boolean(
          live?.status === "ACTIVE" && entry.disposition === "held",
        ),
      };
    }),
  };
}
export function weekStartEastern(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const part = (type) => parts.find((p) => p.type === type).value;
  const date = new Date(
    `${part("year")}-${part("month")}-${part("day")}T12:00:00Z`,
  );
  date.setUTCDate(date.getUTCDate() - ((date.getUTCDay() + 6) % 7));
  const offset = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    timeZoneName: "longOffset",
  })
    .formatToParts(date)
    .find((p) => p.type === "timeZoneName")
    .value.replace("GMT", "");
  return new Date(
    `${date.toISOString().slice(0, 10)}T00:00:00${offset}`,
  ).toISOString();
}
export async function paidOrderWeek(env, now = new Date()) {
  const start = weekStartEastern(now);
  /** @type {Map<string, { cents: bigint, count: number }>} */
  const totals = new Map();
  let after = null,
    hasNextPage = true,
    pages = 0;
  while (hasNextPage && pages < 10) {
    const { orders } = await adminGraphql(env, PAID_WEEK_QUERY, {
      query: `test:false processed_at:>=${start.slice(0, 10)}`,
      after,
    });
    for (const order of orders.nodes) {
      if (
        order.cancelledAt ||
        order.test ||
        order.displayFinancialStatus !== "PAID" ||
        Date.parse(order.processedAt) < Date.parse(start) ||
        Date.parse(order.processedAt) > now.getTime()
      )
        continue;
      const money = order.currentTotalPriceSet?.shopMoney;
      if (!money || !/^\d+(\.\d{1,2})?$/.test(money.amount))
        throw new Error("Shopify returned an unsupported money value.");
      const [whole, fraction = ""] = money.amount.split(".");
      const cents = BigInt(whole) * 100n + BigInt(fraction.padEnd(2, "0"));
      const total = totals.get(money.currencyCode) || { cents: 0n, count: 0 };
      total.cents += cents;
      total.count += 1;
      totals.set(money.currencyCode, total);
    }
    hasNextPage = orders.pageInfo.hasNextPage;
    after = orders.pageInfo.endCursor;
    pages += 1;
  }
  return {
    start,
    end: now.toISOString(),
    incomplete: hasNextPage,
    totals: [...totals].map(([currency, value]) => ({
      currency,
      amount: `${value.cents / 100n}.${String(value.cents % 100n).padStart(2, "0")}`,
      orders: value.count,
    })),
  };
}
