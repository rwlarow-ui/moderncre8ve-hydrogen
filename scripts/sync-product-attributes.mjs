#!/usr/bin/env node

/**
 * Assigns Shopify category metafields (shopify.* → shopify--* metaobjects) to
 * live products from the reviewed plan in scripts/product-attributes.plan.mjs.
 *
 * These are what the PDP "Specifications" accordion and the Product JSON-LD
 * (material / color / size / additionalProperty) render — see
 * app/utils/product-specs.ts.
 *
 * Steps (all idempotent):
 *   1. enable any missing standard metafield definitions (storefront: PUBLIC_READ)
 *   2. upsert metaobject entries by handle, with their taxonomy value reference
 *   3. fix product categories where the plan says so
 *   4. set the product metafields (only those that differ from the plan)
 *
 * Usage:
 *   npm run sync:attributes                 # dry run — prints the diff
 *   npm run sync:attributes -- --apply      # writes to Shopify
 *   npm run sync:attributes -- --only=the-stowe,the-wookie
 *
 * Needs PUBLIC_STORE_DOMAIN and SHOPIFY_ADMIN_API_TOKEN (the npm script loads .env).
 */

import {
  METAFIELD_TYPES,
  METAOBJECT_ENTRIES,
  NEEDS_INPUT,
  PRODUCT_PLAN,
} from "./product-attributes.plan.mjs";

const API_VERSION = "2025-04";
const { PUBLIC_STORE_DOMAIN: domain, SHOPIFY_ADMIN_API_TOKEN: token } =
  process.env;
const args = Object.fromEntries(
  process.argv
    .slice(2)
    .filter((a) => a.startsWith("--"))
    .map((a) => {
      const [k, v = "true"] = a.slice(2).split("=");
      return [k, v];
    }),
);
const APPLY = args.apply === "true";
const only = args.only ? new Set(args.only.split(",")) : null;

if (!(domain && token)) {
  console.error("Missing PUBLIC_STORE_DOMAIN or SHOPIFY_ADMIN_API_TOKEN");
  process.exit(2);
}

async function admin(query, variables = {}) {
  for (let attempt = 1; attempt <= 3; attempt++) {
    const res = await fetch(
      `https://${domain}/admin/api/${API_VERSION}/graphql.json`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Shopify-Access-Token": token,
        },
        body: JSON.stringify({ query, variables }),
      },
    );
    const json = await res.json();
    if (res.ok && !json.errors) return json.data;
    if (attempt === 3)
      throw new Error(JSON.stringify(json.errors ?? res.status));
    await new Promise((r) => setTimeout(r, attempt * 1000));
  }
}

function assertNoUserErrors(label, payload) {
  const errors = payload?.userErrors ?? [];
  if (errors.length) {
    throw new Error(`${label}: ${JSON.stringify(errors)}`);
  }
}

const log = (...m) => console.log(APPLY ? "" : "[dry-run]", ...m);

// ── 1. Definitions ──────────────────────────────────────────────────────────
const { metafieldDefinitions } = await admin(`{
  metafieldDefinitions(first: 100, ownerType: PRODUCT, namespace: "shopify") {
    nodes { key access { storefront } }
  }
}`);
const existingDefs = new Map(
  metafieldDefinitions.nodes.map((d) => [d.key, d.access.storefront]),
);
for (const key of Object.keys(METAFIELD_TYPES)) {
  if (existingDefs.has(key)) {
    if (existingDefs.get(key) !== "PUBLIC_READ") {
      console.warn(
        `! shopify.${key} is not storefront-readable — enable it in Settings → Custom data`,
      );
    }
    continue;
  }
  log(`enable definition shopify.${key}`);
  if (APPLY) {
    const data = await admin(
      `mutation($key: String!) {
        standardMetafieldDefinitionEnable(ownerType: PRODUCT, namespace: "shopify", key: $key) {
          createdDefinition { id } userErrors { field message code }
        }
      }`,
      { key },
    );
    assertNoUserErrors(key, data.standardMetafieldDefinitionEnable);
  }
}

