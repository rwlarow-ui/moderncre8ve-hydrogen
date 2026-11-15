import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { PGlite } from "@electric-sql/pglite";
import {
  applyLogisticsAction,
  applyManualEvent,
  buildQueue,
  emptyCommsRecord,
  filterQueue,
  recordForStorage,
  reminderEligibility,
  validateProductionUpdate,
  validateTaskUpdate,
} from "../app/utils/ops-comms.js";
import { commsAction } from "../app/utils/ops-comms.server.js";

const meta = {
  actor: "haven@moderncre8ve.com",
  now: new Date("2026-11-15T15:00:00Z"),
};
const kinds = (tasks) => tasks.map((t) => t.kind).sort();

test("historical form receipt with unknown date: review + evidence tasks, no reminder", () => {
  // Acceptance 2: recorded as received with an unknown date, review task, no reminder.
  const awaiting = {
    ...emptyCommsRecord(),
    logistics_status: "awaiting_return",
    reminders_enabled: true,
    reminder_next_due_on: "2026-11-01",
  };
  const { record, events, openTasks } = applyLogisticsAction(
    awaiting,
    "form_received",
    {},
    meta,
  );
  assert.equal(record.logistics_status, "received_needs_review");
  assert.equal(record.logistics_received_on, null);
  assert.equal(record.form_version, 1);
  assert.equal(record.reminder_next_due_on, null);
  assert.deepEqual(kinds(openTasks), ["logistics_review", "missing_evidence"]);
  assert.equal(events[0].occurred_on, null);
  assert.equal(reminderEligibility(record, { today: "2026-11-15" }).due, false);
});

test("receipt makes a due reminder ineligible even before the file is attached", () => {
  // Acceptance 3.
  const awaiting = {
    ...emptyCommsRecord(),
    logistics_status: "awaiting_return",
    logistics_requested_on: "2026-10-01",
    reminders_enabled: true,
    reminder_next_due_on: "2026-11-08",
  };
  assert.equal(
    reminderEligibility(awaiting, { today: "2026-11-15" }).due,
    true,
  );
  const { record } = applyLogisticsAction(
    awaiting,
    "form_received",
    { date: "2026-11-14" },
    meta,
  );
  assert.equal(reminderEligibility(record, { today: "2026-11-15" }).due, false);
});

test("clarification is a distinct task and review needs no page-2 measurements", () => {
  // Acceptance 4.
  let state = applyLogisticsAction(
    emptyCommsRecord(),
    "form_received",
    { evidenceUrl: "https://mail.google.com/mail/u/0/#all/abc" },
    meta,
  ).record;
  assert.throws(
    () => applyLogisticsAction(state, "needs_clarification", {}, meta),
    /clarifying/,
  );
  const clarify = applyLogisticsAction(
    state,
    "needs_clarification",
    { note: "Which floor?" },
    meta,
  );
  assert.deepEqual(kinds(clarify.openTasks), ["logistics_clarification"]);
  assert.deepEqual(clarify.closeTaskKinds, ["logistics_review"]);
  state = applyLogisticsAction(
    clarify.record,
    "ready_for_carrier",
    {},
    meta,
  ).record;
  assert.equal(state.logistics_status, "ready_for_carrier");
  assert.equal(state.logistics_reviewed_by, meta.actor);
  // Ready is not shared: sharing is its own record.
  assert.equal(state.carrier_shared_on, null);
  assert.throws(
    () =>
      applyLogisticsAction(
        state,
        "carrier_shared",
        { provider: "Barkman" },
        meta,
      ),
    /shared with/,
  );
  const shared = applyLogisticsAction(
    state,
    "carrier_shared",
    { provider: "Barkman", recipient: "dispatch", date: "2026-11-20" },
    meta,
  );
  assert.equal(shared.events[0].details.version, 1);
});

test("an update that carried the reminder resets the interval", () => {
  // Acceptance 5.
  const awaiting = {
    ...emptyCommsRecord(),
    logistics_status: "awaiting_return",
    logistics_requested_on: "2026-11-01",
    reminders_enabled: true,
    reminder_next_due_on: "2026-11-08",
  };
  const { record, closeTaskKinds } = applyManualEvent(awaiting, {
    kind: "customer_update",
    date: "2026-11-15",
    summary: "Mid-fabrication update with form reminder",
    includesReminder: true,
  });
  assert.deepEqual(closeTaskKinds, ["update"]);
  assert.equal(record.reminder_last_sent_on, "2026-11-15");
  assert.equal(record.reminder_next_due_on, "2026-11-22");
  assert.equal(reminderEligibility(record, { today: "2026-11-15" }).due, false);
});

