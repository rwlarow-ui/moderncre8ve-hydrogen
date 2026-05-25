#!/usr/bin/env node

/**
 * Import new SEO redirects to Shopify Admin via GraphQL API
 * These are the gaps found in the SEO Migration Audit (v1.2.4)
 * plus product-handle cleanup redirects from the April 2026 content audit.
 *
 * Also updates existing blog redirects from blanket (→ index) to 1:1 (→ article)
 *
 * Usage: node scripts/import-new-redirects.mjs
 */

import { readFileSync } from "fs";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";

// Load .env from project root
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
    // Strip surrounding quotes
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = val;
  }
  console.log("✅ Loaded .env from", envPath);
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
    "Error: SHOPIFY_ADMIN_API_TOKEN not found in .env or environment.",
  );
  process.exit(1);
}
console.log(`🔑 Using token: shpat_...${ADMIN_TOKEN.slice(-6)}`);
const API_VERSION = "2024-10";

// --- New redirects to create ---
// Note: /collections/all is Shopify's built-in all-products page — no redirect needed FROM it
const NEW_REDIRECTS = [
  {
    from: "/pages/custom-kitchen-cabinets-cleveland",
    to: "/pages/custom-furniture-crafted-to-perfection",
  },
  {
    from: "/collections/scandinavian-design-furniture",
    to: "/collections/all",
  },
  { from: "/collections/mid-century-modern", to: "/collections/all" },
  {
    from: "/collections/mid-century-modern-dining-tables",
    to: "/collections/all",
  },
  { from: "/collections/modern-dining-chairs", to: "/collections/all" },
  { from: "/collections/all/custom", to: "/collections/custom-made-furniture" },
  {
    from: "/blogs/mid-century-modern-scandi-japandi-design-blog/tagged/vintagefurniture",
    to: "/blogs/mid-century-modern-scandi-japandi-design-blog",
  },
  {
    from: "/blogs/mid-century-modern-scandi-japandi-design-blog/tagged/japandi-bedroom",
    to: "/blogs/mid-century-modern-scandi-japandi-design-blog",
  },
];

const REDIRECT_REPAIRS = [
  {
    from: "/products/the-april-v2",
    to: "/collections/mid-century-modern-coffee-tables",
  },
  {
    from: "/products/copy-of-larchmere-tallboy-mid-century-modern-dresser",
    to: "/collections/bedroom",
  },
];

// --- Product handle cleanup redirects ---
// Run this phase after the clean product handles exist in Shopify Admin.
const PRODUCT_HANDLE_REDIRECTS = [
  {
    from: "/products/capri-modern-dining-table-set_",
    to: "/products/capri-modern-dining-table-set",
  },
  {
    from: "/products/copy-of-santa-monica-bench-modern-walnut-bench",
    to: "/products/santa-monica-bench-modern-walnut-bench",
  },
  {
    from: "/products/van-aiken-boho-bed-fram",
    to: "/products/van-aiken-boho-bed-frame",
  },
];

// --- Existing blog redirects to fix (delete old blanket → create 1:1) ---
const BLOG_REDIRECT_FIXES = [
  // Removed: /blogs/.../how-to-choose-the-perfect-dining-table — article lives at native URL, no redirect needed
  {
    oldFrom: "/blogs/news/solid-wood-furniture-care-guide",
    oldTo: "/blogs/mid-century-modern-scandi-japandi-design-blog",
    newTo:
      "/blogs/mid-century-modern-scandi-japandi-design-blog/solid-wood-furniture-care-guide",
  },
  {
    oldFrom: "/blogs/news/58430660-we-are-an-etsy-featured-shop-sept-2015",
    oldTo: "/blogs/mid-century-modern-scandi-japandi-design-blog",
    newTo:
      "/blogs/mid-century-modern-scandi-japandi-design-blog/58430660-we-are-an-etsy-featured-shop-sept-2015",
  },
  {
    oldFrom:
      "/blogs/news/uncovering-the-beauty-and-durability-of-black-walnut-wood-the-ultimate-guide",
    oldTo: "/blogs/mid-century-modern-scandi-japandi-design-blog",
    newTo:
      "/blogs/mid-century-modern-scandi-japandi-design-blog/uncovering-the-beauty-and-durability-of-black-walnut-wood-the-ultimate-guide",
  },
];

const ENDPOINT = `https://${SHOPIFY_STORE}/admin/api/${API_VERSION}/graphql.json`;

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
    return {
      valid: false,
      message: `Target resolves to ${response.status}${location ? ` (${location})` : ""}`,
    };
  }

  if (response.status !== 200) {
    return {
      valid: false,
      message: `Target resolves to ${response.status}`,
    };
  }

  return { valid: true, url: url.toString() };
}

