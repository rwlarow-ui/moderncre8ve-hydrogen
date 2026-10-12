#!/usr/bin/env node

/**
 * Creates the Shopify definitions for ADR-0001 (production PO + logistics):
 *   - metaobject definition `production_po`
 *   - order metafields   moderncre8ve.po | .logistics | .logistics_status
 *   - product metafield  custom.finish
 *
 * Idempotent: anything that already exists is skipped, never modified.
 *
 * Usage:
 *   node scripts/create-po-definitions.mjs --dry-run   # read-only, prints the plan
 *   node scripts/create-po-definitions.mjs             # creates what is missing
 *
 * Requires SHOPIFY_ADMIN_API_TOKEN in .env with write_metaobject_definitions
 * plus metafield-definition write access for orders and products.
 */

import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ENV_PATH = resolve(__dirname, "..", ".env");
const API_VERSION = "2026-01";

const PO_TYPE = "production_po";
const PO_STATES = [
  "draft",
  "awaiting_logistics",
  "ready_for_review",
  "approved",
  "sent",
  "cancelled",
];
const LOGISTICS_STATES = ["none", "partial", "complete"];

export const METAOBJECT_DEFINITION = {
  type: PO_TYPE,
  name: "Production PO",
  displayNameKey: "order_name",
  access: { admin: "MERCHANT_READ_WRITE", storefront: "NONE" },
  fieldDefinitions: [
    { key: "order_id", name: "Order ID", type: "single_line_text_field", required: true },
    { key: "order_name", name: "Order name", type: "single_line_text_field", required: true },
    {
      key: "state",
      name: "State",
      type: "single_line_text_field",
      required: true,
      validations: [{ name: "choices", value: JSON.stringify(PO_STATES) }],
    },
    { key: "revision", name: "Revision", type: "number_integer", required: true },
    { key: "line_specs", name: "Line specs", type: "json" },
    { key: "logistics_snapshot", name: "Logistics snapshot", type: "json" },
    { key: "approved_by", name: "Approved by", type: "single_line_text_field" },
    { key: "approved_at", name: "Approved at", type: "date_time" },
    { key: "sent_at", name: "Sent at", type: "date_time" },
    { key: "sent_message_id", name: "Sent message ID", type: "single_line_text_field" },
  ],
};

export const METAFIELD_DEFINITIONS = [
  {
    ownerType: "ORDER",
    namespace: "moderncre8ve",
    key: "po",
    name: "Production PO",
    type: "metaobject_reference",
    validations: [{ name: "metaobject_definition_type", value: PO_TYPE }],
  },
  {
    ownerType: "ORDER",
    namespace: "moderncre8ve",
    key: "logistics",
    name: "Delivery logistics",
    type: "json",
  },
  {
    ownerType: "ORDER",
    namespace: "moderncre8ve",
    key: "logistics_status",
    name: "Logistics status",
    type: "single_line_text_field",
    validations: [{ name: "choices", value: JSON.stringify(LOGISTICS_STATES) }],
  },
  {
    ownerType: "PRODUCT",
    namespace: "custom",
    key: "finish",
    name: "Finish",
    description: "Finish/stain for the production PO (e.g. Natural, Onyx).",
    type: "single_line_text_field",
  },
];

const EXISTING_QUERY = `#graphql
  query ExistingPoDefinitions {
    metaobjectDefinitionByType(type: "${PO_TYPE}") { id }
    orderDefs: metafieldDefinitions(first: 100, ownerType: ORDER, namespace: "moderncre8ve") {
      nodes { key namespace }
    }
    productDefs: metafieldDefinitions(first: 100, ownerType: PRODUCT, namespace: "custom") {
      nodes { key namespace }
    }
  }
`;

const CREATE_METAOBJECT_DEFINITION = `#graphql
  mutation CreatePoMetaobjectDefinition($definition: MetaobjectDefinitionCreateInput!) {
    metaobjectDefinitionCreate(definition: $definition) {
      metaobjectDefinition { id type }
      userErrors { field message code }
    }
  }
`;

