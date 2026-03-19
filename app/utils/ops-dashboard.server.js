const ADMIN_API_VERSION = "2024-10";
export const CURRENT_ORDER_WINDOW_DAYS = 140;
export const DEFAULT_ORDER_LIMIT = 50;
export const MAX_ORDER_LIMIT = 100;
export const OPS_NOTE_NAMESPACE = "codex_ops";
export const OPS_NOTE_KEY = "internal_note";

const INACTIVE_FINANCIAL_STATUSES = new Set(["REFUNDED", "VOIDED", "EXPIRED"]);
const INACTIVE_FULFILLMENT_STATUSES = new Set(["FULFILLED", "RESTOCKED"]);

const MONEY_FRAGMENT = `
  fragment OpsMoney on MoneyV2 {
    amount
    currencyCode
  }
`;

const ORDER_ROW_FRAGMENT = `
  ${MONEY_FRAGMENT}
  fragment OpsOrderRow on Order {
    id
    legacyResourceId
    name
    createdAt
    processedAt
    cancelledAt
    closedAt
    displayFinancialStatus
    displayFulfillmentStatus
    statusPageUrl
    tags
    currentTotalPriceSet {
      shopMoney {
        ...OpsMoney
      }
    }
    metafield(namespace: "${OPS_NOTE_NAMESPACE}", key: "${OPS_NOTE_KEY}") {
      value
    }
    customer {
      id
      legacyResourceId
      displayName
      firstName
      lastName
      email
    }
  }
`;

const LIST_CURRENT_ORDERS_QUERY = `
  ${ORDER_ROW_FRAGMENT}
  query OpsCurrentOrders($first: Int!, $query: String!) {
    orders(first: $first, sortKey: PROCESSED_AT, reverse: true, query: $query) {
      nodes {
        ...OpsOrderRow
      }
    }
  }
`;

const ORDER_DETAIL_QUERY = `
  ${ORDER_ROW_FRAGMENT}
  ${MONEY_FRAGMENT}
  query OpsOrderDetail($id: ID!) {
    order(id: $id) {
      ...OpsOrderRow
      shippingAddress {
        firstName
        lastName
        company
        address1
        address2
        city
        province
        zip
        country
      }
      lineItems(first: 50) {
        nodes {
          id
          name
          quantity
          sku
          variant {
            title
            image {
              url
              altText
            }
          }
          discountedTotalSet {
            shopMoney {
              ...OpsMoney
            }
          }
          originalUnitPriceSet {
            shopMoney {
              ...OpsMoney
            }
          }
        }
      }
      customer {
        id
        legacyResourceId
        displayName
        firstName
        lastName
        email
        phone
        tags
        metafield(namespace: "${OPS_NOTE_NAMESPACE}", key: "${OPS_NOTE_KEY}") {
          value
        }
      }
    }
  }
`;

const CUSTOMER_DETAIL_QUERY = `
  ${MONEY_FRAGMENT}
  query OpsCustomerDetail($id: ID!) {
    customer(id: $id) {
      id
      legacyResourceId
      displayName
      firstName
      lastName
      email
      phone
      tags
      metafield(namespace: "${OPS_NOTE_NAMESPACE}", key: "${OPS_NOTE_KEY}") {
        value
      }
      orders(first: 10, sortKey: PROCESSED_AT, reverse: true) {
        nodes {
          id
          legacyResourceId
          name
          createdAt
          processedAt
          cancelledAt
          closedAt
          displayFinancialStatus
          displayFulfillmentStatus
          statusPageUrl
          tags
          currentTotalPriceSet {
            shopMoney {
              ...OpsMoney
            }
          }
          metafield(namespace: "${OPS_NOTE_NAMESPACE}", key: "${OPS_NOTE_KEY}") {
            value
          }
          customer {
            id
            legacyResourceId
            displayName
            firstName
            lastName
            email
          }
        }
      }
    }
  }
`;

const TAGS_ADD_MUTATION = `
  mutation OpsTagsAdd($id: ID!, $tags: [String!]!) {
    tagsAdd(id: $id, tags: $tags) {
      node {
        id
      }
      userErrors {
        field
        message
      }
    }
  }
`;

const TAGS_REMOVE_MUTATION = `
  mutation OpsTagsRemove($id: ID!, $tags: [String!]!) {
    tagsRemove(id: $id, tags: $tags) {
      node {
        id
      }
      userErrors {
        field
        message
      }
    }
  }
`;

