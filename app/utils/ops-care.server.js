/**
 * Logistics email automation: storage, Shopify, Gmail and the due worker.
 * Rules are in ops-care.js. The only function that sends mail is
 * sendCareMessage, and it calls assertSendable immediately before Gmail.
 */
import { CompactEncrypt, compactDecrypt } from "jose";
import { PDFDocument } from "pdf-lib";
import {
  addDays,
  assertSendable,
  base64,
  base64ToBytes,
  base64Url,
  buildMime,
  CARE_FROM_ADDRESS,
  CARE_LEASE_MINUTES,
  CARE_PDF_MAX_BYTES,
  CARE_PDF_PAGES,
  CARE_RECONCILE_AFTER,
  CARE_REMINDER_DAYS,
  CARE_SENDER_EMAIL,
  CARE_SENDS_PER_TICK,
  CARE_SYSTEM_ACTOR,
  CARE_TEMPLATE_KEYS,
  care01DueAt,
  care01DueForEnrolment,
  care02DueAt,
  careBlockReason,
  classifyGmailResult,
  defaultCareSettings,
  gmailThreadUrl,
  htmlToText,
  intakeEligibility,
  lintTemplate,
  localDate,
  nextReminderOn,
  normalizeEmail,
  parseTemplateExport,
  prepareCareEmail,
  validateSettingsChange,
} from "./ops-care.js";
import { adminGraphql } from "./ops-dashboard.server.js";
import { googleConnectError } from "./ops-google-errors.js";
import { hasOpsStore, opsRpc } from "./ops-store.server.js";

export const CARE_SETUP_SQL = "scripts/sql/ops-hub-care-automation.sql";
export const GMAIL_SEND_SCOPE = "https://www.googleapis.com/auth/gmail.send";
export const GMAIL_READ_SCOPE =
  "https://www.googleapis.com/auth/gmail.readonly";
const GMAIL = "https://gmail.googleapis.com/gmail/v1/users/me";

export function careUnavailableReason(error) {
  const message = error instanceof Error ? error.message : String(error);
  if (/\(404\)/.test(message)) {
    return `The automation tables haven't been created yet. Run ${CARE_SETUP_SQL} in the Ops Supabase project.`;
  }
  return message;
}

function requireStore(env) {
  if (!hasOpsStore(env)) {
    throw new Error("The Ops database is not connected yet.");
  }
}

async function sha256Hex(bytes) {
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", bytes));
  return Array.from(digest, (b) => b.toString(16).padStart(2, "0")).join("");
}
const sha256Text = (text) => sha256Hex(new TextEncoder().encode(text));

// ---------------------------------------------------------------------------
// Reads
// ---------------------------------------------------------------------------

export async function loadCareOverview(env, user) {
  requireStore(env);
  const overview = await opsRpc(env, "ops_care_overview", {
    p_email: user.email,
  });
  return {
    settings: { ...defaultCareSettings(), ...(overview?.settings ?? {}) },
    sender: overview?.sender ?? null,
    templates: overview?.templates ?? [],
    assets: overview?.assets ?? [],
    exceptions: overview?.exceptions ?? [],
    exceptionTasks: overview?.exception_tasks ?? [],
    recent: overview?.recent ?? [],
    queued: overview?.queued ?? [],
  };
}

async function loadSettings(env, actor) {
  const settings = await opsRpc(env, "ops_care_settings_get", {
    p_actor: actor,
  });
  return { ...defaultCareSettings(), ...(settings ?? {}) };
}

async function loadContent(env, actor) {
  return opsRpc(env, "ops_care_active_content", { p_actor: actor });
}

async function loadRecord(env, actor, orderId) {
  return opsRpc(env, "ops_care_record_get", {
    p_actor: actor,
    p_order_id: orderId,
  });
}

// ---------------------------------------------------------------------------
// Shopify
// ---------------------------------------------------------------------------

const CARE_ORDER_FIELDS = `
  legacyResourceId
  name
  createdAt
  cancelledAt
  test
  tags
  email
  customer { firstName email }
  lineItems(first: 50) { nodes { name sku } }
`;

function mapCareOrder(node) {
  return {
    legacyId: String(node.legacyResourceId),
    name: node.name,
    createdAt: node.createdAt,
    cancelledAt: node.cancelledAt || null,
    test: Boolean(node.test),
    tags: node.tags ?? [],
    email: node.email || node.customer?.email || "",
    firstName: node.customer?.firstName || null,
    lineItems: node.lineItems?.nodes ?? [],
  };
}

/** The fields the automation needs, read live from Shopify by immutable ID. */
export async function getCareOrder(env, orderId) {
  const data = await adminGraphql(
    env,
    `query CareOrder($id: ID!) { order(id: $id) { ${CARE_ORDER_FIELDS} } }`,
    { id: `gid://shopify/Order/${orderId}` },
  );
  if (!data.order) {
    throw new Error("Order not found in Shopify.");
  }
  return mapCareOrder(data.order);
}

