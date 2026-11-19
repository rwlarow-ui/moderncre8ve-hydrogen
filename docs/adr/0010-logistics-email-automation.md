# ADR-0010: Logistics email automation (CARE-01 / CARE-02) in the Ops Hub

**Status:** Accepted. Pilot implementation built 2026-11-19 ([`docs/ops-care-automation.md`](../ops-care-automation.md)); awaiting setup, the controlled pilot and Haven's live decisions. Reply sync (phase B) not built.
**Date:** 2026-11-18
**Decider:** Rob LaRow (owner), Haven (business owner and pilot tester)
**Builds on:** [`docs/ops-customer-communications.md`](../ops-customer-communications.md) (phase A manual tracking), ADR-0001 (production PO and delivery logistics), ADR-0008 (Ops identities)

## Context

Haven's 2026-11-18 handoff ("Finish Logistics Email Automation for Testing", kept out of this public repo like the earlier communications handoff) asks for the first automated customer-care workflow:

1. Send CARE-01 (Delivery logistics request) with the blank Delivery and Logistics PDF on the next business day after an order.
2. Send CARE-02 (Logistics reminder) weekly while the form is outstanding.
3. Stop reminders the moment receipt is recorded.
4. Do all of it through Haven's Gmail as `care@`, with automatic history, durable deduplication, a controlled test mode, and real customer sending **off** until Haven turns it on.

### What already exists (reuse, do not rebuild)

| Need | Exists today | Gap |
| --- | --- | --- |
| Per-order comms record keyed by immutable Shopify order ID | `ops_comms_records`, `ops_comms_events`, `ops_comms_tasks` (`scripts/sql/ops-hub-communications.sql`) | Dates are `date` only; no actual send timestamps, no message/outbox table |
| Form status machine | `applyLogisticsAction` in `app/utils/ops-comms.js`: Not requested → Awaiting return → Received, needs review → Needs clarification → Ready for carrier | `request_sent` is manual; nothing schedules or sends |
| Reminder rules | `reminderEligibility`, `REMINDER_INTERVAL_DAYS = 7`, "update included the reminder" resets the interval, unknown request date never creates catch-up | Evaluated on page load only; "today" is UTC; reminders only *shown* |
| Receipt cancels reminders | `form_received` sets `reminder_next_due_on = null`, opens `logistics_review` and `missing_evidence` tasks | Nothing queued to cancel yet |
| Atomic writes with per-order serialisation | `ops_comms_apply` takes `pg_advisory_xact_lock(hashtext('ops_comms:' || order_id))` and optimistic `updated_at` | — |
| Order source | `listCurrentOrders` (140-day window) in `app/utils/ops-dashboard.server.js`, reads `customer.firstName`, on `OPS_ADMIN_API_TOKEN` | No intake cursor |
| Google OAuth per owner | `ops_.auth.google.ts`, refresh token encrypted with A256GCM under `OPS_CONNECTION_ENCRYPTION_KEY` (`ops-personal.server.js`), scopes `gmail.readonly` + `calendar.events.readonly` | No `gmail.send` |
| Outbound email with idempotency | `po-send.server.js` (Resend, idempotency key `po-<id>-r<revision>`) | Resend cannot send *as* Haven's `care@` alias into her Gmail threads |
| Scheduler | None. Oxygen has no cron; GitHub Actions is the only scheduled runner in this repo | Needs a tick |
| PDF tooling | `pdf-lib` 1.17.1 already a dependency | Blank logistics PDF is **not** in the repo or hub |

### Constraints

- Runtime is Shopify Oxygen (Workers-style: request-scoped, no background threads, subrequest limits per request).
- Volume is tiny: tens of furniture orders per month, so at most a handful of sends per day. Gmail's 2,000/day Workspace limit is irrelevant. Correctness, not throughput, is the whole problem.
- Two operators (Rob, Haven). No on-call. Failures must surface in the Hub, not in logs.
- The repo is public: no customer data, templates are fine (they are customer-facing copy), secrets only in Oxygen.

