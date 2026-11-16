# Ops Hub: Sales pipeline

`/ops/pipeline` tracks every inquiry, custom project and trade lead from first contact to an order. It covers **phases 1 and 2** of [ADR-0009](adr/0009-crm-pipeline-in-ops-hub.md), which replaces Asana as the CRM: a manual pipeline, and deals created automatically from the website's forms.

**Nothing in this feature emails anyone.** Reply from Gmail, then record it on the deal.

## Setup (once)

1. In the Ops Supabase SQL editor, run [`scripts/sql/ops-hub-pipeline.sql`](../scripts/sql/ops-hub-pipeline.sql) **before** deploying. It adds three `ops_deal*` tables plus server-only functions, is safe to reapply, and touches no existing table. If you ran an earlier version for phase 1, run it again: phase 2 adds `ops_pipeline_inbound`.
2. Deploy. The tab needs an individual Google sign-in, because every record stores who made it. Shared-password sessions can't open it.

Until step 1 is done, the tab shows "The pipeline tables haven't been created yet" and the rest of Ops is unaffected.

**Rollback:** revert the app change. The tables can stay. If they must go, drop `ops_deal_tasks`, `ops_deal_events` and `ops_deals`, in that order.

## How it works

| Area | Behaviour |
| --- | --- |
| Contact | Each deal belongs to a **Shopify customer**, keyed by its customer ID. Name, email and phone are read live from Shopify, never copied. "Add a deal" uses the existing customer with that email untouched, or creates one tagged `pipeline-lead` with no marketing consent. A customer can have several deals. |
| Stages | New → Contacted → Discovery (call or visit) → Measured / spec'd → Design sent → Maker quote → Quote sent → Won · Lost · On hold. Deals can skip stages. Only **Move to another stage** changes a stage; recording a reply or a quote never does. Lost needs a reason. Won and Lost record a close date (today if blank). |
| Next step | Every open deal has a next step and a due date. A new deal starts with "Reply to the inquiry", due today. A deal without one, or past its date, shows under *Next step overdue or missing*. |
| Tasks | Owner (Haven or Rob), due date, snooze, done or cancelled with a resolution note. At most one open task per type per deal ("Other" excepted). A customer reply opens *Reply needed*; a reply, design or quote you record closes the matching task. Moving to Quote sent opens *Follow up on the quote*, due 7 days later. Won, Lost and On hold finish the deal's working tasks; "Other" tasks stay. |
| Timeline | Inquiry, replies both ways, calls, visits, designs, maker quotes, quotes, notes, stage changes, edits and task changes. Each has its real date (or unknown), who entered it, when, and an optional Gmail or Drive link. |
| Board | Filters: Needs my attention, All open, Next step overdue or missing, Reply needed, Won, Lost, On hold, All. A strip shows the count and estimated value per open stage; click one to see only that stage. Search by customer, email, deal or next step. |

## Website forms (phase 2)

The contact form, **Request this piece** and the trade application already save the visitor as a tagged Shopify customer and email the owners. After that, they now also record the submission on the pipeline:

- If the customer has an **open** deal, the submission is added to its timeline as an *Inquiry received*. Otherwise a **new** deal opens: owner Haven, next step "Reply to the inquiry" due today.
- Either way, exactly one *Reply needed* task is open afterwards.
- A customer whose deals are all Won or Lost gets a new deal.
- Two quick submissions from the same person can't open two deals.

| Form | Deal title | Type | Value |
| --- | --- | --- | --- |
| Contact | "Contact form: *topic*" | Custom for "Custom furniture quote", Retail for "Showroom visit", otherwise Other | — |
| Request this piece | Product (configuration) | Retail | The listed price, when it's a plain dollar amount |
| Trade application | "Trade application: *business*" | Trade | — |

- **What's skipped.** Contact messages with the topic **Existing order** don't create a deal. They're about an order, so they belong to Communications.
- **Email link.** The owner email adds a line with a link to the deal, when `OPS_APP_URL` is an https address.
- **What's stored.** The timeline entry holds the same text as the Shopify customer note. It's shown as plain text.
- **Failures.** Intake runs after the visitor's submission has succeeded, off the response path. If the Ops database isn't configured or fails, the form still works and the email still goes out, without the link. The failure is logged as "… pipeline intake failed".
- **Actor.** Deals and entries made this way are recorded as made by `website`.

Email inquiries to info@ (like the ones Asana used to hold) still go in by hand with **Add a deal**, with source Email and the Gmail link, until Gmail sync (phase 5).

Defaults chosen for phase 1 (change in `app/utils/ops-pipeline.js`):

- New deals are owned by Haven unless the form says otherwise.
- The quote follow-up interval is 7 days.
- "Today" for due dates is UTC, as in Communications.

## Not built yet

- **Phase 3:** quotes as Shopify draft orders; a paid deposit marks the deal Won and opens it in Communications. The `shopify_draft_order_id` and `shopify_order_id` columns are reserved for this.
- **Phase 4:** CRM tools for Claude and Codex on `/ops/bridge/mcp`.
- **Phase 5:** Gmail sync, designed together with Communications phase B.
- Importing open deals from the Asana export. The `asana` source value is reserved for it.

Tests: `node --test tests/ops-hub-pipeline.test.mjs` (also part of `npm run test:ops-hub`).