/** Orders created at or after `since`, oldest first. */
export async function listOrdersCreatedSince(
  env,
  since,
  { maxPages = 5 } = {},
) {
  const orders = [];
  let after = null;
  let complete = true;
  for (let page = 0; page < maxPages; page++) {
    const data = await adminGraphql(
      env,
      `query CareIntake($q: String!, $after: String) {
        orders(first: 50, after: $after, sortKey: CREATED_AT, query: $q) {
          nodes { ${CARE_ORDER_FIELDS} }
          pageInfo { hasNextPage endCursor }
        }
      }`,
      { q: `created_at:>='${since}'`, after },
    );
    orders.push(...data.orders.nodes.map(mapCareOrder));
    if (!data.orders.pageInfo.hasNextPage) {
      return { orders, complete };
    }
    after = data.orders.pageInfo.endCursor;
  }
  complete = false;
  return { orders, complete };
}

// ---------------------------------------------------------------------------
// Gmail sender connection
// ---------------------------------------------------------------------------

function encryptionKey(env) {
  if (!/^[a-f0-9]{64}$/i.test(env.OPS_CONNECTION_ENCRYPTION_KEY || "")) {
    throw googleConnectError(
      "no_key",
      "Private connection encryption is not configured.",
    );
  }
  return Uint8Array.from(env.OPS_CONNECTION_ENCRYPTION_KEY.match(/../g), (s) =>
    Number.parseInt(s, 16),
  );
}

/** Store Haven's sending grant. Only her own mailbox, only with both scopes. */
export async function saveCareSender(env, user, tokens, deps = {}) {
  if (user.email !== CARE_SENDER_EMAIL) {
    throw googleConnectError(
      "care_account",
      "Only Haven's mailbox can send as care@.",
    );
  }
  const scopes = new Set(String(tokens.scope || "").split(" "));
  if (!scopes.has(GMAIL_SEND_SCOPE) || !scopes.has(GMAIL_READ_SCOPE)) {
    throw googleConnectError(
      "care_missing_scopes",
      "Please grant both the send and read mail permissions.",
    );
  }
  if (!tokens.refresh_token) {
    throw googleConnectError(
      "no_refresh_token",
      "Google did not return a refresh token.",
    );
  }
  const encrypted = await new CompactEncrypt(
    new TextEncoder().encode(tokens.refresh_token),
  )
    .setProtectedHeader({ alg: "dir", enc: "A256GCM" })
    .encrypt(encryptionKey(env));
  await opsRpc(env, "ops_care_save_sender", {
    p_email: user.email,
    p_sender_email: user.email,
    p_token: encrypted,
    p_scopes: [...scopes].join(" "),
  });
  return checkSendAs(env, user.email, deps);
}

async function senderAccess(env, actor, fetchImpl = fetch) {
  const sender = await opsRpc(env, "ops_care_sender_get", { p_actor: actor });
  if (!sender) {
    return {
      sender: null,
      accessToken: null,
      problem: "care@ sender is not connected.",
    };
  }
  const { plaintext } = await compactDecrypt(
    sender.refresh_token,
    encryptionKey(env),
  );
  const response = await fetchImpl("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: new TextDecoder().decode(plaintext),
      client_id: env.OPS_GOOGLE_CLIENT_ID,
      client_secret: env.OPS_GOOGLE_CLIENT_SECRET,
    }),
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) {
    return {
      sender,
      accessToken: null,
      problem:
        "Gmail access expired or was revoked. Reconnect the care@ sender.",
    };
  }
  const { access_token: accessToken } = await response.json();
  return { sender, accessToken, problem: null };
}

/**
 * Confirm care@ is a send-as identity of Haven's mailbox. Records the result
 * and returns the alias's Gmail signature (HTML) for the signature step.
 */
export async function checkSendAs(env, actor, deps = {}) {
  const fetchImpl = deps.fetch ?? fetch;
  const { sender, accessToken, problem } = await senderAccess(
    env,
    actor,
    fetchImpl,
  );
  if (!sender || !accessToken) {
    if (sender) {
      await opsRpc(env, "ops_care_sender_checked", {
        p_actor: actor,
        p_ok: false,
        p_display_name: null,
        p_problem: problem,
      });
    }
    return { ok: false, problem };
  }
  const response = await fetchImpl(`${GMAIL}/settings/sendAs`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    signal: AbortSignal.timeout(15_000),
  });
  let result;
  if (!response.ok) {
    result = {
      ok: false,
      problem: `Gmail refused the send-as check (${response.status}).`,
    };
  } else {
    const { sendAs = [] } = await response.json();
    const alias = sendAs.find(
      (s) => String(s.sendAsEmail).toLowerCase() === CARE_FROM_ADDRESS,
    );
    if (!alias) {
      result = {
        ok: false,
        problem:
          "care@moderncre8ve.com is not a send-as address in Haven's Gmail.",
      };
    } else if (
      alias.verificationStatus &&
      alias.verificationStatus !== "accepted"
    ) {
      result = {
        ok: false,
        problem: `care@ send-as is ${alias.verificationStatus}, not verified.`,
      };
    } else {
      result = {
        ok: true,
        displayName: alias.displayName || null,
        signature: alias.signature || "",
        problem: null,
      };
    }
  }
  await opsRpc(env, "ops_care_sender_checked", {
    p_actor: actor,
    p_ok: result.ok,
    p_display_name: result.displayName ?? null,
    p_problem: result.problem,
  });
  return result;
}

