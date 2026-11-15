/**
 * Customer Communications rules (phase A: manual tracking, nothing is sent).
 * Pure functions only: the delivery-logistics form workflow, reminder
 * eligibility, task bookkeeping and the work queue. Storage and Shopify reads
 * live in ops-comms.server.js; this file is the single home of the rules.
 *
 * Two separate things are tracked per order and must never be mixed up:
 * - the production stage (shared with Current orders; only an explicit stage
 *   update changes it, never a form receipt or a customer reply), and
 * - the returned delivery-logistics PDF status. This is unrelated to the
 *   checkout `logistics_status` cart attribute that drives Production PO state.
 */

/** Order of the shared production stages. Not Shopify paid/fulfilled status. */
export const PRODUCTION_STAGES = [
  { id: "unknown", label: "Unknown" },
  { id: "awaiting_production", label: "Awaiting production" },
  { id: "in_fabrication", label: "In fabrication" },
  { id: "finishing", label: "Finishing" },
  { id: "ready_for_delivery", label: "Ready for delivery" },
  { id: "with_carrier", label: "With carrier" },
  { id: "delivered", label: "Delivered" },
  { id: "on_hold", label: "On hold" },
];

export const FORM_STATUSES = [
  { id: "not_requested", label: "Not requested" },
  { id: "awaiting_return", label: "Awaiting return" },
  { id: "received_needs_review", label: "Received, needs review" },
  { id: "needs_clarification", label: "Needs clarification" },
  { id: "ready_for_carrier", label: "Ready for carrier" },
];

/** Task kinds. Only "other" may have several open at once per order. */
export const TASK_KINDS = [
  { id: "reply", label: "Reply needed" },
  { id: "update", label: "Customer update due" },
  { id: "logistics_review", label: "Review returned logistics form" },
  { id: "missing_evidence", label: "Attach returned form / evidence" },
  { id: "logistics_clarification", label: "Logistics clarification" },
  { id: "follow_up", label: "Post-delivery follow-up" },
  { id: "other", label: "Other" },
];

/** Manually recorded timeline entries. */
export const EVENT_KINDS = [
  {
    id: "customer_update",
    label: "Customer update sent",
    direction: "outgoing",
  },
  {
    id: "customer_reply",
    label: "Customer reply received",
    direction: "incoming",
  },
  { id: "call", label: "Phone call", direction: "internal" },
  { id: "note", label: "Internal note", direction: "internal" },
  { id: "delivery", label: "Delivery confirmed", direction: "internal" },
];

export const REMINDER_INTERVAL_DAYS = 7;
export const OPS_TASK_OWNERS = [
  "haven@moderncre8ve.com",
  "rob@moderncre8ve.com",
];
export const DEFAULT_TASK_OWNER = "haven@moderncre8ve.com";

const label = (list, id) => list.find((item) => item.id === id)?.label ?? id;
export const stageLabel = (id) => label(PRODUCTION_STAGES, id || "unknown");
export const formStatusLabel = (id) =>
  label(FORM_STATUSES, id || "not_requested");
export const taskKindLabel = (id) => label(TASK_KINDS, id);
export const eventKindLabel = (id) => label(EVENT_KINDS, id);

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** A date-only value or null. Unknown dates stay unknown, never "today". */
export function normalizeDate(value) {
  const text = String(value ?? "").trim();
  if (!text) {
    return null;
  }
  if (!DATE_RE.test(text) || Number.isNaN(Date.parse(`${text}T00:00:00Z`))) {
    throw new Error(`"${text}" is not a valid date.`);
  }
  return text;
}

export function addDays(date, days) {
  const next = new Date(`${date}T00:00:00Z`);
  next.setUTCDate(next.getUTCDate() + days);
  return next.toISOString().slice(0, 10);
}

export function todayIso(now = new Date()) {
  return now.toISOString().slice(0, 10);
}

