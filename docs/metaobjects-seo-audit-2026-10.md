# Metaobjects & category metafields — SEO audit (2026-10-08)

Scope: every metaobject definition in **Settings → Custom data → Metaobjects**, the product/collection metafield definitions that point at them, and how they reach the Oxygen storefront. Data pulled live from the Admin API (Shopify connector) and GA4 via Supermetrics.

## What was there

| Metaobject definition | Entries | Storefront | Products using it |
|---|---|---|---|
| `shopify--color-pattern` (Color) | 2 (Brown, Beige) | PUBLIC_READ | 1 (Bosco) |
| `shopify--bedding-size` | 7 — **King and California king exist twice** (`king`/`king-1`, `california-king`/`california-king-1`) | PUBLIC_READ | 1 (Bosco, via both `bedding-size` and `compatible-mattress-size`) |
| `shopify--furniture-fixture-material` | 2 (Walnut wood, Wood) | PUBLIC_READ | 1 (Bosco) |
| `shopify--bed-frame-features` | 2 | PUBLIC_READ | 1 (Bosco) |
| `shopify--lumber-wood-type`, `--wood-finish`, `--seat-type`, `--backrest-type`, `--back-type`, `--headboard-style`, `--door-type`, `--door-material`, `--furniture-fixture-features` | 1–5 each | PUBLIC_READ | 0 live products (values only on archived/draft items) |
| `wood_type` (custom, "Wood Type") | **0** | PUBLIC_READ | — fields are `oak`/`cherry`/`maple`/`walnut` **variant references**, i.e. the species is encoded as a field name. Unusable for filtering or schema; superseded by `shopify--furniture-fixture-material`. |
| `shopify--knowledge-base-fact` | 13 | NONE | Shopify-managed (Sidekick / Shop AI). Leave alone. |

Net: **1 of ~50 active products** carried any category attribute, and the storefront never queried them — so none of this reached the page, Product JSON-LD, Google Merchant listings or AI shopping agents.

Other findings:
- **Miscategorized products.** e.g. *The Wabi-Sabi Low Credenza* is categorized as *Posters, Prints & Visual Artwork*; *Scandinavian Solid Hardwood Bed Frame* as *Cabinets & Storage*; *Modern Walnut Live Edge Dining Table* as *Coffee Tables*; *The Haven* sits in an **archived** taxonomy category; ~12 tables sit at generic *Furniture* / *Tables*. Category decides which attributes Shopify offers and feeds Google product category. The `dining` smart collection also matches on category `fr-24-4`, so these tables are missing from `/collections/dining`.
- **Collection metafields referenced in code but not defined.** `custom.seo_rich_description` and `custom.collection_banner` are queried by the collection route but have no definitions (0 values) — the local fallbacks in `collection-seo-descriptions.ts` are doing the work. `ecomposer.collections` is a leftover from a removed page builder.
- **Traffic (GA4 via Supermetrics, last 90 days).** Organic search landings to product/collection pages are near zero; the product pages that *do* get entrances arrive via **AI Assistant** (Mar Vista oval, Santa Monica extendable), **Organic Shopping** and **Unassigned** (Bosco bed, Bossa Nova, Payne, Compagno). Those channels read structured product attributes, which is why this work targets JSON-LD + category metafields rather than copy. Search Console is not on the current Supermetrics license (`LICENSE_DATA_SOURCE_NOT_AVAILABLE`), so query-level data was not available.

## What this PR does

**Storefront (Oxygen)**
- `PRODUCT_QUERY` now fetches the product `category` and 16 `shopify.*` category metafields, resolving each metaobject reference to its `label`.
- `app/utils/product-specs.ts` normalises them (ordered, de-duplicated) and maps them to schema.org.
- PDP: new **Specifications** accordion (server-rendered `<dl>`), toggle `showSpecifications` on the *Main product* section (default on). Hidden automatically when a product has no attributes.
- Product JSON-LD gains `category`, `material`, `color`, `size` and `additionalProperty[]` — the properties Google merchant listings and AI shopping agents read.

