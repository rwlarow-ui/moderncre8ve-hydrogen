# Moderncre8ve Product Catalog — Statistical Analysis
**Generated:** March 19, 2026
**Data source:** Shopify Storefront API (moderncre8ve.myshopify.com)
**Dataset:** 27 products, 265 variants across 8 product types

---

## 1. Descriptive Statistics

### Catalog Composition

| Product Type    | Count | Min Price | Median Price | Max Price |
|-----------------|-------|-----------|-------------|-----------|
| Dining Tables   | 14    | $1,831    | $2,904      | $4,550    |
| Beds            | 5     | $2,113    | $3,136      | $3,536    |
| Benches         | 2     | $630      | $884        | $1,250    |
| Chairs          | 2     | $249      | $284        | $349      |
| Media Console   | 1     | $4,500    | $4,500      | $4,500    |
| Credenza        | 1     | $3,750    | $3,750      | $3,750    |
| Housewares      | 1     | $25       | $25         | $25       |

Dining Tables dominate at 52% of the catalog (14 of 27 products), which aligns with the store's core identity.

### Furniture Price Distribution (excluding Lareaux's Wax at $25)

| Stat            | Value      |
|-----------------|------------|
| Mean            | $2,517     |
| Median          | $2,602     |
| Std Deviation   | $877       |
| IQR (p25–p75)   | $2,238 – $3,000 |
| Min             | $249       |
| Max             | $4,550     |
| Skewness        | –0.794 (left-skewed) |
| Coeff. of Var.  | 0.348      |

**Key insight:** Mean ($2,517) and median ($2,602) are close together, indicating a relatively symmetric distribution of furniture prices. The slight left skew comes from chairs and benches pulling the tail downward. The catalog is firmly premium: 58% of variants are priced $2,500–$3,500.

### Price Tier Breakdown (264 furniture variants)

| Price Tier   | Variants | Share |
|--------------|----------|-------|
| < $1,000     | 27       | 10.2% |
| $1K – $2K    | 19       | 7.2%  |
| $2K – $2.5K  | 57       | 21.6% |
| $2.5K – $3K  | 96       | 36.4% |
| $3K – $3.5K  | 37       | 14.0% |
| $3.5K – $4K  | 24       | 9.1%  |
| $4K+         | 4        | 1.5%  |

The sweet spot is clearly **$2,500–$3,000**, containing over a third of all variants. This is the core price band the store should optimize marketing around.

### Variant Count Stats

| Stat   | Value |
|--------|-------|
| Mean   | 9.8   |
| Median | 8.0   |
| Min    | 1     |
| Max    | 20    |
| p75    | 20    |

The high p75 (20) reflects the Shopify 100-variant cap — many products are hitting the platform maximum, capped at 20 in the data.

### Availability

- **22 of 27 products** (81%) are fully available across all variants
- **2 products** are completely unavailable (0%)
- Overall variant availability rate: **89.1%** (236 / 265 variants)
- Total inventory units across all variants: **1,476**

---

## 2. Trend Analysis

### Catalog Timeline

All 27 products were published within a **21-day window** (February–March 2026), confirming this is a fresh catalog migration for the Hydrogen storefront rebuild. There is no meaningful multi-period trend to analyze yet — a meaningful trend analysis will be possible 6–12 months post-launch.

### What to watch at launch:

- **Price tier performance:** Track whether $2,500–$3,000 (the modal tier) converts better or worse than the $3,000+ range.
- **Product type mix:** Dining Tables are 52% of products. Monitor whether beds and chairs are underrepresented relative to demand.
- **Variant spread:** Products like The Santa Monica (20 variants, $1,980–$4,000 spread) offer the widest configuration range. Watch which configs convert.

---

## 3. Outlier Detection

### Price Outliers (IQR method: outside $1,573–$4,043 fence)

**Low-price outliers** — These are not errors; they are a distinct, lower-priced segment:

| Product | Avg Price | Note |
|---------|-----------|------|
| Contemporary Dining Bench (60") | $981 | Bench, fits the product type |
| The Vista Dining Chairs | $269 | Chairs are structurally a lower-price category |
| The Seymour Dining Chair | $299 | Same as above |
| The Santa Monica Bench | $786 | Bench, fits the product type |

**High-price outliers:**

| Product | Avg Price | Note |
|---------|-----------|------|
| The Sputnik Dining Set | $4,325 | Full dining *set* — commands premium price |
| The Kineko TV Stand | $4,500 | Only media console in catalog; anchors the high end |

**Verdict:** None of these are data errors. They reflect genuine product type segmentation — chairs/benches are structurally cheaper, while sets and specialty pieces are the premium anchor.

### Price Spread Outlier

**The Santa Monica Mid-Century Modern Dining Table** has a spread of **$1,800** across 20 variants ($2,200–$4,000) — the widest in the catalog. This is expected given the extensive size/finish configurations, but worth ensuring all variant prices are intentionally set and not accidentally duplicated or missing.

### Availability Outliers

| Product | Status | Concern Level |
|---------|--------|---------------|
| Contemporary Dining Bench (60") | 0% available | ⚠️ High — 0/16 variants in stock |
| The Kineko TV Stand | 0% available | ⚠️ High — 0/1 variants in stock, also a price outlier |
| The Mansfield (Bed) | 75% available | 🟡 Monitor — 15/20 variants available |
| The Mar Vista Oval Table | 75% available | 🟡 Monitor — 15/20 variants available |

The Dining Bench and Kineko TV Stand being fully unavailable is the most actionable finding — these should either be restocked, moved to draft, or marked with accurate lead time messaging so customers aren't misled.

### Variant Count Outliers (expensive products with very few options)

These high-priced items have only 1–2 variants, which may limit conversion:

| Product | Variants | Avg Price |
|---------|----------|-----------|
| The Sputnik Dining Set | 2 | $4,325 |
| The Kineko TV Stand | 1 | $4,500 |
| Mid-Century Modern Walnut Nightstand | 1 | $3,000 |
| The Astrid Buffet | 1 | $3,750 |

These may be intentionally one-SKU items, but it's worth reviewing whether additional size or finish options could expand their appeal without fragmenting the offering.

---

## 4. Key Findings Summary

1. **The catalog is well-concentrated in the $2,500–$3,000 price band** (36% of variants), making this the strategic core to lead with in marketing and SEO.

2. **89.1% variant availability** is healthy, but two products are completely out of stock and should be addressed before the DNS cutover to moderncre8ve.com.

3. **Dining Tables dominate** (52% of catalog, 14 products). Consider whether Beds (only 5 products) and Chairs/Seating (2 products) are sufficiently represented for the target audience.

4. **No statistically extreme Z-score outliers** in pricing (all products fall within 2.5 standard deviations) — the pricing architecture is internally consistent.

5. **Catalog is brand-new** — all products published Feb–Mar 2026. Trend analysis will become meaningful after 3–6 months of live traffic and order data.

6. **Four high-value products ($3K–$4.5K) have only 1–2 variants.** These could benefit from additional configuration options or richer product descriptions to compensate for limited choice.

---

*Analysis based on publicly available Storefront API data. Order-level data (revenue, conversion, AOV) was not accessible with current API credentials — connecting the Admin API with read_orders scope would unlock a much richer analysis.*
