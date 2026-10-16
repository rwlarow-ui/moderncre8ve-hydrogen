/**
 * Production PO rules (ADR-0001). Pure functions only, so the state machine,
 * spec generation and approval gate can be tested without Shopify.
 *
 * Storage shape (metaobject `production_po`, see scripts/create-po-definitions.mjs):
 *   state              one of PO_STATES
 *   line_specs         JSON array of LineSpec
 *   logistics_snapshot JSON { capturedAt, status, order, logistics }
 */

import { parseLogisticsJson, readLogistics } from "./logistics.js";

export const PO_TYPE = "production_po";

export const PO_STATES = [
  "draft",
  "awaiting_logistics",
  "ready_for_review",
  "approved",
  "sent",
  "cancelled",
];

export const PO_STATE_LABELS = {
  draft: "Draft",
  awaiting_logistics: "Awaiting logistics",
  ready_for_review: "Ready for review",
  approved: "Approved",
  sent: "Sent",
  cancelled: "Cancelled",
};

/**
 * `approved -> ready_for_review` ("revoke approval") is an addition to the
 * ADR diagram: nothing has been sent at that point, so a mistaken approval
 * should be undoable. `sent` is terminal and `cancelled` is not reachable
 * from it.
 */
const TRANSITIONS = {
  draft: ["awaiting_logistics", "ready_for_review", "cancelled"],
  awaiting_logistics: ["ready_for_review", "cancelled"],
  ready_for_review: ["awaiting_logistics", "approved", "cancelled"],
  approved: ["ready_for_review", "sent", "cancelled"],
  sent: [],
  cancelled: [],
};

/** Specs and logistics can change only before the PO is approved. */
const EDITABLE_STATES = ["draft", "awaiting_logistics", "ready_for_review"];

const MAX_SPEC_TEXT = 120;
const MAX_SPEC_NOTES = 500;

export function canTransition(from, to) {
  return (TRANSITIONS[from] ?? []).includes(to);
}

export function nextStates(from) {
  return [...(TRANSITIONS[from] ?? [])];
}

export function isEditableState(state) {
  return EDITABLE_STATES.includes(state);
}

/** State a freshly created PO starts in, given the order's logistics. */
export function initialPoState(logisticsStatus) {
  return logisticsStatus === "complete"
    ? "ready_for_review"
    : "awaiting_logistics";
}

/**
 * The state an editable PO should be in for its logistics status. Returns the
 * current state for approved / sent / cancelled POs, which are never moved by
 * a logistics refresh.
 */
export function stateAfterLogisticsRefresh(state, logisticsStatus) {
  if (!isEditableState(state)) return state;
  return initialPoState(logisticsStatus);
}

function optionValue(selectedOptions, name) {
  const match = (selectedOptions ?? []).find(
    (option) => String(option?.name).toLowerCase() === name,
  );
  return match?.value ? String(match.value) : "";
}

/**
 * Builds PO line specs from order line items. `lineItems` is the Admin API
 * shape: { id, name, quantity, product: { title, metafield }, variant:
 * { selectedOptions } }. Size/Material/Leaf come from variant options and
 * finish from the `custom.finish` product metafield; anything missing is left
 * blank for the reviewer rather than guessed.
 */
export function buildLineSpecs(lineItems = []) {
  return lineItems.map((item) => {
    const options = item.variant?.selectedOptions ?? [];
    const known = new Set(["size", "material", "leaf"]);
    const other = options
      .filter((option) => !known.has(String(option?.name).toLowerCase()))
      .filter((option) => option?.value && option.value !== "Default Title")
      .map((option) => `${option.name}: ${option.value}`)
      .join("; ");

    return {
      lineItemId: item.id,
      product: item.product?.title || item.name || "",
      quantity: Number(item.quantity) || 1,
      size: optionValue(options, "size"),
      species: optionValue(options, "material"),
      leaf: optionValue(options, "leaf"),
      finish: item.product?.metafield?.value
        ? String(item.product.metafield.value)
        : "",
      otherOptions: other,
      notes: "",
    };
  });
}

function cleanText(value, max) {
  let out = "";
  for (const char of String(value ?? "")) {
    const code = char.charCodeAt(0);
    out += code < 32 || code === 127 ? " " : char;
  }
  return out.trim().slice(0, max);
}

/**
 * Applies reviewer edits to existing specs. Only size, species, leaf, finish
 * and notes are editable; product, quantity and line identity always come from
 * the stored specs so an edit can't drift from the order.
 */
