#!/usr/bin/env node

/**
 * Checks that every Shopify collection is visible to the storefront.
 *
 * A collection that exists in the Admin API but is not published to the
 * Hydrogen sales channel is missing from the Storefront API, so its
 * /collections/<handle> page 404s (see issue #60).
 *
 * Usage:
 *   npm run check:collections
 *   npm run check:collections -- --ignore=piper-fox,piper-fox-co
 *   npm run check:collections -- --live=https://moderncre8ve.com
 *
 * Needs PUBLIC_STORE_DOMAIN, PUBLIC_STOREFRONT_API_TOKEN and
 * SHOPIFY_ADMIN_API_TOKEN (the npm script loads .env). Exits 1 on any miss.
 */

const API_VERSION = "2025-04";
const {
  PUBLIC_STORE_DOMAIN: domain,
  PUBLIC_STOREFRONT_API_TOKEN: storefrontToken,
  SHOPIFY_ADMIN_API_TOKEN: adminToken,
} = process.env;

if (!(domain && storefrontToken && adminToken)) {
  console.error(
    "Missing PUBLIC_STORE_DOMAIN, PUBLIC_STOREFRONT_API_TOKEN or SHOPIFY_ADMIN_API_TOKEN",
  );
  process.exit(2);
}

const args = Object.fromEntries(
  process.argv
    .slice(2)
    .filter((a) => a.startsWith("--"))
    .map((a) => {
      const [key, value = ""] = a.slice(2).split("=");
      return [key, value];
    }),
);
const ignored = new Set((args.ignore || "").split(",").filter(Boolean));
const liveBase = args.live?.replace(/\/$/, "");

async function graphql(path, token, headerName, query) {
  const res = await fetch(`https://${domain}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", [headerName]: token },
    body: JSON.stringify({ query }),
  });
  const json = await res.json();
  if (!res.ok || json.errors) {
    throw new Error(`${path}: ${JSON.stringify(json.errors ?? res.status)}`);
  }
  return json.data;
}

const query = "{ collections(first: 250) { nodes { handle } } }";
const [admin, storefront] = await Promise.all([
  graphql(
    `/admin/api/${API_VERSION}/graphql.json`,
    adminToken,
    "X-Shopify-Access-Token",
    query,
  ),
  graphql(
    `/api/${API_VERSION}/graphql.json`,
    storefrontToken,
    "X-Shopify-Storefront-Access-Token",
    query,
  ),
]);

const visible = new Set(storefront.collections.nodes.map((n) => n.handle));
const handles = admin.collections.nodes
  .map((n) => n.handle)
  .filter((h) => !ignored.has(h));
const missing = handles.filter((h) => !visible.has(h));

for (const handle of handles) {
  let live = "";
  if (liveBase) {
    const res = await fetch(`${liveBase}/collections/${handle}`, {
      redirect: "manual",
    });
    live = `  live ${res.status}`;
  }
  console.log(
    `${visible.has(handle) ? "ok     " : "MISSING"} ${handle}${live}`,
  );
}

console.log(
  `\n${handles.length - missing.length}/${handles.length} collections visible to the Storefront API`,
);
if (missing.length) {
  console.error(
    `Publish these to the Hydrogen sales channel in Shopify Admin: ${missing.join(", ")}`,
  );
  process.exit(1);
}