const SET_NOTE_MUTATION = `
  mutation OpsSetNote($metafields: [MetafieldsSetInput!]!) {
    metafieldsSet(metafields: $metafields) {
      metafields {
        key
        namespace
        value
      }
      userErrors {
        field
        message
      }
    }
  }
`;

const DELETE_NOTE_MUTATION = `
  mutation OpsDeleteNote($metafields: [MetafieldIdentifierInput!]!) {
    metafieldsDelete(metafields: $metafields) {
      deletedMetafields {
        key
        namespace
        ownerId
      }
      userErrors {
        field
        message
      }
    }
  }
`;

export function normalizeTagList(input) {
  const values = Array.isArray(input)
    ? input
    : String(input || "")
        .split(",")
        .map((value) => value.trim());

  return [...new Set(values.filter(Boolean))];
}

export function diffTags(currentTags, nextTags) {
  const current = normalizeTagList(currentTags);
  const next = normalizeTagList(nextTags);
  const currentSet = new Set(current);
  const nextSet = new Set(next);

  return {
    addTags: next.filter((tag) => !currentSet.has(tag)),
    removeTags: current.filter((tag) => !nextSet.has(tag)),
  };
}

export function normalizeOpsFilters(filters = {}) {
  const normalized = {
    search: String(filters.search || "").trim(),
    fulfillmentStatus: String(filters.fulfillmentStatus || "").trim(),
    financialStatus: String(filters.financialStatus || "").trim(),
    tag: String(filters.tag || "").trim(),
    limit: Number(filters.limit || DEFAULT_ORDER_LIMIT),
  };

  if (!Number.isFinite(normalized.limit) || normalized.limit < 1) {
    normalized.limit = DEFAULT_ORDER_LIMIT;
  }

  normalized.limit = Math.min(MAX_ORDER_LIMIT, normalized.limit);

  return normalized;
}

export function buildOpsNoteMutation(ownerId, note) {
  const value = String(note || "").trim();

  if (value) {
    return {
      mode: "set",
      metafields: [
        {
          key: OPS_NOTE_KEY,
          namespace: OPS_NOTE_NAMESPACE,
          ownerId,
          type: "multi_line_text_field",
          value,
        },
      ],
    };
  }

  return {
    mode: "delete",
    metafields: [
      {
        key: OPS_NOTE_KEY,
        namespace: OPS_NOTE_NAMESPACE,
        ownerId,
      },
    ],
  };
}

export function buildAdminBaseUrl(storeDomain) {
  const shopSlug = String(storeDomain || "").split(".")[0];
  return `https://admin.shopify.com/store/${shopSlug}`;
}

export function buildOrderAdminUrl(storeDomain, legacyId) {
  return `${buildAdminBaseUrl(storeDomain)}/orders/${legacyId}`;
}

export function buildCustomerAdminUrl(storeDomain, legacyId) {
  return `${buildAdminBaseUrl(storeDomain)}/customers/${legacyId}`;
}

export function isCurrentOrder(order) {
  const fulfillmentStatus = String(order.displayFulfillmentStatus || "").toUpperCase();
  const financialStatus = String(order.displayFinancialStatus || "").toUpperCase();

  return (
    !INACTIVE_FULFILLMENT_STATUSES.has(fulfillmentStatus) &&
    !INACTIVE_FINANCIAL_STATUSES.has(financialStatus)
  );
}

function buildOrderWindowQuery() {
  const startDate = new Date();
  startDate.setUTCDate(startDate.getUTCDate() - CURRENT_ORDER_WINDOW_DAYS);
  return `processed_at:>=${startDate.toISOString().slice(0, 10)}`;
}

function getConfig(config) {
  const storeDomain = config.storeDomain || config.PUBLIC_STORE_DOMAIN;
  const adminToken = config.adminApiToken || config.SHOPIFY_ADMIN_API_TOKEN;

  if (!storeDomain) {
    throw new Error("PUBLIC_STORE_DOMAIN is not configured.");
  }

  if (!adminToken) {
    throw new Error("SHOPIFY_ADMIN_API_TOKEN is not configured.");
  }

  return {
    storeDomain,
    adminToken,
  };
}

