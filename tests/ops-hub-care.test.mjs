import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { PGlite } from "@electric-sql/pglite";
import { PDFDocument } from "pdf-lib";
import {
  assertSendable,
  buildMime,
  businessDayOnOrAfter,
  care01DueAt,
  care01DueForEnrolment,
  care02DueAt,
  careBlockReason,
  careRecipient,
  classifyGmailResult,
  composeBody,
  defaultCareSettings,
  formatOrderNumber,
  hasFurniture,
  intakeEligibility,
  lintTemplate,
  nextReminderOn,
  parseTemplateExport,
  renderTemplate,
  usableFirstName,
  validateSettingsChange,
  zonedTime,
} from "../app/utils/ops-care.js";
import {
  careAdminAction,
  careOrderAction,
  jobSecretMatches,
  runCareTick,
} from "../app/utils/ops-care.server.js";
import {
  applyLogisticsAction,
  emptyCommsRecord,
} from "../app/utils/ops-comms.js";
import { commsAction } from "../app/utils/ops-comms.server.js";

const settings = (over = {}) => ({
  ...defaultCareSettings(),
  send_hour: 10,
  ...over,
});

// ---------------------------------------------------------------------------
// Scheduling
// ---------------------------------------------------------------------------

test("next business day: Friday night, weekend and the UTC/ET date boundary", () => {
  const s = settings();
  // Friday 23:30 ET (Saturday 04:30 UTC) -> Monday 10:00 ET.
  assert.equal(
    care01DueAt("2026-11-21T04:30:00Z", s).toISOString(),
    "2026-11-23T15:00:00.000Z",
  );
  // Saturday -> Monday; Sunday -> Monday.
  assert.equal(
    care01DueAt("2026-11-21T18:00:00Z", s).toISOString(),
    "2026-11-23T15:00:00.000Z",
  );
  assert.equal(
    care01DueAt("2026-11-22T18:00:00Z", s).toISOString(),
    "2026-11-23T15:00:00.000Z",
  );
  // Wednesday 20:30 ET is Thursday 01:30 UTC: still Wednesday locally -> Thursday.
  assert.equal(
    care01DueAt("2026-11-19T01:30:00Z", s).toISOString(),
    "2026-11-19T15:00:00.000Z",
  );
  // Not a 24-hour delay: Monday 08:00 ET -> Tuesday 10:00 ET.
  assert.equal(
    care01DueAt("2026-11-16T13:00:00Z", s).toISOString(),
    "2026-11-17T15:00:00.000Z",
  );
});

test("holidays are skipped and DST is respected", () => {
  const s = settings({ holidays: ["2026-11-26", "2026-11-27"] });
  // Wednesday before Thanksgiving -> Monday.
  assert.equal(
    care01DueAt("2026-11-25T17:00:00Z", s).toISOString(),
    "2026-11-30T15:00:00.000Z",
  );
  // 10:00 New York is 14:00 UTC in summer, 15:00 UTC in winter.
  assert.equal(
    zonedTime("2026-07-01", 10, "America/New_York").toISOString(),
    "2026-07-01T14:00:00.000Z",
  );
  assert.equal(
    zonedTime("2026-11-02", 10, "America/New_York").toISOString(),
    "2026-11-02T15:00:00.000Z",
  );
  assert.equal(businessDayOnOrAfter("2026-11-28", s), "2026-11-30");
});

test("reminders: seven days after the actual send, rolled to a business day", () => {
  const s = settings({ holidays: ["2026-12-25"] });
  assert.equal(nextReminderOn("2026-11-18T15:00:00Z", s), "2026-11-25");
  // Accepted 23:00 ET on the 18th is the 19th in UTC: the local date counts.
  assert.equal(nextReminderOn("2026-11-19T04:00:00Z", s), "2026-11-25");
  assert.equal(
    care02DueAt("2026-12-25", s).toISOString(),
    "2026-12-28T15:00:00.000Z",
  );
  assert.equal(care02DueAt(null, s), null);
});

test("a deliberate enrolment never sends in the past", () => {
  const s = settings();
  const now = new Date("2026-11-18T16:00:00Z"); // Wed 11:00 ET, after today's slot
  const due = care01DueForEnrolment("2026-10-01T12:00:00Z", now, s, {
    manual: true,
  });
  assert.equal(due.toISOString(), "2026-11-19T15:00:00.000Z");
});

// ---------------------------------------------------------------------------
// Settings, eligibility, templates
// ---------------------------------------------------------------------------

test("settings: live rules need live mode and a sending hour; CARE-01 live starts intake now", () => {
  const now = new Date("2026-11-19T12:00:00Z");
  const base = defaultCareSettings();
  assert.throws(
    () => validateSettingsChange(base, { liveRules: { "CARE-01": true } }, now),
    /live mode/,
  );
  assert.throws(
    () =>
      validateSettingsChange(
        base,
        { mode: "live", liveRules: { "CARE-01": true } },
        now,
      ),
    /sending hour/,
  );
  const live = validateSettingsChange(
    base,
    { mode: "live", sendHour: "10", liveRules: { "CARE-01": true } },
    now,
  );
  assert.equal(live.intake_started_at, now.toISOString());
  assert.equal(live.intake_cursor, now.toISOString());
  const later = validateSettingsChange(
    live,
    { liveRules: { "CARE-02": true } },
    new Date("2026-12-01T00:00:00Z"),
  );
  assert.equal(later.intake_started_at, now.toISOString(), "never re-stamped");
  assert.throws(
    () => validateSettingsChange(base, { testOrderIds: "#1839" }),
    /order ID/,
  );
  assert.throws(
    () => validateSettingsChange(base, { testRecipients: "not-an-email" }),
    /email/,
  );
  assert.throws(
    () => validateSettingsChange(base, { timezone: "Mars/Base" }),
    /time zone/,
  );
});

