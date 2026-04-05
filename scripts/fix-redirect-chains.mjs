#!/usr/bin/env node

/**
 * Fix redirect chains and self-redirect issues
 *
 * 1. Update 37 existing redirects targeting /collections/all-products → /collections/all
 * 2. Create 3 new collection redirects → /collections/all
 * 3. Update /collections/mid-century-modern-dining-tables → /collections/all
 * 4. Skip /collections/all (built-in Shopify page, no redirect needed)
 * 5. Keep /collections/all-products → /collections/all for external links
 */

import { readFileSync } from "fs";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dirname, "..", ".env");

try {
  const envFile = readFileSync(envPath, "utf-8");
  for (const line of envFile.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    let val = trimmed.slice(eqIdx + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = val;
  }
} catch {
  console.warn(
    "⚠️  Could not load .env file, using existing environment variables",
  );
}

const SHOPIFY_STORE = "moderncre8ve.myshopify.com";
const STOREFRONT_ORIGIN = "https://moderncre8ve.com";
const ADMIN_TOKEN = process.env.SHOPIFY_ADMIN_API_TOKEN;
if (!ADMIN_TOKEN) {
  console.error(
    "Error: SHOPIFY_ADMIN_API_TOKEN environment variable is not set.",
  );
  process.exit(1);
}
const API_VERSION = "2024-10";
const ENDPOINT = `https://${SHOPIFY_STORE}/admin/api/${API_VERSION}/graphql.json`;

const CORRECT_TARGET = "/collections/all";

async function shopifyGraphQL(query, variables = {}) {
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Access-Token": ADMIN_TOKEN,
    },
    body: JSON.stringify({ query, variables }),
  });

  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${await res.text()}`);
  }

  const json = await res.json();
  if (json.errors) {
    throw new Error(`GraphQL errors: ${JSON.stringify(json.errors)}`);
  }
  return json.data;
}

async function validateRedirectTarget(target) {
  const url = new URL(target, STOREFRONT_ORIGIN);

  const request = async (method) => {
    return fetch(url, {
      method,
      redirect: "manual",
    });
  };

  let response = await request("HEAD");
  if (response.status === 405 || response.status === 501) {
    response = await request("GET");
  }

  if (response.status >= 300 && response.status < 400) {
    const location = response.headers.get("location");
    throw new Error(
      `Target ${target} resolves to ${response.status}${location ? ` (${location})` : ""}`,
    );
  }

  if (response.status !== 200) {
    throw new Error(`Target ${target} resolves to ${response.status}`);
  }
}

async function updateRedirect(id, newTarget) {
  await validateRedirectTarget(newTarget);

  const mutation = `
    mutation urlRedirectUpdate($id: ID!, $urlRedirect: UrlRedirectInput!) {
      urlRedirectUpdate(id: $id, urlRedirect: $urlRedirect) {
        urlRedirect { id path target }
        userErrors { field message }
      }
    }
  `;

  const data = await shopifyGraphQL(mutation, {
    id,
    urlRedirect: { target: newTarget },
  });

  return data.urlRedirectUpdate;
}

async function createRedirect(from, to) {
  await validateRedirectTarget(to);

  const mutation = `
    mutation urlRedirectCreate($urlRedirect: UrlRedirectInput!) {
      urlRedirectCreate(urlRedirect: $urlRedirect) {
        urlRedirect { id path target }
        userErrors { field message }
      }
    }
  `;

  const data = await shopifyGraphQL(mutation, {
    urlRedirect: { path: from, target: to },
  });

  return data.urlRedirectCreate;
}

async function deleteRedirect(id) {
  const mutation = `
    mutation urlRedirectDelete($id: ID!) {
      urlRedirectDelete(id: $id) {
        deletedUrlRedirectId
        userErrors { field message }
      }
    }
  `;

  const data = await shopifyGraphQL(mutation, { id });
  return data.urlRedirectDelete;
}

async function findRedirectByPath(path) {
  const query = `
    query findRedirect($query: String!) {
      urlRedirects(first: 5, query: $query) {
        nodes { id path target }
      }
    }
  `;

  const data = await shopifyGraphQL(query, { query: `path:${path}` });
  return data.urlRedirects.nodes.find((r) => r.path === path) || null;
}

async function getAllRedirectsTargeting(target) {
  let all = [];
  let cursor = null;
  let hasNext = true;

  while (hasNext) {
    const afterClause = cursor ? `, after: "${cursor}"` : "";
    const data = await shopifyGraphQL(`
      query { urlRedirects(first: 50${afterClause}) {
        nodes { id path target }
        pageInfo { hasNextPage endCursor }
      } }
    `);
    all.push(...data.urlRedirects.nodes);
    hasNext = data.urlRedirects.pageInfo.hasNextPage;
    cursor = data.urlRedirects.pageInfo.endCursor;
  }

  return all.filter((r) => r.target === target);
}

const delay = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  console.log("=== Fix Redirect Chains & Self-Redirect ===\n");

  let updated = 0;
  let created = 0;
  let failed = 0;
  let skipped = 0;

  // --- Phase 1: Update 37 existing redirects targeting /collections/all-products ---
  console.log("--- Phase 1: Fix existing chain redirects ---");
  console.log(
    "    Updating target: /collections/all-products → /collections/all\n",
  );

  const chained = await getAllRedirectsTargeting("/collections/all-products");
  console.log(`  Found ${chained.length} redirects to update\n`);

  for (const r of chained) {
    try {
      const result = await updateRedirect(r.id, CORRECT_TARGET);
      if (result.userErrors.length > 0) {
        const msg = result.userErrors.map((e) => e.message).join(", ");
        console.log(`  ❌ ${r.path} → FAILED: ${msg}`);
        failed++;
      } else {
        console.log(`  ✅ ${r.path} → ${CORRECT_TARGET}`);
        updated++;
      }
    } catch (err) {
      console.log(`  ❌ ${r.path} → ERROR: ${err.message}`);
      failed++;
    }
    await delay(300);
  }

  console.log(`\n  Phase 1: ${updated} updated, ${failed} failed\n`);

  // --- Phase 2: Fix /collections/mid-century-modern-dining-tables ---
  console.log("--- Phase 2: Fix stale redirect ---\n");

  const stale = await findRedirectByPath(
    "/collections/mid-century-modern-dining-tables",
  );
  if (stale) {
    try {
      const result = await updateRedirect(stale.id, CORRECT_TARGET);
      if (result.userErrors.length > 0) {
        const msg = result.userErrors.map((e) => e.message).join(", ");
        console.log(`  ❌ ${stale.path} → FAILED: ${msg}`);
        failed++;
      } else {
        console.log(
          `  ✅ ${stale.path} → ${CORRECT_TARGET} (was: ${stale.target})`,
        );
        updated++;
      }
    } catch (err) {
      console.log(`  ❌ ${stale.path} → ERROR: ${err.message}`);
      failed++;
    }
    await delay(300);
  } else {
    console.log("  ⏭️  No existing redirect found, will create in Phase 3\n");
  }

  // --- Phase 3: Create 3 new collection redirects ---
  console.log("\n--- Phase 3: Create new redirects → /collections/all ---\n");

  const NEW_REDIRECTS = [
    // Skip /collections/all — it's Shopify's built-in all-products page
    "/collections/scandinavian-design-furniture",
    "/collections/mid-century-modern",
    "/collections/modern-dining-chairs",
  ];

  // Also create /collections/mid-century-modern-dining-tables if it didn't exist
  if (!stale) {
    NEW_REDIRECTS.push("/collections/mid-century-modern-dining-tables");
  }

  for (const from of NEW_REDIRECTS) {
    try {
      const result = await createRedirect(from, CORRECT_TARGET);
      if (result.userErrors.length > 0) {
        const msg = result.userErrors.map((e) => e.message).join(", ");
        if (msg.includes("already been taken")) {
          console.log(`  ⏭️  ${from} → already exists`);
          skipped++;
        } else {
          console.log(`  ❌ ${from} → FAILED: ${msg}`);
          failed++;
        }
      } else {
        console.log(`  ✅ ${from} → ${CORRECT_TARGET}`);
        created++;
      }
    } catch (err) {
      console.log(`  ❌ ${from} → ERROR: ${err.message}`);
      failed++;
    }
    await delay(300);
  }

  // --- Phase 4: Blog self-redirect ---
  console.log("\n--- Phase 4: Blog self-redirect check ---\n");

  const blogPath =
    "/blogs/mid-century-modern-scandi-japandi-design-blog/how-to-choose-the-perfect-dining-table";
  const blogRedirect = await findRedirectByPath(blogPath);
  if (blogRedirect) {
    console.log(
      `  Found redirect: ${blogRedirect.path} → ${blogRedirect.target}`,
    );
    console.log("  Deleting (article lives at this URL natively)...");
    try {
      await deleteRedirect(blogRedirect.id);
      console.log("  ✅ Deleted self-redirect");
      updated++;
    } catch (err) {
      console.log(`  ❌ Failed to delete: ${err.message}`);
      failed++;
    }
  } else {
    console.log(
      "  ✅ No redirect exists — article accessible at its native URL",
    );
    skipped++;
  }

  // --- Summary ---
  console.log("\n=== SUMMARY ===");
  console.log(`Updated:  ${updated}`);
  console.log(`Created:  ${created}`);
  console.log(`Skipped:  ${skipped}`);
  console.log(`Failed:   ${failed}`);

  console.log(
    "\nNote: /collections/all → /collections/all-products redirect was NOT created",
  );
  console.log(
    "      because /collections/all is Shopify's built-in all-products page.",
  );
  console.log(
    "      The /collections/all-products → /collections/all redirect is kept",
  );
  console.log(
    "      for any external links still pointing to /collections/all-products.",
  );
}

main().catch((err) => {
  console.error("Fatal error:", err.message);
  process.exit(1);
});