function getOwnerId(ownerType, ownerId) {
  if (String(ownerId).startsWith("gid://")) {
    return ownerId;
  }

  const legacyId = String(ownerId).replace(/[^\d]/g, "");
  const resource = ownerType === "customer" ? "Customer" : "Order";
  return `gid://shopify/${resource}/${legacyId}`;
}

async function adminGraphql(config, query, variables = {}) {
  const { adminToken, storeDomain } = getConfig(config);
  const endpoint = `https://${storeDomain}/admin/api/${ADMIN_API_VERSION}/graphql.json`;
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Access-Token": adminToken,
    },
    body: JSON.stringify({ query, variables }),
  });

  if (!response.ok) {
    throw new Error(`Shopify Admin API request failed (${response.status}).`);
  }

  const payload = await response.json();

  if (payload.errors?.length) {
    throw new Error(payload.errors.map((error) => error.message).join("; "));
  }

  return payload.data;
}

function normalizeMoney(money) {
  if (!money) {
    return null;
  }

  return {
    amount: String(money.amount),
    currencyCode: String(money.currencyCode),
  };
}

function getCustomerName(customer) {
  if (!customer) {
    return "Guest checkout";
  }

  return (
    customer.displayName ||
    [customer.firstName, customer.lastName].filter(Boolean).join(" ") ||
    customer.email ||
    "Guest checkout"
  );
}

function toAgeInDays(dateString) {
  const now = Date.now();
  const date = new Date(dateString).getTime();
  return Math.max(0, Math.floor((now - date) / (1000 * 60 * 60 * 24)));
}

function mapCustomerSummary(customer, storeDomain) {
  if (!customer) {
    return null;
  }

  return {
    id: customer.id,
    legacyId: String(customer.legacyResourceId),
    name: getCustomerName(customer),
    email: customer.email || "",
    phone: customer.phone || null,
    tags: normalizeTagList(customer.tags),
    adminUrl: buildCustomerAdminUrl(storeDomain, customer.legacyResourceId),
    opsNote: customer.metafield?.value || null,
  };
}

function mapOrderRow(order, storeDomain) {
  return {
    id: order.id,
    legacyId: String(order.legacyResourceId),
    name: order.name,
    processedAt: order.processedAt,
    ageInDays: toAgeInDays(order.processedAt),
    displayFulfillmentStatus: order.displayFulfillmentStatus,
    displayFinancialStatus: order.displayFinancialStatus,
    totalPrice: normalizeMoney(order.currentTotalPriceSet?.shopMoney),
    tags: normalizeTagList(order.tags),
    adminUrl: buildOrderAdminUrl(storeDomain, order.legacyResourceId),
    statusPageUrl: order.statusPageUrl || null,
    opsNote: order.metafield?.value || null,
    customer: order.customer
      ? {
          id: order.customer.id,
          legacyId: String(order.customer.legacyResourceId),
          name: getCustomerName(order.customer),
          email: order.customer.email || "",
          adminUrl: buildCustomerAdminUrl(
            storeDomain,
            order.customer.legacyResourceId,
          ),
        }
      : null,
  };
}