## Requirements

### Functional
- F1 Versioned, approved CARE-01/CARE-02 templates with source/version recorded; editing the Google Doc does not change sending copy.
- F2 Personalise `[first_name]` (Shopify customer first name, neutral greeting when absent) and `[order_number]` (exactly one `#`).
- F3 Preview shows recipient, From, Reply-To, subject, body, signature, attachment and template version; unresolved placeholders or missing data block sending and open an exception task.
- F4 Send via Haven's Gmail with `care@` send-as identity, approved display name, Reply-To `care@`, signature exactly once, blank PDF attached.
- F5 New eligible orders auto-enrol once; CARE-01 due next business day at the configured hour in the business timezone. No backfill.
- F6 CARE-02 every 7 days after the last *actual* request/reminder, only while Awaiting return; receipt cancels pending reminders immediately.
- F7 Per-order pause/snooze, global pause, explicit live rules per template.
- F8 Automatic history with provider message/thread IDs and Gmail link; draft / queued / accepted / failed / uncertain / suppressed distinguished.
- F9 Test mode: allowlisted recipient, approved test orders only, order-scoped due-date override.
- F10 Reply sync: designed here, **not** in the pilot.

### Non-functional
- N1 At most one CARE-01 per order and one CARE-02 per interval, across retries, refreshes, overlapping ticks and concurrent workers.
- N2 Never a blind resend after a possible acceptance.
- N3 Deployment alone sends nothing.
- N4 Only the hub's own eligible jobs can be sent; no endpoint accepts a recipient or body from a caller.
- N5 Least privilege: `gmail.send` only on Haven's sender connection.

## Decision

Build an **outbox inside the existing Communications module**, driven by an hourly authenticated tick, sending through the **Gmail API directly** with a dedicated, encrypted sender connection on Haven's account.

### High-level design

```
                     ┌───────────────────────────── Ops Hub (Oxygen) ─────────────────────────────┐
 GitHub Actions      │                                                                            │
 hourly cron ──POST──┼─► /ops/jobs/care-tick  (Bearer OPS_JOB_SECRET; no body accepted)          │
                     │        │                                                                   │
 Haven / Rob         │        ├─ 1. intake: Shopify orders since cursor ──► schedule CARE-01      │
 "Run due now" ──────┼────────┤   (signed-in owner, same code path)                               │
                     │        ├─ 2. plan: Awaiting-return records ──► schedule next CARE-02       │
                     │        ├─ 3. reconcile: uncertain jobs ──► Gmail search rfc822msgid:      │
                     │        └─ 4. send: claim due jobs ──► re-check ──► render ──► SEND GATE   │
                     │                                                             │             │
 /ops/communications │  order page: Automation card (preview, enrol, pause,        │             │
  + /automation      │  test override, history)  ── ops_comms_apply ──┐            │             │
                     └────────────────────────────────────────────────┼────────────┼─────────────┘
                                                                      ▼            ▼
                                         Supabase (ops_*): records, events, tasks,    Gmail API
                                         care_settings, care_templates, care_assets,  users.messages.send
                                         care_messages (outbox), Storage: blank PDF   as care@ (Haven)
```

Only the **send gate** (`sendCareMessage` in a new `app/utils/ops-care-send.server.js`) holds the `gmail.send` token. Every path, scheduled or manual, goes through it, and it enforces global pause, mode, live rules and the test allowlist itself, so a bug elsewhere cannot widen who receives mail.

### Data model (new SQL: `scripts/sql/ops-hub-care-automation.sql`, additive, run before deploy)

**`ops_care_settings`** (single row, `id = 1`)

