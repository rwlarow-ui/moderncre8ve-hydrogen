# Catalog rollout: November 2026

## Current state

The supplied PDF defines the scope: 60 inactive products, plus four protected active products. Shopify was read on November 5, 2026. The snapshots contain all 64 products and all 668 variants, including pagination beyond 50 variants for Corcovado, Compagno and Mar Vista.

**Completed:** catalog reconciliation; four release waves and a consolidation track; owner-requested wax priority; content-only corrections applied to 40 drafts; independent post-write verification; local storefront fixes; readiness and batch checks.

**Pending:** current price/margin and production/supplier approval, remaining item-specific content/specification work, publication, storefront acceptance checks and verified consolidation. All 60 items currently have disposition `held`, a responsible owner role, blocker and November 6 review date. No item is marked launched or consolidated. Day 1 and the 21-day clock have not started: `startDate` remains null pending the operational kickoff.

Wave 1 order is **Vista table, Bosco bed, Lareaux's wax (third), Warwick bed, Haven credenza, Vista chairs, Seymour chair, Vermonter bench, Santa Monica bench**. The other wave assignments follow the approved plan.

| Window after kickoff | Work | Items |
|---|---|---:|
| Days 1–3 | Owner price/production review, specifications, inventory policy and content preparation | 60 |
| Days 4–6 | Wave 1: proven sellers, care and dining complements | 9 |
| Days 7–10 | Wave 2: formerly live assortment | 10 |
| Days 11–15 | Wave 3: coffee, storage, bedroom and other | 22 |
| Days 16–19 | Wave 4: specialist designs | 14 |
| Days 1–19 | Consolidation review, not automatic publication | 5 |
| Days 20–21 | Acceptance, redirects, reconciliation and dated holds | 60 |

Publishing is limited to five items per batch, with a next-business-day review before the next batch. These are calendar-day windows; business-day checks use America/New_York, exclude weekends, and exclude any owner-entered `closedDates`. Enter holiday closures before preparing a batch. Advance a ready item within its wave; leave blocked items on hold rather than making unsupported promises.

## Records and commands

- `register.json`: editable operational record, exact IDs/handles, release order, approval evidence, blockers, owners, review dates and batch history. Edit this file, not the generated CSV.
- `register.csv`: current 60-row view, including publication, all variant prices, content findings and readiness blockers. Prices in this view are **observed**, not approved.
- `baseline.json`: immutable pre-change rollback snapshot. Keep it unchanged.
- `post-content-2026-11-05.json`: independently fetched state after the 40 content corrections. It is the initial `currentSnapshot` in the register.
- `content-corrections.json`: exact input fields, reasons and pre-change fingerprints for the 40 applied updates. `content-update-receipts.json` records successful results and independent verification.

Run the offline register audit/export:

```sh
npm run catalog:rollout -- --write
```

Refresh the 64-product snapshot using the local admin token, without changing Shopify:

```sh
node --env-file=.env scripts/catalog-rollout.mjs --refresh --write
```

The refresh prints a **new dated snapshot path** and never overwrites the baseline. Use that path explicitly with `--snapshot=docs/catalog-rollout-2026-11/snapshot-TIMESTAMP.json`, or update `currentSnapshot` in the register to its filename. A refresh fails rather than saving incomplete products, variants, collections or publications. Tokens are never printed or persisted in these records. Do not use the order/customer-only ops token for this product/publication read.

Each of the eight approval fields requires an object with `approvedBy`, ISO `approvedAt`, `snapshotHash` from the current CSV, and substantive `notes`. Notes must record the actual approval: current variant prices/cost and margin review; supplier/build capacity and delivery terms; verified materials/dimensions/options; origin; approved inventory policy; reviewed content/links; reviewed images; and collection placement. Do not enter blanket approvals in place of missing evidence. Set `disposition` to `ready` only after these checks pass. Evidence is bound to the product snapshot; subsequent product changes invalidate it.

Prepare the first three items for review **after** their approvals exist:

```sh
npm run catalog:rollout -- --batch=scandinavian-dining-table-extendable-dining-table,bosco-walnut-mid-century-modern-bed-handmade,lareauxs-furniture-wax
```

