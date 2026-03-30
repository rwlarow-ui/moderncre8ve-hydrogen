#!/usr/bin/env node

/**
 * ModernCre8ve SEO Title & Meta Description Updater
 * Applies all rewrites from the 90-Day Craft & Convert Sprint doc (March 24, 2026)
 *
 * Usage (from project root):
 *   node scripts/seo-update.mjs
 *
 * Requires SHOPIFY_ADMIN_API_TOKEN in .env with write_products scope.
 * To get a fresh token: node scripts/get-admin-token.mjs <client_id> <client_secret>
 */

import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// ── Load .env ─────────────────────────────────────────────────────────────────

function loadDotEnv() {
  const envPath = resolve(__dirname, "..", ".env");
  try {
    const raw = readFileSync(envPath, "utf8");
    for (const line of raw.split("\n")) {
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
      if (!process.env[key]) process.env[key] = value;
    }
  } catch {
    // .env not found — rely on environment
  }
}

loadDotEnv();

const SHOP = process.env.PUBLIC_STORE_DOMAIN || "moderncre8ve.myshopify.com";
const TOKEN = process.argv[2] || process.env.SHOPIFY_ADMIN_API_TOKEN;
const API_VERSION = "2024-10";
const ENDPOINT = `https://${SHOP}/admin/api/${API_VERSION}/graphql.json`;

if (!TOKEN) {
  console.error("❌  No token found. Set SHOPIFY_ADMIN_API_TOKEN in .env or pass as first argument.");
  console.error("    To get a fresh token: node scripts/get-admin-token.mjs <client_id> <client_secret>");
  process.exit(1);
}

const headers = {
  "Content-Type": "application/json",
  "X-Shopify-Access-Token": TOKEN,
};

// ── Verify token before running ───────────────────────────────────────────────

async function verifyToken() {
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers,
    body: JSON.stringify({ query: "{ shop { name } }" }),
  });
  const json = await res.json();
  if (json.errors || !json.data?.shop) {
    console.error("❌  Token rejected by Shopify Admin API.");
    console.error("    Run: node scripts/get-admin-token.mjs fd5964839bc3fb47703bafb47d25d3fc <client_secret>");
    process.exit(1);
  }
  return json.data.shop.name;
}

async function gql(query, variables = {}) {
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers,
    body: JSON.stringify({ query, variables }),
  });
  const json = await res.json();
  if (json.errors) throw new Error(JSON.stringify(json.errors));
  return json.data;
}

// ── SEO Data ──────────────────────────────────────────────────────────────────