// ── 2. Metaobject entries ───────────────────────────────────────────────────
const entryIds = {}; // type → handle → gid
for (const [type, { taxonomyField, taxonomyIsList, entries }] of Object.entries(
  METAOBJECT_ENTRIES,
)) {
  const { metaobjects } = await admin(
    `query($type: String!) { metaobjects(first: 250, type: $type) { nodes { id handle } } }`,
    { type },
  );
  entryIds[type] = Object.fromEntries(
    metaobjects.nodes.map((n) => [n.handle, n.id]),
  );
  for (const [handle, { label, value, hex }] of Object.entries(entries)) {
    const exists = Boolean(entryIds[type][handle]);
    if (exists && value === null) continue; // keep as-is
    const fields = [{ key: "label", value: label }];
    if (value !== null) {
      const gid = `gid://shopify/TaxonomyValue/${value}`;
      fields.push({
        key: taxonomyField,
        value: taxonomyIsList ? JSON.stringify([gid]) : gid,
      });
    }
    if (hex) fields.push({ key: "color", value: hex });
    // shopify--color-pattern requires a base pattern; all our finishes are solid.
    if (type === "shopify--color-pattern") {
      fields.push({
        key: "pattern_taxonomy_reference",
        value: "gid://shopify/TaxonomyValue/2874",
      });
    }
    log(`${exists ? "update" : "create"} ${type}/${handle} (${label})`);
    if (APPLY) {
      const data = await admin(
        `mutation($handle: MetaobjectHandleInput!, $metaobject: MetaobjectUpsertInput!) {
          metaobjectUpsert(handle: $handle, metaobject: $metaobject) {
            metaobject { id handle } userErrors { field message code }
          }
        }`,
        { handle: { type, handle }, metaobject: { fields } },
      );
      assertNoUserErrors(`${type}/${handle}`, data.metaobjectUpsert);
      entryIds[type][handle] = data.metaobjectUpsert.metaobject.id;
    } else if (!exists) {
      entryIds[type][handle] = `<new ${type}/${handle}>`;
    }
  }
}

// ── 3 + 4. Products ─────────────────────────────────────────────────────────
const handles = Object.keys(PRODUCT_PLAN).filter((h) => !only || only.has(h));
const products = [];
for (let i = 0; i < handles.length; i += 40) {
  const chunk = handles.slice(i, i + 40);
  const { products: page } = await admin(
    `query($q: String!) {
      products(first: 50, query: $q) {
        nodes { id handle status category { id }
          metafields(first: 30, namespace: "shopify") { nodes { key value } } }
      }
    }`,
    { q: chunk.map((h) => `handle:${h}`).join(" OR ") },
  );
  products.push(...page.nodes);
}

const missing = handles.filter((h) => !products.some((p) => p.handle === h));
if (missing.length) console.warn("! not found in Shopify:", missing.join(", "));

let changes = 0;
for (const product of products) {
  const plan = PRODUCT_PLAN[product.handle];
  if (product.status !== "ACTIVE") {
    console.warn(`! ${product.handle} is ${product.status} — skipped`);
    continue;
  }

  if (plan.category && product.category?.id !== plan.category) {
    changes++;
    log(
      `${product.handle}: category ${product.category?.id ?? "none"} → ${plan.category}`,
    );
    if (APPLY) {
      const data = await admin(
        `mutation($product: ProductUpdateInput!) {
          productUpdate(product: $product) { product { id } userErrors { field message } }
        }`,
        { product: { id: product.id, category: plan.category } },
      );
      assertNoUserErrors(product.handle, data.productUpdate);
    }
  }

  const current = Object.fromEntries(
    product.metafields.nodes.map((m) => [m.key, m.value]),
  );
  const metafields = [];
  for (const [key, entryHandles] of Object.entries(plan.attrs)) {
    const type = METAFIELD_TYPES[key];
    const ids = entryHandles.map((h) => {
      const id = entryIds[type]?.[h];
      if (!id) throw new Error(`${product.handle}: no ${type} entry "${h}"`);
      return id;
    });
    const value = JSON.stringify(ids);
    if (current[key] === value) continue;
    log(`${product.handle}: shopify.${key} = ${entryHandles.join(", ")}`);
    metafields.push({
      ownerId: product.id,
      namespace: "shopify",
      key,
      type: "list.metaobject_reference",
      value,
    });
  }
  if (metafields.length) {
    changes += metafields.length;
    if (APPLY) {
      const data = await admin(
        `mutation($metafields: [MetafieldsSetInput!]!) {
          metafieldsSet(metafields: $metafields) { metafields { key } userErrors { field message code } }
        }`,
        { metafields },
      );
      assertNoUserErrors(product.handle, data.metafieldsSet);
    }
  }
}

console.log(
  `\n${APPLY ? "Applied" : "Would apply"} ${changes} product change(s) across ${products.length} product(s).`,
);
if (NEEDS_INPUT.length) {
  console.log(
    `Needs material/attribute input (left untouched): ${NEEDS_INPUT.join(", ")}`,
  );
}
if (!APPLY) console.log("Re-run with --apply to write.");