| Column | Default | Notes |
| --- | --- | --- |
| `mode` | `'off'` | `off` / `test` / `live`. Deploy leaves it `off` (N3) |
| `global_pause` | `false` | Instant stop for every send, any mode |
| `live_rules` | `{"CARE-01": false, "CARE-02": false}` | Each template enabled separately in live mode |
| `intake_started_at` | `null` | Set when Haven first enables CARE-01 live; orders created before it are never auto-enrolled (no backfill) |
| `timezone` | `'America/New_York'` | Proposed; Haven confirms |
| `send_hour` | `null` | **Required** before live; Haven chooses. Test mode can send any time |
| `business_days` | `{1,2,3,4,5}` | ISO weekdays |
| `holidays` | `{}` | `date[]`, Haven maintains; no implicit federal calendar |
| `test_recipients` | `{}` | Lower-cased addresses Haven controls |
| `test_order_ids` | `{}` | Shopify order IDs approved for testing |
| `sender_email`, `from_name`, `reply_to` | `haven@…`, Haven's approved name, `care@moderncre8ve.com` | |
| `intake_cursor` | `null` | Highest Shopify `created_at` fully processed by intake. Advanced only by `ops_care_advance_cursor(expected, new)` (compare-and-set) **after** every order in the scan was scheduled or ruled out, so a failed or partial scan is simply repeated on the next tick |
| `last_tick_at`, `last_tick_result` | | Heartbeat for the stale-worker banner only; never used as an intake position |
| `updated_by`, `updated_at` | | Optimistic concurrency like the other ops tables |

**`ops_care_templates`** (immutable rows; one `active` per key)
`key` (`CARE-01`/`CARE-02`), `version`, `subject`, `body_text`, `body_html`, `neutral_greeting`, `source_doc_id`, `source_revision` (Docs revision ID or export timestamp), `content_sha256`, `imported_by/at`, `approved_by/at`, `active`. Unique `(key, version)`; partial unique index on `(key) where active`.

**`ops_care_assets`** (immutable rows; one `active` per kind)
`kind` (`logistics_blank_pdf`, `care_signature`), `version`, `storage_path` (private Supabase Storage bucket `ops-care-assets`), `sha256`, `byte_size`, `page_count`, `filename`, `uploaded_by/at`, `approved_by/at`, `active`. The signature is stored as an asset (HTML + text), snapshotted from Gmail's `sendAs.signature` and approved by Haven, so the exact signature that went out is reproducible.

**`ops_care_messages`** (the outbox; one row per intended send)

| Column | Notes |
| --- | --- |
| `id uuid` | Also used in the RFC 822 `Message-ID: <care-{id}@moderncre8ve.com>` |
| `store`, `order_id`, `order_name` | Store identity + immutable Shopify ID (F2 association rule) |
| `template_key`, `seq` | `seq = 0` for CARE-01; 1, 2, … for reminders |
| `dedupe_key text unique` | `{store}:{order_id}:{template_key}:{seq}`. The single source of N1 |
| `status` | see state machine |
| `due_at timestamptz` | Computed from the schedule rules |
| `override_due_at` | Test orders only (check in RPC) |
| `lease_until`, `attempts` | Claim lease for concurrent workers |
| `snapshot jsonb` | Frozen at render: to, from, reply_to, subject, body hash, template version, signature version, attachment version + sha, test-recipient flag |
| `provider_message_id`, `provider_thread_id`, `accepted_at` | From Gmail; `accepted_at` is the **actual sending time** used for the next interval |
| `outcome_note`, `suppression_reason` | Human-readable |
| `created_at`, `updated_at` | |

**Changes to existing tables** (additive):
- `ops_comms_records`: `logistics_requested_at timestamptz`, `reminder_last_sent_at timestamptz` (keep the `date` columns for the existing UI), `care_enrolment` (`none` / `auto` / `manual`), `care_paused_until date`, `care_excluded boolean`, `care_test_recipient text` (per-order test recipient override; written only by `ops_care_set_test_recipient`, which requires the order to be in `test_order_ids` and the address to be in `test_recipients`).
- `ops_comms_tasks.kind`: add `care_exception` (missing data, attachment failure, uncertain send, sender disconnected). One open per order, like the other kinds.
- `ops_comms_events`: no schema change; new kinds `care_email_sent`, `care_email_failed`, `care_email_uncertain`, `care_email_suppressed`, with `details.message_id` linking to the outbox row.

