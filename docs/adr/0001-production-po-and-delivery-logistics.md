# ADR-0001: Automated production PO + Delivery/Logistics intake

**Status:** Proposed
**Date:** 2026-10-12
**Deciders:** Rob LaRow (owner/ops)

## Context

Every new order must produce a purchase order (PO) for the Amish production partner. The PO carries the piece specs (name, dimensions, species, finish) **and** the customer's white-glove Delivery + Logistics details (address, stairs, doorways, hallways, widths). Creation must be automatic, with a human review step before anything is sent. Rob also wants the least-hounding way to get customers to complete the logistics form.

A prototype "Ops Hub" was built outside this repo (ChatGPT-hosted). Its limits: per-user Shopify auth, no order-event automation, no sender. Rob has already questioned that model.

### Verified facts (2026-10-12)

| Fact | Evidence | Consequence |
|---|---|---|
| Store is on a standard Shopify plan, **not Plus** | `shop.plan.shopifyPlus = false` | Checkout-step UI extensions (info/shipping/payment) unavailable. Thank-you / Order-status extensions **are** available (all plans except Starter, per shopify.dev). |
| Size and species are **structured variant options** (`Size`, `Material`, `Leaf`) | Admin API on active products | PO line specs can be generated from order line items, no new data entry. |
| **Finish is not structured.** Only free text in `custom.material` (rich text), or folded into `Material` values (e.g. "Onyx (stain)") | Metafield definitions; `scripts/product-metafields-data.ts` | Prerequisite task: add a finish field/option or accept manual entry at review. |
| Storefront is Hydrogen, so it controls the cart | `app/` | Cart attributes can collect pre-checkout fields on any plan; they land on `order.customAttributes`. |
| A review UI already exists: `/ops`, `/ops/orders/$orderId`, session-gated by `requireOpsAccess`, with a per-order metafield pattern (`codex_ops.internal_note`) | `app/routes/ops*.tsx`, `app/utils/ops-*.server.js` | Review does not need a new app. |
| No order webhooks, no email sender in the storefront. `shopify.app.toml` has `application_url = https://example.com`. Resend key exists only in the separate SEO-truth-layer repo | repo grep | Event ingestion and sending are new. |
| Oxygen is stateless with no cron | platform | Reminders/timers must come from Shopify Flow or an external scheduler, not the storefront. |
| `ops-dashboard.server.js` pins Admin API `2024-10`; `shopify.app.toml` uses `2026-01` | repo | Align versions when extending. |

### Owner decisions (2026-10-12)

1. **PO must include logistics.** The PO is not sent until the logistics form is complete.
2. **Partner receives POs by email with PDF**, sent after approval.
3. **Production partner:** Barkman (Barkman Furniture), contact `albert@barkmanfurniture.com`. PO field layout still to be confirmed with them.
4. **Finish is a product metafield** `custom.finish` (single-line text), not a variant option. Needs a one-time catalog pass to fill it in.
5. **Netlify is to be removed.** The site that posts PR checks is not configured in this repo (no `netlify.toml`); disconnect it in the Netlify dashboard / GitHub app settings.

## Decision

Make **Shopify the system of record** (order metafields + one metaobject), use **Shopify Flow** for triggers and reminders, and build the **review and send step inside the existing `/ops` area** of this repo. Retire the external Ops Hub as the source of truth (it may remain a read-only viewer).

### PO state machine

`draft` → `awaiting_logistics` → `ready_for_review` → `approved` → `sent`
(`cancelled` reachable from any state; `sent` is terminal, amendments create a revision.)

- `draft`: created on order creation, specs auto-filled from line items.
- `awaiting_logistics`: waiting on the customer; reminders run here.
- `ready_for_review`: logistics complete; appears in a review queue.
- `approved`: Rob clicks approve; PDF is frozen.
- `sent`: emailed to partner; timestamp and message ID recorded.

### Data model (Shopify-native)

- **Metaobject `production_po`**: order reference, state, line specs (JSON: product, size, species, finish, leaf, qty), logistics snapshot, revision, approved_by/at, sent_at.
- **Order metafield** `moderncre8ve.po` → reference to that metaobject, so any UI can find it from an order.
- **Order metafields** `moderncre8ve.logistics` (JSON, validated server-side) and `moderncre8ve.logistics_status` (`none|partial|complete`).
- **Order attributes** from cart (Tier 1 below): `stairs`, `elevator`, `delivery_zip`.

