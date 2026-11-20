/**
 * Ops Hub rollout status: pure rules that turn live facts (gathered by
 * ops-status.server.js) into areas, checks and next steps. No I/O here, so
 * every rule is unit-tested in tests/ops-hub-status.test.mjs.
 *
 * A fact is `undefined`/`null` when it couldn't be read; checks built from it
 * report `ok: null` ("couldn't check") instead of guessing.
 */

export const ROB = "rob@moderncre8ve.com";
export const HAVEN = "haven@moderncre8ve.com";

/** Built → set up on the live site → tested with real data → in daily use. */
export const STATUS_STAGES = ["Built", "Set up", "Tested", "In use"];

const DAY = 24 * 60 * 60 * 1000;

/** @param {boolean | null | undefined} ok @param {string} label @param {string} text */
const check = (label, ok, text) => ({
  label,
  ok: ok === undefined ? null : ok,
  text,
});

const known = (value) => value !== null && value !== undefined;
const ageDays = (iso, now) =>
  iso ? Math.floor((Date.parse(now) - Date.parse(iso)) / DAY) : null;

export function formatAgo(iso, now) {
  if (!iso) {
    return "never";
  }
  const days = ageDays(iso, now);
  if (days === null || Number.isNaN(days)) {
    return "unknown";
  }
  if (days <= 0) {
    return "today";
  }
  if (days === 1) {
    return "yesterday";
  }
  return `${days} days ago`;
}

/** Highest stage whose condition holds, counting up from 1 (built). */
function stageFrom(conditions) {
  let stage = 1;
  for (const holds of conditions) {
    if (!holds) {
      break;
    }
    stage += 1;
  }
  return stage;
}

/** First failing check that has an owner becomes the area's next step. */
function nextFrom(steps, done) {
  const step = steps.find((s) => !s.when);
  return step ? { text: step.text, owner: step.owner } : done;
}

function signInArea(f) {
  const rob = f.sessions ? (f.sessions[ROB] ?? null) : undefined;
  const haven = f.sessions ? (f.sessions[HAVEN] ?? null) : undefined;
  const checks = [
    check(
      "Google sign-in configured",
      f.googleLogin,
      f.googleLogin ? "Configured on Oxygen" : "Google client not configured",
    ),
    check(
      "Rob has signed in",
      known(rob) ? Boolean(rob) : rob,
      f.sessions ? `Last sign-in ${formatAgo(rob, f.now)}` : "Couldn't read",
    ),
    check(
      "Haven has signed in",
      known(haven) ? Boolean(haven) : haven,
      f.sessions ? `Last sign-in ${formatAgo(haven, f.now)}` : "Couldn't read",
    ),
    check(
      "Shared team password switched off",
      f.cutover,
      f.cutover
        ? "Only individual Google sign-in works"
        : "The shared password still works",
    ),
  ];
  return {
    id: "sign-in",
    title: "Google sign-in",
    stage: stageFrom([f.googleLogin && f.store, rob && haven, f.cutover]),
    checks,
    next: nextFrom(
      [
        {
          when: f.googleLogin,
          owner: "rob",
          text: "Configure the Google web client on Oxygen.",
        },
        {
          when: Boolean(haven),
          owner: "haven",
          text: "Sign in with Continue with Google as haven@moderncre8ve.com and open each tab.",
        },
        {
          when: f.cutover,
          owner: "rob",
          text: "Set OPS_INDIVIDUAL_LOGIN_ENABLED=true on Oxygen to retire the shared password.",
        },
      ],
      { text: "Done. Only named Google accounts can sign in.", owner: null },
    ),
  };
}

function dailyArea(f) {
  const conn = (email) =>
    f.connections ? Boolean(f.connections[email]) : undefined;
  return {
    id: "daily",
    title: "Daily (Gmail and Calendar)",
    stage: stageFrom([
      f.encryptionKey,
      conn(ROB) || conn(HAVEN),
      conn(ROB) && conn(HAVEN),
    ]),
    checks: [
      check(
        "Connection encryption key set",
        f.encryptionKey,
        f.encryptionKey ? "Set on Oxygen" : "Not set, so nobody can connect",
      ),
      check(
        "Rob connected Google",
        conn(ROB),
        conn(ROB) ? "Connected" : "Not connected",
      ),
      check(
        "Haven connected Google",
        conn(HAVEN),
        conn(HAVEN) ? "Connected" : "Not connected",
      ),
    ],
    next: nextFrom(
      [
        {
          when: f.encryptionKey,
          owner: "rob",
          text: "Set OPS_CONNECTION_ENCRYPTION_KEY on Oxygen.",
        },
        {
          when: conn(HAVEN),
          owner: "haven",
          text: "Connect your Google account from Daily or Account & connections (read-only).",
        },
        {
          when: conn(ROB),
          owner: "rob",
          text: "Connect your Google account from Daily.",
        },
      ],
      { text: "Both accounts are connected.", owner: null },
    ),
  };
}