All new tables follow the existing pattern: RLS on, `anon`/`authenticated` revoked, `service_role` only, writes through `ops_care_*` RPCs that call `ops_check_user` (or a job-principal check for the tick).

### Message state machine

```
             schedule()                    claim (lock, re-check)          Gmail 2xx
 (none) ───────────────► scheduled ─────────────────────────► sending ───────────────► accepted ──► (event + next reminder)
                           │   ▲                                 │  │
       hold (missing data, │   │ resolved by Haven               │  │ 4xx / validation
       attachment, pause)  ▼   │                                 │  └────────────────► failed ──► care_exception task
                           held                                  │
                           │                                     │ timeout / 5xx / network (outcome unknown)
  receipt, cancel, order   │                                     ▼
  cancelled, status change ▼                                  uncertain ──reconcile──► accepted (found in Sent)
                        suppressed / cancelled                     │
                                                                   └──(not found after 2 checks)──► failed (Haven may "Retry", never automatic)
```

`draft` is not a stored state: a preview is rendered on demand and never written. A queued job is never shown as sent; only `accepted` produces a "sent" timeline event, labelled "accepted by Gmail" (not "delivered").

### Tick algorithm (`/ops/jobs/care-tick`, also "Run due now" in the Hub)

1. **Auth.** `Authorization: Bearer` compared in constant time against the SHA-256 of `OPS_JOB_SECRET`; or a signed-in owner session. The request body is ignored. Returns counts only, no customer data.
2. **Heartbeat** into `ops_care_settings`.
3. **Intake** (only if `mode = live` and CARE-01 live rule on, or `mode = test` for `test_order_ids`). Query Shopify for orders `created_at >= max(intake_started_at, intake_cursor - 1h overlap)` (the overlap absorbs Shopify indexing lag; re-seeing an order is harmless because scheduling is idempotent). If every order in the scan is scheduled or ruled out, advance `intake_cursor` to the highest `created_at` seen; if any step fails, leave the cursor where it was and record the error in `last_tick_result`. For each order, eligibility (pure function in `ops-comms.js`):
   - not cancelled, not tagged `ops-no-care` / `test-excluded`, record not `care_excluded`;
   - contains at least one furniture line item (**rule to confirm with Haven**; proposed: any line item whose product is not in the wax/care product types);
   - has a customer email;
   - `logistics_status = not_requested` and no CARE-01 job exists.
   Then `ops_care_schedule` inserts the `CARE-01 / seq 0` job (`on conflict (dedupe_key) do nothing`) and sets `care_enrolment = 'auto'`. Re-running intake is a no-op.
4. **Plan reminders.** For records `awaiting_return`, reminders enabled, not paused, with a known `reminder_last_sent_at` or `logistics_requested_at`: ensure exactly one future `CARE-02 / seq n+1` job. Unknown request date ⇒ nothing (no catch-up).
5. **Reconcile** `uncertain` jobs (see below).
6. **Send.** `ops_care_claim(limit 5)`: `select … where status = 'scheduled' and coalesce(override_due_at, due_at) <= now() for update skip locked`, then for each row takes the **same advisory lock as `ops_comms_apply`** (`ops_comms:<order_id>`), re-evaluates eligibility from the current record and settings inside that transaction, and moves it to `sending` with a 5-minute lease, or to `suppressed` with a reason. Then per claimed job:
   1. Render (template + Shopify data + signature + PDF). Any failure ⇒ `held` + `care_exception` task. Nothing is sent.
   2. **Send gate** checks again: global pause, mode, live rule, and in test mode `to ∈ test_recipients` and `order_id ∈ test_order_ids`. Fails closed.
   3. `ops_care_confirm(job_id)` one last cheap re-read (receipt recorded in the last seconds ⇒ `suppressed`).
   4. Gmail `users.messages.send` (multipart/mixed, `From: "<name>" <care@…>`, `Reply-To: care@…`, fixed `Message-ID`).
   5. `ops_care_record_outcome` in one transaction, under the `ops_comms:<order_id>` advisory lock, **re-reading the record first**. The job always becomes `accepted` with its IDs and a timeline event is always appended (the email did go out). The record is changed only if it is still in the state the send assumed:
      - CARE-01 and the record is still `not_requested` (or `awaiting_return` from a manual request): set `awaiting_return`, `logistics_requested_at = accepted_at`, plan the first reminder.
      - CARE-02 and the record is still `awaiting_return` and not paused: set `reminder_last_sent_at = accepted_at`, plan the next reminder.
      - Otherwise (receipt, clarification, ready for carrier, pause or exclusion was recorded while Gmail was sending): leave the status and reminder fields untouched, schedule nothing, and label the event "Accepted by Gmail after the form receipt was recorded". A receipt is never undone by a send outcome.

