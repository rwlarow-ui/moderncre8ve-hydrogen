/**
 * Shopify access for production POs (ADR-0001). Shopify is the system of
 * record: one `production_po` metaobject per order plus order metafields
 * `moderncre8ve.po | .logistics | .logistics_status`. All rules live in
 * ./production-po.js; this file only moves data.
 *
 * Needs write access to metaobject entries and order metafields on the Admin
 * token, and the definitions from scripts/create-po-definitions.mjs.
 */

import {
  applySpecEdits,
  buildLineSpecs,
  buildSnapshot,
  checkTransition,
  initialPoState,
  isEditableState,
  PO_TYPE,
  parsePoFields,
  resolveLogistics,
  stateAfterLogisticsRefresh,
} from "./production-po.js";

const ADMIN_API_VERSION = "2026-01";
export const PO_NAMESPACE = "moderncre8ve";

const PO_FIELDS = `
  id
  handle
  updatedAt
  fields {
    key
    value
  }
`;

const LIST_POS_QUERY = `
  query OpsProductionPos($type: String!, $first: Int!) {
    metaobjects(type: $type, first: $first, sortKey: "updated_at", reverse: true) {
      nodes {
        ${PO_FIELDS}
      }
    }
  }
`;

const GET_PO_QUERY = `
  query OpsProductionPo($id: ID!) {
    metaobject(id: $id) {
      ${PO_FIELDS}
    }
  }
`;

const GET_PO_BY_HANDLE_QUERY = `
  query OpsProductionPoByHandle($handle: MetaobjectHandleInput!) {
    metaobjectByHandle(handle: $handle) {
      ${PO_FIELDS}
    }
  }
`;

const ORDER_FOR_PO_QUERY = `
  query OpsOrderForPo($id: ID!) {
    order(id: $id) {
      id
      legacyResourceId
      name
      processedAt
      cancelledAt
      email
      customer {
        displayName
        email
        phone
      }
      customAttributes {
        key
        value
      }
      logisticsMetafield: metafield(namespace: "${PO_NAMESPACE}", key: "logistics") {
        value
      }
      lineItems(first: 50) {
        nodes {
          id
          name
          quantity
          product {
            title
            metafield(namespace: "custom", key: "finish") {
              value
            }
          }
          variant {
            selectedOptions {
              name
              value
            }
          }
        }
      }
    }
  }
`;

const METAOBJECT_CREATE_MUTATION = `
  mutation OpsPoCreate($metaobject: MetaobjectCreateInput!) {
    metaobjectCreate(metaobject: $metaobject) {
      metaobject {
        ${PO_FIELDS}
      }
      userErrors {
        field
        message
        code
      }
    }
  }
`;

const METAOBJECT_UPDATE_MUTATION = `
  mutation OpsPoUpdate($id: ID!, $metaobject: MetaobjectUpdateInput!) {
    metaobjectUpdate(id: $id, metaobject: $metaobject) {
      metaobject {
        ${PO_FIELDS}
      }
      userErrors {
        field
        message
        code
      }
    }
  }
`;

const METAFIELDS_SET_MUTATION = `
  mutation OpsPoMetafieldsSet($metafields: [MetafieldsSetInput!]!) {
    metafieldsSet(metafields: $metafields) {
      metafields {
        key
      }
      userErrors {
        field
        message
        code
      }
    }
  }
`;

function getConfig(config) {
  const storeDomain = config.storeDomain || config.PUBLIC_STORE_DOMAIN;
  const adminToken = config.adminApiToken || config.SHOPIFY_ADMIN_API_TOKEN;
  if (!storeDomain) throw new Error("PUBLIC_STORE_DOMAIN is not configured.");
  if (!adminToken) {
    throw new Error("SHOPIFY_ADMIN_API_TOKEN is not configured.");
  }
  return { storeDomain, adminToken };
}

async function adminGraphql(config, query, variables = {}) {
  const { adminToken, storeDomain } = getConfig(config);
  const response = await fetch(
    `https://${storeDomain}/admin/api/${ADMIN_API_VERSION}/graphql.json`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": adminToken,
      },
      body: JSON.stringify({ query, variables }),
    },
  );
  if (!response.ok) {
    throw new Error(`Shopify Admin API request failed (${response.status}).`);
  }
  const payload = await response.json();
  if (payload.errors?.length) {
    throw new Error(payload.errors.map((error) => error.message).join("; "));
  }
  return payload.data;
}

