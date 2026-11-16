/**
 * Sales pipeline rules (ADR-0009, phase 1: manual tracking, nothing is sent).
 * Pure functions only: stages, deal validation, which tasks a change opens or
 * closes, and the board. Storage and Shopify reads live in
 * ops-pipeline.server.js; this file is the single home of the rules.
 *
 * A deal belongs to a Shopify customer. The pipeline never copies the
 * customer's name, email or phone; the board reads them live from Shopify.
 */
import {
  addDays,
  normalizeDate,
  normalizeEvidenceUrl,
  OPS_TASK_OWNERS,
} from "./ops-comms.js";

export {
  addDays,
  normalizeDate,
  OPS_TASK_OWNERS,
  todayIso,
} from "./ops-comms.js";

/** In order. `open: false` stages are closed or parked and leave the board's open views. */
export const DEAL_STAGES = [
  { id: "new", label: "New", open: true },
  { id: "contacted", label: "Contacted", open: true },
  { id: "discovery", label: "Discovery (call or visit)", open: true },
  { id: "measured", label: "Measured / spec'd", open: true },
  { id: "design_sent", label: "Design sent", open: true },
  { id: "maker_quote", label: "Maker quote", open: true },
  { id: "quote_sent", label: "Quote sent", open: true },
  { id: "won", label: "Won", open: false },
  { id: "lost", label: "Lost", open: false },
  { id: "on_hold", label: "On hold", open: false },
];

export const DEAL_TYPES = [
  { id: "retail", label: "Retail (catalog piece)" },
  { id: "custom", label: "Custom piece" },
  { id: "trade", label: "Trade / designer" },
  { id: "wholesale", label: "Wholesale / manufacturing" },
  { id: "other", label: "Other" },
];

export const DEAL_SOURCES = [
  { id: "contact_form", label: "Contact form" },
  { id: "piece_request", label: "Request this piece" },
  { id: "trade_form", label: "Trade application" },
  { id: "email", label: "Email" },
  { id: "phone", label: "Phone" },
  { id: "referral", label: "Referral" },
  { id: "in_person", label: "In person" },
  { id: "asana", label: "Imported from Asana" },
  { id: "other", label: "Other" },
];

/** Task kinds. Only "other" may have several open at once per deal. */
export const DEAL_TASK_KINDS = [
  { id: "reply", label: "Reply needed" },
  { id: "follow_up", label: "Follow up" },
  { id: "schedule_visit", label: "Schedule call or visit" },
  { id: "send_design", label: "Send design" },
  { id: "maker_quote", label: "Get maker quote" },
  { id: "send_quote", label: "Send quote" },
  { id: "other", label: "Other" },
];

/** Manually recorded timeline entries. */
export const DEAL_EVENT_KINDS = [
  { id: "inquiry", label: "Inquiry received", direction: "incoming" },
  {
    id: "reply_received",
    label: "Customer reply received",
    direction: "incoming",
  },
  { id: "reply_sent", label: "Reply sent", direction: "outgoing" },
  { id: "call", label: "Phone call", direction: "internal" },
  { id: "visit", label: "Site visit / measurements", direction: "internal" },
  { id: "design_sent", label: "Design sent", direction: "outgoing" },
  { id: "maker_quote", label: "Maker quote received", direction: "internal" },
  { id: "quote_sent", label: "Quote sent", direction: "outgoing" },
  { id: "note", label: "Internal note", direction: "internal" },
];

/** Days after a quote goes out before a follow-up task is due. Proposed; confirm with the owners. */
export const QUOTE_FOLLOW_UP_DAYS = 7;
export const DEFAULT_DEAL_OWNER = "haven@moderncre8ve.com";
export const NEW_DEAL_NEXT_STEP = "Reply to the inquiry";

const label = (list, id) => list.find((item) => item.id === id)?.label ?? id;
export const dealStageLabel = (id) => label(DEAL_STAGES, id);
export const dealTypeLabel = (id) => label(DEAL_TYPES, id);
export const dealSourceLabel = (id) => label(DEAL_SOURCES, id);
export const dealTaskKindLabel = (id) => label(DEAL_TASK_KINDS, id);
/** Entries the hub writes itself, never chosen in the "record" form. */
const SYSTEM_EVENT_KINDS = [
  { id: "stage", label: "Stage change" },
  { id: "edit", label: "Details updated" },
  { id: "task", label: "Task" },
];
export const dealEventKindLabel = (id) =>
  label([...DEAL_EVENT_KINDS, ...SYSTEM_EVENT_KINDS], id);
export const isOpenStage = (id) =>
  DEAL_STAGES.find((stage) => stage.id === id)?.open ?? false;
