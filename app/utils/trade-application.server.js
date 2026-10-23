// Admin API queries: deliberately not tagged `#graphql` (codegen validates that tag against the Storefront schema).
const ADMIN_API_VERSION = "2026-01";
export const TRADE_TAG = "trade-applicant";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const FIELD_LIMITS = {
  firstName: 80,
  lastName: 80,
  email: 254,
  phone: 40,
  business: 160,
  website: 200,
  role: 60,
  details: 2000,
};

function clean(value, max) {
  // Drop control characters (keeping tab/newline) by char code.
  return Array.from(String(value ?? ""))
    .filter((ch) => {
      const code = ch.charCodeAt(0);
      return code >= 32 || code === 9 || code === 10;
    })
    .join("")
    .trim()
    .slice(0, max);
}

/** Normalise and validate raw form values. Returns `{ values }` or `{ error }`. */
export function parseTradeApplication(formData) {
  const values = {};
  for (const [key, max] of Object.entries(FIELD_LIMITS)) {
    values[key] = clean(formData.get(key), max);
  }

  if (!values.firstName || !values.lastName) {
    return { error: "Please enter your first and last name." };
  }
  if (!EMAIL_PATTERN.test(values.email)) {
    return { error: "Please enter a valid email address." };
  }
  if (!values.business) {
    return { error: "Please enter your studio or business name." };
  }
  values.email = values.email.toLowerCase();
  return { values };
}

export function buildApplicationNote(values, date = new Date()) {
  const lines = [
    `Trade application — ${date.toISOString().slice(0, 10)}`,
    `Business: ${values.business}`,
    values.role && `Role: ${values.role}`,
    values.website && `Website: ${values.website}`,
    values.phone && `Phone: ${values.phone}`,
    values.details && `Project details: ${values.details}`,
  ];
  return lines.filter(Boolean).join("\n");
}

function getConfig(env) {
  // Deliberately no fallback to SHOPIFY_ADMIN_API_TOKEN: the public form must
  // only ever run with the narrowly scoped ops token.
  const adminToken = env.OPS_ADMIN_API_TOKEN;
  const storeDomain = env.PUBLIC_STORE_DOMAIN;
  if (!adminToken || !storeDomain) {
    throw new Error("Trade applications are not configured.");
  }
  return { adminToken, storeDomain };
}

async function adminGraphql(env, query, variables, fetchImpl = fetch) {
  const { adminToken, storeDomain } = getConfig(env);
  const response = await fetchImpl(
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
    throw new Error(payload.errors.map((e) => e.message).join("; "));
  }
  return payload.data;
}

const FIND_CUSTOMER = `
  query TradeFindCustomer($query: String!) {
    customers(first: 1, query: $query) {
      nodes { id note tags }
    }
  }
`;

const CREATE_CUSTOMER = `
  mutation TradeCreateCustomer($input: CustomerInput!) {
    customerCreate(input: $input) {
      customer { id }
      userErrors { field message }
    }
  }
`;

const UPDATE_CUSTOMER = `
  mutation TradeUpdateCustomer($input: CustomerInput!) {
    customerUpdate(input: $input) {
      customer { id }
      userErrors { field message }
    }
  }
`;

const TAGS_ADD = `
  mutation TradeTagsAdd($id: ID!, $tags: [String!]!) {
    tagsAdd(id: $id, tags: $tags) {
      node { id }
      userErrors { field message }
    }
  }
`;

function assertNoUserErrors(errors) {
  if (errors?.length) {
    throw new Error(errors.map((e) => e.message).join("; "));
  }
}

/**
 * Tag the applicant `trade-applicant`, creating the customer if needed and
 * appending the application to the note of an existing one.
 */
export async function submitTradeApplication(env, values, fetchImpl = fetch) {
  const note = buildApplicationNote(values);
  const emailQuery = `email:"${values.email.replace(/["\\]/g, "")}"`;
  const found = await adminGraphql(
    env,
    FIND_CUSTOMER,
    { query: emailQuery },
    fetchImpl,
  );
  const existing = found.customers?.nodes?.[0];

  if (existing) {
    const merged = [existing.note, note].filter(Boolean).join("\n\n");
    const updated = await adminGraphql(
      env,
      UPDATE_CUSTOMER,
      { input: { id: existing.id, note: merged } },
      fetchImpl,
    );
    assertNoUserErrors(updated.customerUpdate?.userErrors);
    const tagged = await adminGraphql(
      env,
      TAGS_ADD,
      { id: existing.id, tags: [TRADE_TAG] },
      fetchImpl,
    );
    assertNoUserErrors(tagged.tagsAdd?.userErrors);
    return { created: false, customerId: existing.id };
  }

  const created = await adminGraphql(
    env,
    CREATE_CUSTOMER,
    {
      input: {
        email: values.email,
        firstName: values.firstName,
        lastName: values.lastName,
        phone: /^\+[1-9]\d{6,14}$/.test(values.phone.replace(/[\s().-]/g, ""))
          ? values.phone.replace(/[\s().-]/g, "")
          : undefined,
        tags: [TRADE_TAG],
        note,
      },
    },
    fetchImpl,
  );
  assertNoUserErrors(created.customerCreate?.userErrors);
  return { created: true, customerId: created.customerCreate.customer.id };
}