### Customer logistics collection

Because the PO is blocked on logistics (owner decision 1), an incomplete form stalls production on a made-to-order piece rather than just delaying a delivery call. These buyers (12–16 week lead time, handcrafted furniture) are not impulse shoppers, so asking for the details up front is reasonable if framed as "we need this to build your piece."

**Recommended: full form in the cart, required before Checkout enables (Hydrogen, any plan).**
- The complete logistics form lives on the Hydrogen cart page and is stored as cart attributes, which carry over to `order.customAttributes`. Checkout button stays disabled until required fields validate.
- Most orders then go straight from `draft` to `ready_for_review`; no chasing.
- Tradeoff: more friction at the highest-intent moment. Mitigate with a collapsed "Why we ask" note, address prefill from the account, and a "not sure yet, I'll provide later" escape that routes to the fallback path below (so a measuring-tape-less customer can still buy).
- **Unverified before build:** cart/order attribute count and value-length limits. The docs search did not surface them, so test a worst-case payload against the Storefront API; if a dozen fields don't fit, store the form as one JSON-encoded attribute or write it to a cart metafield.
- Cart attributes are readable and overwritable by anything on the cart, so the server must re-validate and copy them into the `moderncre8ve.logistics` metafield on order creation; treat attributes as input, not as the record.

**Fallback and edit path: post-purchase form.** An authenticated Hydrogen route (e.g. `/account/orders/:id/delivery`, plus a signed-token link for guest orders) that writes `moderncre8ve.logistics` server-side. Serves customers who chose "provide later", and anyone who needs to correct details. The Admin write path is already proven in this repo: the ops routes call `getOrderDetail(context.env, …)` and `setOpsNote` from Oxygen, so this route needs no new infrastructure. Linked from:
1. The order-confirmation email template (Liquid, editable on all plans)
2. Flow-driven reminder emails (day 3, day 7, day 14) and an internal alert to Rob at day 10
3. Optionally, a Thank-you / Order-status extension (see action items; nice-to-have, not a prerequisite)

All links in emails and reminders must use `https://moderncre8ve.com/...`, not the myshopify.com domain. The Liquid Online Store is still live there and checkout runs on the myshopify domain, so a default-generated link would land on the wrong storefront.

**Lower-friction alternative (if cart friction proves too costly):** cart collects only 2–3 gating fields (stairs, elevator, delivery ZIP), and the full form is post-purchase only. Expect more orders parked in `awaiting_logistics` and more follow-up.

### Flow constraints

Flow is available on any paid plan, but **custom-app Flow triggers/actions are Plus-only**, so this design uses only Shopify's built-in Flow steps. Before build, confirm in the Flow editor that the standard-plan store has: Order created trigger, Create metaobject entry (or an HTTP request step to an Oxygen route as fallback), Wait, Send internal email, and a customer-email action. The docs search could not confirm the exact built-in action list, so this is an open verification, not an assumption. If customer-facing reminder email is not available as a built-in action, send reminders from an Oxygen route triggered by Flow's HTTP step, or from the same email provider used for POs.

12–16 week lead times give slack, but the PO is blocked on this form, so day-to-day follow-up should be a **queue in `/ops` for you, not the customer inbox**: "orders awaiting logistics, oldest first, one-click resend, call-list view."

### Sending

After approval, a server action renders the PO PDF and emails it from a business address via a transactional email provider (Resend is already used elsewhere in this org). Record message ID; allow resend. No automatic send, ever.

## Options Considered

### Option A: Keep the external Ops Hub as the system of record

| Dimension | Assessment |
|---|---|
| Complexity | Low (already built) |
| Cost | Hosting + reauth friction |
| Scalability | Poor: per-user Shopify tokens, no events |
| Team familiarity | Low: lives outside this repo |

**Pros:** Exists; PDF/print UI done. **Cons:** Cannot automate (no webhook, per-user auth), data stranded outside Shopify, not versioned with the storefront, 27 tests but typecheck blocked.

### Option B: Shopify-native storage + Flow + `/ops` review (recommended)