// Create a single redirect
async function createRedirect(from, to) {
  const validation = await validateRedirectTarget(to);
  if (!validation.valid) {
    return {
      success: false,
      from,
      to,
      errors: [{ message: validation.message }],
    };
  }

  const mutation = `
    mutation urlRedirectCreate($urlRedirect: UrlRedirectInput!) {
      urlRedirectCreate(urlRedirect: $urlRedirect) {
        urlRedirect {
          id
          path
          target
        }
        userErrors {
          field
          message
        }
      }
    }
  `;

  const data = await shopifyGraphQL(mutation, {
    urlRedirect: { path: from, target: to },
  });

  const result = data.urlRedirectCreate;
  if (result.userErrors.length > 0) {
    return { success: false, from, to, errors: result.userErrors };
  }
  return { success: true, from, to, id: result.urlRedirect.id };
}

async function updateRedirect(id, from, to) {
  const validation = await validateRedirectTarget(to);
  if (!validation.valid) {
    return {
      success: false,
      from,
      to,
      errors: [{ message: validation.message }],
    };
  }

  const mutation = `
    mutation urlRedirectUpdate($id: ID!, $urlRedirect: UrlRedirectInput!) {
      urlRedirectUpdate(id: $id, urlRedirect: $urlRedirect) {
        urlRedirect {
          id
          path
          target
        }
        userErrors {
          field
          message
        }
      }
    }
  `;

  const data = await shopifyGraphQL(mutation, {
    id,
    urlRedirect: { target: to },
  });

  const result = data.urlRedirectUpdate;
  if (result.userErrors.length > 0) {
    return { success: false, from, to, errors: result.userErrors };
  }
  return { success: true, from, to, id: result.urlRedirect.id };
}

// Find an existing redirect by path
async function findRedirectByPath(path) {
  const query = `
    query findRedirect($query: String!) {
      urlRedirects(first: 5, query: $query) {
        nodes {
          id
          path
          target
        }
      }
    }
  `;

  const data = await shopifyGraphQL(query, { query: `path:${path}` });
  const matches = data.urlRedirects.nodes.filter((r) => r.path === path);
  return matches.length > 0 ? matches[0] : null;
}

// Delete a redirect by ID
async function deleteRedirect(id) {
  const mutation = `
    mutation urlRedirectDelete($id: ID!) {
      urlRedirectDelete(id: $id) {
        deletedUrlRedirectId
        userErrors {
          field
          message
        }
      }
    }
  `;

  const data = await shopifyGraphQL(mutation, { id });
  return data.urlRedirectDelete;
}

async function upsertRedirect(from, to) {
  const existing = await findRedirectByPath(from);
  if (existing) {
    if (existing.target === to) {
      return { success: true, skipped: true, from, to };
    }

    return updateRedirect(existing.id, from, to);
  }

  return createRedirect(from, to);
}

async function testAuth() {
  console.log("🔍 Testing Admin API auth...");
  try {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": ADMIN_TOKEN,
      },
      body: JSON.stringify({ query: "{ shop { name } }" }),
    });

    if (res.status === 401) {
      console.error(
        "\n❌ 401 Unauthorized — your Admin API token is invalid or revoked.",
      );
      console.error("\nTo fix this, generate a new token:");
      console.error(
        "  1. Go to https://admin.shopify.com/store/moderncre8ve/settings/apps/development",
      );
      console.error(
        "  2. Click your 'Claude2' app (or create a new custom app)",
      );
      console.error("  3. Go to 'API credentials' tab");
      console.error(
        "  4. Under 'Admin API access token', click 'Reveal token once'",
      );
      console.error("     (If no token shown, click 'Install app' first)");
      console.error(
        "  5. Copy the shpat_... token to your .env as SHOPIFY_ADMIN_API_TOKEN",
      );
      console.error("\nAlternatively, run: node scripts/get-admin-token.mjs");
      process.exit(1);
    }

    if (!res.ok) {
      const body = await res.text();
      console.error(`\n❌ HTTP ${res.status}: ${body}`);
      process.exit(1);
    }

    const json = await res.json();
    console.log(`✅ Connected to: ${json.data.shop.name}\n`);
  } catch (err) {
    console.error(`\n❌ Connection failed: ${err.message}`);
    process.exit(1);
  }
}

