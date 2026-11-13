# Retiring the ChatGPT-hosted prototype Ops Hub

**Status:** plan, nothing switched off yet. **Prepared:** 2026-11-13. **Tracks:** tech-debt #13 (steps 15–21 in `docs/tech-debt-2026-10.md`), ADR-0001.

There are two Ops Hubs:

| | Prototype (to retire) | `/ops` (keep) |
|---|---|---|
| Where | `moderncre8ve-ops-hub.moderncre8ve-9188.chatgpt.site` (OpenAI ChatGPT "Sites" project `appgprj_6a692027c39881918274ec079b61d460`) | `https://moderncre8ve.com/ops`, this repo, deployed with the storefront on Oxygen |
| Code | Outside GitHub. Per the handoff, a D1 database with Drizzle migrations (`db/schema.ts`, `drizzle/`) and `app/api/*/route.ts` endpoints | `app/routes/ops*.tsx`, `app/utils/ops-*.server.js`, `app/utils/production-po*.js`, `app/utils/po-*.js` |
| PO record | Its own D1 PO table | Shopify metaobject `production_po`, linked by order metafield `moderncre8ve.po` |
| Shopify access | Each visitor's personal ChatGPT Shopify connection | Server-side Admin token |
| State on 2026-11-11 | Unknown since 2026-10-12 (version 14) | Sign-in, 3 current orders, order detail, notes/tags and PO queues verified. PO queue empty. PO email sender not configured |

Goal (from the register): every PO is created, reviewed, approved and sent from `/ops`, Shopify is the only record, and the prototype is **switched off, not kept as a viewer**.

## 1. What the prototype does, and whether `/ops` has it

The prototype column comes from Haven's **"Architecture Handoff"** email (2026-10-12, attachment `MODERNCRE8VE-Architecture-Handoff.md`, describing hub **version 14**). It has not been re-inspected since. The `/ops` column was checked against this repo's code on 2026-11-13.

| Prototype v14 feature | `/ops` today | Evidence / gap |
|---|---|---|
| Order list and order detail | ✅ Has it | `ops._index.tsx`, `ops.orders.$orderId.tsx` |
| Create PO draft from an order (one per order) | ✅ Manual button | `production-po.server.js` (handle `po-<order id>`) |
| Drafts created when staff load/sync orders | ➖ Not needed | `/ops` creates on click; automatic creation is step 16 |
| Editable piece specifications | ✅ Has it | `applySpecEdits` in `production-po.js` |
| Internal logistics form (staff entry) | ✅ Has it | PO detail page + `app/utils/logistics.js` |
| Customer logistics capture | ✅ Better: live cart form with "provide later" | ADR-0001 item 7. Prototype had a preview only |
| Required-field and item-change checks block approval | ✅ Has it | `reviewBlockers`, `checkTransition` |
| Approval locking; reopen clears approval | ✅ Has it | `approved → ready_for_review` (revoke) |
| Print / text download | ✅ PDF preview and download | `/ops/pos/:id/pdf`, `po-pdf.server.js` |
| Manual email draft to partner | ✅ Better: approved-only send with idempotency | `po-send.server.js`. **Sender not configured** (step 19) |
| Signed order-create / delivery-submission relay (groundwork, not wired) | ❌ Missing | Step 16 (Flow → authenticated Oxygen route) |
| 27 automated checks | ✅ Own tests | `npm run test:pos`, `tests/ops-*.test.mjs` |
| Named reviewer / per-person access (planned in prototype) | 🟡 Built, not switched on | ADR-0008, `docs/ops-hub-setup.md`; needs Supabase + Google client + `OPS_INDIVIDUAL_LOGIN_ENABLED` |
| **Geographic routing:** Louisiana, Mississippi and outside the contiguous 48 → Barkman *production-only* PO + MODERNCRE8VE carrier network | ❌ Missing | No routing code anywhere in `app/` or `scripts/`. **Owner decision A** |
| **Separate shipping/delivery brief** for network carriers | ❌ Missing | Same as above |
| **Two-stage intake** (short questionnaire, targeted measurement follow-up) with separate manufacturing vs delivery holds | ❌ Different model | `/ops` uses one full cart form and blocks the PO until logistics are complete (ADR-0001 owner decision 1). **Owner decision B** |

Anything else the prototype gained after version 14 is unknown. Step 2 below closes that.

## 2. Inventory and export (Rob, about 30 minutes, in ChatGPT)

