/**
 * Logistics email automation rules (CARE-01 request, CARE-02 reminder).
 * Pure functions only: business-day scheduling, intake eligibility, template
 * import/lint/render, the send gate and the MIME message. Storage, Shopify
 * and Gmail calls live in ops-care.server.js. Design: docs/adr/0010.
 *
 * Nothing here sends anything. The single function that calls Gmail is
 * sendCareMessage in ops-care.server.js, and it calls assertSendable from
 * this file immediately before every request.
 */

export const CARE_TEMPLATES = [
  { key: "CARE-01", label: "Delivery logistics request" },
  { key: "CARE-02", label: "Logistics reminder" },
];
export const CARE_TEMPLATE_KEYS = CARE_TEMPLATES.map((t) => t.key);
export const careTemplateLabel = (key) =>
  CARE_TEMPLATES.find((t) => t.key === key)?.label ?? key;

export const CARE_MODES = ["off", "test", "live"];
export const CARE_SENDER_EMAIL = "haven@moderncre8ve.com";
export const CARE_FROM_ADDRESS = "care@moderncre8ve.com";
export const CARE_REMINDER_DAYS = 7;
export const CARE_STORE = "moderncre8ve.myshopify.com";
export const CARE_SYSTEM_ACTOR = "system:care-tick";
/** Sends per tick: far above real volume, well inside Oxygen request limits. */
export const CARE_SENDS_PER_TICK = 5;
export const CARE_LEASE_MINUTES = 5;
/** Reconciliation searches for an uncertain send, in minutes after the attempt. */
export const CARE_RECONCILE_AFTER = [2, 10];
export const CARE_PDF_MAX_BYTES = 5 * 1024 * 1024;
export const CARE_PDF_PAGES = 2;

/**
 * Line items matching these (name or SKU, case-insensitive) do not make an
 * order a furniture order. Proposed default; Haven confirms before live.
 */
export const DEFAULT_EXCLUDED_ITEM_PATTERNS = [
  "wax",
  "oil",
  "gift card",
  "sample",
];
export const CARE_EXCLUDE_TAGS = ["ops-no-care", "test-excluded"];

export const MESSAGE_STATUSES = [
  { id: "scheduled", label: "Queued" },
  { id: "held", label: "Held: needs attention" },
  { id: "sending", label: "Sending" },
  { id: "accepted", label: "Accepted by Gmail" },
  { id: "failed", label: "Failed" },
  { id: "uncertain", label: "Uncertain: reconciling" },
  { id: "suppressed", label: "Suppressed" },
  { id: "cancelled", label: "Cancelled" },
];
export const messageStatusLabel = (id) =>
  MESSAGE_STATUSES.find((s) => s.id === id)?.label ?? id;

export function defaultCareSettings() {
  return {
    mode: "off",
    global_pause: false,
    live_rules: { "CARE-01": false, "CARE-02": false },
    intake_started_at: null,
    intake_cursor: null,
    timezone: "America/New_York",
    send_hour: null,
    business_days: [1, 2, 3, 4, 5],
    holidays: [],
    test_recipients: [],
    test_order_ids: [],
    excluded_item_patterns: DEFAULT_EXCLUDED_ITEM_PATTERNS,
    from_name: "MODERNCRE8VE",
    reply_to: CARE_FROM_ADDRESS,
    last_tick_at: null,
    last_tick_result: null,
    updated_at: null,
  };
}

// ---------------------------------------------------------------------------
// Time zones and business days
// ---------------------------------------------------------------------------

const WEEKDAYS = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7 };
const formatters = new Map();
function formatter(timeZone) {
  if (!formatters.has(timeZone)) {
    formatters.set(
      timeZone,
      new Intl.DateTimeFormat("en-US", {
        timeZone,
        hourCycle: "h23",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        weekday: "short",
      }),
    );
  }
  return formatters.get(timeZone);
}

export function assertTimeZone(timeZone) {
  try {
    formatter(timeZone);
  } catch {
    throw new Error(`"${timeZone}" is not a valid time zone.`);
  }
  return timeZone;
}

