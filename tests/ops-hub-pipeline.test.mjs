import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { PGlite } from "@electric-sql/pglite";
import {
  applyDealEdit,
  applyDealEvent,
  applyStageChange,
  buildBoard,
  dealForStorage,
  filterBoard,
  NEW_DEAL_NEXT_STEP,
  normalizeValue,
  stageSummary,
  validateDealTaskUpdate,
  validateNewDeal,
} from "../app/utils/ops-pipeline.js";
import { createDeal, dealAction } from "../app/utils/ops-pipeline.server.js";

const today = "2026-11-16";
const kinds = (tasks) => tasks.map((t) => t.kind).sort();
const baseDeal = {
  id: "11111111-1111-4111-8111-111111111111",
  customer_id: "7001",
  title: "Walnut extension table",
  deal_type: "custom",
  stage: "contacted",
  owner_email: "haven@moderncre8ve.com",
  source: "email",
  estimated_value: 6500,
  next_step: "Book a call",
  next_step_due: "2026-11-18",
  lost_reason: "",
  closed_on: null,
};

/* ------------------------------------------------------------------ rules */

test("a new deal always has a next step due today and logs the inquiry", () => {
  const change = validateNewDeal(
    {
      email: " Shopper@Example.com ",
      title: "Custom table",
      inquiry: "Wants a 9 ft table",
    },
    { today },
  );
  assert.equal(change.customer.email, "shopper@example.com");
  assert.equal(change.deal.stage, "new");
  assert.equal(change.deal.next_step, NEW_DEAL_NEXT_STEP);
  assert.equal(change.deal.next_step_due, today);
  assert.equal(change.deal.owner_email, "haven@moderncre8ve.com");
  assert.equal(change.events[0].kind, "inquiry");
  assert.equal(change.events[0].direction, "incoming");
  assert.equal(
    change.events[0].occurred_on,
    null,
    "unknown date stays unknown",
  );
  assert.throws(
    () => validateNewDeal({ email: "nope", title: "x" }, { today }),
    /email/,
  );
  assert.throws(
    () => validateNewDeal({ email: "a@b.co", title: " " }, { today }),
    /deal is for/,
  );
  assert.throws(
    () =>
      validateNewDeal(
        { email: "a@b.co", title: "x", ownerEmail: "x@y.com" },
        { today },
      ),
    /owner/,
  );
});

test("values are dollars; junk is refused", () => {
  assert.equal(normalizeValue("$12,500.555"), 12500.56);
  assert.equal(normalizeValue(""), null);
  assert.throws(() => normalizeValue("-5"), /dollar/);
  assert.throws(() => normalizeValue("ten"), /dollar/);
});

test("only a stage change moves a deal; replies and quotes never do", () => {
  const reply = applyDealEvent(
    baseDeal,
    { kind: "reply_received", summary: "Asked about walnut" },
    { today },
  );
  assert.equal(reply.deal.stage, "contacted");
  assert.deepEqual(kinds(reply.openTasks), ["reply"]);
  assert.equal(reply.openTasks[0].due_on, today);

  const sent = applyDealEvent(
    baseDeal,
    { kind: "quote_sent", summary: "Sent $6,500 quote" },
    { today },
  );
  assert.equal(sent.deal.stage, "contacted");
  assert.deepEqual(sent.closeTaskKinds.sort(), ["reply", "send_quote"]);

  // A reply on a closed deal doesn't reopen work by itself.
  const late = applyDealEvent(
    { ...baseDeal, stage: "lost" },
    { kind: "reply_received", summary: "Thanks" },
    { today },
  );
  assert.deepEqual(late.openTasks, []);
  assert.throws(
    () =>
      applyDealEvent(baseDeal, { kind: "reply_sent", summary: "" }, { today }),
    /summary/,
  );
});