/** Only links can be stored as evidence; no files or customer data inline. */
export function normalizeEvidenceUrl(value) {
  const text = String(value ?? "").trim();
  if (!text) {
    return null;
  }
  let url;
  try {
    url = new URL(text);
  } catch {
    throw new Error("Evidence must be a full https:// link.");
  }
  if (url.protocol !== "https:") {
    throw new Error("Evidence must be a full https:// link.");
  }
  if (text.length > 2000) {
    throw new Error("That link is too long.");
  }
  return url.toString();
}

function cleanText(value, max, field) {
  const text = String(value ?? "").trim();
  if (text.length > max) {
    throw new Error(`${field} is too long.`);
  }
  return text;
}

export function emptyCommsRecord() {
  return {
    logistics_status: "not_requested",
    logistics_requested_on: null,
    logistics_received_on: null,
    logistics_reviewed_by: null,
    logistics_reviewed_at: null,
    logistics_notes: "",
    form_version: 0,
    delivery_provider: "",
    carrier_shared_on: null,
    reminders_enabled: false,
    reminders_paused: false,
    reminder_last_sent_on: null,
    reminder_next_due_on: null,
    updated_at: null,
  };
}

const STORED_RECORD_FIELDS = Object.keys(emptyCommsRecord()).filter(
  (key) => key !== "updated_at",
);

/** The record fields the database stores, ready for ops_comms_apply. */
export function recordForStorage(record) {
  return Object.fromEntries(
    STORED_RECORD_FIELDS.map((key) => [key, record[key] ?? null]),
  );
}

/** Next standalone reminder date, or null when none should be scheduled. */
function nextReminder(record, from) {
  if (record.logistics_status !== "awaiting_return") {
    return null;
  }
  if (!record.reminders_enabled || record.reminders_paused) {
    return null;
  }
  // A historical request with an unknown date must never produce catch-up
  // mail: Haven sets the next action herself.
  if (!from) {
    return null;
  }
  return addDays(from, REMINDER_INTERVAL_DAYS);
}

const ALLOWED_FROM = {
  request_sent: ["not_requested", "awaiting_return"],
  form_received: [
    "not_requested",
    "awaiting_return",
    "needs_clarification",
    "received_needs_review",
    "ready_for_carrier",
  ],
  attach_evidence: [
    "received_needs_review",
    "needs_clarification",
    "ready_for_carrier",
  ],
  needs_clarification: ["received_needs_review"],
  ready_for_carrier: ["received_needs_review", "needs_clarification"],
  carrier_shared: ["ready_for_carrier"],
};

export const LOGISTICS_ACTIONS = [
  "request_sent",
  "form_received",
  "attach_evidence",
  "needs_clarification",
  "ready_for_carrier",
  "carrier_shared",
  "set_provider",
  "set_reminders",
];

/**
 * Apply one delivery-logistics action. Returns the next record plus the
 * timeline events to append and the task kinds to open/close, all of which
 * the server writes in one transaction. Throws with a readable message when
 * the action is not allowed from the current status.
 *
 * @param {ReturnType<typeof emptyCommsRecord>} current
 * @param {string} action
 * @param {Record<string, any>} input
 * @param {{ actor: string, now?: Date }} meta
 */