/**
 * The only function that sends an email. Every rule is checked again here.
 * Returns { status: accepted|failed|uncertain, ... }; it never throws after
 * the request has been made.
 */
export async function sendCareMessage({
  settings,
  job,
  prepared,
  pdfBase64,
  sender,
  accessToken,
  fetchImpl = fetch,
  now = new Date(),
}) {
  assertSendable({ settings, job, to: prepared.to, sender });
  const raw = buildMime({
    fromName: prepared.fromName,
    from: prepared.from,
    to: prepared.to,
    replyTo: prepared.replyTo,
    subject: prepared.subject,
    text: prepared.text,
    html: prepared.html,
    attachment: { filename: prepared.attachment.filename, base64: pdfBase64 },
    messageId: job.rfc822_message_id,
    date: now,
  });
  let response;
  try {
    response = await fetchImpl(`${GMAIL}/messages/send`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ raw: base64Url(raw) }),
      signal: AbortSignal.timeout(25_000),
    });
  } catch (error) {
    return {
      status: "uncertain",
      note: `No response from Gmail (${error?.name || "error"}).`,
    };
  }
  const status = classifyGmailResult({ status: response.status });
  if (status === "accepted") {
    const body = await response.json().catch(() => ({}));
    return {
      status,
      providerMessageId: body.id ?? null,
      providerThreadId: body.threadId ?? null,
      acceptedAt: new Date(),
    };
  }
  return {
    status,
    note:
      status === "failed"
        ? `Gmail refused the message (${response.status}).`
        : `Gmail error ${response.status}; it may have been sent.`,
  };
}

/** Look for an uncertain send in Haven's mailbox by its fixed Message-ID. */
async function findSent(accessToken, rfc822Id, fetchImpl) {
  const q = `rfc822msgid:${rfc822Id.replace(/[<>]/g, "")} in:anywhere`;
  const response = await fetchImpl(
    `${GMAIL}/messages?maxResults=1&q=${encodeURIComponent(q)}`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
      signal: AbortSignal.timeout(15_000),
    },
  );
  if (!response.ok) {
    throw new Error(`Gmail search failed (${response.status}).`);
  }
  const { messages = [] } = await response.json();
  if (!messages.length) {
    return null;
  }
  const detail = await fetchImpl(
    `${GMAIL}/messages/${encodeURIComponent(messages[0].id)}?format=minimal`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
      signal: AbortSignal.timeout(15_000),
    },
  );
  const info = detail.ok ? await detail.json() : {};
  return {
    id: messages[0].id,
    threadId: messages[0].threadId ?? info.threadId ?? null,
    acceptedAt: info.internalDate ? new Date(Number(info.internalDate)) : null,
  };
}

// ---------------------------------------------------------------------------
// The due worker
// ---------------------------------------------------------------------------

/**
 * Seven days after the actual send. A test reminder sent early (by the
 * order-scoped override) would otherwise get its own date again, so the next
 * one is never on or before the date of the reminder just sent.
 */
export function nextDueAfterSend(job, acceptedAt, settings) {
  const byActual = nextReminderOn(acceptedAt, settings);
  if (job.template_key !== "CARE-02") {
    return byActual;
  }
  const byAnchor = addDays(job.anchor, CARE_REMINDER_DAYS);
  return byActual > byAnchor ? byActual : byAnchor;
}

async function recordAccepted(env, actor, job, settings, result) {
  const acceptedAt = result.acceptedAt ?? new Date();
  await opsRpc(env, "ops_care_record_outcome", {
    p_actor: actor,
    p_job_id: job.id,
    p_outcome: {
      status: "accepted",
      accepted_at: acceptedAt.toISOString(),
      provider_message_id: result.providerMessageId,
      provider_thread_id: result.providerThreadId,
      gmail_url: gmailThreadUrl(result.providerThreadId) ?? "",
      note: result.note ?? "",
      ...(result.snapshot ? { snapshot: result.snapshot } : {}),
    },
    p_sent_on: localDate(acceptedAt, settings.timezone),
    p_next_due_on: nextDueAfterSend(job, acceptedAt, settings),
  });
}

async function verifiedPdf(env, actor, content) {
  const pdf = content?.pdf;
  if (!pdf) {
    throw new Error("No approved blank logistics PDF is active.");
  }
  const text = await opsRpc(env, "ops_care_pdf_content", {
    p_actor: actor,
    p_version: pdf.version,
  });
  if (!text) {
    throw new Error("The approved PDF could not be retrieved.");
  }
  const bytes = base64ToBytes(text);
  if ((await sha256Hex(bytes)) !== pdf.sha256) {
    throw new Error("The stored PDF does not match its approved version.");
  }
  return text;
}

/**
 * 1. Intake: live mode with CARE-01 on only (test orders are enrolled by hand).
 * Orders come oldest first and every one seen is handled, so the cursor can
 * move to the newest seen even when the scan hit its page cap (the rest are
 * picked up next time). Any error skips the cursor move, so a failed scan
 * repeats; scheduling is idempotent.
 */