test("stage changes: lost needs a reason, closing finishes working tasks, quote opens a follow-up", () => {
  assert.throws(
    () => applyStageChange(baseDeal, { stage: "lost" }, { today }),
    /why/,
  );
  assert.throws(
    () => applyStageChange(baseDeal, { stage: "contacted" }, { today }),
    /already/,
  );

  const lost = applyStageChange(
    baseDeal,
    { stage: "lost", lostReason: "Went with a local shop" },
    { today },
  );
  assert.equal(lost.deal.closed_on, today);
  assert.equal(lost.deal.lost_reason, "Went with a local shop");
  assert.ok(lost.closeTaskKinds.includes("reply"));
  assert.ok(
    !lost.closeTaskKinds.includes("other"),
    "Other tasks survive closing",
  );
  assert.match(
    lost.events[0].summary,
    /Contacted → Lost\. Reason: Went with a local shop/,
  );

  const quoted = applyStageChange(
    baseDeal,
    { stage: "quote_sent", date: "2026-11-10" },
    { today },
  );
  assert.deepEqual(kinds(quoted.openTasks), ["follow_up"]);
  assert.equal(quoted.openTasks[0].due_on, "2026-11-17");
  assert.deepEqual(quoted.closeTaskKinds, []);

  // Reopening clears the close date and reason.
  const reopened = applyStageChange(
    lost.deal,
    { stage: "discovery" },
    { today },
  );
  assert.equal(reopened.deal.closed_on, null);
  assert.equal(reopened.deal.lost_reason, "");
});

test("edits name what changed and refuse no-ops", () => {
  const input = {
    title: baseDeal.title,
    dealType: "custom",
    ownerEmail: "rob@moderncre8ve.com",
    source: "email",
    estimatedValue: "6500",
    nextStep: "Book a call",
    nextStepDue: "2026-11-18",
  };
  const change = applyDealEdit(baseDeal, input);
  assert.equal(change.deal.owner_email, "rob@moderncre8ve.com");
  assert.equal(change.events[0].summary, "Updated owner.");
  assert.throws(
    () =>
      applyDealEdit(baseDeal, { ...input, ownerEmail: baseDeal.owner_email }),
    /Nothing changed/,
  );
});

test("task updates: done needs a resolution, snooze needs a date", () => {
  assert.throws(() => validateDealTaskUpdate({ status: "done" }), /resolved/);
  assert.throws(() => validateDealTaskUpdate({ status: "snoozed" }), /date/);
  assert.equal(
    validateDealTaskUpdate({ status: "done", note: "Called" }).status,
    "done",
  );
});

test("board: missing or overdue next steps and replies need the owner; closed deals don't", () => {
  const deals = [
    { ...baseDeal, id: "a", next_step_due: "2026-11-10" },
    { ...baseDeal, id: "b", next_step: "", next_step_due: null },
    { ...baseDeal, id: "c", next_step_due: "2026-12-01" },
    { ...baseDeal, id: "d", stage: "won", next_step_due: "2026-11-01" },
    {
      ...baseDeal,
      id: "e",
      owner_email: "rob@moderncre8ve.com",
      stage: "new",
      next_step_due: "2026-11-01",
    },
  ];
  const tasks = [
    {
      id: "t1",
      deal_id: "c",
      kind: "reply",
      status: "open",
      owner_email: "haven@moderncre8ve.com",
      due_on: today,
    },
    {
      id: "t2",
      deal_id: "c",
      kind: "other",
      status: "snoozed",
      owner_email: "haven@moderncre8ve.com",
      due_on: "2026-12-20",
    },
  ];
  const customers = new Map([
    ["7001", { name: "Pat Example", email: "pat@example.com" }],
  ]);
  const rows = buildBoard({
    deals,
    tasks,
    last: [],
    customers,
    today,
    viewer: "haven@moderncre8ve.com",
  });
  const byId = Object.fromEntries(rows.map((r) => [r.deal.id, r]));

  assert.equal(byId.a.flags.next_step_overdue, true);
  assert.equal(byId.b.flags.next_step_missing, true);
  assert.equal(byId.c.flags.reply, true);
  assert.equal(
    byId.c.tasks.length,
    1,
    "a snoozed task stays hidden until its date",
  );
  assert.equal(
    byId.d.flags.next_step_overdue,
    false,
    "closed deals have no next step",
  );
  assert.deepEqual(
    filterBoard(rows, "attention")
      .map((r) => r.deal.id)
      .sort(),
    ["a", "b", "c"],
    "Rob's overdue deal isn't Haven's attention",
  );
  assert.deepEqual(
    filterBoard(rows, "won").map((r) => r.deal.id),
    ["d"],
  );
  assert.equal(rows.at(-1).deal.id, "d", "closed deals sort last");
  assert.deepEqual(filterBoard(rows, "all", { search: "pat ex" }).length, 5);
  assert.deepEqual(
    filterBoard(rows, "open", { stage: "new" }).map((r) => r.deal.id),
    ["e"],
  );

  const contacted = stageSummary(rows.filter((r) => r.open)).find(
    (s) => s.id === "contacted",
  );
  assert.equal(contacted.count, 3);
  assert.equal(contacted.value, 19500);
});