Only Rob can do this, because the prototype lives in Rob's ChatGPT account.

1. Open the prototype and note its current version. Walk every tab (at least `/production` and Orders) and list any screen or action **not** in the table above. Add each one to this file.
2. **Export its PO table.** For every PO it holds, record the PO number, order number, state/revision, approval (who/when), whether it was sent, and the pieces + logistics. A CSV or a screenshot per PO is enough.
3. Compare that list with `/ops/pos`. The `/ops` queue was **empty on 2026-11-11**, so any PO the prototype holds for an open order is **not** in Shopify yet.
4. For each such PO on an open order: open the order in `/ops`, click **Create PO draft**, then re-enter the specs and logistics. Do **not** carry over an old approval. Re-approve in `/ops` after checking the order snapshot (handoff § Migration). POs for orders that are closed or already built need only the export kept as an archive (e.g. in Drive), not re-entry.
5. Download or copy the prototype's source if ChatGPT allows it, and keep it next to the export. This is reference only; do not commit it here.

## 3. Owner decisions before cutover

These came up in the prototype's handoff but were never carried into ADR-0001. Each needs a yes/no from Rob.

- **A. Geographic routing.** The handoff records as *confirmed* that orders to Louisiana, Mississippi and outside the contiguous 48 get a Barkman **production-only** PO, with shipping/delivery by MODERNCRE8VE's own carriers. `/ops` sends every PO as combined production + delivery. Either add routing to `/ops` before cutover (new work: route field on the PO, "Production only — shipping and delivery outsourced" on the PDF, a carrier brief), or handle those orders manually and note it on the PO. Also decide Washington, DC and other edge cases.
- **B. Intake model.** Keep `/ops`'s "PO blocked until logistics complete" rule (ADR-0001 decision 1), or adopt the handoff's two stages with a separate manufacturing hold and delivery hold. The handoff's `mc8_delivery_*` cart-attribute keys were a proposal only. `/ops` already writes `logistics`, `logistics_status`, `stairs`, `elevator`, `delivery_zip`, and those stay unless decision B changes the model.
- **C. Viewer or off.** ADR-0001 says the prototype "may remain a read-only viewer"; the register says switch it off. This plan assumes **off** (two tools holding POs is the risk #13 exists to remove). If you choose off, change the ADR-0001 sentence when marking it Accepted.

## 4. Cutover gate

Don't switch the prototype off until all of these are true:

- [ ] Step 2 export done; every open-order PO exists in `/ops`
- [ ] Decisions A–C made, and any routing work they require shipped
- [ ] PO sender configured (`RESEND_API_KEY`, `PO_FROM_EMAIL`, `PO_PARTNER_EMAIL`, optional `PO_CC_EMAIL` on Oxygen), register step 19
- [ ] Dry run: one historical order end to end with your own address as `PO_PARTNER_EMAIL` (ADR-0001 item 12, register step 21)
- [ ] Haven confirmed she uses `/ops` and not the prototype

Steps 16–18 (automatic PO, post-purchase form, reminders) improve `/ops` but are **not** needed to switch the prototype off. The prototype never automated those either.

## 5. Switch-off (Rob, in ChatGPT and Shopify)

1. Unpublish or delete the Site `moderncre8ve-ops-hub` in ChatGPT (Sites project above).
2. In ChatGPT settings, remove the Shopify connection the prototype used if nothing else needs it, and revoke the "MODERNCRE8VE Ops Hub" site access (OpenAI sent "You updated a Site's access to ChatGPT" on 2026-10-08 and 2026-10-12).
3. In Shopify Admin → Settings → Apps, check for any app or webhook created for the prototype's signed relay and remove it.
4. Tell Haven the old link (sent 2026-10-09) is gone and `/ops` is the only hub.
5. Check that the prototype URL no longer loads.

## 6. Close-out (repo)

- Mark ADR-0001 **Accepted** and fix its "read-only viewer" sentence (decision C).
- Update tech-debt #13 and the "external hub" rows in `docs/tech-debt-2026-10.md`; close #13 after two weeks with no PO handled outside `/ops` (register step 21).
- Leave the `codex_ops` metafield namespace alone (`app/utils/ops-dashboard.server.js:22`). It is live data for ops notes; renaming it would orphan existing notes.

## Related

- The `/ops` shared team password was emailed in plain text on 2026-11-11. Turning on individual logins (`docs/ops-hub-setup.md`, ADR-0008) retires that password. Until then, change it if the email is forwarded.