export function applyLogisticsAction(current, action, input = {}, meta) {
  const record = { ...emptyCommsRecord(), ...current };
  const now = meta.now ?? new Date();
  const events = [];
  const openTasks = [];
  const closeTaskKinds = [];
  const from = record.logistics_status;

  if (!LOGISTICS_ACTIONS.includes(action)) {
    throw new Error(`Unknown logistics action "${action}".`);
  }
  if (ALLOWED_FROM[action] && !ALLOWED_FROM[action].includes(from)) {
    throw new Error(
      `Can't do that while the form is "${formStatusLabel(from)}".`,
    );
  }
  const date = normalizeDate(input.date);
  const evidence = normalizeEvidenceUrl(input.evidenceUrl);
  const note = cleanText(input.note, 2000, "Note");

  switch (action) {
    case "request_sent": {
      record.logistics_status = "awaiting_return";
      record.logistics_requested_on = date;
      record.reminder_next_due_on = nextReminder(record, date);
      events.push({
        kind: "logistics_requested",
        direction: "outgoing",
        occurred_on: date,
        summary: note || "Delivery logistics form requested.",
        evidence_url: evidence,
      });
      break;
    }
    case "form_received": {
      // Any receipt, including one recorded before the file is filed,
      // stops missing-form reminders immediately.
      record.form_version += 1;
      record.logistics_status = "received_needs_review";
      record.logistics_received_on = date;
      record.logistics_reviewed_by = null;
      record.logistics_reviewed_at = null;
      record.reminder_next_due_on = null;
      // The previous version's carrier handoff stays in the timeline, but it
      // no longer describes the form now on file.
      record.carrier_shared_on = null;
      events.push({
        kind: "form_received",
        direction: "incoming",
        occurred_on: date,
        summary:
          note ||
          `Delivery logistics form received (version ${record.form_version}).`,
        evidence_url: evidence,
        details: { version: record.form_version },
      });
      openTasks.push({
        kind: "logistics_review",
        title: `Review returned logistics form (version ${record.form_version})`,
      });
      closeTaskKinds.push("logistics_clarification");
      if (evidence) {
        closeTaskKinds.push("missing_evidence");
      } else {
        openTasks.push({
          kind: "missing_evidence",
          title: "Attach the returned form or link its email",
        });
      }
      break;
    }
    case "attach_evidence": {
      if (!evidence) {
        throw new Error("Add the link to the form or its email.");
      }
      events.push({
        kind: "form_document",
        direction: "internal",
        occurred_on: null,
        summary:
          note || `Evidence linked for form version ${record.form_version}.`,
        evidence_url: evidence,
        details: { version: record.form_version },
      });
      closeTaskKinds.push("missing_evidence");
      break;
    }
    case "needs_clarification": {
      if (!note) {
        throw new Error("Say what needs clarifying.");
      }
      record.logistics_status = "needs_clarification";
      record.logistics_notes = note;
      events.push({
        kind: "logistics_review",
        direction: "internal",
        occurred_on: null,
        summary: `Needs clarification: ${note}`,
        evidence_url: null,
      });
      closeTaskKinds.push("logistics_review");
      openTasks.push({
        kind: "logistics_clarification",
        title: "Ask the customer to clarify their delivery logistics",
      });
      break;
    }
    case "ready_for_carrier": {
      record.logistics_status = "ready_for_carrier";
      record.logistics_reviewed_by = meta.actor;
      record.logistics_reviewed_at = now.toISOString();
      if (note) {
        record.logistics_notes = note;
      }
      events.push({
        kind: "logistics_review",
        direction: "internal",
        occurred_on: null,
        summary: `Reviewed: ready for carrier (form version ${record.form_version}).`,
        evidence_url: null,
      });
      closeTaskKinds.push("logistics_review", "logistics_clarification");
      break;
    }
    case "carrier_shared": {
      const provider =
        cleanText(input.provider, 120, "Provider") || record.delivery_provider;
      const recipient = cleanText(input.recipient, 200, "Recipient");
      if (!provider) {
        throw new Error("Name the delivery provider.");
      }
      if (!recipient) {
        throw new Error("Say who it was shared with.");
      }
      record.delivery_provider = provider;
      record.carrier_shared_on = date;
      events.push({
        kind: "carrier_handoff",
        direction: "internal",
        occurred_on: date,
        summary: `Logistics form version ${record.form_version} shared with ${provider} (${recipient}).`,
        evidence_url: evidence,
        details: {
          provider,
          recipient,
          version: record.form_version,
          method: cleanText(input.method, 120, "Method"),
        },
      });
      break;
    }
    case "set_provider": {
      record.delivery_provider = cleanText(input.provider, 120, "Provider");
      events.push({
        kind: "provider_set",
        direction: "internal",
        occurred_on: null,
        summary: record.delivery_provider
          ? `Delivery provider set to ${record.delivery_provider}.`
          : "Delivery provider cleared.",
        evidence_url: null,
      });
      break;
    }
    case "set_reminders": {
      record.reminders_enabled = input.enabled === true;
      record.reminders_paused = input.paused === true;
      // Re-plan from the last reminder (or the request); an explicit date
      // from Haven wins, which is how historical records get a next action.
      record.reminder_next_due_on =
        record.logistics_status === "awaiting_return" &&
        record.reminders_enabled &&
        !record.reminders_paused
          ? date ||
            nextReminder(
              record,
              record.reminder_last_sent_on || record.logistics_requested_on,
            )
          : null;
      events.push({
        kind: "reminder_settings",
        direction: "internal",
        occurred_on: null,
        summary: !record.reminders_enabled
          ? "Form reminders turned off."
          : record.reminders_paused
            ? "Form reminders paused."
            : `Form reminders on; next due ${record.reminder_next_due_on ?? "not set"}.`,
        evidence_url: null,
      });
      break;
    }
    default:
      throw new Error(`Unknown logistics action "${action}".`);
  }
  return { record, events, openTasks, closeTaskKinds };
}