test("unknown request dates never create catch-up reminders; closed orders suppress", () => {
  // Acceptance 6.
  const { record } = applyLogisticsAction(
    { ...emptyCommsRecord(), reminders_enabled: true },
    "request_sent",
    {},
    meta,
  );
  assert.equal(record.reminder_next_due_on, null);
  assert.equal(reminderEligibility(record, { today: "2030-01-01" }).due, false);
  const due = { ...record, reminder_next_due_on: "2026-11-01" };
  assert.equal(
    reminderEligibility(due, { today: "2026-11-15", orderClosed: true }).due,
    false,
  );
  assert.equal(
    reminderEligibility(
      { ...due, reminders_paused: true },
      { today: "2026-11-15" },
    ).due,
    false,
  );
});

test("inputs are validated", () => {
  assert.throws(
    () =>
      applyLogisticsAction(
        emptyCommsRecord(),
        "form_received",
        { date: "11/14" },
        meta,
      ),
    /valid date/,
  );
  assert.throws(
    () =>
      applyLogisticsAction(
        emptyCommsRecord(),
        "form_received",
        { evidenceUrl: "javascript:alert(1)" },
        meta,
      ),
    /https/,
  );
  assert.throws(
    () =>
      applyLogisticsAction(emptyCommsRecord(), "ready_for_carrier", {}, meta),
    /Can't/,
  );
  assert.throws(() => validateTaskUpdate({ status: "snoozed" }), /snooze/);
  assert.throws(
    () => validateTaskUpdate({ status: "done", ownerEmail: "x@y.z" }),
    /owner/,
  );
  assert.throws(() => validateProductionUpdate({ stage: "made_up" }), /stage/);
  assert.equal(
    validateProductionUpdate({ stage: "finishing", estimateWeeks: "12" })
      .estimateWeeks,
    12,
  );
});

test("queue keeps orders outside the Shopify window that still have work", () => {
  const rows = buildQueue({
    currentOrders: [
      {
        legacyId: "200",
        name: "#1900",
        customer: { name: "A", email: "a@example.com" },
      },
    ],
    overview: {
      records: [
        {
          order_id: "100",
          order_name: "#1800",
          logistics_status: "ready_for_carrier",
        },
      ],
      production: [
        { order_id: "200", order_name: "#1900", stage: "in_fabrication" },
      ],
      tasks: [
        {
          id: "t1",
          order_id: "100",
          order_name: "#1800",
          kind: "follow_up",
          title: "Check-in",
          owner_email: "haven@moderncre8ve.com",
          status: "open",
          due_on: "2026-11-10",
        },
        {
          id: "t2",
          order_id: "200",
          order_name: "#1900",
          kind: "reply",
          title: "Reply",
          owner_email: "rob@moderncre8ve.com",
          status: "snoozed",
          due_on: "2026-12-01",
        },
      ],
      last: [],
    },
    today: "2026-11-15",
    viewer: "haven@moderncre8ve.com",
  });
  assert.deepEqual(
    rows.map((r) => r.orderName),
    ["#1800", "#1900"],
  );
  assert.equal(rows[0].inCurrentWindow, false);
  assert.equal(rows[0].flags.overdue, true);
  assert.equal(rows[1].stage, "in_fabrication");
  assert.equal(
    rows[1].flags.reply,
    false,
    "a snoozed task is hidden until its date",
  );
  assert.deepEqual(
    filterQueue(rows, "follow_up").map((r) => r.orderId),
    ["100"],
  );
  assert.deepEqual(
    filterQueue(rows, "attention").map((r) => r.orderId),
    ["100"],
  );
  assert.deepEqual(
    filterQueue(rows, "all", "#1900").map((r) => r.orderId),
    ["200"],
  );
});