At most 5 sends per tick keeps each request well inside Oxygen subrequest and CPU limits; volume never needs more.

### Concurrency and duplicate prevention (N1, N2)

| Scenario | Mechanism |
| --- | --- |
| Same order seen by two ticks / retries / refreshes | `dedupe_key` unique; scheduling is `insert … on conflict do nothing` |
| Two workers claim the same job | `for update skip locked` + `status = 'sending'` lease |
| Worker dies mid-send | Lease expires ⇒ job goes to `uncertain`, **not** back to `scheduled`, so reconciliation runs before anything is resent |
| Receipt recorded while job is queued | `form_received` in `ops_comms_apply` also sets all `scheduled`/`held` CARE-02 jobs for the order to `suppressed` (`receipt recorded`) in the same transaction |
| Receipt and claim race | Both take the `ops_comms:<order_id>` advisory lock, so one fully precedes the other. If the claim wins, the job is `sending`; receipt cannot recall it. The narrow remaining window (milliseconds between `ops_care_confirm` and Gmail acceptance) is accepted and reported honestly: history shows "Reminder accepted by Gmail at 10:00:03, form receipt recorded at 10:00:04". Because `ops_care_record_outcome` re-reads the record under the lock and only applies its transition from the expected state, the receipt stays recorded and no further reminder is planned |
| Manual reminder recorded in an update | Existing `includes_reminder` path additionally suppresses that interval's scheduled job and plans the next from the update date |
| Gmail timeout after possible acceptance | `uncertain` ⇒ search Haven's mailbox `in:sent rfc822msgid:<care-{id}@moderncre8ve.com>` (needs `gmail.readonly`, already granted for the daybook) at +2 and +10 minutes. Found ⇒ `accepted` with real IDs. Not found ⇒ `failed`, `care_exception` task, and a **Retry** button for Haven. No automatic resend, ever |

### Scheduling rules (pure, unit-tested in `ops-comms.js`)

- `nextBusinessSlot(instant, settings)`: convert `instant` to local date in `settings.timezone` (via `Intl.DateTimeFormat`, which Oxygen supports); take the next local date strictly after it that is a business day and not a holiday; return that date at `send_hour` local, converted back to UTC (handles DST).
- CARE-01 `due_at = nextBusinessSlot(order.createdAt)`. Order placed Friday 23:30 ET ⇒ Monday; Saturday ⇒ Monday; Thursday 00:30 UTC (= Wednesday 20:30 ET) ⇒ Thursday. Not a 24-hour delay.
- CARE-02 `due_at = first business slot on or after (last accepted_at + 7 days)`.
- Builder approval / PO review have no effect on timing and are never mentioned to customers.
- All stored instants are `timestamptz`; display converts to the business timezone consistently (fixes the UTC "today" noted in the phase A doc).

### Templates and personalisation