const stageIndex = (id) => DEAL_STAGES.findIndex((stage) => stage.id === id);

/** Task kinds that only make sense while a deal is open; closing a deal finishes them. */
const WORKING_TASK_KINDS = DEAL_TASK_KINDS.map((k) => k.id).filter(
  (id) => id !== "other",
);

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function cleanText(value, max, field) {
  const text = String(value ?? "").trim();
  if (text.length > max) {
    throw new Error(`${field} is too long.`);
  }
  return text;
}

function pick(list, value, message) {
  const found = list.find((item) => item.id === value)?.id;
  if (!found) {
    throw new Error(message);
  }
  return found;
}

function owner(value) {
  const email = String(value || DEFAULT_DEAL_OWNER);
  if (!OPS_TASK_OWNERS.includes(email)) {
    throw new Error("Unknown owner.");
  }
  return email;
}

/** Dollars, optional. Stored as numeric(12,2). */
export function normalizeValue(value) {
  const text = String(value ?? "")
    .trim()
    .replace(/[$,\s]/g, "");
  if (!text) {
    return null;
  }
  const amount = Number(text);
  if (!Number.isFinite(amount) || amount < 0 || amount >= 1e10) {
    throw new Error("Estimated value must be a dollar amount.");
  }
  return Math.round(amount * 100) / 100;
}

/** The fields the database stores for a deal, nothing else. */
export function dealForStorage(deal) {
  return {
    customer_id: deal.customer_id,
    title: deal.title,
    deal_type: deal.deal_type,
    stage: deal.stage,
    owner_email: deal.owner_email,
    source: deal.source,
    estimated_value: deal.estimated_value ?? null,
    next_step: deal.next_step ?? "",
    next_step_due: deal.next_step_due ?? null,
    lost_reason: deal.lost_reason ?? "",
    closed_on: deal.closed_on ?? null,
  };
}

/**
 * Validate the "Add deal" form. The customer is looked up or created in
 * Shopify by the server from `customer`; the rest becomes the deal.
 */
export function validateNewDeal(input = {}, { today }) {
  const email = String(input.email ?? "")
    .trim()
    .toLowerCase();
  if (!EMAIL_RE.test(email) || email.length > 254) {
    throw new Error("Enter the customer's email address.");
  }
  const title = cleanText(input.title, 200, "Title");
  if (!title) {
    throw new Error("Say what the deal is for, e.g. “Walnut extension table”.");
  }
  const ownerEmail = owner(input.ownerEmail);
  const inquiry = cleanText(input.inquiry, 2000, "Inquiry");
  const inquiryDate = normalizeDate(input.inquiryDate);
  const evidenceUrl = normalizeEvidenceUrl(input.evidenceUrl);
  const nextStep = cleanText(input.nextStep, 500, "Next step");
  const nextStepDue = normalizeDate(input.nextStepDue);

  const deal = {
    title,
    deal_type: pick(
      DEAL_TYPES,
      input.dealType || "custom",
      "Choose a deal type.",
    ),
    stage: "new",
    owner_email: ownerEmail,
    source: pick(DEAL_SOURCES, input.source || "other", "Choose a source."),
    estimated_value: normalizeValue(input.estimatedValue),
    // A new deal always has a next step, so it can't sit unanswered unseen.
    next_step: nextStep || NEW_DEAL_NEXT_STEP,
    next_step_due: nextStepDue ?? today,
    lost_reason: "",
    closed_on: null,
  };
  const events = [
    {
      kind: "inquiry",
      direction: "incoming",
      occurred_on: inquiryDate,
      summary: inquiry || `Inquiry: ${title}`,
      evidence_url: evidenceUrl,
    },
  ];
  return {
    customer: {
      email,
      firstName: cleanText(input.firstName, 100, "First name"),
      lastName: cleanText(input.lastName, 100, "Last name"),
      phone: cleanText(input.phone, 40, "Phone"),
    },
    deal,
    events,
    openTasks: [],
    closeTaskKinds: [],
  };
}

const FIELD_LABELS = {
  title: "title",
  deal_type: "type",
  owner_email: "owner",
  source: "source",
  estimated_value: "estimated value",
  next_step: "next step",
  next_step_due: "next step date",
};