test("communications SQL: permissions, atomic apply, one open task per kind, conflicts", async (t) => {
  const db = new PGlite();
  t.after(() => db.close());
  await db.exec(
    "create role anon; create role authenticated; create role service_role bypassrls;",
  );
  const read = (f) =>
    readFileSync(new URL(`../scripts/sql/${f}`, import.meta.url), "utf8");
  await db.exec(read("ops-hub.sql"));
  await db.exec(read("ops-hub-haven-email.sql"));
  const migration = read("ops-hub-communications.sql");
  await db.exec(migration);
  await db.exec(migration); // Reapplying must be safe.

  const rpc = async (fn, args) => {
    const entries = Object.entries(args);
    const result = await db.query(
      `select ${fn}(${entries.map(([k], i) => `${k} => $${i + 1}`).join(",")}) as value`,
      entries.map(([k, v]) =>
        ["p_record", "p_events", "p_open_tasks"].includes(k)
          ? JSON.stringify(v)
          : v,
      ),
    );
    return result.rows[0].value;
  };
  const apply = (change, expected, email = "haven@moderncre8ve.com") =>
    rpc("ops_comms_apply", {
      p_email: email,
      p_order_id: "5559001",
      p_order_name: "#9001",
      p_expected_updated_at: expected,
      p_record: recordForStorage(change.record),
      p_events: change.events,
      p_open_tasks: change.openTasks,
      p_close_task_kinds: change.closeTaskKinds,
    });

  const received = applyLogisticsAction(
    emptyCommsRecord(),
    "form_received",
    {},
    meta,
  );
  await assert.rejects(
    apply(received, null, "someone@example.com"),
    /Forbidden/,
  );
  const saved = await apply(received, null);
  assert.equal(saved.logistics_status, "received_needs_review");
  // Stale write is refused.
  await assert.rejects(apply(received, null), /changed/);
  // Opening the same kind again is a no-op, not a duplicate.
  await apply(
    {
      record: saved,
      events: [],
      openTasks: [{ kind: "logistics_review", title: "again" }],
      closeTaskKinds: [],
    },
    saved.updated_at,
  );
  const detail = await rpc("ops_comms_detail", {
    p_email: "rob@moderncre8ve.com",
    p_order_id: "5559001",
  });
  assert.deepEqual(detail.tasks.map((x) => x.kind).sort(), [
    "logistics_review",
    "missing_evidence",
  ]);
  assert.equal(detail.events.length, 1);
  assert.equal(
    detail.production,
    null,
    "a form receipt never touches production stage",
  );

  const task = detail.tasks.find((x) => x.kind === "missing_evidence");
  await assert.rejects(
    rpc("ops_comms_update_task", {
      p_email: "haven@moderncre8ve.com",
      p_id: task.id,
      p_status: "done",
      p_due_on: null,
      p_owner_email: "haven@moderncre8ve.com",
      p_note: "",
      p_expected_updated_at: task.updated_at,
    }),
    /resolved/,
  );
  await rpc("ops_comms_update_task", {
    p_email: "haven@moderncre8ve.com",
    p_id: task.id,
    p_status: "done",
    p_due_on: null,
    p_owner_email: "haven@moderncre8ve.com",
    p_note: "Filed in Drive",
    p_expected_updated_at: task.updated_at,
  });

  await rpc("ops_save_production", {
    p_email: "rob@moderncre8ve.com",
    p_order_id: "5559001",
    p_order_name: "#9001",
    p_stage: "in_fabrication",
    p_confirmed_on: "2026-11-10",
    p_source: "Builder email",
    p_estimate_weeks: 12,
    p_expected_updated_at: null,
  });
  const overview = await rpc("ops_comms_overview", {
    p_email: "haven@moderncre8ve.com",
  });
  assert.equal(overview.production[0].stage, "in_fabrication");
  assert.deepEqual(
    overview.tasks.map((x) => x.kind),
    ["logistics_review"],
  );
  assert.equal(overview.tasks[0].order_name, "#9001");

  // Public roles can't read the tables or call the functions.
  for (const role of ["anon", "authenticated"]) {
    await db.exec(`set role ${role}`);
    await assert.rejects(
      db.query("select * from ops_comms_records"),
      /permission denied/,
    );
    await assert.rejects(
      db.query("select ops_comms_overview('rob@moderncre8ve.com')"),
      /permission denied/,
    );
    await db.exec("reset role");
  }
});

test("queue never flags a reminder for an order outside the current list", () => {
  const record = {
    order_id: "300",
    order_name: "#9300",
    logistics_status: "awaiting_return",
    reminders_enabled: true,
    reminder_next_due_on: "2026-11-01",
  };
  const overview = { records: [record], production: [], tasks: [], last: [] };
  const [outside] = buildQueue({
    currentOrders: [],
    overview,
    today: "2026-11-15",
  });
  assert.equal(outside.flags.reminder_due, false);
  const [inside] = buildQueue({
    currentOrders: [{ legacyId: "300", name: "#9300" }],
    overview,
    today: "2026-11-15",
  });
  assert.equal(inside.flags.reminder_due, true);
});