const COLLECTIONS = [
  // ── Priority 1: were over 155 chars ──────────────────────────────────────
  {
    handle: "mid-century-modern-credenza",
    seoTitle: "Mid-Century Modern Credenza — Solid Walnut",
    seoDescription:
      "Handcrafted mid-century modern credenza in solid walnut. Sideboards with soft-close doors, tapered legs & brass hardware. Made to order in Ohio.",
  },
  {
    handle: "scandinavian-design-furniture",
    seoTitle: "Scandinavian Furniture — Handcrafted Nordic Design",
    seoDescription:
      "Handcrafted Scandinavian furniture in solid walnut & oak. Dining tables, bed frames & storage. Nordic minimalism, American craft. Free delivery.",
  },
  {
    handle: "custom-made-expandable-dining-tables",
    seoTitle: "Custom Expandable Dining Tables — Made to Order",
    seoDescription:
      "Design your custom expandable dining table in solid walnut or oak. Butterfly leaf extends from 4 to 12 seats. Amish-crafted to order in Ohio.",
  },
  {
    handle: "custom-made-furniture",
    seoTitle: "Custom Furniture — Solid Walnut & Oak, Made to Order",
    seoDescription:
      "Custom dining tables, credenzas & bed frames in solid walnut & oak. Choose dimensions, wood & finish. 12–16 week lead time. Handcrafted in Ohio.",
  },
  // ── Priority 2: keyword & CTA improvements ───────────────────────────────
  {
    handle: "japandi",
    seoTitle: "Japandi Furniture — Handcrafted Modern",
    seoDescription:
      "Shop Japandi furniture — Japanese minimalism meets Scandinavian warmth. Handcrafted in solid walnut & oak. Made to order in Ohio. Free delivery.",
  },
  {
    handle: "mid-century-modern",
    seoTitle: "Mid-Century Modern Furniture — Handcrafted Ohio",
    seoDescription:
      "Handcrafted mid-century modern furniture in solid walnut & oak. Dining tables, bed frames, credenzas & coffee tables. Made to order in Ohio.",
  },
  {
    handle: "mid-century-modern-dining-tables",
    seoTitle: "Mid-Century Modern Dining Tables — Round, Oval & Extendable",
    seoDescription:
      "Handcrafted MCM dining tables in solid walnut & oak. Round, oval & extendable designs seating 4–12. Made to order in Ohio. Free white glove delivery.",
  },
  {
    handle: "mid-century-modern-coffee-tables",
    seoTitle: "Mid-Century Modern Coffee Tables — Solid Walnut",
    seoDescription:
      "Handcrafted mid-century modern coffee tables in solid walnut & oak. Japandi & Scandinavian styles. Custom sizes available. Made in Ohio.",
  },
  {
    handle: "handmade-modern-bed-frames",
    seoTitle: "Handmade Modern Bed Frames — Solid Walnut & Oak",
    seoDescription:
      "Handmade modern bed frames in solid walnut & oak. Mid-century, Scandinavian & Japandi styles. Platform & traditional. Twin–Cal King. Ohio.",
  },
  // ── Title updates (metas already correct) ────────────────────────────────
  {
    handle: "oval-dining-tables",
    seoTitle: "Oval Dining Tables — Handcrafted Solid Walnut",
    seoDescription:
      "Handcrafted oval dining tables in solid walnut & white oak. Sculptural mid-century modern designs that seat 6–10. Made to order in Ohio.",
  },
  {
    handle: "modern-dining-chairs",
    seoTitle: "Modern Solid Wood Dining Chairs — Walnut & Oak",
    seoDescription:
      "Solid wood dining chairs in mid-century modern & Scandinavian styles. Handcrafted in walnut & oak. Custom upholstery options. Made in Ohio.",
  },
  {
    handle: "all-products",
    seoTitle: "Handcrafted Modern Furniture Collection",
    seoDescription:
      "Shop all ModernCre8ve furniture: handcrafted mid-century modern dining tables, credenzas, bed frames, coffee tables & more. Made in Ohio.",
  },
  {
    handle: "minimalist-bed-frames",
    seoTitle: "Minimalist Bed Frames — Handcrafted Solid Wood",
    seoDescription:
      "Minimalist bed frames handcrafted in solid walnut & oak. Clean-line platform designs, no box spring needed. Twin–Cal King. Made in Ohio.",
  },
  {
    handle: "scandinavian-bed-frames",
    seoTitle: "Scandinavian Bed Frames — Handcrafted Solid Wood",
    seoDescription:
      "Scandinavian bed frames in solid walnut & white oak. Nordic-inspired minimalist designs with warm wood tones. Twin–Cal King. Made in Ohio.",
  },
  {
    handle: "best-sellers",
    seoTitle: "Best Selling Handcrafted Modern Furniture",
    seoDescription:
      "Our most popular handcrafted furniture pieces — mid-century modern, Japandi & Scandinavian styles. Made in Ohio.",
  },
];