/** Edit a deal's details (not its stage; see applyStageChange). */
export function applyDealEdit(current, input = {}) {
  const title = cleanText(input.title, 200, "Title");
  if (!title) {
    throw new Error("A deal needs a title.");
  }
  const next = {
    ...current,
    title,
    deal_type: pick(DEAL_TYPES, input.dealType, "Choose a deal type."),
    owner_email: owner(input.ownerEmail),
    source: pick(DEAL_SOURCES, input.source, "Choose a source."),
    estimated_value: normalizeValue(input.estimatedValue),
    next_step: cleanText(input.nextStep, 500, "Next step"),
    next_step_due: normalizeDate(input.nextStepDue),
  };
  const changed = Object.keys(FIELD_LABELS).filter(
    (key) => String(current[key] ?? "") !== String(next[key] ?? ""),
  );
  if (changed.length === 0) {
    throw new Error("Nothing changed.");
  }
  return {
    deal: next,
    events: [
      {
        kind: "edit",
        direction: "internal",
        occurred_on: null,
        summary: `Updated ${changed.map((key) => FIELD_LABELS[key]).join(", ")}.`,
        details: { changed },
      },
    ],
    openTasks: [],
    closeTaskKinds: [],
  };
}

/**
 * Move a deal to another stage. Only this action changes the stage: recording
 * a reply or a quote never moves a deal by itself.
 */
export function applyStageChange(current, input = {}, { today }) {
  const stage = pick(DEAL_STAGES, input.stage, "Choose a stage.");
  if (stage === current.stage) {
    throw new Error("The deal is already at that stage.");
  }
  const date = normalizeDate(input.date);
  const note = cleanText(input.note, 1000, "Note");
  const lostReason = cleanText(input.lostReason, 500, "Lost reason");
  if (stage === "lost" && !lostReason) {
    throw new Error("Say why the deal was lost.");
  }
  const closing = stage === "won" || stage === "lost";
  const next = {
    ...current,
    stage,
    lost_reason: stage === "lost" ? lostReason : "",
    closed_on: closing ? (date ?? today) : null,
  };
  const openTasks = [];
  if (stage === "quote_sent") {
    const sentOn = date ?? today;
    openTasks.push({
      kind: "follow_up",
      title: "Follow up on the quote",
      owner_email: current.owner_email,
      due_on: addDays(sentOn, QUOTE_FOLLOW_UP_DAYS),
    });
  }
  const parts = [
    `Stage: ${dealStageLabel(current.stage)} → ${dealStageLabel(stage)}`,
  ];
  if (stage === "lost") {
    parts.push(`Reason: ${lostReason}`);
  }
  if (note) {
    parts.push(note);
  }
  return {
    deal: next,
    events: [
      {
        kind: "stage",
        direction: "internal",
        occurred_on: date,
        summary: parts.join(". "),
        details: { from: current.stage, to: stage },
      },
    ],
    openTasks,
    // Closing or parking a deal finishes its working tasks; "other" tasks stay.
    closeTaskKinds: isOpenStage(stage) ? [] : WORKING_TASK_KINDS,
  };
}

/** Record a reply, call, visit, design or quote on the timeline. */
export function applyDealEvent(current, input = {}, { today }) {
  const kind = DEAL_EVENT_KINDS.find((item) => item.id === input.kind);
  if (!kind) {
    throw new Error("Choose what happened.");
  }
  const summary = cleanText(input.summary, 2000, "Summary");
  if (!summary) {
    throw new Error("Add a short summary.");
  }
  const openTasks = [];
  const closeTaskKinds = [];
  if (kind.direction === "incoming" && isOpenStage(current.stage)) {
    openTasks.push({
      kind: "reply",
      title: "Reply to the customer",
      owner_email: current.owner_email,
      due_on: today,
    });
  }
  if (kind.direction === "outgoing") {
    closeTaskKinds.push("reply");
  }
  if (kind.id === "design_sent") {
    closeTaskKinds.push("send_design");
  }
  if (kind.id === "maker_quote") {
    closeTaskKinds.push("maker_quote");
  }
  if (kind.id === "quote_sent") {
    closeTaskKinds.push("send_quote");
  }
  if (kind.id === "visit") {
    closeTaskKinds.push("schedule_visit");
  }
  return {
    deal: current,
    events: [
      {
        kind: kind.id,
        direction: kind.direction,
        occurred_on: normalizeDate(input.date),
        summary,
        evidence_url: normalizeEvidenceUrl(input.evidenceUrl),
      },
    ],
    openTasks,
    closeTaskKinds,
  };
}

export function validateDealTask(input = {}) {
  const kind = pick(DEAL_TASK_KINDS, input.kind, "Choose a task type.");
  return {
    kind,
    title: cleanText(input.title, 500, "Title") || dealTaskKindLabel(kind),
    ownerEmail: owner(input.ownerEmail),
    dueOn: normalizeDate(input.dueOn),
  };
}