/**
 * Record a manual timeline entry (an email sent from Gmail, a reply, a call,
 * a note, a delivery). A customer reply opens a Reply needed task; an
 * outgoing update closes Update due, and when it carried the form reminder
 * it counts as that reminder so no second one is due the same interval.
 */
export function applyManualEvent(current, input = {}) {
  const record = { ...emptyCommsRecord(), ...current };
  const kind = EVENT_KINDS.find((item) => item.id === input.kind);
  if (!kind) {
    throw new Error("Choose what happened.");
  }
  const date = normalizeDate(input.date);
  const summary = cleanText(input.summary, 2000, "Summary");
  if (!summary) {
    throw new Error("Add a short summary.");
  }
  const evidence = normalizeEvidenceUrl(input.evidenceUrl);
  const openTasks = [];
  const closeTaskKinds = [];
  const details = {};

  if (kind.id === "customer_reply") {
    openTasks.push({ kind: "reply", title: "Reply to the customer" });
  }
  if (kind.id === "customer_update") {
    closeTaskKinds.push("update");
    if (input.includesReminder === true) {
      if (record.logistics_status !== "awaiting_return") {
        throw new Error(
          "Only an order still awaiting its logistics form can carry a reminder.",
        );
      }
      if (!date) {
        throw new Error("Add the date the update was sent.");
      }
      details.includes_reminder = true;
      record.reminder_last_sent_on = date;
      record.reminder_next_due_on = nextReminder(record, date);
    }
  }
  if (kind.id === "delivery") {
    openTasks.push({
      kind: "follow_up",
      title: "Post-delivery check-in",
    });
  }
  return {
    record,
    events: [
      {
        kind: kind.id,
        direction: kind.direction,
        occurred_on: date,
        summary,
        evidence_url: evidence,
        details,
      },
    ],
    openTasks,
    closeTaskKinds,
  };
}

/**
 * Whether a standalone missing-form reminder is due today. Evaluated from
 * current state every time (never only when scheduled), so a receipt, a
 * pause or a closed/cancelled order suppresses a stale reminder.
 */
