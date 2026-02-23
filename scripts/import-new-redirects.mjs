#!/usr/bin/env node

/**
 * Import 11 new SEO redirects to Shopify Admin via GraphQL API
 * These are the gaps found in the SEO Migration Audit (v1.2.4)
 *
 * Also updates 4 existing blog redirects from blanket (→ index) to 1:1 (→ article)
 */

const SHOPIFY_STORE = "moderncre8ve.myshopify.com";
const ADMIN_TOKEN = process.env.SHOPIFY_ADMIN_API_TOKEN;
if (!ADMIN_TOKEN) {
  console.error("Error: SHOPIFY_ADMIN_API_TOKEN environment variable is not set.");
  console.error("Set it in your .env file or export it before running this script.");
  process.exit(1);
}
const API_VERSION = "2024-10";

// --- 11 NEW redirects to create ---
const NEW_REDIRECTS = [
  { from: "/pages/custom-kitchen-cabinets-cleveland", to: "/pages/custom-furniture-crafted-to-perfection" },
  { from: "/collections/all", to: "/collections/all-products" },
  { from: "/collections/scandinavian-design-furniture", to: "/collections/all-products" },
  { from: "/collections/mid-century-modern", to: "/collections/all-products" },
  { from: "/collections/mid-century-modern-dining-tables", to: "/collections/all-products" },
  { from: "/collections/modern-dining-chairs", to: "/collections/all-products" },
  { from: "/collections/all/custom", to: "/collections/custom-made-furniture" },
  { from: "/blogs/mid-century-modern-scandi-japandi-design-blog/tagged/vintagefurniture", to: "/blogs/mid-century-modern-scandi-japandi-design-blog" },
  { from: "/blogs/mid-century-modern-scandi-japandi-design-blog/tagged/japandi-bedroom", to: "/blogs/mid-century-modern-scandi-japandi-design-blog" },
];

// --- 4 EXISTING blog redirects to fix (delete old blanket → create 1:1) ---
const BLOG_REDIRECT_FIXES = [
  {
    oldFrom: "/blogs/mid-century-modern-scandi-japandi-design-blog/how-to-choose-the-perfect-dining-table",
    oldTo: "/blogs/mid-century-modern-scandi-japandi-design-blog",
    newTo: "/blogs/mid-century-modern-scandi-japandi-design-blog/how-to-choose-the-perfect-dining-table",
  },
  {
    oldFrom: "/blogs/news/solid-wood-furniture-care-guide",
    oldTo: "/blogs/mid-century-modern-scandi-japandi-design-blog",
    newTo: "/blogs/mid-century-modern-scandi-japandi-design-blog/solid-wood-furniture-care-guide",
  },
  {
    oldFrom: "/blogs/news/58430660-we-are-an-etsy-featured-shop-sept-2015",
    oldTo: "/blogs/mid-century-modern-scandi-japandi-design-blog",
    newTo: "/blogs/mid-century-modern-scandi-japandi-design-blog/58430660-we-are-an-etsy-featured-shop-sept-2015",
  },
  {
    oldFrom: "/blogs/news/uncovering-the-beauty-and-durability-of-black-walnut-wood-the-ultimate-guide",
    oldTo: "/blogs/mid-century-modern-scandi-japandi-design-blog",
    newTo: "/blogs/mid-century-modern-scandi-japandi-design-blog/uncovering-the-beauty-and-durability-of-black-walnut-wood-the-ultimate-guide",
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

// Create a single redirect
async function createRedirect(from, to) {
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
  const matches = data.urlRedirects.nodes.filter(
    (r) => r.path === path
  );
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

async function main() {
  console.log("=== ModernCre8ve SEO Redirect Import (v1.2.4) ===\n");

  // --- Phase 1: Create 9 new redirects ---
  console.log("--- Phase 1: Creating 9 new redirects ---\n");

  let created = 0;
  let skipped = 0;
  let failed = 0;

  for (const { from, to } of NEW_REDIRECTS) {
    try {
      const result = await createRedirect(from, to);
      if (result.success) {
        console.log(`  ✅ ${from} → ${to}`);
        created++;
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

  console.log(`\nPhase 1 complete: ${created} created, ${skipped} skipped, ${failed} failed\n`);

  // --- Phase 2: Fix 4 blog article redirects (blanket → 1:1) ---
  console.log("--- Phase 2: Fixing 4 blog article redirects ---\n");

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

  console.log(`\nPhase 2 complete: ${fixed} fixed, ${blogSkipped} already correct, ${blogFailed} failed\n`);

  // --- Summary ---
  console.log("=== SUMMARY ===");
  console.log(`New redirects:   ${created} created, ${skipped} skipped, ${failed} failed`);
  console.log(`Blog fixes:      ${fixed} fixed, ${blogSkipped} already correct, ${blogFailed} failed`);
  console.log(`Total redirects: 77 existing + ${created + fixed} new = ${77 + created + fixed} total`);
}

main().catch((err) => {
  console.error("Fatal error:", err.message);
  process.exit(1);
});
