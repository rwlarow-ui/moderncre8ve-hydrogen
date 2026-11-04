# Customer Segments → Keyword & AI-Search Priorities

ModernCre8ve · moderncre8ve.com · Research date Nov 4, 2026

Companion to [seo-snapshot-2026-10-27.md](seo-snapshot-2026-10-27.md). That doc covers on-site fixes (fact consistency, schema, the sprint). This one answers a different question: **who actually buys, what they search for, and where search effort should go.** Most of the Oct 27 fixes still apply and aren't repeated here.

## Answer

Your buyers are **affluent, design-literate homeowners, mostly on the coasts and in Northeast Ohio, buying one ~$2,000 dining table or bed.** Dining tables bring in 45% of revenue. Few customers come back. Search is built for a different shopper. You get seen for broad style terms ("mid century table", "scandinavian furniture") where people are browsing. You're nearly invisible for the product-specific terms buyers use: oval and round extendable tables, walnut, beds and credenzas.

Four things matter most:

1. **ChatGPT is your best traffic by intent.** 42% of ChatGPT sessions add something to the cart, against 12% for direct traffic, and it sent one $2,718 order. Google is already sending AI-style questions to your blog posts. AI visibility is not a side project. It may be your best-converting channel.
2. **The catalog rebuild is costing you search visibility.** Only 4 products are active. Two product URLs that ranked last week now return 404 with no redirect. Your best seller (The Vista, 16 orders and $28k) is unlisted and missing from the sitemap.
3. **Organic visibility is down about two-thirds since March:** 77 clicks a week fell to 23, and 20.3k impressions fell to 7.3k (with the outlier removed). Beds took the biggest hit.
4. **What sells doesn't line up with what ranks.** Fix that by pointing keywords at the products people buy, not the style categories.

**Confidence: Medium.** The order data is solid, but it's a small sample: 78 orders. Search Console gives only one current week plus one week from March, so seasonality can't be ruled out. GA4 sees only visitors who accepted cookies (141 sessions in 90 days), so its shares come from a small slice. The ChatGPT finding rests on 19 sessions and 1 order: a strong signal, but not proof.

## Who buys: segments from 2 years of Shopify orders

78 orders · $132,952 net · Nov 2024 – Nov 2026

| Segment | Evidence | Size | What they search like |
|---|---|---|---|
| **Coastal design buyers** | CA $22.7k (Malibu, Pacific Palisades, Berkeley, Sacramento), NY $16.1k (Brooklyn ×3), OR, CO (Boulder, Durango), MA, DC, RI, CT, WA | ~50% of revenue | Know the style vocabulary. Compare online. Ask assistants things like "where can I find authentic scandinavian design furniture online". |
| **Northeast Ohio locals** | OH $22.1k, 13 orders. Rocky River 5 orders, plus Cleveland and Columbus | ~17% of revenue, the most orders of any state | Search "Amish", "made in Ohio" and "Cleveland". Your page for Cleveland custom kitchen cabinets already shows up for cabinetry searches. |
| **Sun Belt / Mid-Atlantic movers** | TX $7.6k (Austin ×3), MD, NC, VA, FL, AZ, TN, LA | ~24% of revenue | Search for practical needs: "dining table for 8", "extendable" |
| **Wax buyers** | 17 orders, $524 total (~$30 each) | 22% of orders, <1% of revenue | Mostly existing owners. The furniture-care topic that goes with them gets heavy search traffic. |

**What they buy (net sales):**

| Category | Net | Orders | Top items |
|---|---|---|---|
| Dining tables | $60.2k | 28 | Vista oval extendable $28.1k (16), Santa Monica + Ext $16.3k, Bossa Nova $6.8k, Corcovado $3.1k |
| Beds | $22.8k | 8 | Bosco walnut $9.8k, Mansfield $7.3k, Warwick, Wookie |
| Storage | $4.9k | 1 | Elmore sideboard |
| Chairs | $3.4k | 3 | Vista chair, Seymour |
| *Blank product type* | *$40.7k* | *20* | *Custom or deleted products; 30% of revenue can't be put in a category* |

**Behavior:** the average order is $1,700–2,100 for furniture. About 2 returning customers per quarter, which is expected for big furniture purchases. Quarterly orders peaked at 15 in Q2 2025. They fell to 6 in Q2 2026, 5 in Q3, and 3 so far in Q4. That fits the visibility drop and the catalog rebuild, but the data can't show cause.

**Where orders came from (Shopify referrer):** 45 orders (58%) are unattributed or direct, 14 came from Google organic ($17.7k), 12 from your own site/email, 3 from Dealspotr ($7.3k, a coupon site), and 1 from ChatGPT ($2.7k).

## What they search: Search Console

Current: Oct 25 – Nov 1, 2026 (from the live SEO Truth Layer pipeline). Baseline: Mar 1–8, 2026 (in-repo `seo-truth-layer/data/gsc_raw.csv`).