export function reminderEligibility(record, { today, orderClosed = false }) {
  const r = { ...emptyCommsRecord(), ...record };
  if (orderClosed) {
    return { due: false, reason: "Order closed or cancelled" };
  }
  if (r.logistics_status !== "awaiting_return") {
    return {
      due: false,
      reason: `Form is ${formStatusLabel(r.logistics_status).toLowerCase()}`,
    };
  }
  if (!r.reminders_enabled) {
    return { due: false, reason: "Reminders off" };
  }
  if (r.reminders_paused) {
    return { due: false, reason: "Reminders paused" };
  }
  if (!r.reminder_next_due_on) {
    return { due: false, reason: "No next reminder date set" };
  }
  if (r.reminder_last_sent_on === today) {
    return { due: false, reason: "Already reminded today" };
  }
  if (r.reminder_next_due_on > today) {
    return { due: false, reason: `Next due ${r.reminder_next_due_on}` };
  }
  return { due: true, reason: `Due since ${r.reminder_next_due_on}` };
}

/** Manual task changes: complete, cancel, snooze, reopen, reassign. */
export function validateTaskUpdate(input = {}) {
  const status = String(input.status || "");
  if (!["open", "snoozed", "done", "cancelled"].includes(status)) {
    throw new Error("Unknown task status.");
  }
  const dueOn = normalizeDate(input.dueOn);
  if (status === "snoozed" && !dueOn) {
    throw new Error("Pick the date to snooze until.");
  }
  const ownerEmail = String(input.ownerEmail || DEFAULT_TASK_OWNER);
  if (!OPS_TASK_OWNERS.includes(ownerEmail)) {
    throw new Error("Unknown task owner.");
  }
  const note = cleanText(input.note, 2000, "Note");
  if (["done", "cancelled"].includes(status) && !note) {
    throw new Error("Say how it was resolved.");
  }
  return {
    status,
    dueOn,
    ownerEmail,
    note,
  };
}

export function validateNewTask(input = {}) {
  const kind = TASK_KINDS.find((item) => item.id === input.kind)?.id;
  if (!kind) {
    throw new Error("Choose a task type.");
  }
  const title = cleanText(input.title, 500, "Title") || taskKindLabel(kind);
  const ownerEmail = String(input.ownerEmail || DEFAULT_TASK_OWNER);
  if (!OPS_TASK_OWNERS.includes(ownerEmail)) {
    throw new Error("Unknown task owner.");
  }
  return { kind, title, ownerEmail, dueOn: normalizeDate(input.dueOn) };
}

export function validateProductionUpdate(input = {}) {
  const stage = PRODUCTION_STAGES.find((item) => item.id === input.stage)?.id;
  if (!stage) {
    throw new Error("Choose a production stage.");
  }
  const weeks = String(input.estimateWeeks ?? "").trim();
  const estimateWeeks = weeks ? Number(weeks) : null;
  if (
    estimateWeeks !== null &&
    (!Number.isInteger(estimateWeeks) ||
      estimateWeeks < 1 ||
      estimateWeeks > 52)
  ) {
    throw new Error("Estimate must be a whole number of weeks (1–52).");
  }
  return {
    stage,
    confirmedOn: normalizeDate(input.confirmedOn),
    source: cleanText(input.source, 200, "Source"),
    estimateWeeks,
  };
}

/* ------------------------------------------------------------------ queue */

export const QUEUE_FILTERS = [
  { id: "attention", label: "Needs my attention" },
  { id: "update_due", label: "Update due" },
  { id: "reply", label: "Reply needed" },
  { id: "logistics_outstanding", label: "Logistics outstanding" },
  { id: "logistics_review", label: "Logistics needs review" },
  { id: "follow_up", label: "Post-delivery follow-up" },
  { id: "all", label: "All" },
];

const isOpenTask = (task, today) =>
  task.status === "open" ||
  (task.status === "snoozed" && (!task.due_on || task.due_on <= today));

/**
 * One row per order: every current Shopify order plus any order that has a
 * communications record or task, so post-delivery work stays visible after
 * an order leaves the 140-day window or is fulfilled.
 *
 * @param {{ currentOrders: any[], overview: { records: any[], production: any[], tasks: any[], last: any[] }, today: string, viewer?: string, currentListComplete?: boolean }} input
 */
