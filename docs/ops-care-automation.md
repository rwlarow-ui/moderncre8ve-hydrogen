# Ops Hub: logistics email automation (CARE-01 / CARE-02)

The hub can send the delivery logistics request (CARE-01) the next business day after an order, and a weekly reminder (CARE-02) while the form is outstanding. Both go from Haven's Gmail as care@ with the blank logistics PDF attached, and stop the moment receipt is recorded. Design and trade-offs: [ADR-0010](adr/0010-logistics-email-automation.md).

**After deployment, automation is off.** No existing order is enrolled and nothing is sent to anyone until Haven chooses test mode for the pilot, and later live mode with a rule switched on.

## What works, what is pending, what is excluded

| Status | Capability |
| --- | --- |
| Built | Versioned templates imported from Haven's finalised Doc (paste of the tab, or subject/body fields), with a check before import that blocks em dashes, stray notes, unknown placeholders, sign-offs and headings. A version only sends after someone approves it. |
| Built | Personalisation from Shopify by immutable order ID: `[first_name]` (customer first name, never guessed from a full name; Haven's neutral greeting otherwise) and `[order_number]` with exactly one `#`. |
| Built | Sending as care@ through Haven's Gmail, with the approved display name, Reply-To care@, the approved signature added exactly once, and the approved blank PDF (checked to have 2 pages, fingerprinted, and checked again at send time). |
| Built | Live intake of new furniture orders from the moment CARE-01 is switched on (no backfill), with the next business day at the sending hour in America/New_York (configurable), weekend and holiday aware. |
| Built | CARE-02 seven days after the actual request or last reminder, only while Awaiting return. Recording a receipt (including an emailed PDF, before it is filed) cancels queued reminders in the same database transaction. An update that included the reminder resets the date. Unknown request dates never produce catch-up reminders. |
| Built | One queued row per email with a unique key, so retries, refreshes and overlapping workers cannot send a duplicate. The decision to send is checked again just before Gmail. A timeout is reconciled by searching Gmail Sent for the email's fixed Message-ID, never resent blindly. |
| Built | Per-order pause, exclude and enrol; global pause; off / test / live mode with separate live switches for CARE-01 and CARE-02. |
| Built | Test mode: approved test orders and allowlisted recipients only, a per-order test recipient, and "make due and send now" for one test order without touching anyone else's schedule. |
| Built | Automatic history on the order: queued, sent (accepted by Gmail, with time, Gmail message and thread ID and link, template, signature and PDF versions, recipient), held, failed, uncertain and suppressed, plus an Exceptions queue and a "care exception" task for Haven. |
| Pending | **Reply sync is not built.** Customer replies arrive in Haven's Gmail as normal replies to care@, but the hub raises no Reply needed task for them. Check Gmail by hand. |
| Pending | Haven's confirmations (see below) before live mode. |
| Excluded | Other CARE templates, the online logistics form, carrier handoff, the contact form repair and Shopify notification changes. |

"Accepted by Gmail" means Gmail took the message. It is not proof that the email reached the customer's inbox.

## Where things are

| What | Where |
| --- | --- |
| Global pause, mode, live rules, schedule (time zone, sending hour, business days, holidays), test orders and recipients, From name, Reply-To, furniture rule | `/ops/communications/automation` |
| Template versions, import, preview, approval | same page, **Approved templates** |
| Blank PDF upload, open, approve | same page, **Blank logistics PDF** (`/ops/care/pdf/<version>` opens a version) |
| care@ signature | same page, **care@ signature** |
| Error queue | same page, **Exceptions** (and `care exception` tasks under each order's Next actions) |
| Per-order enrol, pause, exclude, preview, history, test send | `/ops/communications/<order id>`, **Automated emails** |
| Worker | `.github/workflows/care-tick.yml` (hourly) calling `POST /ops/jobs/care-tick`; also **Run due emails now** on the Automation page |
| Code | `app/utils/ops-care.js` (rules), `app/utils/ops-care.server.js` (storage, Shopify, Gmail, worker), `scripts/sql/ops-hub-care-automation.sql` |

## Setup (once)

Do these in order. Do not paste any secret into chat or commit it.

1. **Database.** In the Ops Supabase SQL editor, run [`scripts/sql/ops-hub-care-automation.sql`](../scripts/sql/ops-hub-care-automation.sql) **before** deploying. It is additive, safe to run again, and leaves the mode at off.
2. **Google consent screen.** In Google Cloud project `mindful-quasar-486518-r9` → Google Auth Platform → Data access, add the scope `https://www.googleapis.com/auth/gmail.send` (alongside the existing `gmail.readonly`). With an Internal app for the Workspace no Google verification is needed.
3. **Worker secret.** Generate a random value of at least 32 characters (for example `openssl rand -hex 32`). Store the same value as:
   - Oxygen: Shopify Admin → Sales channels → Hydrogen → MODERNCRE8VE → Storefront settings → Environments and variables → Production → add `OPS_JOB_SECRET` (mark it secret).
   - GitHub: repository Settings → Secrets and variables → Actions → New repository secret `OPS_JOB_SECRET`.
   Until both exist the hourly workflow does nothing and the endpoint refuses every call.
4. **Deploy** (merge to `main`). Nothing sends: mode is off.
5. **Haven connects the sender.** Signed in to the hub as haven@moderncre8ve.com: `/ops/communications/automation` → **care@ sender** → *Connect Haven's Gmail for sending*, and grant the send and read permissions. The hub then checks that care@ is a send-as address of her mailbox and shows "care@ send-as verified". Nobody else can connect it.
6. **Approve the content.**
   - Templates: **Import a template version** for CARE-01 and CARE-02 from the finalised Doc, with the approved no-first-name greeting and the Doc's version or date. Open each version's preview and choose *Approve and make vN active*. If the hub's import check refuses a version, fix the Doc wording with Haven rather than editing around it.
   - PDF: upload Haven's blank MODERNCRE8VE Delivery and Logistics PDF, open it from the list, then *Approve after opening it*.
   - Signature: *Copy care@'s signature from Gmail* (or paste the approved one), check it, then approve it.

## Controlled pilot

Run this with Haven. The previous test order was #1839: confirm with her that it is still suitable, and which address she controls. Never use #1834 or #1835.

1. **Configure test mode.** Automation page → *Mode, rules and schedule*: Mode = Test, Test order IDs = the order's ID from its `/ops/orders/<id>` URL (not `#1839`), Test recipient allowlist = Haven's controlled address. Save. Customer orders can't send in test mode: the send step refuses any order or address not on these lists.
2. **Enrol the test order.** Open the order's Communications page → **Automated emails**. If its Shopify email is not Haven's controlled address, set **Test recipient** first. Then *Enrol: queue the logistics request*. One CARE-01 appears as Queued with its due time.
3. **Inspect and send CARE-01.** Open *Preview CARE-01*: check To, From, Reply-To, subject, body, signature and attachment versions. Then *Test: make due and send now*.
4. **Check the received message** (Haven): it arrived, reads well, the PDF opens with both pages and is blank, and Reply goes to care@. *Mark this step pending until Haven confirms it.*
5. **Inspect history.** The order shows CARE-01 "Accepted by Gmail" with time, Gmail ID and link; the logistics form is Awaiting return; the timeline has the send; a CARE-02 is queued 7 days out.
6. **Reply** from the controlled address. It arrives in Haven's Gmail. No hub task appears: reply sync is pending.
7. **Advance the reminder.** On the queued CARE-02, *Test: make due and send now*. One reminder sends and the next one is queued a week later.
8. **Repeat.** Press *Test: run the worker for this order* and *Run due emails now* a few times: no second CARE-01 or same-week CARE-02.
9. **Record receipt.** With a CARE-02 queued, use **Delivery logistics form** → *Record form received*. The status becomes Received, needs review, a review task opens, and the queued CARE-02 shows Suppressed ("Form receipt recorded").
10. **Run the worker again.** Nothing sends; the suppression is in the timeline.
11. **Failure checks** (all safe in test mode): clear the test recipient on a test order whose own address isn't allowlisted (the email is held, with an exception task), the global pause and the per-order pause (the email stays queued), an order excluded or cancelled (suppressed). A Gmail timeout is reconciled from Sent; the automated tests cover it because it can't be caused on purpose against real Gmail.
12. **Restore.** Automation page → *End test: clear test overrides and switch off*. Mode is off; the history stays.

## Before going live (Haven decides)

- The sending hour, and the holidays to skip.
- The From display name (default `MODERNCRE8VE`).
- The greeting to use when an order has no first name (part of each template import).
- Which orders count as furniture: the default treats line items containing "wax", "oil", "gift card" or "sample" as not furniture; an order needs one other item to be enrolled. Orders can also be tagged `ops-no-care` in Shopify to skip them.
- Then: Mode = Live, set the sending hour, switch on CARE-01 (intake starts from that moment), and CARE-02 when ready. Existing orders are never enrolled automatically; enrol one deliberately from its page if wanted.

## Turning it off and rolling back

None of these delete order history.

- **Instant stop:** Automation page → *Pause all automated sending*. Queued emails stay queued.
- **Off:** set Mode = Off.
- **Stop the worker:** GitHub → Actions → *Logistics email worker* → Disable workflow (or remove the `OPS_JOB_SECRET` secret).
- **Remove Gmail access:** Automation page → *Disconnect*, and in Haven's Google Account → Security → Third-party connections, remove the hub's access.
- **Revert the app:** revert the commit. The tables can stay. If they must go, drop `ops_care_messages`, `ops_care_assets`, `ops_care_templates`, `ops_care_sender`, `ops_care_settings` and the trigger `ops_care_records_changed`; the added `ops_comms_records` columns are harmless and can stay.

## Tests

`node --test tests/ops-hub-care.test.mjs` (also in `npm run test:ops-hub`). It runs the pilot steps end to end against a real Postgres (PGlite) with fake Shopify and Gmail: next-business-day and DST rules, template checks, the send gate, one send per interval, receipt cancelling a queued reminder, a receipt landing mid-send, uncertain sends found in Sent, held and failed emails, live intake without backfill, and database permissions.