const PRODUCTS = [
  {
    handle: "the-santa-monica-mid-century-modern-dining-table",
    seoTitle: "Santa Monica Mid-Century Dining Table — Solid Walnut",
    seoDescription:
      "The Santa Monica dining table: tapered legs, beveled solid walnut top, seats 4–8. Handcrafted to order in Ohio. Free white glove delivery. Shop now.",
  },
  {
    handle: "mid-century-modern-extendable-dining-table-santa-monica",
    seoTitle: "Mid-Century Extendable Dining Table — Butterfly Leaf",
    seoDescription:
      'Solid walnut mid-century dining table with butterfly leaf. Expands 70" to 90", seats 6–10. Made to order in Ohio. Free white glove delivery.',
  },
  {
    handle: "bossa-nova-modern-dining-table-small-handmade-ohio",
    seoTitle: "Bossa Nova Modern Dining Table — Handmade Walnut",
    seoDescription:
      "Sculptural modern dining table in solid American walnut. Double beveled edge, tapered legs. Seats 4–10 with optional leaf. Handcrafted in Ohio.",
  },
  {
    handle: "santa-monica-cherry",
    seoTitle: "Mid-Century Dining Table in Solid Cherry Wood",
    seoDescription:
      "Mid-century modern dining table in solid American cherry. Develops a rich amber patina over time. Made to order in Ohio. Free white glove delivery.",
  },
  {
    handle: "santa-monica-mixed",
    seoTitle: "Santa Monica Dining Table — Two-Tone Walnut & Oak",
    seoDescription:
      "Two-tone mid-century modern dining table in walnut & oak. Bold contrast, clean lines. Handcrafted to order in Ohio. Free white glove delivery.",
  },
  {
    handle: "round-walnut-dining-table",
    seoTitle: "Round Walnut Dining Table — Handcrafted Modern",
    seoDescription:
      "Modern round dining table in solid American walnut with double beveled edge. Seats 4–6. Japandi & Scandinavian-inspired. Handcrafted in Ohio.",
  },
  {
    handle: "scandinavian-danish-modern-dining-table",
    seoTitle: "Scandinavian Dining Table — Handcrafted Minimalist Design",
    seoDescription:
      "Handcrafted Scandinavian dining table in solid walnut or oak. Seats 8–10 with aesthetic Nordic lines. Made to order in Ohio. Free white glove delivery.",
  },
  {
    handle: "mar-vista-oval-dining-table",
    seoTitle: "Mar Vista Oval Dining Table — Custom Solid Walnut",
    seoDescription:
      'Sculptural oval dining table in solid walnut. Custom sizes 60"–96". Seats 6–10. Japandi-inspired design. Made in Ohio. Free delivery.',
  },
  {
    handle: "the-vista-scandinavian-extendable-dining-table",
    seoTitle: "Scandinavian Extendable Oval Dining Table — Walnut",
    seoDescription:
      "Scandinavian oval dining table with butterfly leaf. Solid walnut or oak. Extends to seat up to 10. Handcrafted in Ohio. Free white glove delivery.",
  },
  {
    handle: "modern-hardwood-dining-chair",
    seoTitle: "Modern Hardwood Dining Chair — Walnut, Oak & Cherry",
    seoDescription:
      "Modern solid hardwood dining chair in walnut, oak, or cherry. Arm & side chair options. Traditional Amish joinery. Made to order in Ohio.",
  },
  {
    handle: "mid-century-modern-credenza-handcrafted-ohio",
    seoTitle: "Mid-Century Modern Credenza — Solid Walnut",
    seoDescription:
      "Solid walnut mid-century modern credenza with soft-close doors, leather pulls & adjustable shelves. Made to order in Ohio. Free white glove delivery.",
  },
  {
    handle: "lareauxs-furniture-wax",
    seoTitle: "Lareaux's Natural Furniture Wax — Beeswax Wood Care",
    seoDescription:
      "Natural beeswax furniture wax for solid wood care. Nourishes and protects walnut, oak & cherry. Ships in 3–5 business days.",
  },
  {
    handle: "mid-century-modern-walnut-nightstand",
    seoTitle: "Solid Walnut Nightstand — Mid-Century Modern Design",
    seoDescription:
      "Handcrafted solid walnut nightstand with round modern design. Sold individually or as a pair. Made to order in Ohio. Free white glove delivery.",
  },
];

// ── GraphQL ───────────────────────────────────────────────────────────────────

const GET_COLLECTION = `
  query ($handle: String!) {
    collectionByHandle(handle: $handle) {
      id title seo { title description }
    }
  }
`;

const UPDATE_COLLECTION = `
  mutation ($input: CollectionInput!) {
    collectionUpdate(input: $input) {
      collection { id handle seo { title description } }
      userErrors { field message }
    }
  }
`;

