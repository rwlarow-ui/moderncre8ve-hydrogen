#!/usr/bin/env node

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import {
  getCustomerDetail,
  getOrderDetail,
  listCurrentOrders,
  normalizeTagList,
  setOpsNote,
  updateOwnerTags,
} from "../app/utils/ops-dashboard.server.js";

const serverInfo = {
  name: "moderncre8ve-ops-dashboard",
  version: "1.0.0",
};

loadDotEnv();

const config = {
  PUBLIC_STORE_DOMAIN: process.env.PUBLIC_STORE_DOMAIN,
  SHOPIFY_ADMIN_API_TOKEN: process.env.SHOPIFY_ADMIN_API_TOKEN,
};

let negotiatedProtocolVersion = "2024-11-05";
let buffer = Buffer.alloc(0);

process.stdin.on("data", (chunk) => {
  buffer = Buffer.concat([buffer, Buffer.from(chunk)]);
  consumeMessages();
});

process.stdin.on("end", () => {
  process.exit(0);
});

function loadDotEnv() {
  const envPath = fileURLToPath(new URL("../.env", import.meta.url));

  try {
    const raw = readFileSync(envPath, "utf8");
    for (const line of raw.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) {
        continue;
      }

      const index = trimmed.indexOf("=");
      if (index === -1) {
        continue;
      }

      const key = trimmed.slice(0, index).trim();
      let value = trimmed.slice(index + 1).trim();

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

function consumeMessages() {
  while (true) {
    const newlineIndex = buffer.indexOf("\n");
    if (newlineIndex === -1) {
      return;
    }

    const line = buffer.slice(0, newlineIndex).toString("utf8").trim();
    buffer = buffer.slice(newlineIndex + 1);

    if (!line) {
      continue;
    }

    handleMessage(line).catch((error) => {
      const message = error instanceof Error ? error.message : "Unknown error";
      writeError(null, -32603, message);
    });
  }
}

async function handleMessage(payload) {
  const message = JSON.parse(payload);

  if (!message.method) {
    return;
  }

  if (message.method === "notifications/initialized") {
    return;
  }

  if (message.method === "initialize") {
    negotiatedProtocolVersion =
      message.params?.protocolVersion || negotiatedProtocolVersion;
    writeResponse(message.id, {
      protocolVersion: negotiatedProtocolVersion,
      capabilities: {
        tools: {},
      },
      serverInfo,
    });
    return;
  }

  if (message.method === "tools/list") {
    writeResponse(message.id, {
      tools: [
        {
          name: "list_current_orders",
          description:
            "List current Shopify orders filtered by search, fulfillment status, financial status, tag, or limit.",
          inputSchema: {
            type: "object",
            properties: {
              search: { type: "string" },
              fulfillmentStatus: { type: "string" },
              financialStatus: { type: "string" },
              tag: { type: "string" },
              limit: { type: "number" },
            },
          },
        },
        {
          name: "get_order_detail",
          description:
            "Fetch the full ops dashboard detail for a specific order by legacy ID or Shopify GID.",
          inputSchema: {
            type: "object",
            properties: {
              orderId: { type: "string" },
            },
            required: ["orderId"],
          },
        },
        {
          name: "get_customer_detail",
          description:
            "Fetch customer detail and recent order history by legacy ID or Shopify GID.",
          inputSchema: {
            type: "object",
            properties: {
              customerId: { type: "string" },
            },
            required: ["customerId"],
          },
        },
        {
          name: "update_owner_tags",
          description:
            "Add or remove Shopify tags on an order or customer without changing native order statuses.",
          inputSchema: {
            type: "object",
            properties: {
              ownerType: { type: "string", enum: ["order", "customer"] },
              ownerId: { type: "string" },
              addTags: {
                oneOf: [
                  { type: "array", items: { type: "string" } },
                  { type: "string" },
                ],
              },
              removeTags: {
                oneOf: [
                  { type: "array", items: { type: "string" } },
                  { type: "string" },
                ],
              },
            },
            required: ["ownerType", "ownerId"],
          },
        },
        {
          name: "set_ops_note",
          description:
            "Create, update, or clear the internal ops note metafield on an order or customer.",
          inputSchema: {
            type: "object",
            properties: {
              ownerType: { type: "string", enum: ["order", "customer"] },
              ownerId: { type: "string" },
              note: { type: "string" },
            },
            required: ["ownerType", "ownerId", "note"],
          },
        },
      ],
    });
    return;
  }

  if (message.method === "tools/call") {
    const { name, arguments: args = {} } = message.params || {};
    const result = await callTool(name, args);
    writeResponse(message.id, {
      content: [
        {
          type: "text",
          text: JSON.stringify(result, null, 2),
        },
      ],
      structuredContent: result,
    });
    return;
  }

  writeError(message.id, -32601, `Method not found: ${message.method}`);
}

async function callTool(name, args) {
  switch (name) {
    case "list_current_orders":
      return await listCurrentOrders(config, args);
    case "get_order_detail":
      assertRequired(args.orderId, "orderId");
      return await getOrderDetail(config, args.orderId);
    case "get_customer_detail":
      assertRequired(args.customerId, "customerId");
      return await getCustomerDetail(config, args.customerId);
    case "update_owner_tags":
      assertOwner(args);
      return await updateOwnerTags(config, {
        ownerType: args.ownerType,
        ownerId: args.ownerId,
        addTags: normalizeTagList(args.addTags),
        removeTags: normalizeTagList(args.removeTags),
      });
    case "set_ops_note":
      assertOwner(args);
      return await setOpsNote(config, {
        ownerType: args.ownerType,
        ownerId: args.ownerId,
        note: String(args.note || ""),
      });
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

function assertRequired(value, field) {
  if (!value) {
    throw new Error(`${field} is required.`);
  }
}

function assertOwner(args) {
  assertRequired(args.ownerId, "ownerId");
  if (!["order", "customer"].includes(String(args.ownerType || ""))) {
    throw new Error("ownerType must be 'order' or 'customer'.");
  }
}

function writeResponse(id, result) {
  writeMessage({
    jsonrpc: "2.0",
    id,
    result,
  });
}

function writeError(id, code, message) {
  writeMessage({
    jsonrpc: "2.0",
    id,
    error: {
      code,
      message,
    },
  });
}

function writeMessage(message) {
  process.stdout.write(`${JSON.stringify(message)}\n`);
}
