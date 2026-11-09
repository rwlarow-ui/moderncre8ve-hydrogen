# ADR-0007: Bed pricing from Barkman's 2026 wholesale list

**Status:** Accepted. Prices applied in Shopify on 2026-11-09; both beds are still Draft (catalog rollout Wave 1).
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

**The Warwick** (`scandinavian-solid-hardwood-bed-frame`, walnut only, 9 variants)

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

## Consequences

- Prices rise roughly 60–90% on these beds. The Bosco Queen Walnut goes from $2,698.20 to $4,800.
- The proxied configurations (Twin, Cali King, Warwick drawers) are the least certain. Get Barkman quotes before or
  soon after launch and reprice those variants if they differ.
- The Mansfield (`minimalist-bed-frame-ohio`, live and protected in the rollout) still has legacy prices (Queen
  Walnut $2,698.20) and has not been repriced under this decision.
- Bed stock settings are unchanged: variants still track inventory with "deny" at zero, so the Warwick (1 per variant;
  King no drawers at 0) can sell out. Decide a made-to-order policy before publishing.