function throwUserErrors(label, userErrors) {
  if (userErrors?.length) {
    throw new Error(
      `${label}: ${userErrors.map((error) => error.message).join("; ")}`,
    );
  }
}

/** `gid://shopify/Metaobject/123` <-> `123` for URLs. */
export function poIdToParam(gid) {
  return String(gid).split("/").pop();
}

export function poParamToId(param) {
  const digits = String(param).replace(/[^\d]/g, "");
  if (!digits) throw new Error("Invalid PO id.");
  return `gid://shopify/Metaobject/${digits}`;
}

function orderGid(orderId) {
  if (String(orderId).startsWith("gid://")) return orderId;
  const digits = String(orderId).replace(/[^\d]/g, "");
  if (!digits) throw new Error("Invalid order id.");
  return `gid://shopify/Order/${digits}`;
}

function mapPo(node) {
  if (!node) return null;
  return {
    id: node.id,
    param: poIdToParam(node.id),
    handle: node.handle,
    updatedAt: node.updatedAt,
    ...parsePoFields(node.fields),
  };
}

function fieldInputs(values) {
  return Object.entries(values).map(([key, value]) => ({
    key,
    value: typeof value === "string" ? value : String(value),
  }));
}

export async function listProductionPos(config, { limit = 100 } = {}) {
  const data = await adminGraphql(config, LIST_POS_QUERY, {
    type: PO_TYPE,
    first: Math.min(Math.max(Number(limit) || 100, 1), 250),
  });
  return data.metaobjects.nodes.map(mapPo);
}

export async function getProductionPo(config, param) {
  const data = await adminGraphql(config, GET_PO_QUERY, {
    id: poParamToId(param),
  });
  const po = mapPo(data.metaobject);
  if (!po || !po.orderId) throw new Error("Production PO not found.");
  return po;
}

async function getPoByOrder(config, orderLegacyId) {
  const data = await adminGraphql(config, GET_PO_BY_HANDLE_QUERY, {
    handle: { type: PO_TYPE, handle: `po-${orderLegacyId}` },
  });
  return mapPo(data.metaobjectByHandle);
}

/** Finds the PO for an order, or null. Used by the order detail page. */
export async function findProductionPoForOrder(config, orderId) {
  const digits = String(orderId).replace(/[^\d]/g, "");
  return getPoByOrder(config, digits);
}

async function fetchOrderForPo(config, orderId) {
  const data = await adminGraphql(config, ORDER_FOR_PO_QUERY, {
    id: orderGid(orderId),
  });
  if (!data.order) throw new Error("Order not found.");
  const order = data.order;
  return {
    id: order.id,
    legacyId: order.legacyResourceId,
    name: order.name,
    processedAt: order.processedAt,
    cancelledAt: order.cancelledAt,
    customerName: order.customer?.displayName || "",
    customerEmail: order.customer?.email || order.email || "",
    customerPhone: order.customer?.phone || "",
    attributes: order.customAttributes ?? [],
    logisticsMetafieldValue: order.logisticsMetafield?.value || null,
    lineItems: order.lineItems.nodes,
  };
}

async function writeOrderMetafields(config, order, logistics, poId) {
  const metafields = [
    {
      ownerId: order.id,
      namespace: PO_NAMESPACE,
      key: "logistics_status",
      type: "single_line_text_field",
      value: logistics.status,
    },
  ];
  if (logistics.value) {
    metafields.push({
      ownerId: order.id,
      namespace: PO_NAMESPACE,
      key: "logistics",
      type: "json",
      value: JSON.stringify(logistics.value),
    });
  }
  if (poId) {
    metafields.push({
      ownerId: order.id,
      namespace: PO_NAMESPACE,
      key: "po",
      type: "metaobject_reference",
      value: poId,
    });
  }
  const data = await adminGraphql(config, METAFIELDS_SET_MUTATION, {
    metafields,
  });
  throwUserErrors("metafieldsSet", data.metafieldsSet.userErrors);
}

/**
 * Creates the PO for an order, or returns the existing one. The metaobject
 * handle is derived from the order id, so a double click or a race can't
 * create two POs.
 */