| Dimension | Assessment |
|---|---|
| Complexity | Medium |
| Cost | Email provider only; Flow is free |
| Scalability | Good for tens of orders/week |
| Team familiarity | High: matches existing `/ops` + metafield pattern |

**Pros:** Single data home any UI can read; automation without owning a server; reuses auth, Admin token, and ops shell; reminders handled by Flow. **Cons:** Flow's HTTP step and metaobject writes have limits; complex PDF rendering on Oxygen (Workers runtime) needs a Workers-compatible library or an external render step.

### Option C: Dedicated Shopify app with its own database

| Dimension | Assessment |
|---|---|
| Complexity | High |
| Cost | Hosting + DB + ongoing maintenance |
| Scalability | Best |
| Team familiarity | Low |

**Pros:** Full control, webhooks first-class, App Bridge UI. **Cons:** Overbuilt for one partner; new infra to run; app review/auth surface.

## Trade-off Analysis

The real choice is where the PO lives. Keeping it in Shopify means any front end can change without migrating data, and the owner's workflow (orders, customers, notes) stays in one place. The cost is working within Flow and metaobject constraints and solving PDF rendering on a Workers runtime. Option C only wins if volume or workflow complexity grows well beyond one partner.

For the form: a full form *inside* Shopify checkout needs Plus, but the Hydrogen cart page is ours, so the full form can sit just before checkout on any plan. Given that production is blocked on it, requiring it there trades a little conversion friction for near-complete data and almost no follow-up. Post-purchase collection is weaker for this workflow because every missed form becomes a stalled build; it is kept as the edit/fallback path.

## Consequences

**Easier:** one record per order; consistent review; no per-user Shopify connections; audit trail of who approved/sent what.

**Harder:** production starts only after logistics, so a non-responsive customer stalls the order (mitigated by the follow-up queue). PDF generation and Thank-you extension are net-new engineering.

**To revisit:** if partner ever wants specs-only POs earlier (adds a `specs_only` send path); if volume warrants Option C; whether to upgrade to Plus.

## Open items / risks

- **Finish is unstructured**: add a `finish` option or metafield per product, or the reviewer fills it in manually. Needs a one-time catalog pass (26 products).
- **Thank-you/Order-status extension requires a deployed app**, and `shopify.app.toml` currently has a placeholder `application_url`. This is now optional (action item 13), since the required cart form is the primary path.
- **Guest orders** need a signed link since there is no account session.
- **Secrets**: five live Shopify tokens sit in plaintext in `.claude/settings.local.json` (rotation outstanding); do not add the email key there.
- **Netlify** site posting PR checks is undocumented; unrelated but should not host any PO endpoints.
- **Partner PO field layout** still needed from Barkman (name and email are recorded above).

## Action Items

1. [~] Partner contact recorded (Barkman, albert@barkmanfurniture.com); PO template preferences still to confirm (Rob)
2. [~] Finish decided: `custom.finish` product metafield; definition added by `scripts/create-po-definitions.mjs`, per-product values still to fill
3. [x] Create `production_po` metaobject definition + order metafield definitions (Admin API script, versioned in `scripts/`)
4. [x] Align `ops-dashboard.server.js` Admin API version with `shopify.app.toml`
5. [ ] Flow: on order created → create PO metaobject (draft/awaiting_logistics) and start reminder timers
6. [ ] Verify cart/order attribute limits and Flow built-in actions on this store (see sections above)
7. [ ] Hydrogen: full logistics form on the cart page as cart attributes, required before Checkout, with "provide later" escape and server-side re-validation
8. [ ] Hydrogen: `/account/orders/:id/delivery` fallback/edit form + signed guest link; write metafields; set `logistics_status`; update confirmation email template (moderncre8ve.com links)
9. [ ] `/ops`: PO review queue, edit, approve; awaiting-logistics queue with resend
10. [ ] PDF generation (Workers-compatible) + approved-only email send with message-ID record
11. [ ] Tests: state transitions, validation, permissions (approve/send gated by `requireOpsAccess`)
12. [ ] Dry run with one historical order before enabling for live orders; no live sends until Rob signs off
13. [ ] Nice-to-have, later: deploy a real app and add a Thank-you/Order-status extension linking to the edit form (requires replacing the placeholder `application_url`)

## Not changed

No code, metafield definitions, Flow, or customer-facing changes were made by this ADR. No PO has been sent.
