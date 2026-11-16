/**
 * Sales pipeline storage and Shopify adapter. Rules are in ops-pipeline.js;
 * this file only reads/writes the private Ops database through server-only
 * RPCs, and finds, creates or reads Shopify customers with the ops token.
 */
import { adminGraphql, buildCustomerAdminUrl } from "./ops-dashboard.server.js";
import {
  applyDealEdit,
  applyDealEvent,
  applyStageChange,
  dealForStorage,
  todayIso,
  validateDealTask,
  validateDealTaskUpdate,
  validateNewDeal,
} from "./ops-pipeline.js";
import { hasOpsStore, opsRpc } from "./ops-store.server.js";

export const PIPELINE_SETUP_SQL = "scripts/sql/ops-hub-pipeline.sql";
/** Tag on Shopify customers the pipeline creates. Existing customers are never retagged. */
export const PIPELINE_CUSTOMER_TAG = "pipeline-lead";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const isDealId = (value) => UUID_RE.test(String(value ?? ""));

/**
 * Explains why the pipeline store can't be used, or null when it can.
 * PostgREST answers 404 for an RPC that doesn't exist yet.
 */
export function pipelineUnavailableReason(error) {
  const message = error instanceof Error ? error.message : String(error);
  if (/\(404\)/.test(message)) {
    return `The pipeline tables haven't been created yet. Run ${PIPELINE_SETUP_SQL} in the Ops Supabase project.`;
  }
  return message;
}

function requireStore(env) {
  if (!hasOpsStore(env)) {
    throw new Error("The Ops database is not connected yet.");
  }
}

export async function loadPipelineOverview(env, user) {
  requireStore(env);
  const overview = await opsRpc(env, "ops_pipeline_overview", {
    p_email: user.email,
  });
  return {
    deals: overview?.deals ?? [],
    tasks: overview?.tasks ?? [],
    last: overview?.last ?? [],
  };
}

export async function loadDealDetail(env, user, dealId) {
  requireStore(env);
  const detail = await opsRpc(env, "ops_pipeline_detail", {
    p_email: user.email,
    p_deal_id: dealId,
  });
  return {
    deal: detail?.deal ?? null,
    events: detail?.events ?? [],
    tasks: detail?.tasks ?? [],
  };
}

/* --------------------------------------------------------------- Shopify */

const CUSTOMERS_BY_ID = `
  query OpsPipelineCustomers($ids: [ID!]!) {
    nodes(ids: $ids) {
      ... on Customer { id legacyResourceId displayName email phone }
    }
  }
`;

const FIND_CUSTOMER = `
  query OpsPipelineFindCustomer($query: String!) {
    customers(first: 1, query: $query) {
      nodes { id legacyResourceId email }
    }
  }
`;

const CREATE_CUSTOMER = `
  mutation OpsPipelineCreateCustomer($input: CustomerInput!) {
    customerCreate(input: $input) {
      customer { id legacyResourceId }
      userErrors { field message }
    }
  }
`;

/**
 * Read customers live from Shopify, keyed by legacy ID. Missing customers
 * are simply absent from the map; callers show them as not found.
 */
/**
 * @typedef {{ legacyId: string, name: string, email: string, phone: string | null, adminUrl: string }} PipelineCustomer
 * @param {any} env
 * @param {string[]} legacyIds
 * @returns {Promise<Map<string, PipelineCustomer>>}
 */
export async function readCustomers(env, legacyIds) {
  const ids = [...new Set(legacyIds.filter(Boolean))];
  /** @type {Map<string, PipelineCustomer>} */
  const customers = new Map();
  // `nodes` accepts up to 250 IDs per call.
  for (let i = 0; i < ids.length; i += 250) {
    const data = await adminGraphql(env, CUSTOMERS_BY_ID, {
      ids: ids.slice(i, i + 250).map((id) => `gid://shopify/Customer/${id}`),
    });
    for (const node of data.nodes ?? []) {
      if (node?.legacyResourceId) {
        const legacyId = String(node.legacyResourceId);
        customers.set(legacyId, {
          legacyId,
          name: node.displayName || node.email || "Unnamed customer",
          email: node.email || "",
          phone: node.phone || null,
          adminUrl: buildCustomerAdminUrl(env.PUBLIC_STORE_DOMAIN, legacyId),
        });
      }
    }
  }
  return customers;
}

function e164(phone) {
  const compact = String(phone ?? "").replace(/[\s().-]/g, "");
  if (/^\+[1-9]\d{6,14}$/.test(compact)) {
    return compact;
  }
  // US numbers typed without a country code.
  if (/^\d{10}$/.test(compact)) {
    return `+1${compact}`;
  }
  return undefined;
}

/**
 * The Shopify customer for an email: the existing one, untouched, or a new
 * one tagged `pipeline-lead` with no marketing consent.
 */
