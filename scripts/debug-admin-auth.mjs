#!/usr/bin/env node

import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ENV_PATH = resolve(__dirname, "..", ".env");
const API_VERSION = "2024-10";

loadDotEnv();

const storeDomain = process.env.PUBLIC_STORE_DOMAIN;
const adminToken = process.env.SHOPIFY_ADMIN_API_TOKEN;

if (!storeDomain) {
  console.error("PUBLIC_STORE_DOMAIN is missing.");
  process.exit(1);
}

if (!adminToken) {
  console.error("SHOPIFY_ADMIN_API_TOKEN is missing.");
  process.exit(1);
}

const endpoint = `https://${storeDomain}/admin/api/${API_VERSION}/graphql.json`;

const DEBUG_QUERY = `
  query DebugAdminAuth {
    shop {
      name
      myshopifyDomain
      primaryDomain {
        url
      }
    }
    currentAppInstallation {
      accessScopes {
        handle
      }
    }
  }
`;

async function main() {
  console.log(`Store domain: ${storeDomain}`);
  console.log(`Admin token prefix: ${maskToken(adminToken)}`);
  console.log(`Endpoint: ${endpoint}`);
  console.log("");

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Access-Token": adminToken,
    },
    body: JSON.stringify({ query: DEBUG_QUERY }),
  }).catch((error) => {
    console.error(`Network failure: ${error.message}`);
    process.exit(1);
  });

  if (response.status === 401) {
    console.error("401 Unauthorized");
    console.error(
      "This usually means the token is invalid, revoked, from a different app/store, or not an Admin API token.",
    );
    process.exit(1);
  }

  if (!response.ok) {
    const text = await response.text();
    console.error(`HTTP ${response.status}`);
    console.error(text);
    process.exit(1);
  }

  const json = await response.json();

  if (json.errors?.length) {
    console.error("GraphQL errors:");
    console.error(JSON.stringify(json.errors, null, 2));
    process.exit(1);
  }

  const userErrors =
    json.data?.currentAppInstallation?.userErrors ||
    json.data?.shop?.userErrors ||
    [];

  if (userErrors.length) {
    console.error("User errors:");
    console.error(JSON.stringify(userErrors, null, 2));
    process.exit(1);
  }

  const shop = json.data?.shop;
  const scopes =
    json.data?.currentAppInstallation?.accessScopes?.map((scope) => scope.handle) ||
    [];

  console.log("Admin auth looks valid.");
  console.log(`Shop name: ${shop?.name || "Unknown"}`);
  console.log(`MyShopify domain: ${shop?.myshopifyDomain || "Unknown"}`);
  console.log(`Primary domain: ${shop?.primaryDomain?.url || "Unknown"}`);
  console.log("");
  console.log("Granted scopes:");
  if (scopes.length) {
    for (const scope of scopes) {
      console.log(`- ${scope}`);
    }
  } else {
    console.log("- none returned");
  }
}

function loadDotEnv() {
  try {
    const envFile = readFileSync(ENV_PATH, "utf8");
    for (const line of envFile.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eqIndex = trimmed.indexOf("=");
      if (eqIndex === -1) continue;
      const key = trimmed.slice(0, eqIndex).trim();
      let value = trimmed.slice(eqIndex + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      if (!process.env[key]) {
        process.env[key] = value;
      }
    }
  } catch {}
}

function maskToken(token) {
  if (token.length <= 10) {
    return token;
  }

  return `${token.slice(0, 6)}...${token.slice(-6)}`;
}

await main();