const tablesCheck = (label, area) =>
  check(
    `${label} tables created`,
    area ? !area.error : undefined,
    area?.error ? area.error : "Created",
  );

function commsArea(f) {
  const c = f.comms;
  const ready = c && !c.error;
  const records = ready ? c.records : 0;
  return {
    id: "communications",
    title: "Communications",
    stage: stageFrom([ready, records > 0, records > 0]),
    checks: [
      tablesCheck("Communications", c),
      check(
        "Orders with a communications record",
        ready ? records > 0 : undefined,
        ready ? `${records} orders, ${c.openTasks} open tasks` : "—",
      ),
    ],
    next: nextFrom(
      [
        {
          when: ready,
          owner: "rob",
          text: "Run scripts/sql/ops-hub-communications.sql in the Ops Supabase project.",
        },
        {
          when: records > 0,
          owner: "haven",
          text: "Open Communications and record updates, replies and returned logistics forms.",
        },
      ],
      { text: "In use.", owner: null },
    ),
  };
}

const activeApproved = (list, match) =>
  (list ?? []).find((x) => match(x) && x.active && x.approved_at) ?? null;

function careArea(f) {
  const c = f.care;
  const ready = c && !c.error;
  const s = ready ? c.settings : {};
  const sender = ready ? c.sender : null;
  const verified = Boolean(sender?.send_as_ok);
  const t1 = ready
    ? activeApproved(c.templates, (t) => t.key === "CARE-01")
    : null;
  const t2 = ready
    ? activeApproved(c.templates, (t) => t.key === "CARE-02")
    : null;
  const pdf = ready
    ? activeApproved(c.assets, (a) => a.kind === "logistics_blank_pdf")
    : null;
  const sig = ready
    ? activeApproved(c.assets, (a) => a.kind === "care_signature")
    : null;
  const content = Boolean(t1 && t2 && pdf && sig);
  const sent = ready ? c.accepted : 0;
  const live = ready && s.mode === "live" && Boolean(s.live_rules?.["CARE-01"]);
  const r = (v) => (ready ? v : undefined);
  const modeText = !ready
    ? "—"
    : s.global_pause
      ? `${s.mode}, paused`
      : s.mode === "live"
        ? `live (CARE-01 ${s.live_rules?.["CARE-01"] ? "on" : "off"}, CARE-02 ${s.live_rules?.["CARE-02"] ? "on" : "off"})`
        : s.mode;
  return {
    id: "care",
    title: "Logistics emails (CARE-01/02)",
    stage: stageFrom([
      ready && f.jobSecret && verified,
      content && sent > 0,
      live,
    ]),
    checks: [
      tablesCheck("Automation", c),
      check(
        "Worker secret on Oxygen",
        f.jobSecret,
        f.jobSecret
          ? `Set. Last worker run ${formatAgo(s.last_tick_at, f.now)}`
          : "OPS_JOB_SECRET not set, so the hourly worker does nothing",
      ),
      check(
        "care@ connected and send-as verified",
        r(verified),
        !ready
          ? "—"
          : !sender
            ? "Not connected"
            : verified
              ? "Verified"
              : sender.send_as_problem || "Connected, send-as not verified",
      ),
      check(
        "CARE-01 template approved",
        r(Boolean(t1)),
        t1 ? `v${t1.version} active` : "No approved version",
      ),
      check(
        "CARE-02 template approved",
        r(Boolean(t2)),
        t2 ? `v${t2.version} active` : "No approved version",
      ),
      check(
        "Blank logistics PDF approved",
        r(Boolean(pdf)),
        pdf ? `v${pdf.version} active` : "No approved version",
      ),
      check(
        "care@ signature approved",
        r(Boolean(sig)),
        sig ? `v${sig.version} active` : "No approved version",
      ),
      check(
        "Test pilot sent",
        r(sent > 0),
        ready ? `${sent} emails accepted by Gmail` : "—",
      ),
      check("Mode", r(live), modeText),
    ],
    next: nextFrom(
      [
        {
          when: ready,
          owner: "rob",
          text: "Run scripts/sql/ops-hub-care-automation.sql in the Ops Supabase project.",
        },
        {
          when: f.jobSecret,
          owner: "rob",
          text: "Add OPS_JOB_SECRET in GitHub and on Oxygen, and the gmail.send scope in Google.",
        },
        {
          when: verified,
          owner: "haven",
          text: "Communications → Automation → Connect Haven's Gmail for sending.",
        },
        {
          when: content,
          owner: "haven",
          text: "Import and approve CARE-01 and CARE-02, the blank PDF and the care@ signature.",
        },
        {
          when: sent > 0,
          owner: "haven",
          text: "Run the test-mode pilot with Rob (order #1839, never #1834 or #1835).",
        },
        {
          when: live,
          owner: "haven",
          text: "Choose the sending hour, then switch to Live and turn on CARE-01.",
        },
      ],
      { text: "Live.", owner: null },
    ),
  };
}