test("intake: only new furniture orders with an email, no backfill, no test/cancelled", () => {
  const s = settings({ intake_started_at: "2026-11-19T00:00:00Z" });
  const order = {
    createdAt: "2026-11-20T15:00:00Z",
    email: "c@example.com",
    tags: [],
    lineItems: [{ name: "Walnut Dining Table" }],
  };
  assert.equal(intakeEligibility(order, null, s).eligible, true);
  assert.match(
    intakeEligibility({ ...order, createdAt: "2026-11-18T15:00:00Z" }, null, s)
      .reason,
    /before/,
  );
  assert.match(
    intakeEligibility({ ...order, cancelledAt: "x" }, null, s).reason,
    /Cancelled/,
  );
  assert.match(
    intakeEligibility({ ...order, test: true }, null, s).reason,
    /test/,
  );
  assert.match(
    intakeEligibility({ ...order, tags: ["ops-no-care"] }, null, s).reason,
    /Tagged/,
  );
  assert.match(
    intakeEligibility({ ...order, email: "" }, null, s).reason,
    /email/,
  );
  assert.match(
    intakeEligibility(
      { ...order, lineItems: [{ name: "Furniture Wax 8oz" }] },
      null,
      s,
    ).reason,
    /furniture/,
  );
  assert.match(
    intakeEligibility(
      order,
      { ...emptyCommsRecord(), logistics_status: "awaiting_return" },
      s,
    ).reason,
    /already/,
  );
  assert.match(
    intakeEligibility(order, { ...emptyCommsRecord(), care_excluded: true }, s)
      .reason,
    /Excluded/,
  );
  assert.equal(hasFurniture([{ name: "Wax" }, { name: "Oak Bench" }]), true);
});

const approved = {
  subject: "Delivery details for your order [order_number]",
  body: "Hi [first_name],\n\nThank you for your order [order_number]. Please complete the attached form.\n\nWe look forward to hearing from you.",
  neutralGreeting: "Hello,",
};

test("template lint catches em dashes, stray notes, sign-offs and greeting rules", () => {
  assert.deepEqual(lintTemplate(approved), []);
  assert.match(
    lintTemplate({ ...approved, body: `${approved.body} — thanks` }).join(),
    /em dash/,
  );
  assert.match(
    lintTemplate({
      ...approved,
      body: `${approved.body}\n[insert link]`,
    }).join(),
    /Unknown placeholder/,
  );
  assert.match(
    lintTemplate({
      ...approved,
      body: `${approved.body}\n\nWarmly,\nHaven`,
    }).join(),
    /sign-off/,
  );
  assert.match(
    lintTemplate({ ...approved, body: `${approved.body}\n\nBest,` }).join(),
    /sign-off/,
  );
  assert.match(
    lintTemplate({ ...approved, neutralGreeting: "" }).join(),
    /greeting/,
  );
  assert.match(
    lintTemplate({ ...approved, subject: "Order #[order_number]" }).join(),
    /without a #/,
  );
  assert.match(
    lintTemplate({
      ...approved,
      body: `Trigger: next business day\n${approved.body}`,
    }).join(),
    /internal note|first \(greeting\)/,
  );
});

test("parsing a pasted Doc tab drops the trigger and internal notes", () => {
  const exported = [
    "CARE-01 Delivery logistics request",
    "Trigger: next business day after the order",
    "Subject: Delivery details for your order [order_number]",
    "Body:",
    approved.body,
    "",
    "Internal notes: attach the blank PDF.",
  ].join("\n");
  const parsed = parseTemplateExport(exported);
  assert.equal(parsed.subject, approved.subject);
  assert.equal(parsed.body, approved.body);
  assert.throws(() => parseTemplateExport("no subject here"), /Subject/);
});