export function applySpecEdits(existing = [], edits = []) {
  return existing.map((spec, index) => {
    const edit = edits[index] ?? {};
    return {
      ...spec,
      size: cleanText(edit.size ?? spec.size, MAX_SPEC_TEXT),
      species: cleanText(edit.species ?? spec.species, MAX_SPEC_TEXT),
      leaf: cleanText(edit.leaf ?? spec.leaf, MAX_SPEC_TEXT),
      finish: cleanText(edit.finish ?? spec.finish, MAX_SPEC_TEXT),
      notes: cleanText(edit.notes ?? spec.notes, MAX_SPEC_NOTES),
    };
  });
}

/**
 * Resolves an order's logistics. The `moderncre8ve.logistics` metafield (the
 * record, written by the post-purchase form or a previous refresh) wins when
 * it validates as complete; otherwise the cart-derived order attributes are
 * re-validated and used. Both are re-validated: neither is trusted as-is.
 *
 * @returns {{ status: "none" | "later" | "complete", value: object | null }}
 */
export function resolveLogistics({ metafieldValue, attributes } = {}) {
  const fromMetafield = parseLogisticsJson(metafieldValue);
  if (fromMetafield.status === "complete") return fromMetafield;
  const fromAttributes = readLogistics(attributes);
  if (fromAttributes.status === "complete") return fromAttributes;
  if (fromMetafield.status === "later" || fromAttributes.status === "later") {
    return { status: "later", value: null };
  }
  return { status: "none", value: null };
}

export function buildSnapshot({ order, logistics, now = new Date() }) {
  return {
    capturedAt: now.toISOString(),
    status: logistics.status,
    order: {
      id: order.id,
      name: order.name,
      placedAt: order.processedAt || null,
      customerName: order.customerName || "",
      customerEmail: order.customerEmail || "",
    },
    logistics: logistics.value,
  };
}

/**
 * Reasons a PO can't be approved yet. Empty means ready to approve.
 *
 * @param {{ state?: string, lineSpecs?: any[], snapshot?: any }} [input]
 * @returns {string[]}
 */
export function reviewBlockers({ state, lineSpecs = [], snapshot } = {}) {
  const blockers = [];
  if (state === "cancelled") blockers.push("This PO is cancelled.");
  if (state === "sent") blockers.push("This PO has already been sent.");

  if (snapshot?.status !== "complete" || !snapshot?.logistics) {
    blockers.push(
      "Delivery logistics are not complete. The PO can't be approved until the customer provides them.",
    );
  }

  if (!lineSpecs.length) blockers.push("The PO has no line items.");
  lineSpecs.forEach((spec, index) => {
    const label = `Line ${index + 1} (${spec.product || "unnamed"})`;
    if (!spec.size) blockers.push(`${label}: size is missing.`);
    if (!spec.species) blockers.push(`${label}: species/material is missing.`);
    if (!spec.finish) blockers.push(`${label}: finish is missing.`);
  });

  return blockers;
}

/**
 * Whether a transition is allowed right now, and why not.
 *
 * @param {{ state: string, to: string, lineSpecs?: any[], snapshot?: any }} input
 * @returns {{ ok: boolean, reason: string }}
 *
 * Approval also runs the content gate; every other allowed transition needs
 * only the state graph.
 */
export function checkTransition({ state, to, lineSpecs, snapshot }) {
  if (!PO_STATES.includes(to)) {
    return { ok: false, reason: `Unknown state "${to}".` };
  }
  if (!canTransition(state, to)) {
    return {
      ok: false,
      reason: `A ${PO_STATE_LABELS[state] ?? state} PO can't move to ${PO_STATE_LABELS[to]}.`,
    };
  }
  if (to === "approved") {
    const blockers = reviewBlockers({ state, lineSpecs, snapshot });
    if (blockers.length) return { ok: false, reason: blockers.join(" ") };
  }
  return { ok: true, reason: "" };
}

/** Parses a stored metaobject field list into a PO object. */
export function parsePoFields(fields = []) {
  const byKey = Object.fromEntries(
    fields.map((field) => [field.key, field.value]),
  );
  const json = (raw, fallback) => {
    if (!raw) return fallback;
    try {
      return JSON.parse(raw);
    } catch {
      return fallback;
    }
  };

  return {
    orderId: byKey.order_id || "",
    orderName: byKey.order_name || "",
    state: PO_STATES.includes(byKey.state) ? byKey.state : "draft",
    revision: Number(byKey.revision) || 1,
    lineSpecs: json(byKey.line_specs, []),
    snapshot: json(byKey.logistics_snapshot, null),
    approvedBy: byKey.approved_by || null,
    approvedAt: byKey.approved_at || null,
    sentAt: byKey.sent_at || null,
    sentMessageId: byKey.sent_message_id || null,
  };
}

/** Whole days since an ISO timestamp (0 for missing/invalid). */
export function daysSince(iso, now = new Date()) {
  const time = Date.parse(iso ?? "");
  if (Number.isNaN(time)) return 0;
  return Math.max(0, Math.floor((now.getTime() - time) / 86_400_000));
}