/* ------------------------------------------------------------------ database */

async function freshDb(t) {
  const db = new PGlite();
  t.after(() => db.close());
  await db.exec(
    "create role anon; create role authenticated; create role service_role bypassrls;",
  );
  const read = (f) =>
    readFileSync(new URL(`../scripts/sql/${f}`, import.meta.url), "utf8");
  await db.exec(read("ops-hub.sql"));
  await db.exec(read("ops-hub-haven-email.sql"));
  const migration = read("ops-hub-pipeline.sql");
  await db.exec(migration);
  await db.exec(migration); // Reapplying must be safe.
  return db;
}

const JSON_ARGS = ["p_deal", "p_events", "p_open_tasks"];
const callRpc = async (db, fn, args) => {
  const entries = Object.entries(args);
  const result = await db.query(
    `select ${fn}(${entries.map(([k], i) => `${k} => $${i + 1}`).join(",")}) as value`,
    entries.map(([k, v]) => (JSON_ARGS.includes(k) ? JSON.stringify(v) : v)),
  );
  return result.rows[0].value;
};

test("database: identity, concurrency, task dedupe and privileges", async (t) => {
  const db = await freshDb(t);
  const rpc = (fn, args) => callRpc(db, fn, args);
  const created = validateNewDeal(
    { email: "a@b.co", title: "Banquette" },
    { today },
  );
  const save = (dealId, expected, change, email = "haven@moderncre8ve.com") =>
    rpc("ops_pipeline_save", {
      p_email: email,
      p_deal_id: dealId,
      p_expected_updated_at: expected,
      p_deal: dealForStorage({ ...change.deal, customer_id: "7001" }),
      p_events: change.events,
      p_open_tasks: change.openTasks,
      p_close_task_kinds: change.closeTaskKinds,
    });

  await assert.rejects(
    save(null, null, created, "someone@example.com"),
    /Forbidden/,
  );
  const deal = await save(null, null, created);
  assert.equal(deal.stage, "new");
  assert.equal(deal.created_by, "haven@moderncre8ve.com");

  // A reply opens one reply task; a second reply doesn't duplicate it.
  const reply = applyDealEvent(
    deal,
    { kind: "reply_received", summary: "Sent photos" },
    { today },
  );
  const afterReply = await save(deal.id, deal.updated_at, reply);
  await assert.rejects(
    save(deal.id, deal.updated_at, reply),
    /changed/,
    "stale page conflicts",
  );
  const again = await save(deal.id, afterReply.updated_at, reply);
  let detail = await rpc("ops_pipeline_detail", {
    p_email: "rob@moderncre8ve.com",
    p_deal_id: deal.id,
  });
  assert.equal(detail.tasks.filter((x) => x.kind === "reply").length, 1);
  assert.equal(detail.events.length, 3);

  // Winning closes the reply task and stamps the stage change.
  const won = applyStageChange(again, { stage: "won" }, { today });
  const afterWin = await save(deal.id, again.updated_at, won);
  assert.equal(afterWin.closed_on, today);
  assert.notEqual(afterWin.stage_changed_at, again.stage_changed_at);
  detail = await rpc("ops_pipeline_detail", {
    p_email: "rob@moderncre8ve.com",
    p_deal_id: deal.id,
  });
  assert.equal(detail.tasks[0].status, "done");

  // The customer a deal belongs to can't be moved.
  await save(deal.id, afterWin.updated_at, {
    ...won,
    deal: { ...won.deal, customer_id: "9999" },
    events: [],
  });
  detail = await rpc("ops_pipeline_detail", {
    p_email: "rob@moderncre8ve.com",
    p_deal_id: deal.id,
  });
  assert.equal(detail.deal.customer_id, "7001");

  const overview = await rpc("ops_pipeline_overview", {
    p_email: "rob@moderncre8ve.com",
  });
  assert.equal(overview.deals.length, 1);
  assert.equal(overview.tasks.length, 0, "only live tasks are in the overview");

  // Closing a task needs a resolution, enforced in the database too.
  const other = await save(deal.id, detail.deal.updated_at, {
    deal: detail.deal,
    events: [],
    openTasks: [{ kind: "other", title: "Send care guide", due_on: today }],
    closeTaskKinds: [],
  });
  assert.ok(other.id);
  const task = (
    await rpc("ops_pipeline_detail", {
      p_email: "rob@moderncre8ve.com",
      p_deal_id: deal.id,
    })
  ).tasks.find((x) => x.kind === "other");
  assert.equal(
    task.owner_email,
    "haven@moderncre8ve.com",
    "defaults to the deal owner",
  );
  await assert.rejects(
    rpc("ops_pipeline_update_task", {
      p_email: "rob@moderncre8ve.com",
      p_id: task.id,
      p_status: "done",
      p_due_on: null,
      p_owner_email: task.owner_email,
      p_note: "",
      p_expected_updated_at: task.updated_at,
    }),
    /resolved/,
  );

  // Browser roles can't touch the tables or functions.
  for (const role of ["anon", "authenticated"]) {
    await db.exec(`set role ${role}`);
    await assert.rejects(
      db.query("select * from ops_deals"),
      /permission denied/,
    );
    await assert.rejects(
      db.query("select ops_pipeline_overview('rob@moderncre8ve.com')"),
      /permission denied/,
    );
    await db.exec("reset role");
  }
});