async function intakeStep(ctx) {
  const { env, actor, settings, result } = ctx;
  if (
    ctx.orderId ||
    settings.mode !== "live" ||
    !settings.live_rules["CARE-01"] ||
    !settings.intake_started_at
  ) {
    return;
  }
  const cursor = settings.intake_cursor ?? settings.intake_started_at;
  const since = new Date(
    Math.max(
      Date.parse(settings.intake_started_at),
      Date.parse(cursor) - 3600_000,
    ),
  ).toISOString();
  const { orders } = await listOrdersCreatedSince(env, since);
  let newest = cursor;
  for (const order of orders) {
    const record = await loadRecord(env, actor, order.legacyId);
    if (intakeEligibility(order, record, settings).eligible) {
      const job = await opsRpc(env, "ops_care_schedule", {
        p_actor: actor,
        p_order_id: order.legacyId,
        p_order_name: order.name,
        p_template_key: "CARE-01",
        p_anchor: "1",
        p_due_at: care01DueAt(order.createdAt, settings).toISOString(),
        p_enrolment: "auto",
      });
      if (job) {
        result.intake += 1;
      }
    }
    if (Date.parse(order.createdAt) > Date.parse(newest)) {
      newest = order.createdAt;
    }
  }
  if (newest !== cursor) {
    await opsRpc(env, "ops_care_advance_cursor", {
      p_actor: actor,
      p_expected: settings.intake_cursor,
      p_new: newest,
    });
  }
}

/** 2. Plan the next reminder for enrolled orders still awaiting the form. */
async function planStep(ctx) {
  const { env, actor, settings, result } = ctx;
  const reminderOn =
    settings.mode === "test" ||
    (settings.mode === "live" && settings.live_rules["CARE-02"]);
  if (!reminderOn) {
    return;
  }
  const candidates = await opsRpc(env, "ops_care_plan_candidates", {
    p_actor: actor,
  });
  for (const c of candidates ?? []) {
    const outOfScope =
      (ctx.orderId && c.order_id !== ctx.orderId) ||
      (settings.mode === "test" &&
        !settings.test_order_ids.includes(c.order_id));
    if (outOfScope) {
      continue;
    }
    const job = await opsRpc(env, "ops_care_schedule", {
      p_actor: actor,
      p_order_id: c.order_id,
      p_order_name: c.order_name,
      p_template_key: "CARE-02",
      p_anchor: c.reminder_next_due_on,
      p_due_at: care02DueAt(c.reminder_next_due_on, settings).toISOString(),
      p_enrolment: null,
    });
    if (job) {
      result.planned += 1;
    }
  }
}

/**
 * 3. Leases left by a dead worker become uncertain; uncertain sends are looked
 * up in Gmail by their Message-ID, never resent.
 */
async function reconcileStep(ctx) {
  const { env, actor, settings, result, now } = ctx;
  await opsRpc(env, "ops_care_expire_leases", {
    p_actor: actor,
    p_now: now.toISOString(),
  });
  const uncertain = await opsRpc(env, "ops_care_uncertain", {
    p_actor: actor,
  });
  for (const job of uncertain ?? []) {
    const elapsed =
      (now - new Date(job.last_attempt_at ?? job.updated_at)) / 60000;
    const step = job.reconcile_attempts;
    const notYet =
      (ctx.orderId && job.order_id !== ctx.orderId) ||
      step >= CARE_RECONCILE_AFTER.length ||
      elapsed < CARE_RECONCILE_AFTER[step];
    if (notYet) {
      continue;
    }
    const { accessToken } = await ctx.access();
    if (!accessToken) {
      return;
    }
    const found = await findSent(
      accessToken,
      job.rfc822_message_id,
      ctx.fetchImpl,
    );
    if (found) {
      await recordAccepted(env, actor, job, settings, {
        providerMessageId: found.id,
        providerThreadId: found.threadId,
        acceptedAt: found.acceptedAt ?? new Date(job.last_attempt_at),
        note: "Found in Gmail Sent after an uncertain response.",
      });
      result.reconciled += 1;
    } else {
      await opsRpc(env, "ops_care_reconcile_miss", {
        p_actor: actor,
        p_job_id: job.id,
        p_give_up: step + 1 >= CARE_RECONCILE_AFTER.length,
      });
    }
  }
}

/**
 * Decide, prepare and send one due job. Returns the result key to count
 * ("sent", "held", "suppressed", "waiting", "failed", "uncertain").
 */