function pipelineArea(f) {
  const p = f.pipeline;
  const ready = p && !p.error;
  return {
    id: "pipeline",
    title: "Sales pipeline",
    stage: stageFrom([
      ready,
      ready && p.websiteDeals > 0,
      ready && p.personDeals > 0,
    ]),
    checks: [
      tablesCheck("Pipeline", p),
      check(
        "Website forms open deals",
        ready ? p.websiteDeals > 0 : undefined,
        ready
          ? `${p.websiteDeals} deals from forms, last ${formatAgo(p.lastWebsiteDealAt, f.now)}`
          : "—",
      ),
      check(
        "Deals worked by a person",
        ready ? p.personDeals > 0 : undefined,
        ready ? `${p.openDeals} open deals` : "—",
      ),
      check(
        "Haven's open Reply needed tasks",
        ready ? p.havenReplies === 0 : undefined,
        ready ? `${p.havenReplies} open` : "—",
      ),
    ],
    next: nextFrom(
      [
        {
          when: ready,
          owner: "rob",
          text: "Run scripts/sql/ops-hub-pipeline.sql in the Ops Supabase project.",
        },
        {
          when: !ready || p.havenReplies === 0,
          owner: "haven",
          text: "Answer the open Reply needed tasks in Pipeline.",
        },
      ],
      { text: "Up to date.", owner: null },
    ),
  };
}

function poArea(f) {
  const ok = f.poEmail?.ok;
  const missing = [
    ...(f.poEmail?.missing ?? []),
    ...(f.poEmail?.invalid ?? []),
  ];
  return {
    id: "pos",
    title: "Purchase orders",
    stage: stageFrom([true, ok]),
    checks: [
      check("Review and approval", true, "Working"),
      check(
        "PO email sender configured",
        ok,
        ok ? "Configured" : `Missing or invalid: ${missing.join(", ")}`,
      ),
    ],
    next: ok
      ? {
          text: "Run one dry run to your own address, then point it at Barkman.",
          owner: "rob",
        }
      : {
          text: "Set RESEND_API_KEY, PO_FROM_EMAIL and PO_PARTNER_EMAIL on Oxygen.",
          owner: "rob",
        },
  };
}

function requestArea(f) {
  const r = f.requestForm;
  const readable = r && !r.error;
  const recent =
    readable && r.lastRequestAt ? ageDays(r.lastRequestAt, f.now) <= 14 : false;
  return {
    id: "request-form",
    title: "Request this piece form",
    stage: stageFrom([f.adminToken, f.requestEmail, recent]),
    checks: [
      check(
        "Shopify token for saving requests",
        f.adminToken,
        f.adminToken ? "Set on Oxygen" : "OPS_ADMIN_API_TOKEN not set",
      ),
      check(
        "Owner email for requests",
        f.requestEmail,
        f.requestEmail
          ? "Configured"
          : "Needs RESEND_API_KEY, PO_FROM_EMAIL and PIECE_REQUEST_NOTIFY_EMAIL",
      ),
      check(
        "Last saved request",
        readable ? Boolean(r.lastRequestAt) : undefined,
        readable ? formatAgo(r.lastRequestAt, f.now) : "Couldn't read Shopify",
      ),
    ],
    next: nextFrom(
      [
        {
          when: f.adminToken,
          owner: "rob",
          text: "Set OPS_ADMIN_API_TOKEN on Oxygen.",
        },
        {
          when: f.requestEmail,
          owner: "rob",
          text: "Set the request email settings on Oxygen.",
        },
        {
          when: recent,
          owner: "rob",
          text: "Send one test request from the Warwick page and check it appears here.",
        },
      ],
      { text: "Working.", owner: null },
    ),
  };
}

