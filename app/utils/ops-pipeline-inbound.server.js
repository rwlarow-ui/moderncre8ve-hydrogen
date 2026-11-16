/**
 * Website form intake for the sales pipeline (ADR-0009, phase 2).
 *
 * The contact, piece-request and trade forms call `recordInboundDeal` after
 * they have created or tagged the Shopify customer. It adds the inquiry to
 * that customer's open deal, or opens a new one, through one server-only RPC.
 * It is best-effort and runs off the response path: the form has already
 * succeeded, so a missing or failing Ops database must never surface to the
 * visitor.
 *
 * Form text is untrusted. It is stored as plain text and rendered as escaped
 * React text in the hub, like everything else on the timeline.
 */
import {
  DEFAULT_DEAL_OWNER,
  NEW_DEAL_NEXT_STEP,
  normalizeValue,
  todayIso,
} from "./ops-pipeline.js";
import { hasOpsStore, opsRpc } from "./ops-store.server.js";

const MAX_TITLE = 200;
const MAX_SUMMARY = 2000;

/** Shopify GraphQL IDs (gid://shopify/Customer/123) or bare legacy IDs → "123". */
export function legacyCustomerId(customerId) {
  const id = String(customerId ?? "")
    .split("/")
    .pop();
  return /^\d{1,20}$/.test(id) ? id : null;
}

/** A price shown on the site ("$4,500.00"), as dollars, or null if it isn't one. */
export function priceValue(text) {
  try {
    return normalizeValue(text);
  } catch {
    return null;
  }
}

const shorten = (text, max) => {
  const value = String(text ?? "").trim();
  return value.length > max ? `${value.slice(0, max - 1)}…` : value;
};

/**
 * @typedef {{ title: string, dealType: string, source: string, estimatedValue?: number | null, summary: string }} InboundDeal
 */

/**
 * Store one form submission on the pipeline. Returns `{ dealId, created }`,
 * or null when the Ops database isn't configured or the input is unusable.
 *
 * @param {any} env
 * @param {string} customerId  As returned by upsertTaggedCustomer.
 * @param {InboundDeal | null} inbound  null means "not a sales lead": skip.
 */
export async function recordInboundDeal(
  env,
  customerId,
  inbound,
  { now = new Date() } = {},
) {
  const legacyId = legacyCustomerId(customerId);
  if (!inbound || !legacyId || !hasOpsStore(env)) {
    return null;
  }
  const today = todayIso(now);
  const result = await opsRpc(env, "ops_pipeline_inbound", {
    p_customer_id: legacyId,
    p_deal: {
      title: shorten(inbound.title, MAX_TITLE) || "Website inquiry",
      deal_type: inbound.dealType,
      source: inbound.source,
      owner_email: DEFAULT_DEAL_OWNER,
      estimated_value: inbound.estimatedValue ?? null,
      next_step: NEW_DEAL_NEXT_STEP,
      next_step_due: today,
    },
    p_event: {
      occurred_on: today,
      summary: shorten(inbound.summary, MAX_SUMMARY) || inbound.title,
      details: { source: inbound.source },
    },
  });
  return result?.deal_id
    ? { dealId: String(result.deal_id), created: Boolean(result.created) }
    : null;
}

/**
 * The line an owner notification email adds about the pipeline, or null.
 * Links only when the hub's address is configured.
 */
export function pipelineNotificationLine(env, deal) {
  if (!deal?.dealId) {
    return null;
  }
  const what = deal.created
    ? "New deal in the pipeline"
    : "Added to their open deal in the pipeline";
  const base = String(env.OPS_APP_URL ?? "").replace(/\/+$/, "");
  return base.startsWith("https://")
    ? `${what}: ${base}/ops/pipeline/${deal.dealId}`
    : `${what}.`;
}

/**
 * What a form does after it has saved the customer: record the deal, then
 * send the owner notification with its pipeline link. Each step logs its own
 * failure and the chain never rejects, so it can go to `waitUntil` as is.
 *
 * @param {any} env
 * @param {{ customerId: string, created: boolean }} result  From upsertTaggedCustomer.
 * @param {InboundDeal | null} inbound
 * @param {(result: any) => Promise<unknown>} notify
 * @param {string} label  For logs, e.g. "Contact".
 */
export function afterIntake(env, result, inbound, notify, label) {
  return recordInboundDeal(env, result.customerId, inbound)
    .catch((error) => {
      console.error(`${label} pipeline intake failed:`, error);
      return null;
    })
    .then((deal) => notify({ ...result, deal }))
    .catch((error) => {
      console.error(`${label} notification failed:`, error);
    });
}