async function sendOne(ctx, job) {
  const { env, actor, settings, now } = ctx;
  const record = await loadRecord(env, actor, job.order_id);
  // Checks that need no Shopify call first, then with the live order.
  const pre = careBlockReason({ job, record, settings, order: null, now });
  const order = pre ? null : await getCareOrder(env, job.order_id);
  const block = pre ?? careBlockReason({ job, record, settings, order, now });
  if (block?.action === "wait") {
    return "waiting";
  }
  if (block) {
    const status = block.action === "hold" ? "held" : "suppressed";
    await setStatus(env, actor, job, status, block.reason);
    return status;
  }
  ctx.content ??= await loadContent(env, actor);
  let prepared;
  try {
    prepared = prepareCareEmail({
      job,
      settings,
      content: ctx.content,
      record,
      order,
    });
  } catch (error) {
    await setStatus(env, actor, job, "held", error.message);
    return "held";
  }
  const { sender, accessToken, problem } = await ctx.access();
  if (!(accessToken && sender?.send_as_ok)) {
    // Not this order's fault: leave it queued and say so once.
    ctx.senderProblem = problem || "care@ send-as is not verified.";
    return "waiting";
  }
  const claimed = await opsRpc(env, "ops_care_claim", {
    p_actor: actor,
    p_job_id: job.id,
    p_record_updated_at: record.updated_at,
    p_settings_updated_at: settings.updated_at,
    p_lease_until: new Date(
      now.getTime() + CARE_LEASE_MINUTES * 60000,
    ).toISOString(),
  });
  if (!claimed) {
    return "waiting";
  }
  ctx.attempts += 1;
  let pdfBase64;
  try {
    pdfBase64 = await verifiedPdf(env, actor, ctx.content);
  } catch (error) {
    await setStatus(
      env,
      actor,
      claimed,
      "held",
      error.message,
      prepared.snapshot,
    );
    return "held";
  }
  const confirmed = await opsRpc(env, "ops_care_confirm", {
    p_actor: actor,
    p_job_id: claimed.id,
    p_record_updated_at: record.updated_at,
    p_settings_updated_at: settings.updated_at,
  });
  if (!confirmed) {
    return "waiting";
  }
  const outcome = await sendCareMessage({
    settings,
    job: claimed,
    prepared,
    pdfBase64,
    sender,
    accessToken,
    fetchImpl: ctx.fetchImpl,
    now,
  });
  if (outcome.status === "accepted") {
    await recordAccepted(env, actor, claimed, settings, {
      ...outcome,
      snapshot: prepared.snapshot,
    });
    return "sent";
  }
  await opsRpc(env, "ops_care_record_outcome", {
    p_actor: actor,
    p_job_id: claimed.id,
    p_outcome: {
      status: outcome.status,
      note: outcome.note,
      snapshot: prepared.snapshot,
    },
    p_sent_on: null,
    p_next_due_on: null,
  });
  return outcome.status;
}

/** 4. Send what is due, at most CARE_SENDS_PER_TICK attempts. */
async function sendStep(ctx) {
  const { env, actor, result } = ctx;
  ctx.settings = await loadSettings(env, actor);
  const due = await opsRpc(env, "ops_care_due", {
    p_actor: actor,
    p_now: ctx.now.toISOString(),
    // Read more than we send, so paused or waiting jobs can't starve others.
    p_limit: CARE_SENDS_PER_TICK * 10,
    p_order_id: ctx.orderId,
  });
  for (const job of due ?? []) {
    if (ctx.attempts >= CARE_SENDS_PER_TICK) {
      return;
    }
    try {
      result[await sendOne(ctx, job)] += 1;
    } catch (error) {
      ctx.note(`send ${job.template_key} ${job.order_name}`, error);
    }
  }
}

/**
 * One run of the worker: intake, reminder planning, reconciliation, sending.
 * Safe to run at any time and any number of times. Returns counts only.
 */
export async function runCareTick(
  env,
  {
    actor = CARE_SYSTEM_ACTOR,
    now = new Date(),
    orderId = null,
    deps = {},
  } = {},
) {
  requireStore(env);
  const result = {
    at: now.toISOString(),
    intake: 0,
    planned: 0,
    sent: 0,
    held: 0,
    suppressed: 0,
    failed: 0,
    uncertain: 0,
    reconciled: 0,
    waiting: 0,
    errors: [],
  };
  let access = null;
  const ctx = {
    env,
    actor,
    now,
    orderId,
    result,
    fetchImpl: deps.fetch ?? fetch,
    settings: await loadSettings(env, actor),
    content: null,
    attempts: 0,
    senderProblem: null,
    note: (step, error) =>
      result.errors.push(
        `${step}: ${error instanceof Error ? error.message : String(error)}`,
      ),
    access: async () => {
      access ??= await senderAccess(env, actor, ctx.fetchImpl);
      return access;
    },
  };
  const run = async (name, step) => {
    try {
      await step(ctx);
    } catch (error) {
      ctx.note(name, error);
    }
  };
  await run("intake", intakeStep);
  await run("plan", planStep);
  await run("reconcile", reconcileStep);
  await run("send", sendStep);
  if (ctx.senderProblem) {
    ctx.note("sender", ctx.senderProblem);
  }
  // Plan again so a reminder appears as soon as a send lands.
  if (result.sent || result.reconciled) {
    await run("plan", planStep);
  }
  await run("heartbeat", () =>
    opsRpc(env, "ops_care_heartbeat", { p_actor: actor, p_result: result }),
  );
  return result;
}

const JOB_ACTIONS = {
  release: "Released: it will be checked and sent at the next run.",
  retry: "Queued again. It will be checked and sent at the next run.",
  cancel: "Cancelled.",
  make_due: "Made due now.",
};