test("server adapter: Add deal finds or creates the Shopify customer, actions reach Postgres", async (t) => {
  const db = await freshDb(t);
  const env = {
    OPS_SUPABASE_URL: "https://database.example.test",
    OPS_SUPABASE_SECRET_KEY: "sb_secret_test",
    PUBLIC_STORE_DOMAIN: "shop.example.test",
    OPS_ADMIN_API_TOKEN: "shpat_test",
  };
  const shopify = { known: { "known@example.com": "8001" }, created: [] };
  // Only HTTP is replaced. PostgREST answers 409 for SQLSTATE 40001, 400 otherwise.
  t.mock.method(globalThis, "fetch", async (input, init) => {
    const url = new URL(input);
    const body = JSON.parse(init.body);
    if (url.hostname === "shop.example.test") {
      if (body.query.includes("customers(first: 1")) {
        const email = body.variables.query.match(/email:"(.+)"/)[1];
        const id = shopify.known[email];
        return Response.json({
          data: {
            customers: {
              nodes: id
                ? [
                    {
                      id: `gid://shopify/Customer/${id}`,
                      legacyResourceId: id,
                      email,
                    },
                  ]
                : [],
            },
          },
        });
      }
      if (body.query.includes("customerCreate")) {
        shopify.created.push(body.variables.input);
        return Response.json({
          data: {
            customerCreate: {
              customer: {
                id: "gid://shopify/Customer/8002",
                legacyResourceId: "8002",
              },
              userErrors: [],
            },
          },
        });
      }
      throw new Error(`Unexpected Shopify call: ${body.query}`);
    }
    const fn = url.pathname.replace("/rest/v1/rpc/", "");
    assert.match(fn, /^ops_pipeline_[a-z_]+$/);
    try {
      return Response.json(await callRpc(db, fn, body));
    } catch (error) {
      return Response.json(
        { message: error.message },
        { status: error.code === "40001" ? 409 : 400 },
      );
    }
  });
  const user = { email: "rob@moderncre8ve.com" };
  const form = (values) => {
    const data = new FormData();
    for (const [key, value] of Object.entries(values)) {
      data.set(key, value);
    }
    return data;
  };
  const now = new Date(`${today}T15:00:00Z`);

  // An existing customer is used as-is: no create, no retag.
  const existing = await createDeal(
    env,
    user,
    form({ email: "Known@Example.com", title: "Sideboard", source: "phone" }),
    { now },
  );
  assert.equal(existing.customerCreated, false);
  assert.equal(shopify.created.length, 0);

  // An unknown email creates a tagged customer with no marketing consent field.
  const fresh = await createDeal(
    env,
    user,
    form({
      email: "new@example.com",
      firstName: "Sam",
      phone: "(216) 555-0100",
      title: "Bed",
      ownerEmail: "rob@moderncre8ve.com",
    }),
    { now },
  );
  assert.equal(fresh.customerCreated, true);
  assert.deepEqual(shopify.created[0].tags, ["pipeline-lead"]);
  assert.equal(shopify.created[0].phone, "+12165550100");
  assert.equal(shopify.created[0].emailMarketingConsent, undefined);

  const detail = async (id) =>
    (
      await db.query(
        `select ops_pipeline_detail('rob@moderncre8ve.com', '${id}') as v`,
      )
    ).rows[0].v;
  let current = (await detail(fresh.dealId)).deal;
  assert.equal(current.customer_id, "8002");
  assert.equal(current.owner_email, "rob@moderncre8ve.com");

  await dealAction(
    env,
    user,
    fresh.dealId,
    form({
      intent: "stage",
      stage: "quote_sent",
      updatedAt: current.updated_at,
    }),
    { now },
  );
  let after = await detail(fresh.dealId);
  assert.equal(after.deal.stage, "quote_sent");
  assert.equal(after.tasks[0].kind, "follow_up");
  assert.equal(after.tasks[0].due_on, "2026-11-23");

  // A stale page gets a readable conflict, not a silent overwrite.
  await assert.rejects(
    dealAction(
      env,
      user,
      fresh.dealId,
      form({ intent: "stage", stage: "won", updatedAt: current.updated_at }),
      { now },
    ),
    /changed/,
  );
  current = after.deal;
  await assert.rejects(
    dealAction(
      env,
      user,
      fresh.dealId,
      form({ intent: "stage", stage: "lost", updatedAt: current.updated_at }),
      { now },
    ),
    /why/,
  );
  await dealAction(
    env,
    user,
    fresh.dealId,
    form({
      intent: "task",
      taskId: after.tasks[0].id,
      taskUpdatedAt: after.tasks[0].updated_at,
      status: "done",
      note: "Called, they're deciding",
      ownerEmail: "rob@moderncre8ve.com",
    }),
    { now },
  );
  after = await detail(fresh.dealId);
  assert.equal(after.tasks[0].status, "done");
  assert.match(after.events[0].summary, /→ done: Called/);

  await assert.rejects(
    dealAction(
      env,
      user,
      "22222222-2222-4222-8222-222222222222",
      form({ intent: "edit" }),
      { now },
    ),
    (error) => error instanceof Response && error.status === 404,
  );
});