export async function findOrCreateCustomer(env, customer, { actor, today }) {
  const query = `email:"${customer.email.replace(/["\\]/g, "")}"`;
  const found = await adminGraphql(env, FIND_CUSTOMER, { query });
  const existing = found.customers?.nodes?.find(
    (node) => String(node.email ?? "").toLowerCase() === customer.email,
  );
  if (existing) {
    return { created: false, legacyId: String(existing.legacyResourceId) };
  }
  const created = await adminGraphql(env, CREATE_CUSTOMER, {
    input: {
      email: customer.email,
      firstName: customer.firstName || undefined,
      lastName: customer.lastName || undefined,
      phone: e164(customer.phone),
      tags: [PIPELINE_CUSTOMER_TAG],
      note: `Added from the Ops pipeline by ${actor} on ${today}.`,
    },
  });
  const errors = created.customerCreate?.userErrors;
  if (errors?.length) {
    throw new Error(errors.map((e) => e.message).join("; "));
  }
  return {
    created: true,
    legacyId: String(created.customerCreate.customer.legacyResourceId),
  };
}

/* --------------------------------------------------------------- actions */

function save(env, user, dealId, expectedUpdatedAt, change) {
  return opsRpc(env, "ops_pipeline_save", {
    p_email: user.email,
    p_deal_id: dealId,
    p_expected_updated_at: expectedUpdatedAt,
    p_deal: dealForStorage(change.deal),
    p_events: change.events,
    p_open_tasks: change.openTasks,
    p_close_task_kinds: change.closeTaskKinds,
  });
}

const formText = (form) => (name) => String(form.get(name) ?? "");

/**
 * Create a deal from the "Add deal" form. Returns the new deal's ID.
 *
 * @param {any} env
 * @param {{ email: string }} user
 * @param {FormData} form
 */
export async function createDeal(env, user, form, { now = new Date() } = {}) {
  requireStore(env);
  const text = formText(form);
  const today = todayIso(now);
  const change = validateNewDeal(
    {
      email: text("email"),
      firstName: text("firstName"),
      lastName: text("lastName"),
      phone: text("phone"),
      title: text("title"),
      dealType: text("dealType"),
      source: text("source"),
      ownerEmail: text("ownerEmail"),
      estimatedValue: text("estimatedValue"),
      nextStep: text("nextStep"),
      nextStepDue: text("nextStepDue"),
      inquiry: text("inquiry"),
      inquiryDate: text("inquiryDate"),
      evidenceUrl: text("evidenceUrl"),
    },
    { today },
  );
  const customer = await findOrCreateCustomer(env, change.customer, {
    actor: user.email,
    today,
  });
  const saved = await save(env, user, null, null, {
    ...change,
    deal: { ...change.deal, customer_id: customer.legacyId },
  });
  return { dealId: saved.id, customerCreated: customer.created };
}

/**
 * Apply one action from a deal's page.
 *
 * @param {any} env
 * @param {{ email: string }} user
 * @param {string} dealId
 * @param {FormData} form
 */
export async function dealAction(
  env,
  user,
  dealId,
  form,
  { now = new Date() } = {},
) {
  const text = formText(form);
  const today = todayIso(now);
  const intent = text("intent");

  if (intent === "task") {
    const update = validateDealTaskUpdate({
      status: text("status"),
      dueOn: text("dueOn"),
      ownerEmail: text("ownerEmail"),
      note: text("note"),
    });
    await opsRpc(env, "ops_pipeline_update_task", {
      p_email: user.email,
      p_id: text("taskId"),
      p_status: update.status,
      p_due_on: update.dueOn,
      p_owner_email: update.ownerEmail,
      p_note: update.note,
      p_expected_updated_at: text("taskUpdatedAt") || null,
    });
    return "Task updated.";
  }

  const { deal: current } = await loadDealDetail(env, user, dealId);
  if (!current) {
    throw new Response("Deal not found.", { status: 404 });
  }
  // The version the user was looking at, so concurrent edits conflict.
  const seen = text("updatedAt") || null;

  switch (intent) {
    case "edit": {
      const change = applyDealEdit(current, {
        title: text("title"),
        dealType: text("dealType"),
        ownerEmail: text("ownerEmail"),
        source: text("source"),
        estimatedValue: text("estimatedValue"),
        nextStep: text("nextStep"),
        nextStepDue: text("nextStepDue"),
      });
      await save(env, user, dealId, seen, change);
      return "Saved.";
    }
    case "stage": {
      const change = applyStageChange(
        current,
        {
          stage: text("stage"),
          date: text("date"),
          note: text("note"),
          lostReason: text("lostReason"),
        },
        { today },
      );
      await save(env, user, dealId, seen, change);
      return "Stage updated.";
    }
    case "event": {
      const change = applyDealEvent(
        current,
        {
          kind: text("kind"),
          date: text("date"),
          summary: text("summary"),
          evidenceUrl: text("evidenceUrl"),
        },
        { today },
      );
      await save(env, user, dealId, seen, change);
      return "Recorded.";
    }
    case "new-task": {
      const task = validateDealTask({
        kind: text("kind"),
        title: text("title"),
        ownerEmail: text("ownerEmail"),
        dueOn: text("dueOn"),
      });
      await save(env, user, dealId, seen, {
        deal: current,
        events: [],
        openTasks: [
          {
            kind: task.kind,
            title: task.title,
            owner_email: task.ownerEmail,
            due_on: task.dueOn,
          },
        ],
        closeTaskKinds: [],
      });
      return "Task added. If one of that type was already open, it was kept.";
    }
    default:
      throw new Error("Unknown action.");
  }
}
