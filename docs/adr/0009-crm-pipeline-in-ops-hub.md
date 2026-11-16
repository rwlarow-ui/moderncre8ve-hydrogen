# ADR-0009: A sales pipeline (CRM) inside the Ops Hub, replacing Asana

**Status:** Accepted. Phases 1 and 2 implemented 2026-11-16 ([`docs/ops-pipeline.md`](../ops-pipeline.md)); later phases pending.
**Date:** 2026-11-16
**Decider:** Rob LaRow

## Context

Leads and custom-order work were tracked in Asana. Asana is being retired. Its data will not be ported wholesale; its structure (sections, custom fields, task templates) is the input to this design.

The pieces a CRM needs mostly exist already, in different places:

| Need | What exists today | Gap |
| --- | --- | --- |
| Contact of record | The contact, piece-request and trade forms upsert a **Shopify customer**, tag it (`upsertTaggedCustomer` in `app/utils/trade-application.server.js`) and put the request in the customer note | No stage, owner, value, next step or history. A second inquiry overwrites context in one note field |
| Owner alert | Each form emails the owners | Email inquiries to info@ never reach Shopify at all |
| Private store and sign-in | Ops Hub Supabase, individual Google sign-in for Rob and Haven (ADR-0008) | — |
| Work-queue pattern | `/ops/communications`: Shopify-keyed records, a dated timeline, typed tasks with owners and due dates, Gmail/Drive links as evidence, nothing sent automatically | Keyed to **orders**, so it starts where a sale ends |
| Claude access | `/ops/bridge/mcp`, an OAuth remote MCP server, tools limited to context publishing | No CRM tools |
| Local agent access | `ops-dashboard` stdio MCP (`set_ops_note`, `update_owner_tags`) on the narrowed ops token | Orders and customer tags only |
| Sales tab | `/ops/sales`: published context (the dated "Trade pipeline" artifact) plus free-form tasks | A narrative, not records |

The custom-work flow, seen in recent threads, runs: inquiry → call or site visit → measurements → preliminary design → maker quote (Barkman) → customer quote → deposit and order → production. The Communications tab picks up at "order".

## Decision

Build the CRM as a **Pipeline module in the existing Ops Hub**, the order-less front half of the Communications tab.

1. **Shopify stays the contact of record.** A pipeline record ("deal") is keyed by the immutable Shopify customer ID. Name, email and phone are read live from Shopify and never copied, the same rule Communications uses. Email-only inquiries go in through **Add a deal**, which uses the existing customer or creates one tagged `pipeline-lead` with no marketing consent. (This replaced the `lead-email` tag first proposed here.)
2. **Supabase holds pipeline state.** These tables are additive and server-only, following `ops-hub-communications.sql`:
   - `ops_deals`: customer ID, type (retail, custom, trade, wholesale/manufacturing, other), stage, owner, estimated value, source, next step and its due date, lost reason, linked Shopify draft order and order IDs
   - `ops_deal_events`: dated timeline (inquiry, reply, call, visit, design sent, quote sent, note, stage change), each with who entered it and an optional Gmail or Drive link
   - `ops_deal_tasks`: the Communications task model (owner, due, snooze, done or cancelled with a resolution note, at most one open task per type)
3. **Inquiries create deals automatically.** The three form actions add a deal and an "Inquiry" event after the customer upsert. This is best-effort, off the response path, like today's notification email. A second inquiry from the same customer adds an event to their open deal instead of a duplicate.
4. **Quotes are Shopify draft orders.** "Send quote" creates a draft order and links it. Paying the draft-order invoice (the deposit) creates a real order. The next page load sees that order, marks the deal Won, and opens it in Communications. No new payment path.
5. **Claude and Codex use the existing bridge.** Add a separately consented `crm` permission to `/ops/bridge/mcp` with tools `list_deals`, `get_deal`, `create_deal`, `log_event`, `set_stage`, `add_task` and `save_draft_reply` (stored text only). There is **no send tool**: replies go out from Gmail and are logged back. Context-only grants keep their current reach. The speed-to-lead routine then logs here instead of to a local file. Codex reaches the same tools if its MCP client supports remote servers with OAuth. Otherwise it builds against this ADR and `AGENTS.md` and uses the stdio `ops-dashboard` server.

### Stages (accepted by the owner 2026-11-16)

New → Contacted → Discovery (call or visit) → Measured / spec'd → Design sent → Maker quote → Quote sent → Won (order) · Lost (reason) · On hold

A retail "can you ship to 33703?" question can go straight from Contacted to Won or Lost. Not every deal walks every stage.

### What we take from Asana, and how

Export the old CRM project once as CSV (Asana: project menu → Export → CSV). Use it to:

- map Asana sections to the stages above and custom fields to `ops_deals` columns, and
- optionally import **open** deals only, through `create_deal`, linked to existing Shopify customers by email.

Closed history stays in the export file, not in the hub. The Asana connector did not connect in the 2026-11-16 session, so this mapping has not been done yet.

## Phases

Each phase is one PR, with tests alongside `tests/ops-hub-comms.test.mjs`.

| Phase | Delivers | Depends on |
| --- | --- | --- |
| 1. Manual pipeline | SQL, `/ops/pipeline` board (by stage, filters: mine, overdue next step, by type), deal page with timeline and tasks, "Add deal from Gmail link" form | ADR-0008 sign-in live |
| 2. Inbound capture | Form actions create deals; `lead-email` path for info@ inquiries | 1 |
| 3. Shopify quotes | Draft-order quote from a deal, Won on order, hand-off to Communications | 1 |
| 4. Agent tools | `crm` bridge permission and tools; speed-to-lead and Codex use them | 1 |
| 5. Gmail sync | Unmatched info@ and care@ mail as suggested deals or events. **Shared with Communications phase B**, designed once | 1, comms phase B design |

## Considered and rejected

- **HubSpot or another hosted CRM.** It would duplicate the Shopify customer and need a sync, and it adds a vendor and a login. The Ops Hub already has the store, sign-in, task model and Claude connector.
- **Shopify only (tags, notes, metaobjects).** There is no history, tasks or owners, and the ops token lacks metaobject scopes (ADR-0002).
- **Porting Asana in full.** It is a large build for data that is mostly closed, which is exactly what the owner ruled out.

## Consequences

- Leads and orders share one hub and one task model, so "nothing falls through the cracks" can be checked: every open deal has a next step and a due date or shows as overdue.
- The bridge gains write tools. They stay behind individual consent, a separate permission, revocation in `/ops/settings`, and no send capability.
- Email-only leads become Shopify customers. They carry no marketing consent, but they will show in the customer list. Filter on `lead-email` if that becomes noise.

## Open decisions

1. ~~Confirm the stage list~~ Accepted as proposed. Deal types ship as proposed, including wholesale / manufacturing; drop it if that work isn't taken on.
2. Should email-only inquiries create a Shopify customer at first contact (proposed), or only once a quote is sent?
3. Who owns new deals by default? Phase 1 defaults to Haven, changeable per deal.
4. Provide the Asana CSV export for the field and stage mapping.
