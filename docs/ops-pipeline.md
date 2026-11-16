# Ops Hub: Sales pipeline

`/ops/pipeline` tracks every inquiry, custom project and trade lead from first contact to an order. It is **phase 1 (manual pipeline)** of [ADR-0009](adr/0009-crm-pipeline-in-ops-hub.md), which replaces Asana as the CRM.

**Nothing in this feature emails anyone.** Reply from Gmail, then record it on the deal.

## Setup (once)

1. In the Ops Supabase SQL editor, run [`scripts/sql/ops-hub-pipeline.sql`](../scripts/sql/ops-hub-pipeline.sql) **before** deploying. It adds three `ops_deal*` tables plus server-only functions, is safe to reapply, and touches no existing table.
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

Defaults chosen for phase 1 (change in `app/utils/ops-pipeline.js`):

- New deals are owned by Haven unless the form says otherwise.
- The quote follow-up interval is 7 days.
- "Today" for due dates is UTC, as in Communications.

## Not built yet

- **Phase 2:** the contact, piece-request and trade forms create deals automatically.
- **Phase 3:** quotes as Shopify draft orders; a paid deposit marks the deal Won and opens it in Communications. The `shopify_draft_order_id` and `shopify_order_id` columns are reserved for this.
- **Phase 4:** CRM tools for Claude and Codex on `/ops/bridge/mcp`.
- **Phase 5:** Gmail sync, designed together with Communications phase B.
- Importing open deals from the Asana export. The `asana` source value is reserved for it.

Tests: `node --test tests/ops-hub-pipeline.test.mjs` (also part of `npm run test:ops-hub`).