/** Release, retry, cancel or make due one queued email. */
async function jobAction(env, user, jobId, action) {
  if (!JOB_ACTIONS[action]) {
    throw new Error("Unknown action.");
  }
  try {
    await opsRpc(env, "ops_care_job_action", {
      p_email: user.email,
      p_job_id: jobId,
      p_action: action,
    });
  } catch {
    // Database messages are not shown (they can carry private content).
    throw new Error(
      action === "make_due"
        ? "Only queued emails for approved test orders in test mode can be made due."
        : "That isn't possible for this email now. Reload the page.",
    );
  }
  return JOB_ACTIONS[action];
}

function setStatus(env, actor, job, status, reason, snapshot = null) {
  return opsRpc(env, "ops_care_set_status", {
    p_actor: actor,
    p_job_id: job.id,
    p_status: status,
    p_reason: reason,
    p_snapshot: snapshot,
  });
}

// ---------------------------------------------------------------------------
// Preview and per-order controls
// ---------------------------------------------------------------------------

/** What CARE-01 / CARE-02 would look like for this order right now. Sends nothing. */
export async function previewCareEmails(env, user, order, record) {
  const settings = await loadSettings(env, user.email);
  const content = await loadContent(env, user.email);
  return CARE_TEMPLATE_KEYS.map((key) => {
    const job = { template_key: key, order_id: order.legacyId };
    try {
      const prepared = prepareCareEmail({
        job,
        settings,
        content,
        record: record ?? {},
        order,
      });
      return { key, ok: true, ...prepared };
    } catch (error) {
      return { key, ok: false, problem: error.message };
    }
  });
}

export async function loadCareOrder(env, user, orderId) {
  requireStore(env);
  const [messages, settings] = await Promise.all([
    opsRpc(env, "ops_care_order", { p_email: user.email, p_order_id: orderId }),
    loadSettings(env, user.email),
  ]);
  return { messages: messages ?? [], settings };
}

/** Per-order automation actions from the order's Communications page. */
export async function careOrderAction(
  env,
  user,
  order,
  form,
  { now = new Date(), deps = {} } = {},
) {
  const intent = String(form.get("intent") || "");
  const text = (name) => String(form.get(name) ?? "").trim();
  const settings = await loadSettings(env, user.email);
  const setOrder = (change) =>
    opsRpc(env, "ops_care_set_order", {
      p_email: user.email,
      p_order_id: order.legacyId,
      p_order_name: order.name,
      p_change: change,
    });
  switch (intent) {
    case "care-enrol": {
      if (settings.mode === "off") {
        throw new Error("Automation is off. Choose test or live mode first.");
      }
      if (
        settings.mode === "test" &&
        !settings.test_order_ids.includes(order.legacyId)
      ) {
        throw new Error(
          "In test mode only approved test orders can be enrolled.",
        );
      }
      const careOrder = await getCareOrder(env, order.legacyId);
      if (careOrder.cancelledAt) {
        throw new Error("This order is cancelled.");
      }
      const record = await loadRecord(env, user.email, order.legacyId);
      if (!record || record.logistics_status === "not_requested") {
        const job = await opsRpc(env, "ops_care_schedule", {
          p_actor: user.email,
          p_order_id: order.legacyId,
          p_order_name: order.name,
          p_template_key: "CARE-01",
          p_anchor: "1",
          p_due_at: care01DueForEnrolment(careOrder.createdAt, now, settings, {
            manual: true,
          }).toISOString(),
          p_enrolment: "manual",
        });
        return job
          ? "Enrolled. The logistics request is queued."
          : "Already enrolled; nothing new was queued.";
      }
      if (record.logistics_status === "awaiting_return") {
        await setOrder({
          care_enrolment: "manual",
          reminders_enabled: true,
          summary: "Enrolled for automated form reminders.",
        });
        return record.reminder_next_due_on
          ? `Enrolled for reminders. The next one is planned for ${record.reminder_next_due_on}.`
          : "Enrolled for reminders, but the request date is unknown: set the next reminder date under Form reminder settings. No catch-up reminder is sent.";
      }
      throw new Error(
        "The form is already received for this order; nothing to send.",
      );
    }
    case "care-exclude":
      await setOrder({
        care_excluded: form.get("excluded") === "on",
        summary:
          form.get("excluded") === "on"
            ? "Excluded from automated emails."
            : "Automated emails allowed again.",
      });
      return "Saved.";
    case "care-pause": {
      const until = text("until");
      if (until && !/^\d{4}-\d{2}-\d{2}$/.test(until)) {
        throw new Error("Choose a date.");
      }
      await setOrder({
        care_paused_until: until,
        summary: until
          ? `Automated emails paused until ${until}.`
          : "Automated email pause lifted.",
      });
      return "Saved.";
    }
    case "care-test-recipient": {
      const to = text("to") ? normalizeEmail(text("to")) : "";
      if (
        to &&
        (settings.mode !== "test" ||
          !settings.test_order_ids.includes(order.legacyId) ||
          !settings.test_recipients.includes(to))
      ) {
        throw new Error(
          "A test recipient needs test mode, an approved test order and an allowlisted address.",
        );
      }
      await setOrder({
        care_test_recipient: to ? normalizeEmail(to) : "",
        summary: to
          ? `Test recipient set to ${normalizeEmail(to)}.`
          : "Test recipient cleared.",
      });
      return "Saved.";
    }
    case "care-job":
      return jobAction(env, user, text("jobId"), text("action"));
    case "care-send-due": {
      // Test pilot: make this order's next email due and run the worker for it alone.
      if (
        settings.mode !== "test" ||
        !settings.test_order_ids.includes(order.legacyId)
      ) {
        throw new Error(
          "Only approved test orders in test mode can be sent early.",
        );
      }
      const jobId = text("jobId");
      if (jobId) {
        await jobAction(env, user, jobId, "make_due");
      }
      const result = await runCareTick(env, {
        actor: user.email,
        now: new Date(),
        orderId: order.legacyId,
        deps,
      });
      return tickSummary(result);
    }
    default:
      throw new Error("Unknown action.");
  }
}

