# ADR-0007: Bed pricing from Barkman's 2026 wholesale list

**Status:** Accepted. Prices applied in Shopify on 2026-11-09. Amended 2026-11-22 (D5): the Mansfield takes the Bosco
prices, the Warwick is four woods with no drawers, and stock tracking is off. All three beds are live (the Bosco and
Warwick since 2026-11-09).
**Date:** 2026-11-09
**Deciders:** Rob LaRow (owner/ops)
**Where it lives:** Shopify Admin (variant prices). No code changes.

## Context

Production moved to Barkman Furniture (Millersburg, OH), which costs more than the previous maker. The Bosco and
Warwick bed listings still had legacy prices with an old 10% discount built in (for example Bosco Queen Walnut
$2,698.20, Warwick Queen no drawers $3,155.40), so they no longer covered cost. The dining tables were already
repriced from cost with the formula in ADR-0004 (D2), and the beds should use the same one.

Barkman builds these beds as white-label ModernCre8ve designs, so there is no Barkman price for the Bosco or Warwick
themselves. The closest source is Barkman's own bedroom collections in the **2026 Master Wholesale Price List**
(`BF_2026_Master_Pricelist_0526.xlsx`, effective 2026-06-01). Collections carried over from 2022 are exactly 10%
higher than the 2022 list.

## Decisions

### D1. Cost basis: median of Barkman's bed designs per size and wood

For each size (Full, Queen, King) and wood group, the wholesale cost is the **median** across Barkman's 13 bed designs
(Chesapeaka, Waterford, Berkeley, Bergen, Oakley, Arlington, Highlands; Halley has no wood pricing). Prices are the
"Standard Finish" column after Barkman's per-row markup.

| Wood on our listing | Barkman price column |
|---|---|
| Cherry | Rustic / Cherry group |
| Maple, Oak | White Oak / Hard Maple group (same names as the dining tables) |
| Walnut | Walnut |

Median wholesale (2026):

| Size | Cherry | Maple / Oak | Walnut |
|---|---|---|---|
| Full | $1,465 | $1,730 | $2,165 |
| Queen | $1,530 | $1,810 | $2,255 |
| King | $1,715 | $2,042.50 | $2,525 |
| Side-rail storage unit, Queen (walnut) | | | $2,730 |
| Side-rail storage unit, King (walnut) | | | $2,845 |

For reference, the walnut range across designs is Full $1,620–$2,860, Queen $1,750–$3,055, King $1,895–$3,720
(low: Berkeley panel bed; high: Arlington).

### D2. Same formula as the dining tables (ADR-0004 D2)

```
delivery = MAX(0.25 × wholesale, 500)
price    = CEILING((wholesale + delivery) / (1 − 0.05 SAC − 0.33 margin − 0.03 card fee), 25)
```

33% margin, 5% SAC, 3% card fee (divisor 0.59), rounded up to the next $25. Compare-at prices removed.

### D3. Approved prices

**The Bosco** (`bosco-walnut-mid-century-modern-bed-handmade`, 20 variants)

| Size | Cherry | Maple / Oak | Walnut |
|---|---|---|---|
| Twin | $3,350 | $3,800 | $4,600 |
| Full | $3,350 | $3,800 | $4,600 |
| Queen | $3,450 | $3,925 | $4,800 |
| King | $3,775 | $4,350 | $5,350 |
| Cali King | $3,775 | $4,350 | $5,350 |

**The Warwick** (`scandinavian-solid-hardwood-bed-frame`), as first approved: walnut only, 9 variants. *Superseded by
D5: the Warwick now has four woods and no drawer versions.*

| Size | No drawers | 2 or 4 drawers |
|---|---|---|
| Queen | $4,800 | $5,800 |
| King | $5,350 | $6,050 |
| Cali King | $5,350 | $6,050 |

### D4. Proxies until Barkman quotes

- **Twin** is priced as Full, and **Cali King** as King: Barkman's list has neither size.
- **Warwick drawers** use the walnut side-rail storage unit median for both 2 and 4 drawers: Barkman sells storage
  rails as a separate unit with no drawer-count split, and it is not confirmed whether the unit replaces the standard
  rails or adds to them.

### D5. Amendments, 2026-11-09 to 2026-11-12 (recorded 2026-11-22)

Checked against Shopify on 2026-11-22.

- **The Mansfield** (`minimalist-bed-frame-ohio`, 20 variants) takes the Bosco prices in D3: Twin and Full $3,350 /
  $3,800 / $4,600, Queen $3,450 / $3,925 / $4,800, King and Cali King $3,775 / $4,350 / $5,350 (cherry / maple and oak
  / walnut). Owner decision, applied 2026-11-09. It replaces the legacy prices (Queen Walnut $2,698.20).
- **The Warwick** is now offered in walnut, maple, oak and cherry, Queen, King and Cali King, with **no drawer
  versions** (12 variants). It uses the same grid as the Bosco for those sizes: Queen $3,450 / $3,925 / $4,800, King
  and Cali King $3,775 / $4,350 / $5,350 ($3,450–$5,350). The drawer proxy in D4 no longer applies. The Warwick stays
  request-only (no Add to Cart; the cart refuses it on the server since #197).
- **Stock tracking is off** on all three beds, under the made-to-order rule set on 2026-11-09: made-to-order furniture
  does not track inventory, so a bed cannot sell out. Only the Cure All and imported Xin Yean pieces track stock.

## Consequences

- Prices rise roughly 60–90% on these beds. The Bosco Queen Walnut goes from $2,698.20 to $4,800.
- The proxied configurations (Twin, Cali King, Warwick drawers) are the least certain. Get Barkman quotes before or
  soon after launch and reprice those variants if they differ.
- ~~The Mansfield still has legacy prices.~~ Repriced to the Bosco grid on 2026-11-09 (D5).
- ~~Bed variants track inventory and can sell out.~~ Tracking is off on all three beds (D5).
- If Barkman later builds drawers for the Warwick, price them from a Barkman quote rather than the storage-unit proxy.
