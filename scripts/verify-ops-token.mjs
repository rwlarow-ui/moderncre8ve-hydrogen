#!/usr/bin/env node

/**
 * Verifies the ops hub Admin token: reports which token is in use, checks it
 * grants every scope the hub needs, lists any extra scopes it carries, and
 * makes one real orders read. Never prints the token.
 *
 * Usage: node scripts/verify-ops-token.mjs
 */

import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { OPS_REQUIRED_SCOPES } from "../app/utils/ops-dashboard.server.js";

const ENV_PATH = resolve(dirname(fileURLToPath(import.meta.url)), "..", ".env");
const API_VERSION = "2026-01";

try {
  for (const line of readFileSync(ENV_PATH, "utf8").split("\n")) {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (match && !process.env[match[1]]) {
      process.env[match[1]] = match[2].trim().replace(/^["']|["']$/g, "");
    }
  }
} catch {}

const domain = process.env.PUBLIC_STORE_DOMAIN;
const usingOpsToken = Boolean(process.env.OPS_ADMIN_API_TOKEN);
const token =
  process.env.OPS_ADMIN_API_TOKEN || process.env.SHOPIFY_ADMIN_API_TOKEN;

if (!domain || !token) {
  console.error("PUBLIC_STORE_DOMAIN and an admin token are required.");
  process.exit(1);
}

async function graphql(query) {
  const res = await fetch(
    `https://${domain}/admin/api/${API_VERSION}/graphql.json`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": token,
      },
      body: JSON.stringify({ query }),
    },
  );
  if (!res.ok) {
    throw new Error(`Admin API returned ${res.status}`);
  }
  const body = await res.json();
  if (body.errors?.length) {
    throw new Error(body.errors.map((e) => e.message).join("; "));
  }
  return body.data;
}

const { currentAppInstallation: install } = await graphql(
  "{ currentAppInstallation { app { title } accessScopes { handle } } }",
);
const granted = new Set(install.accessScopes.map((s) => s.handle));
const missing = OPS_REQUIRED_SCOPES.filter((s) => !granted.has(s));
const extra = [...granted].filter((s) => !OPS_REQUIRED_SCOPES.includes(s));

console.log(
  `Token in use: ${usingOpsToken ? "OPS_ADMIN_API_TOKEN" : "SHOPIFY_ADMIN_API_TOKEN (fallback)"}`,
);
console.log(`App: ${install.app.title}`);
console.log(`Scopes granted: ${granted.size}`);
console.log(
  `Missing required: ${missing.length ? missing.join(", ") : "none"}`,
);
console.log(`Extra scopes: ${extra.length}`);

let failed = missing.length > 0;
try {
  const data = await graphql(
    "{ orders(first: 1) { nodes { name customer { email } } } }",
  );
  console.log(`Orders read: ok (${data.orders.nodes.length} returned)`);
} catch (error) {
  failed = true;
  console.log(`Orders read: FAILED — ${error.message}`);
}

if (extra.length) {
  console.log(
    "\nThis token is broader than the ops hub needs. Create a dedicated app " +
      "with only the required scopes (see scripts/get-admin-token.mjs --ops).",
  );
  failed = true;
}
process.exit(failed ? 1 : 0);