export function tickSummary(r) {
  const parts = [
    r.sent && `${r.sent} sent`,
    r.held && `${r.held} held`,
    r.suppressed && `${r.suppressed} suppressed`,
    r.failed && `${r.failed} failed`,
    r.uncertain && `${r.uncertain} uncertain`,
    r.reconciled && `${r.reconciled} reconciled`,
    r.intake && `${r.intake} new orders queued`,
    r.planned && `${r.planned} reminders planned`,
    r.waiting && `${r.waiting} waiting`,
  ].filter(Boolean);
  const errors = r.errors.length ? ` Problems: ${r.errors.join("; ")}` : "";
  return `Worker ran: ${parts.length ? parts.join(", ") : "nothing due"}.${errors}`;
}

// ---------------------------------------------------------------------------
// Automation page actions
// ---------------------------------------------------------------------------

async function pdfAsset(file) {
  if (!file || typeof file === "string" || !file.size) {
    throw new Error("Choose the blank PDF file.");
  }
  if (file.size > CARE_PDF_MAX_BYTES) {
    throw new Error("The PDF is larger than 5 MB.");
  }
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (new TextDecoder().decode(bytes.subarray(0, 5)) !== "%PDF-") {
    throw new Error("That file is not a PDF.");
  }
  let pages;
  try {
    pages = (
      await PDFDocument.load(bytes, {
        ignoreEncryption: true,
        updateMetadata: false,
      })
    ).getPageCount();
  } catch {
    throw new Error("The PDF could not be read.");
  }
  if (pages !== CARE_PDF_PAGES) {
    throw new Error(
      `The blank form must have ${CARE_PDF_PAGES} pages; this one has ${pages}.`,
    );
  }
  return {
    kind: "logistics_blank_pdf",
    filename: String(file.name || "MODERNCRE8VE Delivery and Logistics.pdf")
      .replace(/["\r\n]/g, "")
      .slice(0, 200),
    content_base64: base64(bytes),
    sha256: await sha256Hex(bytes),
    byte_size: bytes.length,
    page_count: pages,
    source: "Uploaded in Ops",
  };
}

export async function careAdminAction(
  env,
  user,
  form,
  { now = new Date(), deps = {} } = {},
) {
  const intent = String(form.get("intent") || "");
  const text = (name) => String(form.get(name) ?? "");
  switch (intent) {
    case "settings": {
      const current = await loadSettings(env, user.email);
      const seen = text("updatedAt") || null;
      const input = {};
      for (const [field, key] of [
        ["timezone", "timezone"],
        ["sendHour", "sendHour"],
        ["holidays", "holidays"],
        ["testRecipients", "testRecipients"],
        ["testOrderIds", "testOrderIds"],
        ["excludedItemPatterns", "excludedItemPatterns"],
        ["fromName", "fromName"],
        ["replyTo", "replyTo"],
        ["mode", "mode"],
      ]) {
        if (form.has(field)) {
          input[key] = text(field);
        }
      }
      if (form.has("businessDaysPresent")) {
        input.businessDays = form.getAll("businessDays").map(String);
      }
      if (form.has("globalPausePresent")) {
        input.globalPause = form.get("globalPause") === "on";
      }
      if (form.has("liveRulesPresent")) {
        input.liveRules = Object.fromEntries(
          CARE_TEMPLATE_KEYS.map((k) => [k, form.get(`live-${k}`) === "on"]),
        );
      }
      const next = validateSettingsChange(current, input, now);
      await opsRpc(env, "ops_care_save_settings", {
        p_email: user.email,
        p_settings: {
          mode: next.mode,
          global_pause: next.global_pause,
          live_rules: next.live_rules,
          intake_started_at: next.intake_started_at,
          intake_cursor: next.intake_cursor,
          timezone: next.timezone,
          send_hour: next.send_hour,
          business_days: next.business_days,
          holidays: next.holidays,
          test_recipients: next.test_recipients,
          test_order_ids: next.test_order_ids,
          excluded_item_patterns: next.excluded_item_patterns,
          from_name: next.from_name,
          reply_to: next.reply_to,
        },
        p_expected_updated_at: seen,
      });
      return "Settings saved.";
    }
    case "pause": {
      const current = await loadSettings(env, user.email);
      const next = validateSettingsChange(
        current,
        { globalPause: form.get("paused") === "on" },
        now,
      );
      await opsRpc(env, "ops_care_save_settings", {
        p_email: user.email,
        p_settings: { global_pause: next.global_pause },
        p_expected_updated_at: current.updated_at,
      });
      return next.global_pause
        ? "All automated sending is paused."
        : "Global pause lifted.";
    }
    case "leave-test":
      await opsRpc(env, "ops_care_leave_test", { p_email: user.email });
      return "Test mode ended: overrides cleared, mode is off.";
    case "import-template": {
      const key = text("key");
      if (!CARE_TEMPLATE_KEYS.includes(key)) {
        throw new Error("Choose CARE-01 or CARE-02.");
      }
      let subject = text("subject").trim();
      let body = text("body").trim();
      if (text("export").trim()) {
        const parsed = parseTemplateExport(text("export"));
        subject ||= parsed.subject;
        body ||= parsed.body;
      }
      const neutralGreeting = text("neutralGreeting").trim();
      const problems = lintTemplate({ subject, body, neutralGreeting });
      if (problems.length) {
        throw new Error(`Not imported: ${problems.join(" ")}`);
      }
      const version = await opsRpc(env, "ops_care_import_template", {
        p_email: user.email,
        p_template: {
          key,
          subject,
          body_text: body,
          neutral_greeting: neutralGreeting,
          source_doc_id: text("sourceDocId").trim().slice(0, 200),
          source_revision: text("sourceRevision").trim().slice(0, 200),
          content_sha256: await sha256Text(
            JSON.stringify({ subject, body, neutralGreeting }),
          ),
        },
      });
      return `${key} version ${version} imported. Review the preview, then activate it.`;
    }
    case "activate-template": {
      await opsRpc(env, "ops_care_activate_template", {
        p_email: user.email,
        p_key: text("key"),
        p_version: Number(text("version")),
      });
      return `${text("key")} version ${text("version")} is now the sending copy.`;
    }
    case "upload-pdf": {
      const asset = await pdfAsset(form.get("file"));
      const version = await opsRpc(env, "ops_care_save_asset", {
        p_email: user.email,
        p_asset: asset,
      });
      return `PDF version ${version} uploaded (${asset.page_count} pages). Open it to check it, then approve it.`;
    }
    case "signature-text": {
      const body = text("signature").trim();
      if (!body) {
        throw new Error("Paste the approved signature.");
      }
      if (/—/.test(body)) {
        throw new Error("The signature contains an em dash.");
      }
      const version = await opsRpc(env, "ops_care_save_asset", {
        p_email: user.email,
        p_asset: {
          kind: "care_signature",
          text_content: body.slice(0, 5000),
          html: null,
          sha256: await sha256Text(body),
          byte_size: body.length,
          source: "Pasted in Ops",
        },
      });
      return `Signature version ${version} saved. Approve it to use it.`;
    }
    case "signature-gmail": {
      const check = await checkSendAs(env, user.email, deps);
      if (!check.ok) {
        throw new Error(check.problem);
      }
      if (!check.signature?.trim()) {
        throw new Error(
          "care@ has no signature set in Gmail. Paste the approved one instead.",
        );
      }
      const html = check.signature.slice(0, 20000);
      const plain = htmlToText(html).slice(0, 5000);
      const version = await opsRpc(env, "ops_care_save_asset", {
        p_email: user.email,
        p_asset: {
          kind: "care_signature",
          text_content: plain,
          html,
          sha256: await sha256Text(html),
          byte_size: html.length,
          source: "Copied from Gmail care@ send-as",
        },
      });
      return `Signature version ${version} copied from Gmail. Approve it to use it.`;
    }
    case "activate-asset":
      await opsRpc(env, "ops_care_activate_asset", {
        p_email: user.email,
        p_kind: text("kind"),
        p_version: Number(text("version")),
      });
      return "Approved and active.";
    case "check-sender": {
      const check = await checkSendAs(env, user.email, deps);
      return check.ok ? "care@ send-as is verified." : check.problem;
    }
    case "disconnect-sender":
      await opsRpc(env, "ops_care_disconnect_sender", { p_email: user.email });
      return "Sender disconnected. Also remove the grant in Haven's Google Account security settings.";
    case "care-job":
      return jobAction(env, user, text("jobId"), text("action"));
    case "run-tick":
      return tickSummary(
        await runCareTick(env, { actor: user.email, now: new Date(), deps }),
      );
    default:
      throw new Error("Unknown action.");
  }
}

/** The blank PDF, for the approver to open from the Automation page. */
export async function loadCarePdf(env, user, version) {
  const text = await opsRpc(env, "ops_care_pdf_content", {
    p_actor: user.email,
    p_version: version,
  });
  return text ? base64ToBytes(text) : null;
}

/** Bearer check for the scheduled worker; constant time on the hashes. */
export async function jobSecretMatches(env, header) {
  const secret = String(env.OPS_JOB_SECRET || "");
  if (secret.length < 32) {
    return false;
  }
  const given = String(header || "").replace(/^Bearer\s+/i, "");
  const [a, b] = await Promise.all([sha256Text(secret), sha256Text(given)]);
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}