**Outlier removed:** "wooden furniture care" accounts for 16,266 of 23,551 current impressions (69%). It's at position ~23 with zero clicks, all on `/blogs/.../solid-wood-furniture-care-guide`. That looks like AI Overview or Discover impressions, not a real ranking. It's excluded from the table below, and handled separately under Priorities.

| Topic cluster | Mar impr | Now impr | Now pos | Now clicks | Read |
|---|---|---|---|---|---|
| Mid-century modern | 5,553 | 3,063 | 13.3 | 10 | Your biggest cluster. Mostly page 2. |
| Scandinavian / Danish / Nordic | 7,919 | 2,494 | 14.6 | 3 | Fell 69% |
| Dining table | 6,343 | 2,603 | 11.8 | 10 | Collection is at #15 for "mid century dining table" |
| Extendable | 1,428 | 649 | 11.9 | 2 | Position improved, volume fell |
| **Round / oval** | 1,324 | **154** | 10.2 | 0 | **Your best-selling shape, and close to invisible** |
| **Walnut** | 1,293 | 163 | **9.2** | 0 | Edge of page 1; small push needed |
| **Beds** | 1,176 | **141** | **28.8** | 1 | **Fell 88%; beds are 17% of revenue** |
| Amish / handmade / custom | 1,393 | 464 | 21.4 | 0 | What sets you apart doesn't rank |
| Japandi | 661 | 173 | 37.1 | 1 | You position the brand on it, but search doesn't see it |
| Conversational / AI-style | 2,237 | 290 | 9.8 | 1 | See below |
| Competitor "alternatives" | 3 | 108 | 7.2 | 0 | New, and already on page 1 |

**AI-style queries now showing up in Google.** These read like questions to an AI assistant, not typed keywords. Google's AI Mode generates searches like these behind the scenes. They land on your blog and collection pages:

- "which online store sells curated nordic homewares?" → best-scandinavian-furniture-online
- "where can i find authentic modern scandinavian design furniture online in 2026?"
- "best scandinavian style furniture brands that are actually affordable for families"
- "which stores offer modern dining tables that can extend for 8-10 people?" → custom-made-expandable-dining-tables
- "alternatives to ashley extendable tables for quick online delivery and white-glove setup?"
- "which mid-range furniture brands do designers recommend for client projects? asking as: midwestern family homeowner"
- "finnish design shop alternatives" (pos 7.6), "nordic nest alternatives" (pos 5.9)

These map closely to the coastal-design and Ohio-family segments above. They phrase things as comparisons and recommendations ("which store", "alternatives to", "brands designers recommend"), and they name what sets you apart: white glove, extendable, seating for 8–10.

**Size intent shows up repeatedly:** "dining table for 8" (27 impr), "for 10" (9), "walnut dining table for 10" (10, pos 5.7), "36x60 extendable" (7). That's a buyer working out a specific room, the same person who buys a Vista.

## Traffic quality: GA4, last 90 days (consented visitors only)

| Source | Sessions | Engaged | Add-to-carts |
|---|---|---|---|
| Direct | 90 | 29 | 11 (12%) |
| **chatgpt.com** (ai-assistant + feed) | **19** | **11** | **8 (42%)** |
| facebook.com | 19 | 2 | 0 |
| Google organic | 2 | 2 | 0 |

Google organic looks tiny here because of the cookie banner (GSC shows ~23 clicks a week). Facebook brings people who don't engage. ChatGPT visitors engage and add to cart.

## Priorities

Ordered by expected revenue impact for these segments. Owner decisions are marked.

### 1. Stop the bleed from the catalog rebuild (this week)

- **301 the two 404s that ranked last week:** `/products/scandinavian-oval-dining-table-mar-vista` (295 impr) and `/products/scandinavian-danish-modern-dining-table` (609 impr, incl. "dining table for 10"). Point each at the closest active table (Payne oval or Santa Monica), or at `/collections/mid-century-modern-dining-tables`. Shopify Admin → Navigation → URL redirects.
- **Owner:** The Vista is `UNLISTED`. Its page is live and indexable but not in the sitemap or collections. It's your #1 product. If it's still for sale, set it to Active. If not, 301 it.
- Do the same review for every drafted product with search history before drafting more. The pipeline's `seo_truth_merged.csv` lists pages with impressions.
- The bed cluster fell 88%, with 4 of 5 bed products drafted. If beds are coming back in the rebuild, prioritize them.

### 2. Make the site the answer to AI-style questions (2–4 weeks)

The coastal-design segment asks assistants comparison questions. Answer them directly on your pages, in quotable sentences:

- **"Alternatives" page / blog post:** "Finnish Design Shop & Nordic Nest alternatives for solid wood furniture made in the USA". You already rank around position 6–8 with no page built for it.
- **Extend `best-scandinavian-furniture-online`** with a short, honest comparison table (brand, made where, lead time, delivery, price range). Include ModernCre8ve with accurate facts. That post is where the "which store" and "affordable for families" questions land.
- **Sizing answers on the dining-tables collection:** "What size dining table seats 8? 10?" with your table lengths. The FAQ copy in the Oct 27 doc already has the 24"-per-person rule; put it on the tables collection too, not just chairs.
- **One "Why handmade in Ohio" page:** joinery, wood species, the 12–16 week build, white glove. That gives the Amish/handmade cluster (pos 21, 0 clicks) a single strong page to rank, instead of the claim spread thin across every product.
- Fix the off-site facts from the Oct 27 doc (Houzz, CustomMade, Wescover, Google Business Profile). Assistants cite those pages about you more than your own.