export async function createDraftPoForOrder(config, orderId) {
  const order = await fetchOrderForPo(config, orderId);
  if (order.cancelledAt) {
    throw new Error("This order is cancelled; no PO was created.");
  }

  const existing = await getPoByOrder(config, order.legacyId);
  if (existing) return { po: existing, created: false };

  const logistics = resolveLogistics({
    metafieldValue: order.logisticsMetafieldValue,
    attributes: order.attributes,
  });
  const snapshot = buildSnapshot({ order, logistics });
  const data = await adminGraphql(config, METAOBJECT_CREATE_MUTATION, {
    metaobject: {
      type: PO_TYPE,
      handle: `po-${order.legacyId}`,
      fields: fieldInputs({
        order_id: order.id,
        order_name: order.name,
        state: initialPoState(logistics.status),
        revision: 1,
        line_specs: JSON.stringify(buildLineSpecs(order.lineItems)),
        logistics_snapshot: JSON.stringify(snapshot),
      }),
    },
  });
  throwUserErrors("metaobjectCreate", data.metaobjectCreate.userErrors);

  const po = mapPo(data.metaobjectCreate.metaobject);
  await writeOrderMetafields(config, order, logistics, po.id);
  return { po, created: true };
}

async function updatePoFields(config, po, values) {
  const data = await adminGraphql(config, METAOBJECT_UPDATE_MUTATION, {
    id: po.id,
    metaobject: { fields: fieldInputs(values) },
  });
  throwUserErrors("metaobjectUpdate", data.metaobjectUpdate.userErrors);
  return mapPo(data.metaobjectUpdate.metaobject);
}

/** Saves reviewer edits to size/species/leaf/finish/notes. Pre-approval only. */
export async function savePoSpecs(config, param, edits) {
  const po = await getProductionPo(config, param);
  if (!isEditableState(po.state)) {
    throw new Error(
      `A ${po.state} PO can't be edited. Revoke approval first, or cancel it.`,
    );
  }
  return updatePoFields(config, po, {
    line_specs: JSON.stringify(applySpecEdits(po.lineSpecs, edits)),
  });
}

/**
 * Re-reads the order's logistics into the PO snapshot and moves the PO
 * between awaiting_logistics and ready_for_review accordingly. Approved,
 * sent and cancelled POs are frozen and left untouched.
 */
export async function refreshPoLogistics(config, param) {
  const po = await getProductionPo(config, param);
  if (!isEditableState(po.state)) {
    throw new Error("This PO is frozen; its logistics can't be refreshed.");
  }
  const order = await fetchOrderForPo(config, po.orderId);
  const logistics = resolveLogistics({
    metafieldValue: order.logisticsMetafieldValue,
    attributes: order.attributes,
  });
  const snapshot = buildSnapshot({ order, logistics });

  const updated = await updatePoFields(config, po, {
    logistics_snapshot: JSON.stringify(snapshot),
    state: stateAfterLogisticsRefresh(po.state, logistics.status),
  });
  await writeOrderMetafields(config, order, logistics, null);
  return updated;
}

/**
 * Moves a PO to a new state. The server re-checks the state graph and the
 * approval gate against the stored PO, so a stale or forged form can't skip
 * them. Sending isn't available here: it goes through po-send.server.js.
 */
export async function transitionPo(config, param, to, { actor = "ops" } = {}) {
  if (to === "sent") {
    throw new Error(
      "Use the send action to email a PO; it can't be set by hand.",
    );
  }
  const po = await getProductionPo(config, param);
  const check = checkTransition({
    state: po.state,
    to,
    lineSpecs: po.lineSpecs,
    snapshot: po.snapshot,
  });
  if (!check.ok) throw new Error(check.reason);

  const values = { state: to };
  if (to === "approved") {
    values.approved_by = actor;
    values.approved_at = new Date().toISOString();
  }
  // Revoking approval leaves approved_by/approved_at in place (a blank
  // date_time value isn't reliably accepted); the UI only shows them while
  // the PO is approved or sent, and re-approving overwrites them.
  return updatePoFields(config, po, values);
}

/**
 * Records that a PO was emailed. Called only after the email provider has
 * accepted the message. A first send moves approved -> sent; a re-send of an
 * already-sent PO just updates the timestamp and message id.
 */
export async function markPoSent(config, param, { messageId, resend = false }) {
  if (!messageId)
    throw new Error("A message id is required to mark a PO sent.");
  const po = await getProductionPo(config, param);

  if (po.state === "sent" && resend) {
    return updatePoFields(config, po, {
      sent_at: new Date().toISOString(),
      sent_message_id: messageId,
    });
  }
  const check = checkTransition({
    state: po.state,
    to: "sent",
    lineSpecs: po.lineSpecs,
    snapshot: po.snapshot,
  });
  if (!check.ok) throw new Error(check.reason);

  return updatePoFields(config, po, {
    state: "sent",
    sent_at: new Date().toISOString(),
    sent_message_id: messageId,
  });
}