test("server adapter: actions reach Postgres; validation and conflicts read clearly", async (t) => {
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
  const env = {
    OPS_SUPABASE_URL: "https://database.example.test",
    OPS_SUPABASE_SECRET_KEY: "sb_secret_test",
  };
  // Only HTTP is replaced. PostgREST answers 409 for SQLSTATE 40001, 400 otherwise.
  t.mock.method(globalThis, "fetch", async (input, init) => {
    const fn = new URL(input).pathname.replace("/rest/v1/rpc/", "");
    assert.match(fn, /^ops_[a-z_]+$/);
    const args = Object.entries(JSON.parse(init.body));
    try {
      const result = await db.query(
        `select ${fn}(${args.map(([k], i) => `${k} => $${i + 1}`).join(",")}) as value`,
        args.map(([k, v]) =>
          ["p_record", "p_events", "p_open_tasks"].includes(k)
            ? JSON.stringify(v)
            : v,
        ),
      );
      return Response.json(result.rows[0].value);
    } catch (error) {
      return Response.json(
        { message: error.message },
        { status: error.code === "40001" ? 409 : 400 },
      );
    }
  });
  const user = { email: "haven@moderncre8ve.com" };
  const order = { legacyId: "5559002", name: "#9002" };
  const form = (values) => {
    const data = new FormData();
    for (const [key, value] of Object.entries(values)) data.set(key, value);
    return data;
  };
  const detail = async () =>
    (
      await db.query(
        "select ops_comms_detail('rob@moderncre8ve.com','5559002') as v",
      )
    ).rows[0].v;

  await commsAction(
    env,
    user,
    order,
    form({ intent: "logistics", action: "form_received", updatedAt: "" }),
  );
  const first = await detail();
  assert.equal(first.record.logistics_status, "received_needs_review");
  assert.equal(first.record.updated_by, "haven@moderncre8ve.com");

  // A stale page gets a readable conflict, not a silent overwrite.
  await assert.rejects(
    commsAction(
      env,
      user,
      order,
      form({ intent: "logistics", action: "ready_for_carrier", updatedAt: "" }),
    ),
    /changed/,
  );
  // Closing a task without a resolution is caught before the database.
  const task = first.tasks.find((x) => x.kind === "logistics_review");
  await assert.rejects(
    commsAction(
      env,
      user,
      order,
      form({
        intent: "task",
        taskId: task.id,
        taskUpdatedAt: task.updated_at,
        status: "done",
      }),
    ),
    /resolved/,
  );
  await commsAction(
    env,
    user,
    order,
    form({
      intent: "logistics",
      action: "ready_for_carrier",
      updatedAt: first.record.updated_at,
    }),
  );
  const after = await detail();
  assert.equal(after.record.logistics_status, "ready_for_carrier");
  assert.equal(
    after.tasks.find((x) => x.kind === "logistics_review").status,
    "done",
  );

  // An undated entry never shows up as today's date.
  const overview = (
    await db.query("select ops_comms_overview('haven@moderncre8ve.com') as v")
  ).rows[0].v;
  const last = overview.last.find((x) => x.order_id === "5559002");
  assert.equal(last.last_incoming, null);
  assert.equal(last.undated_incoming, true);
});

test("a resubmitted form clears the old handoff and, with a link, the evidence task", () => {
  const handedOff = {
    ...emptyCommsRecord(),
    logistics_status: "ready_for_carrier",
    form_version: 1,
    carrier_shared_on: "2026-11-10",
  };
  const withLink = applyLogisticsAction(
    handedOff,
    "form_received",
    { evidenceUrl: "https://mail.google.com/mail/u/0/#inbox/abc" },
    meta,
  );
  assert.equal(withLink.record.form_version, 2);
  assert.equal(withLink.record.carrier_shared_on, null);
  assert.ok(withLink.closeTaskKinds.includes("missing_evidence"));
  assert.deepEqual(kinds(withLink.openTasks), ["logistics_review"]);

  const noLink = applyLogisticsAction(handedOff, "form_received", {}, meta);
  assert.ok(!noLink.closeTaskKinds.includes("missing_evidence"));
  assert.deepEqual(kinds(noLink.openTasks), [
    "logistics_review",
    "missing_evidence",
  ]);
});

test("an incomplete current list does not treat missing orders as closed", () => {
  const overview = {
    records: [
      {
        order_id: "301",
        order_name: "#9301",
        logistics_status: "awaiting_return",
        reminders_enabled: true,
        reminder_next_due_on: "2026-11-01",
      },
    ],
    production: [],
    tasks: [],
    last: [],
  };
  const [row] = buildQueue({
    currentOrders: [],
    overview,
    today: "2026-11-15",
    currentListComplete: false,
  });
  assert.equal(row.flags.reminder_due, true);
});