const GET_PRODUCT = `
  query ($handle: String!) {
    productByHandle(handle: $handle) {
      id title seo { title description }
    }
  }
`;

const UPDATE_PRODUCT = `
  mutation ($input: ProductInput!) {
    productUpdate(input: $input) {
      product { id handle seo { title description } }
      userErrors { field message }
    }
  }
`;

// ── Helpers ───────────────────────────────────────────────────────────────────

function charLen(s) {
  return [...(s ?? "")].length;
}

async function updateCollection({ handle, seoTitle, seoDescription }) {
  const fetchData = await gql(GET_COLLECTION, { handle });
  const col = fetchData.collectionByHandle;
  if (!col) {
    console.warn(`  ⚠️  Not found: ${handle}`);
    return { handle, status: "not_found" };
  }
  const result = await gql(UPDATE_COLLECTION, {
    input: { id: col.id, seo: { title: seoTitle, description: seoDescription } },
  });
  const errors = result.collectionUpdate.userErrors;
  if (errors.length > 0) {
    console.error(`  ❌  ${handle}: ${errors.map((e) => e.message).join(", ")}`);
    return { handle, status: "error", errors };
  }
  const s = result.collectionUpdate.collection.seo;
  console.log(`  ✅  ${handle}`);
  console.log(`      title (${charLen(s.title)} chars): "${s.title}"`);
  console.log(`      meta  (${charLen(s.description)} chars): "${s.description}"`);
  return { handle, status: "ok" };
}

async function updateProduct({ handle, seoTitle, seoDescription }) {
  const fetchData = await gql(GET_PRODUCT, { handle });
  const product = fetchData.productByHandle;
  if (!product) {
    console.warn(`  ⚠️  Not found: ${handle}`);
    return { handle, status: "not_found" };
  }
  const result = await gql(UPDATE_PRODUCT, {
    input: { id: product.id, seo: { title: seoTitle, description: seoDescription } },
  });
  const errors = result.productUpdate.userErrors;
  if (errors.length > 0) {
    console.error(`  ❌  ${handle}: ${errors.map((e) => e.message).join(", ")}`);
    return { handle, status: "error", errors };
  }
  const s = result.productUpdate.product.seo;
  console.log(`  ✅  ${handle}`);
  console.log(`      title (${charLen(s.title)} chars): "${s.title}"`);
  console.log(`      meta  (${charLen(s.description)} chars): "${s.description}"`);
  return { handle, status: "ok" };
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const shopName = await verifyToken();

  console.log("═══════════════════════════════════════════════════");
  console.log(" ModernCre8ve SEO Updater — 90-Day Sprint");
  console.log(` Shop: ${shopName} (${SHOP})`);
  console.log("═══════════════════════════════════════════════════\n");

  console.log(`📂  COLLECTIONS (${COLLECTIONS.length})\n`);
  const colResults = [];
  for (const col of COLLECTIONS) {
    colResults.push(await updateCollection(col));
  }

  console.log(`\n📦  PRODUCTS (${PRODUCTS.length})\n`);
  const prodResults = [];
  for (const prod of PRODUCTS) {
    prodResults.push(await updateProduct(prod));
  }

  const all = [...colResults, ...prodResults];
  const ok = all.filter((r) => r.status === "ok").length;
  const notFound = all.filter((r) => r.status === "not_found").length;
  const errors = all.filter((r) => r.status === "error").length;

  console.log("\n═══════════════════════════════════════════════════");
  console.log(` DONE: ${ok} updated · ${notFound} not found · ${errors} errors`);
  console.log("═══════════════════════════════════════════════════");

  if (notFound > 0 || errors > 0) {
    console.log("\nItems needing attention:");
    all
      .filter((r) => r.status !== "ok")
      .forEach((r) =>
        console.log(`  ${r.status === "not_found" ? "⚠️ " : "❌"} ${r.handle} (${r.status})`),
      );
  }
}

main().catch((err) => {
  console.error("\n❌  Fatal error:", err.message);
  process.exit(1);
});