test("render: one #, neutral greeting, no guessing names, signature once", () => {
  const template = {
    subject: approved.subject,
    body_text: approved.body,
    neutral_greeting: "Hello,",
  };
  assert.equal(formatOrderNumber("##1839"), "#1839");
  assert.equal(formatOrderNumber("1839"), "#1839");
  const named = renderTemplate(template, {
    firstName: " Ana ",
    orderName: "#1839",
  });
  assert.equal(named.subject, "Delivery details for your order #1839");
  assert.match(named.text, /^Hi Ana,/);
  assert.doesNotMatch(named.text, /##/);
  const anon = renderTemplate(template, { firstName: "", orderName: "#1839" });
  assert.match(anon.text, /^Hello,\n/);
  assert.equal(usableFirstName("ana@example.com"), null);
  assert.equal(
    usableFirstName("Ana Maria"),
    "Ana Maria",
    "used as given, never split",
  );
  assert.throws(
    () =>
      renderTemplate(
        { ...template, body_text: "Hi [first_name], [po]" },
        { firstName: "A", orderName: "#1" },
      ),
    /Unresolved/,
  );
  const body = composeBody(named, {
    text: "MODERNCRE8VE Care\ncare@moderncre8ve.com",
  });
  assert.equal(
    body.text.split("MODERNCRE8VE Care").length,
    2,
    "signature exactly once",
  );
  assert.throws(
    () =>
      composeBody(
        { text: `${named.text}\nMODERNCRE8VE Care` },
        { text: "MODERNCRE8VE Care" },
      ),
    /already contains/,
  );
});

// ---------------------------------------------------------------------------
// Send gate
// ---------------------------------------------------------------------------

test("send gate: mode, pause, live rules and the test allowlist all fail closed", () => {
  const job = { template_key: "CARE-01", order_id: "100" };
  const sender = { email: "haven@moderncre8ve.com", send_as_ok: true };
  const test = settings({
    mode: "test",
    test_order_ids: ["100"],
    test_recipients: ["haven@moderncre8ve.com"],
  });
  assert.doesNotThrow(() =>
    assertSendable({
      settings: test,
      job,
      to: "haven@moderncre8ve.com",
      sender,
    }),
  );
  assert.throws(
    () =>
      assertSendable({
        settings: test,
        job,
        to: "customer@example.com",
        sender,
      }),
    /allowlist/,
  );
  assert.throws(
    () =>
      assertSendable({
        settings: test,
        job: { ...job, order_id: "200" },
        to: "haven@moderncre8ve.com",
        sender,
      }),
    /test order/,
  );
  assert.throws(
    () =>
      assertSendable({
        settings: { ...test, global_pause: true },
        job,
        to: "haven@moderncre8ve.com",
        sender,
      }),
    /pause/,
  );
  assert.throws(
    () =>
      assertSendable({
        settings: settings(),
        job,
        to: "x@example.com",
        sender,
      }),
    /off/,
  );
  assert.throws(
    () =>
      assertSendable({
        settings: settings({ mode: "live" }),
        job,
        to: "x@example.com",
        sender,
      }),
    /not on/,
  );
  assert.throws(
    () =>
      assertSendable({
        settings: test,
        job,
        to: "haven@moderncre8ve.com",
        sender: { ...sender, send_as_ok: false },
      }),
    /send-as/,
  );
  // The test override must itself be allowlisted.
  const order = { email: "customer@example.com" };
  assert.equal(
    careRecipient({
      order,
      record: { care_test_recipient: "haven@moderncre8ve.com" },
      settings: test,
    }),
    "haven@moderncre8ve.com",
  );
  assert.equal(careRecipient({ order, record: {}, settings: test }), null);
  assert.equal(
    careRecipient({ order, record: {}, settings: settings({ mode: "live" }) }),
    "customer@example.com",
  );
});

test("block reasons: receipt suppresses reminders; pauses wait; unknown dates never send", () => {
  const s = settings({
    mode: "test",
    test_order_ids: ["1"],
    test_recipients: ["t@example.com"],
  });
  const now = new Date("2026-11-19T15:00:00Z");
  const awaiting = {
    ...emptyCommsRecord(),
    logistics_status: "awaiting_return",
    reminders_enabled: true,
    reminder_next_due_on: "2026-11-19",
  };
  const job = { template_key: "CARE-02", order_id: "1" };
  assert.equal(
    careBlockReason({ job, record: awaiting, settings: s, now }),
    null,
  );
  const received = applyLogisticsAction(
    awaiting,
    "form_received",
    {},
    { actor: "haven@moderncre8ve.com" },
  ).record;
  assert.equal(
    careBlockReason({ job, record: received, settings: s, now }).action,
    "suppress",
  );
  assert.equal(
    careBlockReason({
      job,
      record: { ...awaiting, reminders_paused: true },
      settings: s,
      now,
    }).action,
    "wait",
  );
  assert.equal(
    careBlockReason({
      job,
      record: { ...awaiting, care_paused_until: "2026-11-20" },
      settings: s,
      now,
    }).action,
    "wait",
  );
  assert.equal(
    careBlockReason({
      job,
      record: { ...awaiting, reminder_next_due_on: null },
      settings: s,
      now,
    }).action,
    "suppress",
  );
  assert.equal(
    careBlockReason({
      job,
      record: awaiting,
      settings: s,
      now,
      order: { cancelledAt: "x" },
    }).action,
    "suppress",
  );
  assert.equal(
    careBlockReason({
      job,
      record: awaiting,
      settings: s,
      now,
      order: { email: "c@example.com" },
    }).action,
    "hold",
  );
});

test("MIME: identity, Reply-To, Message-ID, attachment; Gmail outcomes classified honestly", () => {
  const mime = buildMime({
    fromName: "MODERNCRE8VE",
    from: "care@moderncre8ve.com",
    to: "t@example.com",
    replyTo: "care@moderncre8ve.com",
    subject: "Delivery details for your order #1839",
    text: "Hi",
    html: "<p>Hi</p>",
    attachment: { filename: "form.pdf", base64: "JVBERi0=" },
    messageId: "<care-x-1@moderncre8ve.com>",
    date: new Date("2026-11-19T15:00:00Z"),
  });
  assert.match(mime, /^From: MODERNCRE8VE <care@moderncre8ve.com>\r\n/);
  assert.match(mime, /\r\nReply-To: care@moderncre8ve.com\r\n/);
  assert.match(mime, /\r\nMessage-ID: <care-x-1@moderncre8ve.com>\r\n/);
  assert.match(mime, /Content-Type: application\/pdf; name="form.pdf"/);
  assert.throws(
    () =>
      buildMime({
        fromName: "A",
        from: "a@b.c",
        to: "x@y.z\r\nBcc: e@v.il",
        replyTo: "a@b.c",
        subject: "s",
        text: "",
        html: "",
        messageId: "<m>",
      }),
    /line breaks/,
  );
  assert.equal(classifyGmailResult({ status: 200 }), "accepted");
  assert.equal(classifyGmailResult({ status: 400 }), "failed");
  assert.equal(classifyGmailResult({ status: 503 }), "uncertain");
  assert.equal(
    classifyGmailResult({ error: new Error("timeout") }),
    "uncertain",
  );
});

test("job secret: required, long, and compared exactly", async () => {
  const env = { OPS_JOB_SECRET: "s".repeat(40) };
  assert.equal(await jobSecretMatches(env, `Bearer ${"s".repeat(40)}`), true);
  assert.equal(await jobSecretMatches(env, `Bearer ${"s".repeat(39)}`), false);
  assert.equal(
    await jobSecretMatches({ OPS_JOB_SECRET: "short" }, "Bearer short"),
    false,
  );
  assert.equal(await jobSecretMatches({}, "Bearer "), false);
});

// ---------------------------------------------------------------------------
// End to end against Postgres, with fake Shopify and Gmail
// ---------------------------------------------------------------------------

const ENC_KEY = "a".repeat(64);
const ORDER_ID = "6001839";
const TEST_TO = "haven.test@moderncre8ve.com";

async function setup(t) {
  const db = new PGlite();
  t.after(() => db.close());
  await db.exec(
    "create role anon; create role authenticated; create role service_role bypassrls;",
  );
  const read = (f) =>
    readFileSync(new URL(`../scripts/sql/${f}`, import.meta.url), "utf8");
  await db.exec(read("ops-hub.sql"));
  await db.exec(read("ops-hub-haven-email.sql"));
  await db.exec(read("ops-hub-communications.sql"));
  await db.exec(read("ops-hub-care-automation.sql"));
  await db.exec(read("ops-hub-care-automation.sql")); // reapplying is safe

  const sent = [];
  const gmail = { mode: "ok", sentIds: new Map() };
  const shopify = {
    order: {
      legacyResourceId: ORDER_ID,
      name: "#1839",
      createdAt: "2026-11-17T15:00:00Z",
      cancelledAt: null,
      test: false,
      tags: [],
      email: "customer@example.com",
      customer: { firstName: "Ana", email: "customer@example.com" },
      lineItems: { nodes: [{ name: "Walnut Bench", sku: "WB-1" }] },
    },
    intake: [],
  };
  const env = {
    OPS_SUPABASE_URL: "https://database.example.test",
    OPS_SUPABASE_SECRET_KEY: "sb_secret_test",
    OPS_CONNECTION_ENCRYPTION_KEY: ENC_KEY,
    OPS_GOOGLE_CLIENT_ID: "client",
    OPS_GOOGLE_CLIENT_SECRET: "secret",
    PUBLIC_STORE_DOMAIN: "moderncre8ve.myshopify.com",
    OPS_ADMIN_API_TOKEN: "shpat_test",
  };
  const jsonArgs = new Set([
    "p_record",
    "p_events",
    "p_open_tasks",
    "p_settings",
    "p_template",
    "p_asset",
    "p_change",
    "p_outcome",
    "p_result",
    "p_snapshot",
  ]);
  const handler = async (input, init = {}) => {
    const url = new URL(String(input?.url ?? input));
    if (url.hostname === "database.example.test") {
      const fn = url.pathname.replace("/rest/v1/rpc/", "");
      const args = Object.entries(JSON.parse(init.body));
      try {
        const result = await db.query(
          `select ${fn}(${args.map(([k], i) => `${k} => $${i + 1}`).join(",")}) as value`,
          args.map(([k, v]) =>
            jsonArgs.has(k) && v !== null ? JSON.stringify(v) : v,
          ),
        );
        return Response.json(result.rows[0].value);
      } catch (error) {
        return Response.json(
          { message: error.message },
          { status: error.code === "40001" ? 409 : 400 },
        );
      }
    }
    if (url.hostname === "moderncre8ve.myshopify.com") {
      const { query } = JSON.parse(init.body);
      if (query.includes("CareIntake")) {
        return Response.json({
          data: {
            orders: {
              nodes: shopify.intake,
              pageInfo: { hasNextPage: false, endCursor: null },
            },
          },
        });
      }
      return Response.json({ data: { order: shopify.order } });
    }
    if (url.hostname === "oauth2.googleapis.com") {
      return Response.json({ access_token: "ya29.test" });
    }
    if (url.pathname.endsWith("/settings/sendAs")) {
      return Response.json({
        sendAs: [
          { sendAsEmail: "haven@moderncre8ve.com", isPrimary: true },
          {
            sendAsEmail: "care@moderncre8ve.com",
            displayName: "MODERNCRE8VE",
            signature: "<div>MODERNCRE8VE Care<br>care@moderncre8ve.com</div>",
          },
        ],
      });
    }
    if (url.pathname.endsWith("/messages/send")) {
      const raw = Buffer.from(
        JSON.parse(init.body).raw,
        "base64url",
      ).toString();
      const messageId = raw.match(/^Message-ID: (.+)$/m)[1].trim();
      sent.push({ raw, messageId, to: raw.match(/^To: (.+)$/m)[1].trim() });
      gmail.sentIds.set(messageId, `msg-${sent.length}`);
      if (gmail.mode === "timeout") {
        gmail.mode = "ok";
        throw Object.assign(new Error("timed out"), { name: "TimeoutError" });
      }
      if (gmail.mode === "refuse") {
        return Response.json({ error: "bad" }, { status: 400 });
      }
      return Response.json({
        id: `msg-${sent.length}`,
        threadId: `thread-${sent.length}`,
      });
    }
    if (url.pathname.endsWith("/messages") && url.searchParams.get("q")) {
      const id = `<${url.searchParams.get("q").match(/rfc822msgid:(\S+)/)[1]}>`;
      const found = gmail.sentIds.get(id);
      return Response.json(
        found ? { messages: [{ id: found, threadId: "thread-r" }] } : {},
      );
    }
    if (/\/messages\/msg-/.test(url.pathname)) {
      return Response.json({
        threadId: "thread-r",
        internalDate: String(Date.parse("2026-11-19T15:01:00Z")),
      });
    }
    throw new Error(`Unexpected request ${url}`);
  };
  t.mock.method(globalThis, "fetch", handler);
  const q = async (sql, params) => (await db.query(sql, params)).rows;
  const form = (values) => {
    const data = new FormData();
    for (const [k, v] of Object.entries(values)) {
      if (Array.isArray(v)) {
        for (const x of v) {
          data.append(k, x);
        }
      } else {
        data.set(k, v);
      }
    }
    return data;
  };
  return { db, env, sent, gmail, shopify, q, form };
}

const haven = { email: "haven@moderncre8ve.com", role: "owner" };

async function twoPagePdf() {
  const doc = await PDFDocument.create();
  doc.addPage();
  doc.addPage();
  return new File(
    [await doc.save()],
    "MODERNCRE8VE Delivery and Logistics.pdf",
    { type: "application/pdf" },
  );
}

async function configure(ctx) {
  const { env, q, form } = ctx;
  const { CompactEncrypt } = await import("jose");
  const token = await new CompactEncrypt(new TextEncoder().encode("refresh"))
    .setProtectedHeader({ alg: "dir", enc: "A256GCM" })
    .encrypt(
      Uint8Array.from(ENC_KEY.match(/../g), (s) => Number.parseInt(s, 16)),
    );
  await q(
    "select ops_care_save_sender('haven@moderncre8ve.com','haven@moderncre8ve.com',$1,'gmail.send gmail.readonly')",
    [token],
  );
  await careAdminAction(env, haven, form({ intent: "check-sender" }));
  for (const key of ["CARE-01", "CARE-02"]) {
    await careAdminAction(
      env,
      haven,
      form({
        intent: "import-template",
        key,
        subject: approved.subject,
        body: approved.body,
        neutralGreeting: "Hello,",
        sourceDocId: "doc-1",
        sourceRevision: "2026-11-18",
      }),
    );
    await careAdminAction(
      env,
      haven,
      form({ intent: "activate-template", key, version: "1" }),
    );
  }
  await careAdminAction(
    env,
    haven,
    form({ intent: "upload-pdf", file: await twoPagePdf() }),
  );
  await careAdminAction(
    env,
    haven,
    form({
      intent: "activate-asset",
      kind: "logistics_blank_pdf",
      version: "1",
    }),
  );
  await careAdminAction(env, haven, form({ intent: "signature-gmail" }));
  await careAdminAction(
    env,
    haven,
    form({ intent: "activate-asset", kind: "care_signature", version: "1" }),
  );
  const [{ updated_at }] = await q("select updated_at from ops_care_settings");
  await careAdminAction(
    env,
    haven,
    form({
      intent: "settings",
      updatedAt: updated_at.toISOString(),
      mode: "test",
      testOrderIds: ORDER_ID,
      testRecipients: TEST_TO,
    }),
  );
}

const order = { legacyId: ORDER_ID, name: "#1839" };
const statuses = async (q) =>
  (
    await q(
      "select template_key, status from ops_care_messages order by created_at",
    )
  ).map((r) => `${r.template_key}:${r.status}`);

test("pilot: CARE-01 sends once to the test recipient, reminder sends, receipt cancels the next", async (t) => {
  const ctx = await setup(t);
  const { env, sent, q, form } = ctx;

  // Deployment alone sends nothing, even with everything configured.
  await careOrderAction(
    env,
    haven,
    order,
    form({ intent: "care-test-recipient", to: TEST_TO }),
  ).catch((e) => assert.match(e.message, /test order/));
  assert.deepEqual(await statuses(q), []);
  await configure(ctx);
  await careOrderAction(
    env,
    haven,
    order,
    form({ intent: "care-test-recipient", to: TEST_TO }),
  );
  // A non-allowlisted override is refused by the database too.
  await assert.rejects(
    careOrderAction(
      env,
      haven,
      order,
      form({ intent: "care-test-recipient", to: "customer@example.com" }),
    ),
    /allowlisted/,
  );

  // Step 2: enrol -> one request scheduled.
  await careOrderAction(env, haven, order, form({ intent: "care-enrol" }), {
    now: new Date("2026-11-19T12:00:00Z"),
  });
  await careOrderAction(env, haven, order, form({ intent: "care-enrol" }), {
    now: new Date("2026-11-19T12:00:00Z"),
  });
  assert.deepEqual(await statuses(q), ["CARE-01:scheduled"]);

  // Step 3: make due + send.
  const [job] = await q("select id from ops_care_messages");
  const message = await careOrderAction(
    env,
    haven,
    order,
    form({ intent: "care-send-due", jobId: job.id }),
  );
  assert.match(message, /1 sent/);
  assert.equal(sent.length, 1);
  assert.equal(sent[0].to, TEST_TO, "test override, never the customer");
  assert.match(sent[0].raw, /^From: MODERNCRE8VE <care@moderncre8ve.com>/m);
  assert.match(sent[0].raw, /^Reply-To: care@moderncre8ve.com/m);
  assert.match(sent[0].raw, /^Subject: Delivery details for your order #1839/m);
  assert.match(sent[0].raw, /application\/pdf/);
  const textPart = Buffer.from(
    sent[0].raw
      .split(
        "Content-Type: text/plain; charset=UTF-8\r\nContent-Transfer-Encoding: base64\r\n\r\n",
      )[1]
      .split("--")[0]
      .replace(/\r\n/g, ""),
    "base64",
  ).toString();
  assert.match(textPart, /^Hi Ana,/);
  assert.equal(textPart.split("MODERNCRE8VE Care").length, 2, "signature once");

  // Step 5: history and the next reminder.
  const [rec] = await q(
    `select * from ops_comms_records where order_id = '${ORDER_ID}'`,
  );
  assert.equal(rec.logistics_status, "awaiting_return");
  assert.equal(rec.reminders_enabled, true);
  assert.ok(rec.logistics_requested_at);
  assert.equal(rec.care_enrolment, "manual");
  const [sentEvent] = await q(
    "select * from ops_comms_events where kind = 'care_email_sent'",
  );
  assert.equal(sentEvent.direction, "outgoing");
  assert.equal(sentEvent.details.provider_thread_id, "thread-1");
  assert.equal(sentEvent.details.template_version, 1);
  assert.equal(sentEvent.details.attachment_version, 1);
  assert.match(sentEvent.evidence_url, /mail\.google\.com/);

  // Step 8: repeating the worker sends nothing new.
  await runCareTick(env, { now: new Date() });
  await runCareTick(env, { now: new Date() });
  assert.equal(sent.length, 1);
  assert.deepEqual(await statuses(q), [
    "CARE-01:accepted",
    "CARE-02:scheduled",
  ]);

  // Step 7: advance only the test reminder.
  const [reminder] = await q(
    "select id, anchor from ops_care_messages where template_key = 'CARE-02'",
  );
  assert.equal(
    reminder.anchor,
    rec.reminder_next_due_on.toISOString().slice(0, 10),
  );
  await careOrderAction(
    env,
    haven,
    order,
    form({ intent: "care-send-due", jobId: reminder.id }),
  );
  await careOrderAction(
    env,
    haven,
    order,
    form({ intent: "care-send-due", jobId: "" }),
  );
  assert.equal(sent.length, 2, "one CARE-02 for the interval");
  assert.deepEqual(await statuses(q), [
    "CARE-01:accepted",
    "CARE-02:accepted",
    "CARE-02:scheduled",
  ]);

  // Step 9: a reminder is queued; record receipt -> cancelled in the same transaction.
  const [detailBefore] = await q(
    `select updated_at from ops_comms_records where order_id = '${ORDER_ID}'`,
  );
  await commsAction(
    env,
    haven,
    order,
    form({
      intent: "logistics",
      action: "form_received",
      updatedAt: detailBefore.updated_at.toISOString(),
    }),
  );
  assert.deepEqual(await statuses(q), [
    "CARE-01:accepted",
    "CARE-02:accepted",
    "CARE-02:suppressed",
  ]);
  const [after] = await q(
    `select logistics_status from ops_comms_records where order_id = '${ORDER_ID}'`,
  );
  assert.equal(after.logistics_status, "received_needs_review");
  const tasks = await q(
    "select kind from ops_comms_tasks where status = 'open' order by kind",
  );
  assert.ok(tasks.some((x) => x.kind === "logistics_review"));

  // Step 10: the worker again sends nothing and suppression is visible.
  await runCareTick(env, { now: new Date(Date.now() + 30 * 86400000) });
  assert.equal(sent.length, 2);
  const suppressed = await q(
    "select * from ops_comms_events where kind = 'care_email_suppressed'",
  );
  assert.match(suppressed[0].summary, /Form receipt recorded/);

  // Step 12: leaving test mode clears overrides and stops everything.
  await careAdminAction(env, haven, form({ intent: "leave-test" }));
  const [s] = await q("select mode, test_order_ids from ops_care_settings");
  assert.equal(s.mode, "off");
  assert.deepEqual(s.test_order_ids, []);
  const [r2] = await q(
    `select care_test_recipient from ops_comms_records where order_id = '${ORDER_ID}'`,
  );
  assert.equal(r2.care_test_recipient, null);
});

test("failures: missing data and attachment problems hold; pause waits; uncertain reconciles without resending", async (t) => {
  const ctx = await setup(t);
  const { env, sent, gmail, shopify, q, form } = ctx;
  await configure(ctx);
  await careOrderAction(
    env,
    haven,
    order,
    form({ intent: "care-test-recipient", to: TEST_TO }),
  );
  await careOrderAction(env, haven, order, form({ intent: "care-enrol" }));
  const [job] = await q("select id from ops_care_messages");

  // Global pause: nothing goes, the job stays queued.
  await careAdminAction(env, haven, form({ intent: "pause", paused: "on" }));
  await careOrderAction(
    env,
    haven,
    order,
    form({ intent: "care-send-due", jobId: job.id }),
  );
  assert.equal(sent.length, 0);
  assert.deepEqual(await statuses(q), ["CARE-01:scheduled"]);
  await careAdminAction(env, haven, form({ intent: "pause" }));

  // Per-order pause waits too.
  await careOrderAction(
    env,
    haven,
    order,
    form({ intent: "care-pause", until: "2099-01-01" }),
  );
  await careOrderAction(env, haven, order, form({ intent: "care-send-due" }));
  assert.equal(sent.length, 0);
  await careOrderAction(
    env,
    haven,
    order,
    form({ intent: "care-pause", until: "" }),
  );

  // Attachment corrupted after approval: held with a task, nothing sent.
  await q(
    "update ops_care_assets set content_base64 = 'JVBERi0xLjcK' where kind = 'logistics_blank_pdf'",
  );
  await careOrderAction(env, haven, order, form({ intent: "care-send-due" }));
  assert.equal(sent.length, 0);
  assert.deepEqual(await statuses(q), ["CARE-01:held"]);
  assert.equal(
    (
      await q(
        "select count(*)::int n from ops_comms_tasks where kind = 'care_exception' and status = 'open'",
      )
    )[0].n,
    1,
  );

  // Fix it (new approved version) and release: the timeout path.
  await careAdminAction(
    env,
    haven,
    form({ intent: "upload-pdf", file: await twoPagePdf() }),
  );
  await careAdminAction(
    env,
    haven,
    form({
      intent: "activate-asset",
      kind: "logistics_blank_pdf",
      version: "2",
    }),
  );
  await careOrderAction(
    env,
    haven,
    order,
    form({ intent: "care-job", jobId: job.id, action: "release" }),
  );
  gmail.mode = "timeout";
  await careOrderAction(env, haven, order, form({ intent: "care-send-due" }));
  assert.deepEqual(await statuses(q), ["CARE-01:uncertain"]);
  // Re-running immediately does not resend.
  await runCareTick(env, { now: new Date() });
  assert.equal(sent.length, 1);
  // After two minutes it is found in Sent and recorded as accepted.
  await runCareTick(env, { now: new Date(Date.now() + 3 * 60000) });
  assert.equal(sent.length, 1, "never a blind resend");
  assert.deepEqual(await statuses(q), [
    "CARE-01:accepted",
    "CARE-02:scheduled",
  ]);
  const [m] = await q(
    "select provider_message_id, outcome_note from ops_care_messages",
  );
  assert.equal(m.provider_message_id, "msg-1");

  // Missing recipient data holds the job: a different test order with no override.
  shopify.order = {
    ...shopify.order,
    legacyResourceId: "6001840",
    name: "#1840",
    email: "",
    customer: { firstName: null, email: "" },
  };
  const [{ updated_at }] = await q("select updated_at from ops_care_settings");
  await careAdminAction(
    env,
    haven,
    form({
      intent: "settings",
      updatedAt: updated_at.toISOString(),
      testOrderIds: `${ORDER_ID} 6001840`,
    }),
  );
  const other = { legacyId: "6001840", name: "#1840" };
  await careOrderAction(env, haven, other, form({ intent: "care-enrol" }));
  await careOrderAction(
    env,
    haven,
    other,
    form({
      intent: "care-send-due",
      jobId: (
        await q("select id from ops_care_messages where order_id = '6001840'")
      )[0].id,
    }),
  );
  assert.equal(
    (
      await q("select status from ops_care_messages where order_id = '6001840'")
    )[0].status,
    "held",
  );
  assert.equal(sent.length, 1);

  // Cancelled order: suppressed.
  await q(
    "update ops_care_messages set status = 'scheduled' where order_id = '6001840'",
  );
  shopify.order = {
    ...shopify.order,
    cancelledAt: "2026-11-19T00:00:00Z",
    email: TEST_TO,
  };
  await careOrderAction(env, haven, other, form({ intent: "care-send-due" }));
  assert.equal(
    (
      await q("select status from ops_care_messages where order_id = '6001840'")
    )[0].status,
    "suppressed",
  );
  assert.equal(sent.length, 1);
});

test("a refused send fails visibly and only an explicit retry queues it again", async (t) => {
  const ctx = await setup(t);
  const { env, sent, gmail, q, form } = ctx;
  await configure(ctx);
  await careOrderAction(
    env,
    haven,
    order,
    form({ intent: "care-test-recipient", to: TEST_TO }),
  );
  await careOrderAction(env, haven, order, form({ intent: "care-enrol" }));
  gmail.mode = "refuse";
  await careOrderAction(
    env,
    haven,
    order,
    form({
      intent: "care-send-due",
      jobId: (await q("select id from ops_care_messages"))[0].id,
    }),
  );
  assert.deepEqual(await statuses(q), ["CARE-01:failed"]);
  await runCareTick(env, { now: new Date(Date.now() + 86400000) });
  assert.equal(sent.length, 1, "a failure is not retried automatically");
  gmail.mode = "ok";
  const [job] = await q("select id from ops_care_messages");
  await careOrderAction(
    env,
    haven,
    order,
    form({ intent: "care-job", jobId: job.id, action: "retry" }),
  );
  await careOrderAction(
    env,
    haven,
    order,
    form({ intent: "care-send-due", jobId: job.id }),
  );
  assert.deepEqual(await statuses(q), [
    "CARE-01:accepted",
    "CARE-02:scheduled",
  ]);
  assert.notEqual(
    sent[0].messageId,
    sent[1].messageId,
    "each attempt has its own Message-ID",
  );
});

test("races: receipt during a send is kept; a stale claim is refused; leases become uncertain", async (t) => {
  const ctx = await setup(t);
  const { env, q, form } = ctx;
  await configure(ctx);
  await careOrderAction(
    env,
    haven,
    order,
    form({ intent: "care-test-recipient", to: TEST_TO }),
  );
  await careOrderAction(env, haven, order, form({ intent: "care-enrol" }));
  const [job] = await q("select id from ops_care_messages");
  const rec = async () =>
    (
      await q(`select * from ops_comms_records where order_id = '${ORDER_ID}'`)
    )[0];
  const settingsAt = async () =>
    (
      await q("select updated_at from ops_care_settings")
    )[0].updated_at.toISOString();

  // A claim decided on an older record version is refused.
  const before = await rec();
  await careOrderAction(
    env,
    haven,
    order,
    form({ intent: "care-pause", until: "" }),
  );
  const stale = await q(
    "select ops_care_claim('system:care-tick', $1, $2, $3, now() + interval '5 minutes') v",
    [job.id, before.updated_at.toISOString(), await settingsAt()],
  );
  assert.equal(stale[0].v, null);

  // Claim, then a receipt lands before Gmail answers: accepted is recorded, the receipt stays.
  const current = await rec();
  const claimed = await q(
    "select ops_care_claim('system:care-tick', $1, $2, $3, now() + interval '5 minutes') v",
    [job.id, current.updated_at.toISOString(), await settingsAt()],
  );
  assert.equal(claimed[0].v.status, "sending");
  assert.match(
    claimed[0].v.rfc822_message_id,
    /^<care-.+-1@moderncre8ve.com>$/,
  );
  const received = applyLogisticsAction(
    { ...emptyCommsRecord(), ...current },
    "form_received",
    {},
    { actor: "haven@moderncre8ve.com" },
  );
  await commsAction(
    env,
    haven,
    order,
    form({
      intent: "logistics",
      action: "form_received",
      updatedAt: current.updated_at.toISOString(),
    }),
  );
  assert.equal(received.record.logistics_status, "received_needs_review");
  const confirm = await q(
    "select ops_care_confirm('system:care-tick', $1, $2, $3) v",
    [job.id, current.updated_at.toISOString(), await settingsAt()],
  );
  assert.equal(
    confirm[0].v,
    false,
    "the last check catches the receipt and requeues",
  );
  // Simulate Gmail having accepted it in the gap anyway.
  await q("update ops_care_messages set status = 'sending' where id = $1", [
    job.id,
  ]);
  await q(
    `select ops_care_record_outcome('system:care-tick', $1, '{"status":"accepted","provider_message_id":"m","provider_thread_id":"t"}'::jsonb, '2026-11-19', '2026-11-26')`,
    [job.id],
  );
  const after = await rec();
  assert.equal(
    after.logistics_status,
    "received_needs_review",
    "receipt is never undone",
  );
  assert.equal(after.reminder_next_due_on, null, "no further reminder planned");
  const [msg] = await q(
    "select status, outcome_note from ops_care_messages where id = $1",
    [job.id],
  );
  assert.equal(msg.status, "accepted");
  assert.match(msg.outcome_note, /after the order changed/);

  // A dead worker's lease becomes uncertain, not queued.
  await q(
    "insert into ops_care_messages(order_id, order_name, template_key, anchor, dedupe_key, status, due_at, lease_until, created_by) values ('7', '#7', 'CARE-01', '1', 'k7', 'sending', now(), now() - interval '1 minute', 't')",
  );
  await q("select ops_care_expire_leases('system:care-tick', now())");
  assert.equal(
    (await q("select status from ops_care_messages where order_id = '7'"))[0]
      .status,
    "uncertain",
  );

  // Duplicate scheduling is a no-op.
  const again = await q(
    `select ops_care_schedule('system:care-tick', '${ORDER_ID}', '#1839', 'CARE-01', '1', now(), null) v`,
  );
  assert.equal(again[0].v, null);
});

test("live intake: only orders placed after activation; cursor advances only after a full scan", async (t) => {
  const ctx = await setup(t);
  const { env, shopify, q, form } = ctx;
  await configure(ctx);
  const [{ updated_at }] = await q("select updated_at from ops_care_settings");
  await careAdminAction(
    env,
    haven,
    form({
      intent: "settings",
      updatedAt: updated_at.toISOString(),
      mode: "live",
      sendHour: "10",
      testOrderIds: "",
      testRecipients: "",
      liveRulesPresent: "1",
      "live-CARE-01": "on",
    }),
    { now: new Date("2026-11-19T12:00:00Z") },
  );
  const [s1] = await q(
    "select intake_started_at, intake_cursor from ops_care_settings",
  );
  assert.equal(s1.intake_started_at.toISOString(), "2026-11-19T12:00:00.000Z");
  const node = (id, createdAt, over = {}) => ({
    ...shopify.order,
    legacyResourceId: id,
    name: `#${id}`,
    createdAt,
    ...over,
  });
  shopify.intake = [
    node("9001", "2026-11-19T11:00:00Z"), // before activation: never
    node("9002", "2026-11-19T13:00:00Z"),
    node("9003", "2026-11-19T14:00:00Z", {
      lineItems: { nodes: [{ name: "Furniture Wax" }] },
    }),
    node("9004", "2026-11-19T15:00:00Z", {
      cancelledAt: "2026-11-19T16:00:00Z",
    }),
  ];
  // Existing record #1834-style: already received; must not be touched.
  await q(
    "insert into ops_comms_records(order_id, order_name, logistics_status, updated_by) values ('1834', '#1834', 'received_needs_review', 'haven@moderncre8ve.com')",
  );
  await runCareTick(env, { now: new Date("2026-11-19T17:00:00Z") });
  await runCareTick(env, { now: new Date("2026-11-19T18:00:00Z") });
  const jobs = await q(
    "select order_id, due_at from ops_care_messages order by order_id",
  );
  assert.deepEqual(
    jobs.map((j) => j.order_id),
    ["9002"],
  );
  // Thursday 08:00 ET order -> Friday 10:00 ET.
  assert.equal(jobs[0].due_at.toISOString(), "2026-11-20T15:00:00.000Z");
  const [s2] = await q("select intake_cursor from ops_care_settings");
  assert.equal(s2.intake_cursor.toISOString(), "2026-11-19T15:00:00.000Z");
  const [old] = await q(
    "select logistics_status, care_enrolment from ops_comms_records where order_id = '1834'",
  );
  assert.deepEqual(old, {
    logistics_status: "received_needs_review",
    care_enrolment: "none",
  });
  // CARE-02 rule is off in live mode: no reminder planning yet.
  assert.equal(
    (
      await q(
        "select count(*)::int n from ops_care_messages where template_key = 'CARE-02'",
      )
    )[0].n,
    0,
  );
});

test("permissions: automation tables and functions are server-only", async (t) => {
  const { db } = await setup(t);
  for (const role of ["anon", "authenticated"]) {
    await db.exec(`set role ${role}`);
    await assert.rejects(
      db.query("select * from ops_care_messages"),
      /permission denied/,
    );
    await assert.rejects(
      db.query("select ops_care_settings_get('system:care-tick')"),
      /permission denied/,
    );
    await db.exec("reset role");
  }
  await assert.rejects(
    db.query("select ops_care_overview('someone@example.com')"),
  );
});