The command rejects missing/stale evidence, snapshots older than 24 hours, protected products, consolidation candidates, batches over five, mixed waves, duplicate products and missing next-business-day reviews. It writes a local proposal containing each product's entire pre-release state for rollback. **It never publishes or modifies Shopify, and has no `--apply` mode.** A Shopify operator must perform the reviewed changes and record the outcome; the local checker cannot prevent independent manual changes in Admin.

## Release and acceptance checklist

For each proposed batch, the catalog operator re-reads current Shopify state immediately before writing and checks it against the proposal. Abort on drift. Reuse product and variant IDs; set Active and publish only to publication `gid://shopify/Publication/291307159851`, verified as **MODERNCRE8VE**. Preserve other channel settings and do not add feed destinations by default. Do not change stock quantities to enable purchasing. An approved made-to-order inventory policy requires explicit buildability confirmation.

The storefront implementer then checks each released product:

1. Desktop and mobile page, images, specifications, pricing, each option value and every variant's availability data.
2. Collection/search discovery, canonical URL, sitemap and structured-data availability. No links or origin claims for held items.
3. Representative add-to-cart and checkout handoff without placing an order. Include an approved zero-stock made-to-order case, a legitimately unavailable variant and wax shipping when applicable.
4. Consented product-view, add-to-cart and checkout-handoff analytics in a clean session. Inspect actual events rather than assuming that successful cart interaction proves analytics.
5. The four protected products still behave normally. Record the checks and URLs, operator and timestamp in the entry's `verification` field. Mark `launched` only when all release checks pass.

Append a batch record to `batches` with a unique `id`, ordered `handles` and actual ISO `publishedAt`. On or after the next business day, record `review: { passed, reviewedBy, reviewedAt, evidence }`; evidence identifies the checks and any issues. Failed or absent reviews block the next proposal. For a critical purchase/pricing defect, stop and restore affected status, prices/variant policy if changed, and per-channel publication from the batch's `before` snapshot. The initial content-only changes can be reversed using `baseline.json` descriptions/titles, but re-read current state first to avoid overwriting later edits. Retain a destination required by an existing redirect.

Local storefront fixes remove held wax/Vista links from dining collection copy, filter related-product structured-data destinations to verified active products, and prevent the legacy Seymour vendor name from enabling Ohio/Amish promises. These repository changes are tested but **not deployed**. Update the related-product allowlist only after the corresponding release passes acceptance; restore a wax collection link only after wax is verified live. Deploy repository changes through the normal project deployment workflow, excluding unrelated working-tree edits.

## Consolidation and unresolved work

The five legacy candidates have specific blockers in the register. The existing active Santa Monica/Bossa Nova pages are only candidate destinations:

- Santa Monica Extension describes a **20-inch leaf**; its equivalence is unverified.
- Santa Monica Large describes **116 × 38 × 30 inches**; no matching purchasable active configuration is established.
- Santa Monica Cherry includes **90-inch options** requiring a variant-by-variant mapping.
- Mixed Walnut explicitly includes sapwood and heartwood; do not substitute standard natural walnut.
- Legacy Bossa Nova uses **12-inch leaves** and different widths; the active listing uses **18-inch leaves**.

Keep these sources inactive. For each source variant, document an equivalent purchasable destination variant with matching construction/material/dimensions/leaf inclusion and approved price; if none exists, retain the distinct offering on hold for a separate launch. Set `approvedDestination` only after equivalence and destination readiness are confirmed. Create and test redirects only then: no loops, correct canonical, preserved option/variant selection and updated internal links. Mark `consolidated` only after verification is recorded. No redirects were created during implementation.

Mechanical fixes do not constitute a full copy or production approval. The current audit still flags warranty conflicts, legacy links, tax wording in other forms, missing product type, inventory issues and Seymour origin claims. The floor lamp remains subject to its own origin, electrical specifications and fulfillment confirmation. Specialist live-edge/resin items require confirmation that the photographed configuration can actually be supplied.

At day 21, every row must be launched with evidence, consolidated with a verified destination, or held with a specific blocker, responsible person and next review date. The target is 60 reconciled source items, not 60 published pages. No future automation or scheduled publication has been created.

Validation performed: 38 relevant tests initially passed, followed by an additional passing post-write snapshot test (39 total). TypeScript typecheck, production build, Biome on changed source files and GraphQL schema validation also passed. No products were released, so post-release mobile, cart, checkout, analytics and next-day acceptance checks remain pending.