function documentsArea(f) {
  const rows = f.artifacts;
  const byId = new Map((rows ?? []).map((a) => [a.source_id, a]));
  const stale = rows
    ? f.sources.filter((s) => {
        const a = byId.get(s.id);
        if (!a || a.withdrawn) {
          return s.status !== "historical";
        }
        return (
          s.status !== "historical" &&
          ageDays(a.source_updated_at, f.now) > s.freshnessDays
        );
      })
    : [];
  const lastPublish = rows?.length
    ? rows
        .map((a) => a.published_at)
        .sort()
        .at(-1)
    : null;
  return {
    id: "documents",
    title: "Claude connector and documents",
    stage: stageFrom([
      f.store,
      Boolean(lastPublish),
      lastPublish ? ageDays(lastPublish, f.now) <= 7 : false,
    ]),
    checks: [
      check(
        "Last document published",
        rows ? Boolean(lastPublish) : undefined,
        rows ? formatAgo(lastPublish, f.now) : "Couldn't read",
      ),
      check(
        "Documents past their refresh interval",
        rows ? stale.length === 0 : undefined,
        rows
          ? stale.length
            ? stale.map((s) => s.title).join(", ")
            : "None"
          : "—",
      ),
    ],
    next: stale.length
      ? {
          text: `Republish or withdraw ${stale.length} out-of-date documents.`,
          owner: "rob",
        }
      : { text: "Up to date.", owner: null },
  };
}

const checkOf = (area, label) =>
  area.checks.find((c) => c.label === label)?.ok ?? null;
const allOf = (values) =>
  values.some((v) => v === null) ? null : values.every(Boolean);

/**
 * Work split by person. Each step is ticked from live facts: done is true,
 * false, or null when the hub can't check it. `waitingOn` names the other
 * person's step that has to happen first.
 */
