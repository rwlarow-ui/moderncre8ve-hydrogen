# Ops Hub: Customer Communications

`/ops/communications` is one work queue for customer updates, replies, delivery logistics and follow-up, linked to Current orders. It implements **phase A (manual foundation)** of Haven's 2026-11-15 handoff (Tech action "Add Customer Communications tab linked to Current Orders"; the handoff itself is kept out of this public repo).

**Only the logistics request and reminder can be emailed by the hub**, through the separate automation in [ops-care-automation.md](ops-care-automation.md), which is off until Haven turns it on. Everything else here is a record: send from Gmail (care@), then record it.

## Setup (once)

1. In the Ops Supabase SQL editor, run [`scripts/sql/ops-hub-communications.sql`](../scripts/sql/ops-hub-communications.sql) **before** deploying. It is additive (four new `ops_*` tables plus server-only functions), safe to reapply, and touches no existing table.
2. Deploy. The tab needs an individual Google sign-in, because every record stores who made it. Shared-password sessions can't open it.

Until step 1 is done, the tab shows "The communications tables haven't been created yet" and the rest of Ops is unaffected.

**Rollback:** revert the app change. The tables can stay. If they must go, drop `ops_comms_tasks`, `ops_comms_events`, `ops_comms_records` and `ops_production_records`, in that order.

## What works (phase A)

| Area | Behaviour |
| --- | --- |
| Queue | Every current Shopify order (140-day window) **plus** any order with a communications record or open task, so post-delivery work survives fulfilment and the window. Filters: Needs my attention, Update due, Reply needed, Logistics outstanding, Logistics needs review, Post-delivery follow-up, All. Search by order number or customer. Unknown dates show as "Unknown". |
| Order link | Keyed by the immutable Shopify order ID. Customer name and email are read live from Shopify, never copied. "Customer communications" button on each Current orders page; "Open in Current orders" back. |
| Production stage | Shared record (Unknown → Awaiting production → In fabrication → Finishing → Ready for delivery → With carrier → Delivered, plus On hold) with confirmed date, source and estimate. Shown on each Current orders page and edited on the order's Communications page. Only its own form changes it. Form receipts and customer replies never do. |
| Logistics form (existing PDF) | Not requested → Awaiting return → Received, needs review → (Needs clarification) → Ready for carrier, then a separate **carrier handoff** record (provider, recipient, form version, date). Resubmissions bump the form version and keep history. |
| Record form received | Works with an unknown date and before the file is filed. Stops reminders immediately, opens a review task, and opens an "attach evidence" task if no link was given. |
| Reminders | Weekly while awaiting return, **off by default**, and only *shown* as due; nothing is sent. Re-evaluated on every page load, so a receipt, a pause or a closed order suppresses it. An update recorded as "included the reminder" resets the interval. An unknown request date never creates a catch-up reminder: set the next date by hand. |
| Timeline | Updates sent, replies, calls, notes, delivery, form events, reviews, handoffs and task changes. Each has its real date (or unknown), who entered it, when, and an optional Gmail or Drive link. |
| Tasks | Owner (Haven or Rob), due date, snooze, done or cancelled with a resolution note. At most one open task per type per order ("Other" excepted). A reply opens "Reply needed". A recorded update closes "Update due". A delivery opens a post-delivery check-in. |

Evidence is stored as **links only** (Gmail message, Drive file). Customer PDFs are not uploaded to the hub or the repo.

## Not built yet

- **Phase B, Gmail sync:** reading care@ correspondence, the unmatched-mail queue and automatic Reply needed tasks. Today's Google connection is read-only and per user, and the matching scope has not been designed.
- **Phase C, sending:** built for CARE-01 and CARE-02 only (ADR-0010, [ops-care-automation.md](ops-care-automation.md)). Other templates and settling the rest of Shopify's notifications are not.
- **Phase D:** an online logistics form.
- Badges on the Current orders list.

## Decisions to confirm before relying on it

- The production stage list above was proposed for this build. Adjust it if Rob's stages differ.
- "Today" for due dates is UTC. Confirm the business time zone before any timed rule goes live.
- Reminder timing (7 days) needs Haven's approval before it drives real sends.
- The pilot orders named in the handoff are **not** seeded. Haven records them from verified facts.

## How to record a returned form

Communications → the order → **Delivery logistics form** → *Record form received*. Add the date if known and the Gmail or Drive link if you have it. The review task appears under Next actions. After reviewing, choose *Needs clarification* or *Reviewed: ready for carrier*. Once the PDF is sent to the carrier, use *Record carrier handoff*.

Tests: `node --test tests/ops-hub-comms.test.mjs` (also part of `npm run test:ops-hub`).