- **Import.** Haven exports CARE-01 and CARE-02 from the finalised Google Doc (Docs "Download as plain text/HTML", or the hub reads it with a Drive read scope if she grants one later). `scripts/import-care-templates.mjs <export>` (or an upload form on the Automation page) parses each tab into `subject`, `body`, and **discards** Trigger and internal-instruction sections by their headings. It stores `source_doc_id`, revision/export time and SHA-256. If the Doc is not readable, we ask Haven for the export; we never write copy ourselves.
- **Lint on import** (blocks activation): only `[first_name]` and `[order_number]` placeholders; no em dash (U+2014); no document headings or bracketed instructions left; no closing sign-off line (signature comes from the signature asset only).
- **Activation** is a separate click by Haven after a rendered preview. Editing the Doc later changes nothing until a new version is imported and activated.
- **Personalisation:** `first_name = customer.firstName?.trim()`; if empty, the greeting line is replaced by the template's approved `neutral_greeting` (Haven supplies it; never derived by splitting `displayName`). `order_number = "#" + order.name.replace(/^#+/, "")`. After substitution any remaining `[...]` token blocks the send.
- **Signature:** Gmail does not add the configured signature to API sends. The hub appends the approved `care_signature` asset exactly once; templates may not contain one (lint).

### Sender connection (N5)

- New connection kind `care_sender`, separate from the personal daybook connection so the daybook keeps read-only scopes. Scopes: `openid email gmail.send gmail.readonly`. Stored encrypted with the existing `OPS_CONNECTION_ENCRYPTION_KEY`.
- Only `haven@moderncre8ve.com` may hold it (checked on callback).
- On connect and daily: `users.settings.sendAs.list` must contain `care@moderncre8ve.com` with `verificationStatus = accepted`; otherwise the hub shows "care@ send-as not verified" and the send gate refuses.
- Disconnect deletes the token; Haven can also revoke in Google Account security.

**Rejected transports**
- *Resend (existing PO path):* cannot place the message in Haven's Sent folder and thread; replies and history live outside Gmail; `care@` would need separate DNS sender setup. Fails F4.
- *Zapier:* an extra hop with weaker idempotency and no access to message IDs without more steps; the hub would still have to own eligibility and dedupe. Kept as a documented fallback only if Google OAuth verification blocks `gmail.send`.

### Scheduler choice