function matchesFilters(order, filters) {
  const search = filters.search.toLowerCase();

  if (filters.fulfillmentStatus) {
    if (order.displayFulfillmentStatus !== filters.fulfillmentStatus) {
      return false;
    }
  }

  if (filters.financialStatus) {
    if (order.displayFinancialStatus !== filters.financialStatus) {
      return false;
    }
  }

  if (filters.tag) {
    if (!order.tags.includes(filters.tag)) {
      return false;
    }
  }

  if (!search) {
    return true;
  }

  const haystack = [
    order.name,
    order.legacyId,
    order.customer?.name,
    order.customer?.email,
    ...order.tags,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return haystack.includes(search);
}

export async function listCurrentOrders(config, filters = {}) {
  const normalizedFilters = normalizeOpsFilters(filters);
  const data = await adminGraphql(config, LIST_CURRENT_ORDERS_QUERY, {
    first: MAX_ORDER_LIMIT,
    query: buildOrderWindowQuery(),
  });
  const storeDomain = getConfig(config).storeDomain;
  const orders = data.orders.nodes
    .map((order) => mapOrderRow(order, storeDomain))
    .filter(isCurrentOrder)
    .filter((order) => matchesFilters(order, normalizedFilters))
    .slice(0, normalizedFilters.limit);

  return {
    filters: normalizedFilters,
    orders,
    total: orders.length,
  };
}

export async function getOrderDetail(config, orderId) {
  const data = await adminGraphql(config, ORDER_DETAIL_QUERY, {
    id: getOwnerId("order", orderId),
  });

  if (!data.order) {
    throw new Error("Order not found.");
  }

  const storeDomain = getConfig(config).storeDomain;
  const order = mapOrderRow(data.order, storeDomain);

  return {
    ...order,
    createdAt: data.order.createdAt,
    cancelledAt: data.order.cancelledAt || null,
    closedAt: data.order.closedAt || null,
    shippingAddress: [
      [data.order.shippingAddress?.firstName, data.order.shippingAddress?.lastName]
        .filter(Boolean)
        .join(" "),
      data.order.shippingAddress?.company,
      data.order.shippingAddress?.address1,
      data.order.shippingAddress?.address2,
      [
        data.order.shippingAddress?.city,
        data.order.shippingAddress?.province,
        data.order.shippingAddress?.zip,
      ]
        .filter(Boolean)
        .join(", "),
      data.order.shippingAddress?.country,
    ].filter(Boolean),
    customer: mapCustomerSummary(data.order.customer, storeDomain),
    lineItems: data.order.lineItems.nodes.map((lineItem) => ({
      id: lineItem.id,
      name: lineItem.name,
      quantity: lineItem.quantity,
      sku: lineItem.sku || null,
      variantTitle: lineItem.variant?.title || null,
      imageUrl: lineItem.variant?.image?.url || null,
      imageAlt: lineItem.variant?.image?.altText || null,
      lineTotal: normalizeMoney(lineItem.discountedTotalSet?.shopMoney),
      unitPrice: normalizeMoney(lineItem.originalUnitPriceSet?.shopMoney),
    })),
  };
}

export async function getCustomerDetail(config, customerId) {
  const data = await adminGraphql(config, CUSTOMER_DETAIL_QUERY, {
    id: getOwnerId("customer", customerId),
  });

  if (!data.customer) {
    throw new Error("Customer not found.");
  }

  const storeDomain = getConfig(config).storeDomain;

  return {
    ...mapCustomerSummary(data.customer, storeDomain),
    recentOrders: data.customer.orders.nodes.map((order) =>
      mapOrderRow(order, storeDomain),
    ),
  };
}

export async function updateOwnerTags(config, options) {
  const ownerId = getOwnerId(options.ownerType, options.ownerId);
  const addTags = normalizeTagList(options.addTags);
  const removeTags = normalizeTagList(options.removeTags);
  const userErrors = [];

  if (addTags.length) {
    const data = await adminGraphql(config, TAGS_ADD_MUTATION, {
      id: ownerId,
      tags: addTags,
    });
    userErrors.push(...(data.tagsAdd.userErrors || []));
  }

  if (removeTags.length) {
    const data = await adminGraphql(config, TAGS_REMOVE_MUTATION, {
      id: ownerId,
      tags: removeTags,
    });
    userErrors.push(...(data.tagsRemove.userErrors || []));
  }

  return {
    ok: userErrors.length === 0,
    message:
      addTags.length || removeTags.length
        ? "Tags updated."
        : "No tag changes were needed.",
    ownerType: options.ownerType,
    ownerId,
    addTags,
    removeTags,
    userErrors,
  };
}

export async function setOpsNote(config, options) {
  const ownerId = getOwnerId(options.ownerType, options.ownerId);
  const note = String(options.note || "").trim();
  const mutation = buildOpsNoteMutation(ownerId, note);

  if (mutation.mode === "set") {
    const data = await adminGraphql(config, SET_NOTE_MUTATION, {
      metafields: mutation.metafields,
    });
    return {
      ok: data.metafieldsSet.userErrors.length === 0,
      message: "Ops note saved.",
      ownerType: options.ownerType,
      ownerId,
      note,
      userErrors: data.metafieldsSet.userErrors,
    };
  }

  const data = await adminGraphql(config, DELETE_NOTE_MUTATION, {
    metafields: mutation.metafields,
  });

  return {
    ok: data.metafieldsDelete.userErrors.length === 0,
    message: "Ops note cleared.",
    ownerType: options.ownerType,
    ownerId,
    note: "",
    userErrors: data.metafieldsDelete.userErrors,
  };
}