async function main() {
  console.log("=== ModernCre8ve SEO Redirect Import ===\n");
  await testAuth();

  // --- Phase 1: Create new redirects ---
  console.log(
    `--- Phase 1: Creating ${NEW_REDIRECTS.length} new redirects ---\n`,
  );

  let created = 0;
  let skipped = 0;
  let failed = 0;

  for (const { from, to } of NEW_REDIRECTS) {
    try {
      const result = await upsertRedirect(from, to);
      if (result.success && !result.skipped) {
        console.log(`  ✅ ${from} → ${to}`);
        created++;
      } else if (result.skipped) {
        console.log(`  ⏭️  ${from} → already correct`);
        skipped++;
      } else {
        const msg = result.errors.map((e) => e.message).join(", ");
        if (msg.includes("already exists")) {
          console.log(`  ⏭️  ${from} → already exists, skipping`);
          skipped++;
        } else {
          console.log(`  ❌ ${from} → FAILED: ${msg}`);
          failed++;
        }
      }
    } catch (err) {
      console.log(`  ❌ ${from} → ERROR: ${err.message}`);
      failed++;
    }

    // Rate limit: small delay between calls
    await new Promise((r) => setTimeout(r, 300));
  }

  console.log(
    `\nPhase 1 complete: ${created} created, ${skipped} skipped, ${failed} failed\n`,
  );

  // --- Phase 2: Repair broken product redirects ---
  console.log("--- Phase 2: Repairing broken product redirects ---\n");

  let repaired = 0;
  let repairSkipped = 0;
  let repairFailed = 0;

  for (const { from, to } of REDIRECT_REPAIRS) {
    try {
      const result = await upsertRedirect(from, to);
      if (result.success && !result.skipped) {
        console.log(`  ✅ ${from} → ${to}`);
        repaired++;
      } else if (result.skipped) {
        console.log(`  ⏭️  ${from} → already correct`);
        repairSkipped++;
      } else {
        const msg = result.errors.map((e) => e.message).join(", ");
        console.log(`  ❌ ${from} → FAILED: ${msg}`);
        repairFailed++;
      }
    } catch (err) {
      console.log(`  ❌ ${from} → ERROR: ${err.message}`);
      repairFailed++;
    }

    await new Promise((r) => setTimeout(r, 300));
  }

  console.log(
    `\nPhase 2 complete: ${repaired} repaired, ${repairSkipped} skipped, ${repairFailed} failed\n`,
  );

  // --- Phase 3: Product handle cleanup redirects ---
  console.log("--- Phase 3: Creating product handle cleanup redirects ---");
  console.log("    Rename the target product handles in Shopify Admin first.\n");

  let productCreated = 0;
  let productSkipped = 0;
  let productFailed = 0;

  for (const { from, to } of PRODUCT_HANDLE_REDIRECTS) {
    try {
      const result = await upsertRedirect(from, to);
      if (result.success && !result.skipped) {
        console.log(`  ✅ ${from} → ${to}`);
        productCreated++;
      } else if (result.skipped) {
        console.log(`  ⏭️  ${from} → already correct`);
        productSkipped++;
      } else {
        const msg = result.errors.map((e) => e.message).join(", ");
        console.log(`  ❌ ${from} → FAILED: ${msg}`);
        productFailed++;
      }
    } catch (err) {
      console.log(`  ❌ ${from} → ERROR: ${err.message}`);
      productFailed++;
    }

    await new Promise((r) => setTimeout(r, 300));
  }

  console.log(
    `\nPhase 3 complete: ${productCreated} created, ${productSkipped} skipped, ${productFailed} failed\n`,
  );

  // --- Phase 4: Fix blog article redirects (blanket → 1:1) ---
  console.log(
    `--- Phase 4: Fixing ${BLOG_REDIRECT_FIXES.length} blog article redirects ---\n`,
  );

  let fixed = 0;
  let blogSkipped = 0;
  let blogFailed = 0;

  for (const { oldFrom, oldTo, newTo } of BLOG_REDIRECT_FIXES) {
    try {
      // Step 1: Find the existing redirect
      const existing = await findRedirectByPath(oldFrom);

      if (existing) {
        // Check if it already points to the correct target
        if (existing.target === newTo) {
          console.log(`  ⏭️  ${oldFrom} → already correct (${newTo})`);
          blogSkipped++;
          continue;
        }

        // Step 2: Delete the old blanket redirect
        console.log(`  🗑️  Deleting blanket: ${oldFrom} → ${existing.target}`);
        await deleteRedirect(existing.id);
        await new Promise((r) => setTimeout(r, 300));
      }

      // Step 3: Create the new 1:1 redirect
      const result = await createRedirect(oldFrom, newTo);
      if (result.success) {
        console.log(`  ✅ ${oldFrom} → ${newTo}`);
        fixed++;
      } else {
        const msg = result.errors.map((e) => e.message).join(", ");
        console.log(`  ❌ ${oldFrom} → FAILED: ${msg}`);
        blogFailed++;
      }
    } catch (err) {
      console.log(`  ❌ ${oldFrom} → ERROR: ${err.message}`);
      blogFailed++;
    }

    await new Promise((r) => setTimeout(r, 300));
  }

  console.log(
    `\nPhase 3 complete: ${fixed} fixed, ${blogSkipped} already correct, ${blogFailed} failed\n`,
  );

  // --- Summary ---
  console.log("=== SUMMARY ===");
  console.log(
    `New redirects:   ${created} created, ${skipped} skipped, ${failed} failed`,
  );
  console.log(
    `Repairs:         ${repaired} repaired, ${repairSkipped} skipped, ${repairFailed} failed`,
  );
  console.log(
    `Product handles: ${productCreated} created, ${productSkipped} skipped, ${productFailed} failed`,
  );
  console.log(
    `Blog fixes:      ${fixed} fixed, ${blogSkipped} already correct, ${blogFailed} failed`,
  );
  console.log(
    "Review Shopify Admin > Content > Menus > URL redirects for final totals.",
  );
}

main().catch((err) => {
  console.error("Fatal error:", err.message);
  process.exit(1);
});
