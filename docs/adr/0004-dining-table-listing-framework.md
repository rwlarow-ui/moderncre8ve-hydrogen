# ADR-0004: Dining table listing framework, pricing and FoxKit removal

**Status:** Accepted, in rollout (Bossa Nova and Santa Monica live, Payne unlisted for review, Vista not started)
**Date:** 2026-10-29
**Deciders:** Rob LaRow (owner/ops)
**Where it lives:** Shopify Admin (product options, variants, prices, copy, metafields). The only code is the PDP changes in PRs #134 and #135.

## Context

The dining table listings had grown apart. Bossa Nova sold 64–90" tables with up to four 12" leaves, and every leaf
variant cost a flat $2,640–$3,080 whatever the size or wood, so some tables with leaves cost less than without. Santa Monica
had no leaves, Payne had no size option, and Vista sold 54–72" lengths. Prices did not reflect cost. The new pricing
sheet (`Table_Pricing.xlsx`, tabs Bossa Nova / Payne / Santa Monica / Vista) prices each table from a wholesale
proxy, and the whiteboard "Modified Listings" sets one structure for every dining table.

## Decisions

### D1. One option structure for every dining table

| Option | Values |
|---|---|
| Size | `64" × 32/36" · Seats 4–6`, `72" × 34/38" · Seats 6–8`, `84" × 36/40" · Seats 8–10` |
| Material | `Natural Eastern Walnut`, `Natural Cherry`, `Natural White Oak`, `Natural Hard Maple` |
| Leaves | `No leaf`, `1 × 18" leaf`, `2 × 18" leaves`, `3 × 18" leaves + support leg` |

- The width appears in the size label (for example "32/36"); the exact width is confirmed on the order and costs the same.
- 84" is sold without leaves only. 84" with leaves and the 108" × 42/44" table (seats 10–12) are by quote, and the description says so.
- The option name stays `Material` because `product-option-values.tsx` shows variant images for it.
- Each variant shows its wood's photo. Stock tracking is off, since every table is made to order.
- Existing variant IDs and SKUs (`BN_*`, `SM_72`, `SM_84`) were kept where a variant mapped across, so old orders and links still resolve.

### D2. Pricing formula

```
wholesale = sheet "Wholesale used" (Solid top / 1 leaf / 2 leaves);
            3 leaves = 2-leaf wholesale + one leaf (Cherry 256.25, Maple 333.75, White Oak 337.50, Eastern Walnut 392.50)
delivery  = MAX(0.25 × wholesale, 500)
price     = CEILING((wholesale + delivery) / (1 − 0.05 SAC − 0.33 margin − 0.03 card fee), 25)
```

- Target margin is **33%**, with a **3% card fee** added (divisor 0.59).
- Every table uses the same prices, because the sheet costs them all the same: $3,550 (64" Cherry, no leaf) to $8,175 (72" Walnut, 3 leaves).
- Compare-at prices were removed.
- **Known gap:** the 3-leaf price leaves out the support leg's cost, which isn't known yet.

### D3. Copy and SEO per listing

- **Description:** no H1 (the product title is the page's H1). Sections, in order: an intro paragraph, Sizes and seating,
  Extension leaves, Wood and finish, Construction and delivery.
- **Finish:** "Catalyzed lacquer and Rev Oil, 10 sheen" on dining tables. Other furniture keeps the
  "catalyzed lacquer or hand-rubbed oil" wording (PR #134).
- **Lead time:** 12–16 weeks.
- **SEO title:** at most 55 characters, because the template adds " | ModernCre8ve" (70 in total).
- **Meta description:** at most 155 characters.
- **Kept in step with the description:** the feature badges (`custom.usp1–4`), `custom.material`,
  `descriptor.short_description`, `shopify.extension-mechanism` (Removable leaf) and the image alt text.

### D4. FoxKit removed (2026-10-29)

The FoxKit app was already uninstalled, but 67 product metafields were still there. Nothing in `app/` reads them.

| Namespace / key | Products | Value |
|---|---|---|
| `foxkit-discount.discount` | 10 (Santa Monica ×5, Santa Barbara, Modern Walnut Round, Vista, Compagno, Mar Vista) | `{"InCart":{"incart-1":"5:PERCENTAGE"}}` |
| `foxkit.preorder` | 54 | Preorder from 2024-11-19, 10% offer with its discount turned off |
| `foxecom-bs-kit.variant-images` | 3 (Haven, Caipirinha, Santa Monica Bench) | Variant image mappings |

All 67 were deleted, and a re-check found none left. The owner keeps a JSON backup of the values
(`foxkit-metafields-backup-2026-10-29.json`).

## Rollout status (2026-10-29)

| Listing | Status | Notes |
|---|---|---|
| Bossa Nova (`bossa-nova-modern-dining-table-small-handmade-ohio`) | Active | 36 variants |
| Santa Monica (`the-santa-monica-mid-century-modern-dining-table`) | Active | 36 variants; has the unused theme template suffix `custom-layout-1` (harmless, Hydrogen ignores it) |
| Payne (`payne-oval-extendable-dining-table-for-6-8`) | Unlisted | Moved from a butterfly leaf to removable 18" leaves; the photos may still show the butterfly-leaf build |
| Vista (`scandinavian-dining-table-extendable-dining-table`) | Draft | Not started (54–72" lengths, 12" leaves) |
| Santa Monica Extension Table | Draft | Overlaps the Santa Monica now that it sells leaves; decide whether to merge, redirect or retire it |

## Open items

- Support-leg cost for the 3-leaf price.
- Guarantee panel (`custom.product_guarantee_text`) says "lifetime structural warranty"; descriptions elsewhere say two-year.
- Confirm real wholesale on top sellers. The sheet uses proxy averages, and a 64" table borrows the 66" group.
- Put the wholesale cost into each variant's cost per item field (`inventoryItem.unitCost`) so Shopify's margin reports work.
- Product type must be exactly "Dining Tables" for the finish wording. The draft duplicate Bossa Nova (`9885299671339`) has none.