**Shopify data — applied 2026-10-08 via the Admin API (Shopify connector)**
- **Category-specific keys.** Shopify's current taxonomy splits material and color by part, and each category only accepts its own attribute keys (anything else is rejected with *"Owner subtype does not match the metafield definition's constraints"*):
  - Tables & desks → `tabletop-material`, `leg-material`, `tabletop-color`, `leg-color` (+ `extension-mechanism` on dining tables)
  - Sideboards, nightstands, TV stands → `frame-material`, `top-material`, `frame-color`, `top-color`
  - Beds, dressers, benches → `furniture-fixture-material`, `color-pattern` (+ `bedding-size`, `bed-frame-features` on beds)
  - All part-level keys reuse the same `shopify--furniture-fixture-material` / `shopify--color-pattern` metaobjects. `wood-finish` isn't accepted by any of these categories and was dropped.
- **Definitions enabled:** `extension-mechanism`, `tabletop-material`, `tabletop-color`, `leg-material`, `leg-color`, `frame-material`, `frame-color`, `top-material`, `top-color` (all storefront-readable).
- **Metaobject entries:** 25 upserted with taxonomy references. Materials: walnut, oak, cherry, maple, wood, glass, marble, steel, brass, resin. Colors: brown, beige, black, white, pink. Extension: butterfly leaf, removable leaf. Bed sizes: twin, full, queen, king, California king. Bed features: headboard, slats, storage.
- **23 product categories fixed.** 9 tables moved into *Kitchen & Dining Room Tables*, and the `dining` smart collection went from 34 to 38 products. Other moves: the Wabi-Sabi credenza out of *Posters*, the Scandinavian bed frame out of *Cabinets*, The Haven off an archived category, plus benches, coffee/console tables, the nightstand pair and the desk.
- **~140 product metafields set across 41 products.** Values are sourced from variant options, the `custom.material` metafield, or the title. Products with no evidence are listed in `NEEDS_INPUT` rather than guessed.
- The same plan is re-runnable as `npm run sync:attributes` (dry run) / `-- --apply`. It's idempotent and only writes differences. `scripts/product-attributes.plan.mjs` is the source of truth for future edits.
- `tests/product-specs.test.mjs` (`npm run test:specs`): parser/JSON-LD tests, plus guards that the query and plan stay in sync with `PRODUCT_SPEC_DEFINITIONS`.

## Manual follow-ups (Shopify admin)
1. Bosco no longer references `bedding-size` entries `king-1` / `california-king-1` — delete those two duplicates (Settings → Custom data → Bedding size).
2. **Check the Bossa Nova extension type.** Its description says "up to 2 self-storing leaves", but its Leaf variant option goes up to 4 × 12" leaves. It is currently set to *Removable leaf*. If the description is right, switch it to *Self-storing leaf*.
3. Delete the custom **Wood Type** (`wood_type`) metaobject definition (0 entries, wrong shape).
4. Fill materials for the `NEEDS_INPUT` products (or tell Claude what they're made of and re-run).
5. **Search & Discovery app → Filters:** add *Tabletop material*, *Furniture/Fixture material*, *Color*, *Extension mechanism* and *Bedding size* so `/collections/*` filter pages can use them.
6. Optional: create `custom.seo_rich_description` (rich text) and `custom.collection_banner` (file) collection definitions so the existing code paths can be edited from admin instead of `collection-seo-descriptions.ts`.
7. Add Google Search Console to the Supermetrics license to measure query-level impact.

## Verifying after deploy
- View source on `/products/bosco-walnut-mid-century-modern-bed-handmade` (bed) and `/products/bossa-nova-modern-dining-table-small-handmade-ohio` (extendable table): the `Product` JSON-LD should contain `"material"`, `"color"`, `additionalProperty` (and `"size"` on the bed), and the PDP should show a Specifications accordion.
- Google Rich Results Test → Product snippets / Merchant listings: no new warnings, material/color detected.