### 3. Re-point keywords at what sells (ongoing)

| Target | Page | Why |
|---|---|---|
| oval extendable dining table, scandinavian oval dining table | Payne (and Vista if reactivated) | Your best-selling shape; 154 impr now, 1,324 in March |
| mid century walnut dining table, walnut dining table for 8/10 | Santa Monica / Santa Monica Ext | Pos 9.2. Small changes to title, H1 and internal links could reach page 1. |
| mid century dining table (collection) | `/collections/mid-century-modern-dining-tables` | Pipeline's #1 action: pos 14.6, 1,720 impr |
| walnut mid century bed, platform bed handmade | Mansfield (the only active bed) | Recover the bed cluster |
| mid century credenza / sideboard | Credenza collection, once storage products return | $4.9k from one order; collection meta already targets it |

The Santa Monica PDP gets 1,125 impressions at position 8.5 and 0 clicks. Rewriting its title and meta is the cheapest win in the data.

### 4. Furniture-care traffic → wax and trust (low effort)

16k weekly impressions on the care guide with 0 clicks is a big audience, even if most of it is AI Overview exposure. Make the title and first paragraph a direct, quotable answer: how to care for solid wood furniture in 3 steps. Link Lareaux's Furniture Wax inline. Wax buyers are 22% of orders and likely past furniture customers, so this page also builds trust.

### 5. Local Ohio segment (owner decision)

Ohio is your top state by order count, yet Ohio and Cleveland terms average position 26. Also, `/pages/custom-kitchen-cabinets-cleveland` shows up for "custom cabinetry cleveland / cuyahoga county" and "luxury kitchen designers cleveland" (pos 9–65). **Owner:** is custom cabinetry a real service you want leads for? If yes, build that page out and claim the Google Business Profile category. If no, noindex the page so it stops diluting the site's topic.

## Gaps & unknowns

- **Search Console history is thin.** The pipeline database starts Oct 18 (8 rolling weekly windows). The only older point is one March week, so the "down 64%" figure compares two single weeks and may include seasonality. Supermetrics has no Search Console license on this team, and the Ahrefs connector returns "Insufficient plan" for both GSC and Site Explorer. For a 16-month trend, export Performance → Queries from GSC directly, or extend the pipeline to keep longer history.
- **No demographics.** GA4 age and gender are "unknown" (Google Signals is likely off, and the consented sample is tiny).
- **30% of revenue ($40.7k, 20 orders) has a blank product type.** Probably custom or deleted products. Setting product types in Admin would make the segment table complete.
- **58% of orders have no referrer**, so channel shares are lower bounds.
- **I couldn't query ChatGPT or Perplexity directly** to see how they currently describe you. The Oct 27 assistant test is the latest baseline. Repeat it with the AI-style queries above.
- **Bing data** in the pipeline is empty this week.

## Recommended next steps

1. Owner: decide on Vista (activate or redirect) and the cabinetry page. Then add the two 301s. All of this is Admin work, under 30 minutes.
2. Code (optional): have the SEO pipeline alert when a page with impressions starts returning 404. That would have caught this rebuild's losses the same day.
3. Write the "alternatives" post and the sizing FAQ (priority 2). I can draft both.
4. Recheck this doc's cluster table on **Dec 10, 2026**, the same date as the Oct 27 recheck, using the pipeline's `gsc_raw.csv`.

## Sources

1. Shopify Analytics (ShopifyQL), Nov 2024 – Nov 4 2026: sales by region, city, product, product type, referrer, quarter. Shopify Admin GraphQL for product status. **High confidence.**
2. SEO Truth Layer pipeline (`rwlarow-ui/moderncre8ve-seo-truth-layer`, refreshed Nov 4 14:04 UTC): `gsc_raw.csv` (Oct 25 – Nov 1), `seo_actions.csv`, `history.db`. **High confidence for that week.**
3. In-repo `seo-truth-layer/data/gsc_raw.csv` and `reports/weekly_brief.md` (Mar 1–8, 2026) as the baseline. **Medium: a single week.**
4. GA4 property 251836602 via Supermetrics, last 90 days: source/medium, region, demographics. **Medium: consented visitors only.**
5. Live checks with `curl` on Nov 4: Vista 200 + `index,follow` + not in the product sitemap (4 URLs); Mar Vista and Danish modern table 404; bed collection 301 → `/collections/bedroom`.
6. [seo-snapshot-2026-10-27.md](seo-snapshot-2026-10-27.md) for the assistant test, off-site listings and on-site fixes.
