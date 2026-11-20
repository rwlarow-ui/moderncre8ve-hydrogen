import assert from "node:assert/strict";
import test from "node:test";
import {
  buildOpsStatus,
  formatAgo,
  HAVEN,
  ROB,
} from "../app/utils/ops-status.js";

const NOW = "2026-11-20T15:00:00.000Z";
const SOURCES = [
  {
    id: "catalog-todos",
    title: "Catalog to-dos",
    status: "current",
    freshnessDays: 3,
  },
  {
    id: "replacing-weaverse",
    title: "Replacing Weaverse",
    status: "historical",
    freshnessDays: 30,
  },
];

/** The state found on 2026-11-20: Rob signed in, nothing else set up. */
function today(overrides = {}) {
  return {
    now: NOW,
    store: true,
    googleLogin: true,
    cutover: false,
    encryptionKey: true,
    jobSecret: false,
    adminToken: true,
    requestEmail: false,
    poEmail: { ok: false, missing: ["RESEND_API_KEY"], invalid: [] },
    sessions: { [ROB]: "2026-11-20T14:00:00Z" },
    connections: {},
    artifacts: [
      {
        source_id: "catalog-todos",
        published_at: "2026-11-19T14:23:59Z",
        source_updated_at: "2026-11-15T12:00:00Z",
        withdrawn: false,
      },
    ],
    sources: SOURCES,
    care: {
      settings: {
        mode: "off",
        global_pause: false,
        live_rules: { "CARE-01": false, "CARE-02": false },
        send_hour: null,
        holidays: [],
        timezone: "America/New_York",
        from_name: "MODERNCRE8VE",
        excluded_item_patterns: ["wax", "oil", "gift card", "sample"],
        last_tick_at: null,
      },
      sender: null,
      templates: [],
      assets: [],
      accepted: 0,
    },
    comms: { records: 0, openTasks: 0 },
    pipeline: {
      openDeals: 2,
      websiteDeals: 2,
      lastWebsiteDealAt: "2026-11-17T10:00:00Z",
      personDeals: 0,
      havenReplies: 2,
    },
    requestForm: { lastRequestAt: null },
    ...overrides,
  };
}

const step = (list, title) => list.find((s) => s.title.startsWith(title));

test("today's state splits the open work between Haven and Rob", () => {
  const s = buildOpsStatus(today());
  assert.equal(step(s.haven, "Sign in").done, false);
  assert.equal(step(s.haven, "Connect care@").done, false);
  assert.match(
    step(s.haven, "Connect care@").waitingOn,
    /Rob adds the worker secret/,
  );
  assert.equal(step(s.haven, "Answer Reply needed").done, false);
  assert.equal(step(s.rob, "Turn on the email worker").done, false);
  assert.equal(
    step(s.rob, "Switch off the shared").waitingOn,
    "Haven signs in",
  );
  assert.equal(step(s.rob, "Retire the old ChatGPT hub").done, null);
  assert.equal(step(s.rob, "Refresh out-of-date").done, false);
  assert.match(step(s.rob, "Refresh out-of-date").text, /Catalog to-dos/);
  assert.equal(s.tally.emailsSent, 0);
  const care = s.areas.find((a) => a.id === "care");
  assert.equal(care.stage, 1);
  assert.equal(care.next.owner, "rob");
});

test("historical documents are never counted as out of date", () => {
  const s = buildOpsStatus(today());
  const docs = s.areas.find((a) => a.id === "documents");
  assert.doesNotMatch(docs.checks[1].text, /Replacing Weaverse/);
});

test("Haven's steps tick off from live facts and unblock Rob's pilot", () => {
  const approved = {
    active: true,
    approved_at: "2026-11-21T10:00:00Z",
    version: 1,
  };
  const base = today();
  const s = buildOpsStatus({
    ...base,
    jobSecret: true,
    sessions: { [ROB]: NOW, [HAVEN]: NOW },
    care: {
      ...base.care,
      sender: { send_as_ok: true, send_as_problem: null },
      templates: [
        { key: "CARE-01", ...approved },
        { key: "CARE-02", ...approved },
      ],
      assets: [
        { kind: "logistics_blank_pdf", ...approved },
        { kind: "care_signature", ...approved },
      ],
    },
  });
  assert.equal(step(s.haven, "Sign in").done, true);
  assert.equal(step(s.haven, "Connect care@").done, true);
  assert.equal(step(s.haven, "Approve the email content").done, true);
  assert.equal(step(s.rob, "Run the test pilot").waitingOn, null);
  assert.equal(step(s.rob, "Switch off the shared").waitingOn, null);
  const care = s.areas.find((a) => a.id === "care");
  assert.equal(care.stage, 2);
  assert.equal(care.next.owner, "haven");
  assert.match(care.next.text, /pilot/);
});

test("live mode with a sent email puts the email area in use", () => {
  const approved = { active: true, approved_at: NOW, version: 2 };
  const base = today();
  const s = buildOpsStatus({
    ...base,
    jobSecret: true,
    care: {
      ...base.care,
      settings: {
        ...base.care.settings,
        mode: "live",
        send_hour: 9,
        live_rules: { "CARE-01": true, "CARE-02": false },
      },
      sender: { send_as_ok: true },
      templates: [
        { key: "CARE-01", ...approved },
        { key: "CARE-02", ...approved },
      ],
      assets: [
        { kind: "logistics_blank_pdf", ...approved },
        { kind: "care_signature", ...approved },
      ],
      accepted: 3,
    },
  });
  const care = s.areas.find((a) => a.id === "care");
  assert.equal(care.stage, 4);
  assert.equal(care.next.owner, null);
  assert.equal(step(s.haven, "Choose the sending hour").done, true);
  assert.equal(s.decisions[0].value, "9:00 America/New_York");
});

test("unreadable sources become 'couldn't check', never false", () => {
  const s = buildOpsStatus(
    today({
      sessions: null,
      connections: null,
      artifacts: null,
      care: { error: "The automation tables haven't been created yet." },
      comms: { error: "The communications tables haven't been created yet." },
      pipeline: { error: "Ops storage request failed (500)." },
      requestForm: { error: "Couldn't read Shopify" },
    }),
  );
  assert.equal(step(s.haven, "Sign in").done, null);
  assert.equal(step(s.haven, "Connect care@").done, null);
  assert.equal(step(s.haven, "Answer Reply needed").done, null);
  assert.equal(s.tally.emailsSent, null);
  const tables = step(s.rob, "Create the missing hub tables");
  assert.equal(tables.done, false);
  assert.match(tables.text, /automation tables/);
  assert.match(tables.text, /communications tables/);
  assert.equal(s.decisions[0].value, "Couldn't read");
});

test("formatAgo", () => {
  assert.equal(formatAgo(null, NOW), "never");
  assert.equal(formatAgo("2026-11-20T01:00:00Z", NOW), "today");
  assert.equal(formatAgo("2026-11-19T10:00:00Z", NOW), "yesterday");
  assert.equal(formatAgo("2026-11-10T10:00:00Z", NOW), "10 days ago");
});