export function buildQueue({
  currentOrders,
  overview,
  today,
  viewer,
  currentListComplete = true,
}) {
  const byId = new Map();
  const ensure = (orderId, orderName) => {
    if (!byId.has(orderId)) {
      byId.set(orderId, { orderId, orderName, shopify: null });
    }
    return byId.get(orderId);
  };
  for (const order of currentOrders) {
    ensure(order.legacyId, order.name).shopify = order;
  }
  for (const row of overview.records) {
    ensure(row.order_id, row.order_name).record = row;
  }
  for (const row of overview.production) {
    ensure(row.order_id, row.order_name).production = row;
  }
  for (const row of overview.last) {
    const item = byId.get(row.order_id);
    if (item) {
      item.last = row;
    }
  }
  for (const task of overview.tasks) {
    const item = ensure(task.order_id, task.order_name);
    item.tasks = [...(item.tasks || []), task];
  }

  return [...byId.values()]
    .map((item) => {
      const record = { ...emptyCommsRecord(), ...item.record };
      const tasks = (item.tasks || []).filter((task) =>
        isOpenTask(task, today),
      );
      const reminder = reminderEligibility(record, {
        today,
        // Orders outside the current list (fulfilled, cancelled, closed or
        // older than the window) never show a form reminder as due. If the
        // current list was cut short, absence proves nothing, so don't hide it.
        orderClosed: currentListComplete && !item.shopify,
      });
      const due =
        tasks
          .map((task) => task.due_on)
          .filter(Boolean)
          .sort()[0] || null;
      const has = (kind) => tasks.some((task) => task.kind === kind);
      const flags = {
        reply: has("reply"),
        update_due: tasks.some(
          (task) =>
            task.kind === "update" && (!task.due_on || task.due_on <= today),
        ),
        logistics_outstanding: ["not_requested", "awaiting_return"].includes(
          record.logistics_status,
        ),
        logistics_review:
          has("logistics_review") ||
          has("missing_evidence") ||
          has("logistics_clarification"),
        follow_up: has("follow_up"),
        reminder_due: reminder.due,
        overdue: Boolean(due && due < today),
      };
      return {
        orderId: item.orderId,
        orderName:
          item.orderName || item.shopify?.name || `Order ${item.orderId}`,
        customerName: item.shopify?.customer?.name || null,
        customerEmail: item.shopify?.customer?.email || null,
        inCurrentWindow: Boolean(item.shopify),
        stage: item.production?.stage || "unknown",
        stageConfirmedOn: item.production?.stage_confirmed_on || null,
        lastOutgoing: item.last?.last_outgoing || null,
        lastIncoming: item.last?.last_incoming || null,
        undatedOutgoing: item.last?.undated_outgoing === true,
        undatedIncoming: item.last?.undated_incoming === true,
        record,
        reminder,
        tasks,
        mine: tasks.filter((task) => !viewer || task.owner_email === viewer),
        nextDue: due,
        flags,
      };
    })
    .sort(
      (a, b) =>
        (a.nextDue || "9999").localeCompare(b.nextDue || "9999") ||
        b.orderName.localeCompare(a.orderName, undefined, { numeric: true }),
    );
}

export function filterQueue(rows, filter, search = "") {
  const needle = search.trim().toLowerCase().replace(/^#/, "");
  return rows.filter((row) => {
    if (
      needle &&
      ![row.orderName, row.orderId, row.customerName, row.customerEmail]
        .filter(Boolean)
        .some((value) => value.toLowerCase().replace(/^#/, "").includes(needle))
    ) {
      return false;
    }
    switch (filter) {
      case "attention":
        return row.mine.length > 0 || row.flags.reminder_due;
      case "update_due":
        return row.flags.update_due;
      case "reply":
        return row.flags.reply;
      case "logistics_outstanding":
        return row.flags.logistics_outstanding && row.inCurrentWindow;
      case "logistics_review":
        return row.flags.logistics_review;
      case "follow_up":
        return row.flags.follow_up;
      default:
        return true;
    }
  });
}