/** Wall-clock parts of an instant in a time zone. */
export function localParts(instant, timeZone) {
  const parts = Object.fromEntries(
    formatter(timeZone)
      .formatToParts(new Date(instant))
      .map((p) => [p.type, p.value]),
  );
  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    hour: Number(parts.hour),
    minute: Number(parts.minute),
    second: Number(parts.second),
    weekday: WEEKDAYS[parts.weekday],
  };
}

export const localDate = (instant, timeZone) =>
  localParts(instant, timeZone).date;

/** The UTC instant at which the wall clock in `timeZone` reads date+hour:00. */
export function zonedTime(date, hour, timeZone) {
  const target = Date.parse(`${date}T${String(hour).padStart(2, "0")}:00:00Z`);
  let guess = target;
  // Two passes settle any offset, including across a DST change.
  for (let i = 0; i < 3; i++) {
    const p = localParts(guess, timeZone);
    const seen = Date.parse(
      `${p.date}T${String(p.hour).padStart(2, "0")}:${String(p.minute).padStart(2, "0")}:${String(p.second).padStart(2, "0")}Z`,
    );
    guess += target - seen;
  }
  return new Date(guess);
}

export function addDays(date, days) {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function isoWeekday(date) {
  const day = new Date(`${date}T00:00:00Z`).getUTCDay();
  return day === 0 ? 7 : day;
}

export function isBusinessDay(date, settings) {
  return (
    settings.business_days.includes(isoWeekday(date)) &&
    !(settings.holidays ?? []).includes(date)
  );
}

/** First business day on or after `date`. */
export function businessDayOnOrAfter(date, settings) {
  if (!settings.business_days?.length) {
    throw new Error("Choose at least one business day.");
  }
  let d = date;
  for (let i = 0; i < 400; i++) {
    if (isBusinessDay(d, settings)) {
      return d;
    }
    d = addDays(d, 1);
  }
  throw new Error("No business day found in the next year.");
}

/**
 * The sending slot (UTC Date) for a business date, at the configured hour.
 * Without a confirmed sending hour (test mode before Haven chooses one) the
 * slot is the start of that business day, so it is never earlier than the
 * date the rules allow.
 */
export function slotFor(date, settings) {
  return zonedTime(date, settings.send_hour ?? 0, settings.timezone);
}

/**
 * CARE-01: the next business day strictly after the order's local date, at
 * the sending hour. Not a fixed 24 hours: an order on Friday evening goes out
 * Monday; one at 20:30 ET on Wednesday (Thursday in UTC) goes out Thursday.
 */
export function care01DueAt(orderCreatedAt, settings) {
  const placed = localDate(orderCreatedAt, settings.timezone);
  return slotFor(businessDayOnOrAfter(addDays(placed, 1), settings), settings);
}

/** CARE-02: the first business-day slot on or after the record's next due date. */
export function care02DueAt(nextDueOn, settings) {
  if (!nextDueOn) {
    return null;
  }
  return slotFor(businessDayOnOrAfter(nextDueOn, settings), settings);
}

/** Next reminder date, 7 days after the actual send in the business time zone. */
export function nextReminderOn(acceptedAt, settings) {
  return addDays(localDate(acceptedAt, settings.timezone), CARE_REMINDER_DAYS);
}

// ---------------------------------------------------------------------------
// Settings validation
// ---------------------------------------------------------------------------

const EMAIL_RE = /^[^\s@<>",]+@[^\s@<>",]+\.[^\s@<>",]+$/;
export function normalizeEmail(value) {
  const text = String(value ?? "")
    .trim()
    .toLowerCase();
  if (!EMAIL_RE.test(text) || text.length > 254) {
    throw new Error(`"${value}" is not an email address.`);
  }
  return text;
}

function list(value) {
  return String(value ?? "")
    .split(/[\s,]+/)
    .map((x) => x.trim())
    .filter(Boolean);
}

/**
 * Validate a settings change from the Automation page. Returns the full next
 * settings object. Turning CARE-01 live for the first time stamps
 * intake_started_at: orders placed before it are never auto-enrolled.
 */
export function validateSettingsChange(current, input, now = new Date()) {
  const next = { ...defaultCareSettings(), ...current };
  if (input.mode !== undefined) {
    if (!CARE_MODES.includes(input.mode)) {
      throw new Error("Unknown mode.");
    }
    next.mode = input.mode;
  }
  if (input.globalPause !== undefined) {
    next.global_pause = input.globalPause === true;
  }
  if (input.timezone !== undefined) {
    next.timezone = assertTimeZone(String(input.timezone).trim());
  }
  if (input.sendHour !== undefined) {
    const text = String(input.sendHour).trim();
    if (text === "") {
      next.send_hour = null;
    } else {
      const hour = Number(text);
      if (!Number.isInteger(hour) || hour < 0 || hour > 23) {
        throw new Error("Sending hour must be 0 to 23.");
      }
      next.send_hour = hour;
    }
  }
  if (input.businessDays !== undefined) {
    const days = [...new Set(input.businessDays.map(Number))].sort();
    if (
      !days.length ||
      days.some((d) => !Number.isInteger(d) || d < 1 || d > 7)
    ) {
      throw new Error("Choose at least one business day.");
    }
    next.business_days = days;
  }
  if (input.holidays !== undefined) {
    const days = list(input.holidays);
    for (const d of days) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(d) || Number.isNaN(Date.parse(d))) {
        throw new Error(`"${d}" is not a date (use YYYY-MM-DD).`);
      }
    }
    next.holidays = [...new Set(days)].sort();
  }
  if (input.testRecipients !== undefined) {
    next.test_recipients = [
      ...new Set(list(input.testRecipients).map(normalizeEmail)),
    ];
  }
  if (input.testOrderIds !== undefined) {
    const ids = list(input.testOrderIds);
    for (const id of ids) {
      if (!/^\d{1,20}$/.test(id)) {
        throw new Error(
          `"${id}" is not a Shopify order ID (the number in /ops/orders/<id>).`,
        );
      }
    }
    next.test_order_ids = [...new Set(ids)];
  }
  if (input.excludedItemPatterns !== undefined) {
    next.excluded_item_patterns = String(input.excludedItemPatterns)
      .split(/\n|,/)
      .map((x) => x.trim().toLowerCase())
      .filter(Boolean);
  }
  if (input.fromName !== undefined) {
    const name = String(input.fromName).trim();
    if (!name || name.length > 80 || /[<>"\r\n]/.test(name)) {
      throw new Error("From name must be 1 to 80 plain characters.");
    }
    next.from_name = name;
  }
  if (input.replyTo !== undefined) {
    next.reply_to = normalizeEmail(input.replyTo);
  }
  if (input.liveRules !== undefined) {
    const rules = { ...next.live_rules };
    for (const key of CARE_TEMPLATE_KEYS) {
      if (input.liveRules[key] !== undefined) {
        rules[key] = input.liveRules[key] === true;
      }
    }
    next.live_rules = rules;
  }
  const anyLive = CARE_TEMPLATE_KEYS.some((k) => next.live_rules[k]);
  if (anyLive && next.mode !== "live") {
    throw new Error(
      "Live rules can only be on in live mode. Turn them off first, or choose live mode.",
    );
  }
  if (next.mode === "live" && anyLive && next.send_hour === null) {
    throw new Error("Choose a sending hour before turning a live rule on.");
  }
  if (next.live_rules["CARE-01"] && !next.intake_started_at) {
    // No backfill: intake only ever looks at orders placed from now on.
    next.intake_started_at = now.toISOString();
    next.intake_cursor = now.toISOString();
  }
  return next;
}

// ---------------------------------------------------------------------------
// Intake eligibility
// ---------------------------------------------------------------------------

/**
 * Whether a Shopify order should get an automatic CARE-01. Returns
 * { eligible, reason }. `order` is from careOrderQuery; `record` is the comms
 * record or null.
 */
export function intakeEligibility(order, record, settings) {
  if (order.cancelledAt) {
    return { eligible: false, reason: "Cancelled" };
  }
  if (order.test) {
    return { eligible: false, reason: "Shopify test order" };
  }
  const tags = (order.tags ?? []).map((t) => String(t).toLowerCase());
  const tag = CARE_EXCLUDE_TAGS.find((t) => tags.includes(t));
  if (tag) {
    return { eligible: false, reason: `Tagged ${tag}` };
  }
  if (
    settings.intake_started_at &&
    Date.parse(order.createdAt) < Date.parse(settings.intake_started_at)
  ) {
    return { eligible: false, reason: "Placed before automation started" };
  }
  if (record?.care_excluded) {
    return { eligible: false, reason: "Excluded from automated emails" };
  }
  if (record && record.logistics_status !== "not_requested") {
    return { eligible: false, reason: "Logistics form already requested" };
  }
  if (record?.care_enrolment && record.care_enrolment !== "none") {
    return { eligible: false, reason: "Already enrolled" };
  }
  if (!hasFurniture(order.lineItems, settings.excluded_item_patterns)) {
    return { eligible: false, reason: "No furniture items" };
  }
  if (!order.email) {
    return { eligible: false, reason: "No customer email" };
  }
  return { eligible: true, reason: "Eligible" };
}

export function hasFurniture(
  lineItems,
  patterns = DEFAULT_EXCLUDED_ITEM_PATTERNS,
) {
  return (lineItems ?? []).some((item) => {
    const text = `${item.name ?? ""} ${item.sku ?? ""}`.toLowerCase();
    return !patterns.some((p) => p && text.includes(p));
  });
}

// ---------------------------------------------------------------------------
// Templates
// ---------------------------------------------------------------------------

const ALLOWED_TOKENS = new Set(["[first_name]", "[order_number]"]);
const SIGN_OFF_RE =
  /^(best|best regards|kind regards|regards|warmly|warm regards|thanks|thank you|thank you so much|many thanks|cheers|sincerely|all the best|with gratitude)[,!.]?$/i;
const INTERNAL_RE =
  /^(trigger|internal|notes?|branch|implementation|instructions?|when to send|send when|condition|status|approved|tab)\b/i;

/**
 * Parse a pasted Google Doc tab export into subject + body. Text before the
 * "Subject:" line (title, trigger, instructions) is dropped, and the body ends
 * at the next internal section heading. Lint still checks the result.
 */
export function parseTemplateExport(text) {
  const lines = String(text ?? "")
    .replace(/\r\n?/g, "\n")
    .split("\n");
  const start = lines.findIndex((l) => /^\s*subject(\s+line)?\s*:/i.test(l));
  if (start === -1) {
    throw new Error('No "Subject:" line found in the export.');
  }
  const subject = lines[start]
    .replace(/^\s*subject(\s+line)?\s*:\s*/i, "")
    .trim();
  const body = [];
  for (const raw of lines.slice(start + 1)) {
    const line = raw.trimEnd();
    if (!body.length && /^\s*(body|email body|message)\s*:?\s*$/i.test(line)) {
      continue;
    }
    if (INTERNAL_RE.test(line.trim()) && /:/.test(line)) {
      break;
    }
    body.push(line);
  }
  return { subject, body: tidyBody(body.join("\n")) };
}

function tidyBody(text) {
  return String(text ?? "")
    .replace(/\r\n?/g, "\n")
    .replace(/[ \t]+$/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** Problems that block activating or sending a template. */
export function lintTemplate({ subject, body, neutralGreeting }) {
  const problems = [];
  const all = `${subject}\n${body}\n${neutralGreeting ?? ""}`;
  if (!String(subject ?? "").trim()) {
    problems.push("Subject is empty.");
  }
  if (String(subject ?? "").length > 200) {
    problems.push("Subject is too long.");
  }
  if (!String(body ?? "").trim()) {
    problems.push("Body is empty.");
  }
  if (/—/.test(all)) {
    problems.push("Contains an em dash (—).");
  }
  for (const token of all.match(/\[[^\]\n]*\]/g) ?? []) {
    if (!ALLOWED_TOKENS.has(token.toLowerCase())) {
      problems.push(`Unknown placeholder or bracketed note: ${token}`);
    }
  }
  if (/\{\{|\}\}/.test(all)) {
    problems.push("Contains {{ }} placeholders.");
  }
  if (/#\s*\[order_number\]/i.test(all)) {
    problems.push(
      "Write [order_number] without a # in front; the hub adds exactly one.",
    );
  }
  const lines = String(body ?? "")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  for (const line of lines) {
    if (/^#{1,6}\s/.test(line) || (INTERNAL_RE.test(line) && /:/.test(line))) {
      problems.push(`Looks like a heading or internal note: "${line}"`);
    }
  }
  const last = lines.at(-1) ?? "";
  if (
    SIGN_OFF_RE.test(last) ||
    (lines.length > 1 && SIGN_OFF_RE.test(lines.at(-2) ?? ""))
  ) {
    problems.push(
      "Ends with a sign-off. Remove it: the approved care@ signature is added once by the hub.",
    );
  }
  const nameLines = lines.filter((l) => /\[first_name\]/i.test(l));
  if (nameLines.length > 1) {
    problems.push("[first_name] may only appear in the greeting line.");
  }
  if (nameLines.length === 1 && nameLines[0] !== lines[0]) {
    problems.push("[first_name] may only appear in the first (greeting) line.");
  }
  if (nameLines.length && !String(neutralGreeting ?? "").trim()) {
    problems.push(
      "Add the approved greeting to use when an order has no first name.",
    );
  }
  if (/\[first_name\]/i.test(subject ?? "")) {
    problems.push("[first_name] is not allowed in the subject.");
  }
  return problems;
}

/** Order number with exactly one leading #. */
export function formatOrderNumber(name) {
  const digits = String(name ?? "")
    .replace(/^\s*#+\s*/, "")
    .trim();
  if (!digits) {
    throw new Error("The order has no order number.");
  }
  return `#${digits}`;
}

/** A usable first name, or null. Never split a full name to guess one. */
export function usableFirstName(value) {
  const text = String(value ?? "").trim();
  if (!text || text.length > 60 || /[@<>[\]{}]/.test(text) || /\d/.test(text)) {
    return null;
  }
  return text;
}

/**
 * Render subject + text body for one order. Throws with a readable message
 * when anything is unresolved; the caller holds the job and opens a task.
 */
export function renderTemplate(template, { firstName, orderName }) {
  const orderNumber = formatOrderNumber(orderName);
  const first = usableFirstName(firstName);
  let body = template.body_text;
  const lines = body.split("\n");
  const greetingIndex = lines.findIndex((l) => /\[first_name\]/i.test(l));
  if (greetingIndex !== -1 && !first) {
    if (!String(template.neutral_greeting ?? "").trim()) {
      throw new Error("No first name on the order and no neutral greeting.");
    }
    lines[greetingIndex] = template.neutral_greeting.trim();
    body = lines.join("\n");
  }
  const fill = (text) =>
    text
      .replace(/\[first_name\]/gi, first ?? "")
      .replace(/\[order_number\]/gi, orderNumber);
  const subject = fill(template.subject).replace(/##+/g, "#");
  body = fill(body);
  const leftover = `${subject}\n${body}`.match(/\[[^\]\n]*\]/);
  if (leftover) {
    throw new Error(`Unresolved placeholder ${leftover[0]}.`);
  }
  if (/—/.test(`${subject}${body}`)) {
    throw new Error("Rendered email contains an em dash.");
  }
  return { subject, text: body };
}

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Plain paragraphs to minimal HTML. Links are made clickable. */
export function textToHtml(text) {
  return String(text)
    .split(/\n{2,}/)
    .map(
      (para) =>
        `<p>${escapeHtml(para)
          .replace(/(https:\/\/[^\s<]+)/g, '<a href="$1">$1</a>')
          .replace(/\n/g, "<br>")}</p>`,
    )
    .join("\n");
}

/** Text version of a Gmail HTML signature. */
export function htmlToText(html) {
  return String(html ?? "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|tr|li|h\d)>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * The full email body: rendered template + the approved signature, once.
 * Refuses a body that already carries the signature.
 */
export function composeBody(rendered, signature) {
  if (!signature?.text?.trim()) {
    throw new Error("No approved care@ signature.");
  }
  const sigText = signature.text.trim();
  const firstSigLine = sigText.split("\n")[0].trim();
  if (firstSigLine && rendered.text.includes(firstSigLine)) {
    throw new Error("The template already contains the signature.");
  }
  const text = `${rendered.text}\n\n--\n${sigText}\n`;
  const html = `<div>${textToHtml(rendered.text)}</div>\n<br>\n<div class="gmail_signature">${
    signature.html?.trim() ? signature.html : textToHtml(sigText)
  }</div>`;
  return { text, html };
}

// ---------------------------------------------------------------------------
// The send gate
// ---------------------------------------------------------------------------

/**
 * Why this job must not be sent now, or null when it may. Evaluated when the
 * job is claimed, again immediately before the Gmail request, and by the
 * database's optimistic check in between. `wait` means leave it queued (a
 * pause or mode, not the order's fault); `suppress` means it should never go;
 * `hold` means a person must fix something first.
 */
export function careBlockReason({ job, record, settings, order, now }) {
  const wait = (reason) => ({ action: "wait", reason });
  const suppress = (reason) => ({ action: "suppress", reason });
  const hold = (reason) => ({ action: "hold", reason });
  if (settings.mode === "off") {
    return wait("Automation is off");
  }
  if (settings.global_pause) {
    return wait("Global send pause is on");
  }
  if (settings.mode === "live" && !settings.live_rules?.[job.template_key]) {
    return wait(`${job.template_key} is not switched on for live sending`);
  }
  if (
    settings.mode === "test" &&
    !settings.test_order_ids.includes(job.order_id)
  ) {
    return wait("Test mode: not an approved test order");
  }
  if (!record) {
    return suppress("No communications record");
  }
  if (record.care_excluded) {
    return suppress("Excluded from automated emails");
  }
  if (
    record.care_paused_until &&
    record.care_paused_until >= localDate(now, settings.timezone)
  ) {
    return wait(`Paused until ${record.care_paused_until}`);
  }
  if (
    job.template_key === "CARE-01" &&
    record.logistics_status !== "not_requested"
  ) {
    return suppress(
      `Form already ${record.logistics_status.replace(/_/g, " ")}`,
    );
  }
  if (job.template_key === "CARE-02") {
    if (record.logistics_status !== "awaiting_return") {
      return suppress(`Form is ${record.logistics_status.replace(/_/g, " ")}`);
    }
    if (!record.reminders_enabled) {
      return suppress("Reminders are off");
    }
    if (record.reminders_paused) {
      return wait("Reminders are paused");
    }
    if (!record.reminder_next_due_on) {
      return suppress("No next reminder date (unknown request date)");
    }
  }
  if (order) {
    if (order.cancelledAt) {
      return suppress("Order cancelled");
    }
    if (!careRecipient({ order, record, settings })) {
      return hold("No usable recipient address");
    }
  }
  return null;
}

/** The address this order's email goes to, honouring the test override. */
export function careRecipient({ order, record, settings }) {
  if (settings.mode === "test") {
    const override = record?.care_test_recipient;
    const to = override || order?.email;
    return to && settings.test_recipients.includes(String(to).toLowerCase())
      ? String(to).toLowerCase()
      : null;
  }
  return order?.email ? String(order.email).toLowerCase() : null;
}

/**
 * Last line of defence, called by sendCareMessage right before Gmail.
 * Throws (nothing is sent) unless every rule allows this exact send.
 */
export function assertSendable({ settings, job, to, sender }) {
  if (settings.mode === "off") {
    throw new Error("Automation is off.");
  }
  if (settings.global_pause) {
    throw new Error("Global send pause is on.");
  }
  if (!CARE_TEMPLATE_KEYS.includes(job.template_key)) {
    throw new Error("Unknown template.");
  }
  if (settings.mode === "live" && !settings.live_rules?.[job.template_key]) {
    throw new Error(`${job.template_key} is not on for live sending.`);
  }
  if (settings.mode === "test") {
    if (!settings.test_order_ids.includes(job.order_id)) {
      throw new Error("Test mode: not an approved test order.");
    }
    if (!settings.test_recipients.includes(String(to).toLowerCase())) {
      throw new Error("Test mode: recipient is not on the test allowlist.");
    }
  }
  if (!sender?.send_as_ok) {
    throw new Error("care@ send-as is not verified on the sender connection.");
  }
  if (sender.email !== CARE_SENDER_EMAIL) {
    throw new Error("Only Haven's mailbox may send as care@.");
  }
}

// ---------------------------------------------------------------------------
// MIME
// ---------------------------------------------------------------------------

function encodeWord(text) {
  // RFC 2047 only when needed, so plain subjects stay readable in raw mail.
  return /^[\x20-\x7e]*$/.test(text)
    ? text
    : `=?UTF-8?B?${base64(new TextEncoder().encode(text))}?=`;
}

export function base64(bytes) {
  let binary = "";
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(binary);
}

export function base64ToBytes(text) {
  const binary = atob(text);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export function base64Url(text) {
  return base64(new TextEncoder().encode(text))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

const wrap = (text) => text.replace(/.{1,76}/g, "$&\r\n");
const utf8Base64 = (text) => wrap(base64(new TextEncoder().encode(text)));

/** Deterministic Message-ID, so an uncertain send can be found in Sent. */
export const careMessageId = (jobId, attempt) =>
  `<care-${jobId}-${attempt}@moderncre8ve.com>`;

/**
 * Build the RFC 822 message. multipart/mixed: alternative (text, html) + PDF.
 */
export function buildMime({
  fromName,
  from,
  to,
  replyTo,
  subject,
  text,
  html,
  attachment,
  messageId,
  date = new Date(),
}) {
  for (const value of [from, to, replyTo, subject, fromName, messageId]) {
    if (/[\r\n]/.test(String(value))) {
      throw new Error("Header values may not contain line breaks.");
    }
  }
  const mixed = `mixed_${messageId.replace(/[^a-z0-9]/gi, "").slice(0, 40)}`;
  const alt = `alt_${mixed}`;
  const headers = [
    `From: ${encodeWord(fromName)} <${from}>`,
    `To: ${to}`,
    `Reply-To: ${replyTo}`,
    `Subject: ${encodeWord(subject)}`,
    `Message-ID: ${messageId}`,
    `Date: ${date.toUTCString()}`,
    "MIME-Version: 1.0",
    `Content-Type: multipart/mixed; boundary="${mixed}"`,
  ];
  const parts = [
    `--${mixed}`,
    `Content-Type: multipart/alternative; boundary="${alt}"`,
    "",
    `--${alt}`,
    "Content-Type: text/plain; charset=UTF-8",
    "Content-Transfer-Encoding: base64",
    "",
    utf8Base64(text),
    `--${alt}`,
    "Content-Type: text/html; charset=UTF-8",
    "Content-Transfer-Encoding: base64",
    "",
    utf8Base64(html),
    `--${alt}--`,
    "",
  ];
  if (attachment) {
    parts.push(
      `--${mixed}`,
      `Content-Type: application/pdf; name="${attachment.filename}"`,
      `Content-Disposition: attachment; filename="${attachment.filename}"`,
      "Content-Transfer-Encoding: base64",
      "",
      wrap(attachment.base64),
    );
  }
  parts.push(`--${mixed}--`, "");
  return `${headers.join("\r\n")}\r\n\r\n${parts.join("\r\n")}`;
}

/**
 * How a Gmail response should be recorded. Only a 2xx is an acceptance; a
 * 4xx is a definite refusal; anything else (5xx, timeout, network) might have
 * been accepted and must be reconciled, never blindly resent.
 */
export function classifyGmailResult({ status, error }) {
  if (error) {
    return "uncertain";
  }
  if (status >= 200 && status < 300) {
    return "accepted";
  }
  if (status >= 400 && status < 500) {
    return "failed";
  }
  return "uncertain";
}

/** Gmail web link for a thread in Haven's mailbox. */
export function gmailThreadUrl(threadId, account = CARE_SENDER_EMAIL) {
  return threadId
    ? `https://mail.google.com/mail/u/?authuser=${encodeURIComponent(account)}#all/${encodeURIComponent(threadId)}`
    : null;
}

export function dedupeKey(orderId, templateKey, anchor) {
  return `${CARE_STORE}:${orderId}:${templateKey}:${anchor}`;
}

/**
 * The first sending slot strictly after `now`: used when Haven deliberately
 * enrols an existing order, so it never goes out the instant she clicks.
 */
export function nextSlotAfter(now, settings) {
  let date = businessDayOnOrAfter(localDate(now, settings.timezone), settings);
  for (let i = 0; i < 400; i++) {
    const slot = slotFor(date, settings);
    if (slot.getTime() > new Date(now).getTime()) {
      return slot;
    }
    date = businessDayOnOrAfter(addDays(date, 1), settings);
  }
  throw new Error("No sending slot found in the next year.");
}

/** When a CARE-01 for this order is due: next business day, never in the past for a manual enrolment. */
export function care01DueForEnrolment(
  orderCreatedAt,
  now,
  settings,
  { manual },
) {
  const byOrder = care01DueAt(orderCreatedAt, settings);
  if (!manual) {
    return byOrder;
  }
  const soonest = nextSlotAfter(now, settings);
  return byOrder > soonest ? byOrder : soonest;
}

/**
 * Everything about one email except the PDF bytes: recipient, identity,
 * rendered copy with the signature once, attachment and versions. Throws a
 * readable error when something is missing; the job is then held.
 */
export function prepareCareEmail({ job, settings, content, record, order }) {
  const template = content?.templates?.[job.template_key];
  if (!template) {
    throw new Error(`No approved ${job.template_key} template is active.`);
  }
  const problems = lintTemplate({
    subject: template.subject,
    body: template.body_text,
    neutralGreeting: template.neutral_greeting,
  });
  if (problems.length) {
    throw new Error(
      `Template ${job.template_key} v${template.version}: ${problems[0]}`,
    );
  }
  const pdf = content?.pdf;
  if (!pdf) {
    throw new Error("No approved blank logistics PDF is active.");
  }
  if (pdf.page_count !== CARE_PDF_PAGES) {
    throw new Error(
      `The active PDF has ${pdf.page_count} pages, not ${CARE_PDF_PAGES}.`,
    );
  }
  const signature = content?.signature;
  if (!signature) {
    throw new Error("No approved care@ signature is active.");
  }
  const to = careRecipient({ order, record, settings });
  if (!to) {
    throw new Error(
      settings.mode === "test"
        ? "Test mode: no allowlisted recipient for this order."
        : "The order has no customer email.",
    );
  }
  const rendered = renderTemplate(template, {
    firstName: order.firstName,
    orderName: order.name,
  });
  const body = composeBody(rendered, {
    text: signature.text_content,
    html: signature.html,
  });
  const testOverride =
    settings.mode === "test" && to !== String(order.email ?? "").toLowerCase();
  return {
    to,
    fromName: settings.from_name,
    from: CARE_FROM_ADDRESS,
    replyTo: settings.reply_to,
    subject: rendered.subject,
    text: body.text,
    html: body.html,
    attachment: {
      filename: pdf.filename || "MODERNCRE8VE Delivery and Logistics.pdf",
      version: pdf.version,
      sha256: pdf.sha256,
      pages: pdf.page_count,
    },
    snapshot: {
      to,
      test_recipient_override: testOverride,
      from: `${settings.from_name} <${CARE_FROM_ADDRESS}>`,
      reply_to: settings.reply_to,
      subject: rendered.subject,
      template: job.template_key,
      template_version: template.version,
      template_sha256: template.content_sha256,
      signature_version: signature.version,
      attachment_version: pdf.version,
      attachment_sha256: pdf.sha256,
      mode: settings.mode,
    },
  };
}