const CREATE_METAFIELD_DEFINITION = `#graphql
  mutation CreatePoMetafieldDefinition($definition: MetafieldDefinitionInput!) {
    metafieldDefinitionCreate(definition: $definition) {
      createdDefinition { id namespace key }
      userErrors { field message code }
    }
  }
`;

function loadDotEnv() {
  try {
    for (const line of readFileSync(ENV_PATH, "utf8").split(/\r?\n/)) {
      const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
      if (match && process.env[match[1]] === undefined) {
        process.env[match[1]] = match[2].replace(/^["']|["']$/g, "");
      }
    }
  } catch {
    // No .env: fall back to the process environment.
  }
}

async function adminGraphql(query, variables = {}) {
  const storeDomain = process.env.PUBLIC_STORE_DOMAIN;
  const token = process.env.SHOPIFY_ADMIN_API_TOKEN;
  const response = await fetch(
    `https://${storeDomain}/admin/api/${API_VERSION}/graphql.json`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": token,
      },
      body: JSON.stringify({ query, variables }),
    },
  );

  if (!response.ok) {
    throw new Error(`Admin API request failed (${response.status}).`);
  }

  const payload = await response.json();
  if (payload.errors?.length) {
    throw new Error(payload.errors.map((error) => error.message).join("; "));
  }
  return payload.data;
}

function assertNoUserErrors(label, userErrors) {
  if (userErrors?.length) {
    throw new Error(`${label}: ${JSON.stringify(userErrors)}`);
  }
}

export function planDefinitions(existing) {
  const have = new Set([
    ...existing.orderDefs.nodes.map((d) => `ORDER:${d.namespace}.${d.key}`),
    ...existing.productDefs.nodes.map((d) => `PRODUCT:${d.namespace}.${d.key}`),
  ]);

  return {
    createMetaobject: !existing.metaobjectDefinitionByType,
    metafields: METAFIELD_DEFINITIONS.map((def) => ({
      def,
      id: `${def.ownerType}:${def.namespace}.${def.key}`,
    })).map(({ def, id }) => ({ def, exists: have.has(id) })),
  };
}

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  loadDotEnv();

  for (const name of ["PUBLIC_STORE_DOMAIN", "SHOPIFY_ADMIN_API_TOKEN"]) {
    if (!process.env[name]) {
      console.error(`${name} is missing.`);
      process.exit(1);
    }
  }

  console.log(
    `${dryRun ? "[dry-run] " : ""}${process.env.PUBLIC_STORE_DOMAIN} @ Admin API ${API_VERSION}`,
  );

  const plan = planDefinitions(await adminGraphql(EXISTING_QUERY));

  // The order metafield `po` references the metaobject type, so create it first.
  console.log(
    `metaobject ${PO_TYPE}: ${plan.createMetaobject ? "create" : "exists, skip"}`,
  );
  if (plan.createMetaobject && !dryRun) {
    const data = await adminGraphql(CREATE_METAOBJECT_DEFINITION, {
      definition: METAOBJECT_DEFINITION,
    });
    assertNoUserErrors(
      "metaobjectDefinitionCreate",
      data.metaobjectDefinitionCreate.userErrors,
    );
  }

  for (const { def, exists } of plan.metafields) {
    const label = `${def.ownerType.toLowerCase()} metafield ${def.namespace}.${def.key}`;
    console.log(`${label}: ${exists ? "exists, skip" : "create"}`);
    if (exists || dryRun) continue;
    const data = await adminGraphql(CREATE_METAFIELD_DEFINITION, {
      definition: def,
    });
    assertNoUserErrors(
      `metafieldDefinitionCreate ${label}`,
      data.metafieldDefinitionCreate.userErrors,
    );
  }

  console.log(dryRun ? "Dry run complete; nothing was written." : "Done.");
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
}