- **Chosen: GitHub Actions** `.github/workflows/care-tick.yml`, `cron: "7 * * * *"`, `curl -fsS -X POST -H "Authorization: Bearer $OPS_JOB_SECRET" https://moderncre8ve.com/ops/jobs/care-tick`. Runs only on the default branch (GitHub's rule for schedules), so preview deployments never tick. Visible run history; a failing tick fails the workflow.
- *Alternative:* Supabase `pg_cron` + `pg_net`. Fewer moving parts but logs are less visible to Rob. Revisit if GitHub cron delays (which can be 10-30 minutes) ever matter; for a once-a-day send hour they do not.
- The tick being late is harmless: jobs are "due at or after", and the hub shows a banner if `last_tick_at` is older than 2 hours.

### Attachment

- Rob or Haven uploads Haven's existing blank PDF on the Automation page. The server checks `%PDF-` header, parses with `pdf-lib`, requires **2 pages**, records SHA-256, size and version, and stores it in the private bucket. Haven approves it from a rendered preview.
- At send time the bytes are fetched and their SHA-256 must match the active version; otherwise the job is `held` with a `care_exception` ("Attachment unavailable"). The snapshot records the attachment version that actually went out.
- Completed customer forms stay in Haven's Drive; only existing per-order links are stored (unchanged from phase A).

### Test mode (F9)

- `mode = test`: sends only for `order_id ∈ test_order_ids` **and** to an address in `test_recipients`. For a test order whose Shopify email is not controlled by Haven, a per-order **test recipient override**, persisted in `ops_comms_records.care_test_recipient` so the hourly tick can use it after the request that set it has ended, replaces `to`. It is validated against the allowlist when set and again by the send gate at send time; the preview labels it "TEST: sending to … instead of the customer address".
- Order-scoped **"Make due now"** sets `override_due_at` on that order's next job (RPC rejects non-test orders). No global clock change.
- **"Run due now"** runs the tick for the signed-in owner.
- **Restore:** a "Leave test mode" action clears every `override_due_at` and `care_test_recipient`, sets `mode = off`, and leaves the history.
- Order #1839 is the proposed test order, subject to Haven re-verifying it and the controlled address. #1834 and #1835 are never test records; the migration seeds nothing and changes no existing record.

### UI locations

| Where | What |
| --- | --- |
| `/ops/communications/automation` (new) | Mode, global pause, live rules, timezone/send hour/business days/holidays, test allowlist and orders, sender connection status (incl. send-as check), templates (versions, preview, activate), assets (PDF, signature), **Exceptions queue** (failed / uncertain / held), tick heartbeat |
| `/ops/communications/<orderId>` | New **Automated emails** card: enrolment (auto / manual "Enrol now" / exclude), next due, pause/snooze until date, full preview (recipient, From, Reply-To, subject, body, signature, attachment, versions), test override and "Make due now", outbox history with Gmail links (`https://mail.google.com/mail/u/?authuser=haven@moderncre8ve.com#all/<threadId>`) |
| Communications queue | New filters: "Email held / failed", "Uncertain send" |

### Reply sync (F10): designed, not in the pilot

Pilot status: **Reply sync pending.** Haven checks replies in Gmail; the hub raises no reply alerts.

Phase B design: poll Gmail `users.history.list` from a stored `historyId` on the sender connection; consider **only threads whose ID matches an `ops_care_messages.provider_thread_id`**, so no unrelated mailbox content is read into the hub. Classify: `mailer-daemon`/DSN ⇒ bounce (exception task); `Auto-Submitted: auto-replied` or out-of-office ⇒ auto-reply (event only); otherwise ⇒ customer reply event + `reply` task with Gmail link, linked by thread to the exact order (handles one customer with several orders). New threads from customers go to a manual "unmatched" queue only if they reply-to a care thread; everything else is ignored.

## Scale and reliability

- **Load:** under 50 sends/month. One tick/hour, ≤ 5 sends per tick. Supabase and Gmail usage are negligible.
- **Failure surfaces:** every non-`accepted` terminal state opens a `care_exception` task (owner Haven) and appears in the Exceptions queue. Stale heartbeat and disconnected/unverified sender show as banners on Communications.
- **Token expiry/revocation:** refresh failure ⇒ send gate refuses, jobs stay `scheduled`, banner "Reconnect care@ sender". Nothing is lost; due jobs go out on the next tick after reconnection (still subject to the re-check).
- **Order leaves the 140-day window:** outbox and comms rows are keyed by order ID and remain; the order page reads Shopify by ID, not from the window.

## Testing

- Pure-function unit tests (extend `tests/ops-hub-comms.test.mjs`): next-business-day across Friday/weekend/holiday, DST transitions, UTC/ET date boundary; eligibility matrix; template lint; personalisation (missing first name, `##1839`, unresolved token); reminder planning; suppression on receipt; manual reminder resets interval.
- Postgres tests (existing harness in `npm run test:ops-hub`): dedupe-key conflicts, concurrent claim with `skip locked`, receipt vs claim ordering under the shared advisory lock, lease expiry ⇒ `uncertain`, test-order-only due and recipient overrides, receipt committed between `ops_care_confirm` and `ops_care_record_outcome` (status stays received, no reminder planned), intake cursor not advanced after a failed scan.
- Send-gate tests with a fake Gmail: 2xx, 4xx, timeout ⇒ reconcile found / not found, pause and mode refusals, allowlist refusal.
- Live controlled pilot: Haven's 12-step sequence from the handoff, run against the deployed hub in `test` mode.

## Rollout

1. Run `ops-hub-care-automation.sql` (additive; `mode = off`).
2. Deploy. Nothing sends (N3). Add `OPS_JOB_SECRET` to Oxygen and to GitHub Actions secrets; enable the workflow.
3. Haven connects the `care_sender` connection; hub verifies `care@` send-as.
4. Import + approve templates, upload + approve PDF and signature.
5. Set `mode = test`, add test order and recipient, run the pilot.
6. After Haven accepts: set `send_hour`, holidays, eligibility rule; enable CARE-01 live (stamps `intake_started_at`), then CARE-02.

**Rollback / disable** (no history is deleted): global pause (instant) ⇒ `mode = off` ⇒ disable the GitHub workflow ⇒ disconnect the sender ⇒ revert the app. The tables can stay; dropping them is only ever `ops_care_messages`, `ops_care_assets`, `ops_care_templates`, `ops_care_settings`, and the added columns are nullable.

## Consequences and trade-offs

| Decision | Benefit | Cost |
| --- | --- | --- |
| Outbox in Supabase with unique dedupe key | Strong, inspectable dedupe; history and schedule are the same rows | One more table and RPC set to maintain |
| Polling intake instead of Shopify `orders/create` webhook | No new public endpoint; idempotent; catches up after outages | Up to an hour's lag, irrelevant for a next-business-day send |
| Gmail API as Haven | Real `care@` identity, Sent folder, threads, replies in her inbox | Needs `gmail.send` consent (Internal Workspace app avoids verification), token can be revoked |
| No automatic retry | Never a duplicate customer email | Haven occasionally clicks Retry |
| Hub-rendered signature | Exactly once, versioned | Must be re-approved if Haven changes her Gmail signature |
| GitHub Actions tick | Visible, already used | Cron timing jitter; depends on GitHub |

## Open questions for Haven before live activation

1. Sending hour, and holiday list for the pilot period.
2. Approved From display name.
3. Approved neutral greeting for when no first name is on the order.
4. Live eligibility rule for "furniture order" (product types/tags to exclude).
5. The controlled test recipient address, and whether #1839 is still suitable.
6. Confirm the `care@` signature to snapshot.
7. The blank PDF file itself, and an export of the finalised Doc if the hub cannot read it.

## What we would revisit as it grows

- More CARE templates: the outbox and template tables are generic; each new template needs only its trigger in the planner.
- Shopify webhooks if intake latency ever matters.
- Phase B reply sync, then the online logistics form writing the same `form_received` action (no parallel tracking).
- Moving the tick to Supabase `pg_cron` if GitHub schedule jitter becomes a problem.

## Implementation notes (2026-11-19)

Where the build differs from the design above:

- **PDF storage.** The blank PDF is stored base64 in `ops_care_assets.content_base64` (capped at about 5 MB), not in a Supabase Storage bucket, so it needs no second API or bucket policy. Page loads never read the bytes; only the send step does, and it re-checks the SHA-256 before attaching.
- **Rules live in one place.** Eligibility is decided in `app/utils/ops-care.js`. The database enforces the invariants: the unique `dedupe_key`, claims that are refused if the order record or settings changed since the decision (optimistic `updated_at` check under the per-order lock), a trigger on `ops_comms_records` that suppresses queued emails in the same transaction as a receipt or other change, and the guarded outcome step.
- **CARE-02 dedupe key** is the reminder's due date (`anchor`), so there is one reminder per interval. A test reminder sent early through the override plans its successor at least 7 days after its own due date, so the two never collide.
- **Enrolment.** Live intake marks new orders `auto`. Haven can enrol an order by hand (`manual`): CARE-01 goes at the next sending slot, never immediately, and an order already Awaiting return is enrolled for reminders only. Records that existed before the migration stay `none`, so no existing order is ever reminded because automation was deployed.
- **Furniture rule.** Without `read_products` on the ops token, "furniture" is judged from line-item names and SKUs against a configurable exclusion list (default wax, oil, gift card, sample), plus the `ops-no-care` order tag.
- **Test send.** "Make due and send now" sets the order-scoped override and runs the worker for that order only.