export function validateDealTaskUpdate(input = {}) {
  const status = ["open", "snoozed", "done", "cancelled"].includes(input.status)
    ? input.status
    : null;
  if (!status) {
    throw new Error("Choose a task status.");
  }
  const note = cleanText(input.note, 2000, "Note");
  if ((status === "done" || status === "cancelled") && !note) {
    throw new Error("Say how it was resolved.");
  }
  const dueOn = normalizeDate(input.dueOn);
  if (status === "snoozed" && !dueOn) {
    throw new Error("A snoozed task needs a date to come back.");
  }
  return { status, dueOn, ownerEmail: owner(input.ownerEmail), note };
}

/* ------------------------------------------------------------------ board */

export const BOARD_FILTERS = [
  { id: "attention", label: "Needs my attention" },
  { id: "open", label: "All open" },
  { id: "overdue", label: "Next step overdue or missing" },
  { id: "reply", label: "Reply needed" },
  { id: "won", label: "Won" },
  { id: "lost", label: "Lost" },
  { id: "on_hold", label: "On hold" },
  { id: "all", label: "All" },
];

const isLiveTask = (task, today) =>
  task.status === "open" ||
  (task.status === "snoozed" && (!task.due_on || task.due_on <= today));

/**
 * One row per deal, with its Shopify customer (or null when Shopify couldn't
 * be read or no longer has the customer), live tasks and attention flags.
 *
 * @param {{ deals: any[], tasks: any[], last: any[], customers: Map<string, any>, today: string, viewer?: string }} input
 */
export function buildBoard({ deals, tasks, last, customers, today, viewer }) {
  const lastById = new Map(last.map((row) => [row.deal_id, row]));
  return deals
    .map((deal) => {
      const dealTasks = tasks.filter(
        (task) => task.deal_id === deal.id && isLiveTask(task, today),
      );
      const open = isOpenStage(deal.stage);
      const nextStepMissing = open && (!deal.next_step || !deal.next_step_due);
      const nextStepOverdue =
        open && Boolean(deal.next_step_due) && deal.next_step_due < today;
      const reply = dealTasks.some((task) => task.kind === "reply");
      const nextStepDue =
        open && Boolean(deal.next_step_due) && deal.next_step_due <= today;
      // A task needs the viewer if it's theirs, or unassigned-by-date on a deal they own.
      const taskNeedsViewer = dealTasks.some(
        (task) =>
          (!task.due_on || task.due_on <= today) &&
          (task.owner_email === viewer || deal.owner_email === viewer),
      );
      const mine =
        deal.owner_email === viewer ||
        dealTasks.some((task) => task.owner_email === viewer);
      return {
        deal,
        customer: customers.get(deal.customer_id) ?? null,
        tasks: dealTasks,
        lastOutgoing: lastById.get(deal.id)?.last_outgoing ?? null,
        lastIncoming: lastById.get(deal.id)?.last_incoming ?? null,
        open,
        flags: {
          next_step_missing: nextStepMissing,
          next_step_overdue: nextStepOverdue,
          reply,
        },
        attention:
          mine &&
          ((open && (nextStepMissing || nextStepDue || reply)) ||
            taskNeedsViewer),
      };
    })
    .sort(
      (a, b) =>
        Number(b.open) - Number(a.open) ||
        stageIndex(a.deal.stage) - stageIndex(b.deal.stage) ||
        String(a.deal.next_step_due ?? "9999").localeCompare(
          String(b.deal.next_step_due ?? "9999"),
        ) ||
        String(b.deal.updated_at ?? "").localeCompare(
          String(a.deal.updated_at ?? ""),
        ),
    );
}

export function filterBoard(rows, filter, { stage = "", search = "" } = {}) {
  const query = search.trim().toLowerCase();
  return rows.filter((row) => {
    const keep = {
      attention: row.attention,
      open: row.open,
      overdue: row.flags.next_step_missing || row.flags.next_step_overdue,
      reply: row.flags.reply,
      won: row.deal.stage === "won",
      lost: row.deal.stage === "lost",
      on_hold: row.deal.stage === "on_hold",
      all: true,
    }[filter];
    if (!keep) {
      return false;
    }
    if (stage && row.deal.stage !== stage) {
      return false;
    }
    if (!query) {
      return true;
    }
    return [
      row.deal.title,
      row.customer?.name,
      row.customer?.email,
      row.deal.next_step,
    ].some((value) =>
      String(value ?? "")
        .toLowerCase()
        .includes(query),
    );
  });
}

/** Count and estimated value per open stage, for the board's summary strip. */
export function stageSummary(rows) {
  return DEAL_STAGES.filter((stage) => stage.open).map((stage) => {
    const inStage = rows.filter((row) => row.deal.stage === stage.id);
    return {
      id: stage.id,
      label: stage.label,
      count: inStage.length,
      value: inStage.reduce(
        (sum, row) => sum + Number(row.deal.estimated_value ?? 0),
        0,
      ),
    };
  });
}