function splitWork(f, areas) {
  const by = Object.fromEntries(areas.map((a) => [a.id, a]));
  const care = by.care;
  const tablesMissing = [f.care, f.comms, f.pipeline]
    .map((x) => x?.error)
    .filter((e) => e && /haven't been created/.test(e));
  const havenSigned = f.sessions ? Boolean(f.sessions[HAVEN]) : null;
  const robSecret = Boolean(f.jobSecret);
  const sender = checkOf(care, "care@ connected and send-as verified");
  const content = allOf(
    [
      "CARE-01 template approved",
      "CARE-02 template approved",
      "Blank logistics PDF approved",
      "care@ signature approved",
    ].map((l) => checkOf(care, l)),
  );
  const pilot = checkOf(care, "Test pilot sent");
  const p = f.pipeline && !f.pipeline.error ? f.pipeline : null;
  const s = f.care && !f.care.error ? f.care.settings : null;
  const conn = (email) =>
    f.connections ? Boolean(f.connections[email]) : null;
  const stale = by.documents.checks[1];

  const haven = [
    {
      title: "Sign in with your own Google account",
      done: havenSigned,
      text: "moderncre8ve.com/ops → Continue with Google → haven@moderncre8ve.com. Open Daily, Tech, an order, Communications and Pipeline. Tell Rob if a tab says its tables haven't been created.",
    },
    {
      title: "Connect care@ for sending",
      done: sender,
      waitingOn: robSecret
        ? null
        : "Rob adds the worker secret and Gmail send permission",
      text: "Communications → Automation → Connect Haven's Gmail for sending. It should then say “care@ send-as verified”.",
    },
    {
      title: "Approve the email content",
      done: content,
      text: "Same page: import and approve CARE-01 and CARE-02 from your finalised Doc, upload and approve the blank logistics PDF, and copy and approve the care@ signature.",
    },
    {
      title: "Run the test pilot with Rob",
      done: pilot,
      waitingOn: sender && content ? null : "the two steps above",
      text: "Test mode on order #1839 (if still suitable) with an address you control. Never #1834 or #1835. Check the email, the two-page blank PDF, and that Reply goes to care@.",
    },
    {
      title: "Choose the sending hour and holidays",
      done: s ? s.send_hour !== null && s.send_hour !== undefined : null,
      text: "Automation → Mode, rules and schedule. Also confirm the From name, the greeting for orders without a first name, and which items don't count as furniture (see Settings to decide below).",
    },
    {
      title: "Answer Reply needed tasks in Pipeline",
      done: p ? p.havenReplies === 0 : null,
      text: p
        ? `${p.havenReplies} open. Website inquiries open a deal assigned to you with “Reply to the inquiry” due the same day.`
        : "Website inquiries open a deal assigned to you with “Reply to the inquiry” due the same day.",
    },
    {
      title: "Connect Google for Daily (optional)",
      done: conn(HAVEN),
      text: "Daily or Account & connections → Connect Google. Read-only; it shows your unread mail and the next week's calendar.",
    },
    {
      title: "Until reply sync is built, check care@ by hand",
      done: null,
      text: "The hub doesn't read care@ yet. Record customer replies on the order's Communications page.",
    },
  ];

  const rob = [
    ...(tablesMissing.length
      ? [
          {
            title: "Create the missing hub tables",
            done: false,
            text: tablesMissing.join(" "),
          },
        ]
      : []),
    {
      title: "Turn on the email worker",
      done: robSecret,
      text: "Add the same OPS_JOB_SECRET in GitHub Actions secrets and on Oxygen, and add the gmail.send scope to the Google sign-in app. Haven can't connect care@ until this is done.",
    },
    {
      title: "Switch off the shared team password",
      done: Boolean(f.cutover),
      waitingOn: havenSigned ? null : "Haven signs in",
      text: "Set OPS_INDIVIDUAL_LOGIN_ENABLED=true on Oxygen and redeploy. Only named Google accounts can sign in afterwards.",
    },
    {
      title: "Get the Request this piece form saving again",
      done:
        checkOf(by["request-form"], "Last saved request") &&
        by["request-form"].stage >= 4,
      text: "Blocking sales for the Warwick, Haven bed and Vermonter. Check OPS_ADMIN_API_TOKEN and the request email settings on Oxygen, then send one test request.",
    },
    {
      title: "Set up the PO email sender and dry run",
      done: Boolean(f.poEmail?.ok),
      text: "Set RESEND_API_KEY, PO_FROM_EMAIL and PO_PARTNER_EMAIL on Oxygen, then send one PO to your own address before pointing it at Barkman.",
    },
    {
      title: "Run the test pilot with Haven",
      done: pilot,
      waitingOn:
        sender && content
          ? null
          : "Haven connects care@ and approves the content",
      text: "Automation → Mode = Test with the test order ID and Haven's address, then follow the 12 pilot steps in docs/ops-care-automation.md.",
    },
    {
      title: "Refresh out-of-date documents",
      done: stale.ok,
      text:
        stale.ok === false
          ? `Republish or withdraw: ${stale.text}.`
          : "Ask Claude to republish a document after editing it.",
    },
    {
      title: "Retire the old ChatGPT hub",
      done: null,
      text: "Export its POs, decide routing for Louisiana, Mississippi and orders outside the lower 48, then switch it off (docs/ops-hub-prototype-retirement.md). The hub can't check this.",
    },
  ];
  return { haven, rob };
}

/** Current automation settings Haven decides before going live. */
function decisions(f) {
  const s = f.care && !f.care.error ? f.care.settings : null;
  const v = (fn) => (s ? fn(s) : "Couldn't read");
  return [
    {
      label: "Sending hour",
      value: v((x) =>
        x.send_hour === null || x.send_hour === undefined
          ? "Not chosen"
          : `${x.send_hour}:00 ${x.timezone}`,
      ),
      decided: s ? s.send_hour !== null && s.send_hour !== undefined : null,
    },
    {
      label: "Holidays skipped",
      value: v((x) =>
        x.holidays?.length ? x.holidays.join(", ") : "None listed",
      ),
      decided: s ? Boolean(s.holidays?.length) : null,
    },
    {
      label: "From name",
      value: v((x) => x.from_name),
      decided: null,
    },
    {
      label: "Not furniture (skipped)",
      value: v((x) => (x.excluded_item_patterns ?? []).join(", ")),
      decided: null,
    },
    {
      label: "Reminder interval",
      value: "Every 7 days while the form is outstanding",
      decided: null,
    },
    {
      label: "Due-date time zone",
      value: "UTC (Communications and Pipeline)",
      decided: null,
    },
  ];
}

export function buildOpsStatus(f) {
  const areas = [
    signInArea(f),
    dailyArea(f),
    commsArea(f),
    careArea(f),
    pipelineArea(f),
    poArea(f),
    requestArea(f),
    documentsArea(f),
  ];
  const { haven, rob } = splitWork(f, areas);
  const open = (list) => list.filter((x) => x.done === false).length;
  return {
    checkedAt: f.now,
    areas,
    haven,
    rob,
    decisions: decisions(f),
    tally: {
      areas: areas.length,
      inUse: areas.filter((a) => a.stage >= 4).length,
      havenOpen: open(haven),
      robOpen: open(rob),
      emailsSent: f.care && !f.care.error ? f.care.accepted : null,
    },
  };
}
