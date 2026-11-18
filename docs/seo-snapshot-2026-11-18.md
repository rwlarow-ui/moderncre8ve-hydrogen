# Search & AI Visibility Snapshot — Nov 18, 2026

ModernCre8ve · moderncre8ve.com · follows [the Oct 27 snapshot](./seo-snapshot-2026-10-27.md). Recheck: **Dec 18, 2026**.

## Overview

Crawling and rendering are still in good shape. Most Oct 27 fact fixes have held: the made-up "In Your Home" names are gone, Seymour's origin is consistent, and llms.txt has contact facts. Two things changed for the worse. The catalog rollout cut the live catalog from 25 products to 13, and **five collections are now empty** but still indexed and listed. Separately, a later PDP layout change put "Made to order · ships in 12–16 weeks" back on the **wax** page.

## What was crawled

- Raw HTML (no JavaScript), fetched as ClaudeBot: home, FAQ, 23 collections, 13 products, robots.txt, sitemap index + 5 child sitemaps, llms.txt, llms-full.txt.
- Every URL in the sitemaps and llms files (94 unique) was checked: **93 return 200, 1 returns 404** (`/pages/trade`, linked from llms.txt).
- `/pages/contact` and `/pages/about` 301 to `-us` handles (fine).
- Not reachable from here: Google Business Profile, Search Console, and the Houzz listing itself.

## Scorecard

| Area | Status | Nov 18 finding |
|---|---|---|
| AI crawler access | Good | robots.txt explicitly allows GPTBot, OAI-SearchBot, ChatGPT-User, ClaudeBot, PerplexityBot, Google-Extended and Applebot-Extended. No change needed. |
| Renderability | Good | Titles, H1s, prices, FAQs and JSON-LD are all in the raw HTML. |
| Sitemap | Warn | Valid index; 13 products, 23 collections, 18 pages, 37 articles. It includes the 5 empty collections. |
| llms.txt | Warn → fixed in code | Trade link 404s (live handle is `trade-1`). Lists the 5 empty collections. Both fixed in this branch. |
| Wax page facts | **Critical → fixed in code** | Three ship times on one page: "Made to order · ships in 12–16 weeks" under the title, "Ships within 3–5 business days" in Lead Time, "Ships within 3–7 business days" in the description. Fixed the first in code. The 3–7 is in the Shopify description. |
| Empty collections | **Critical** | Housewares, Living, Coffee Tables, Custom Made Furniture, Nightstand + End Tables show "No products matched your filters" but are indexable. The wax is live but **not in Housewares**. |
| Structured data | Good | Product, Offer, BreadcrumbList, FurnitureStore, Organization on PDPs; LocalBusiness + FAQPage on home. `countryOfOrigin: US` on every live product, all Ohio-built (Seymour confirmed Amish-made 11-12). The FAQ page itself has no FAQPage markup. |
| Titles / metas | Good | Fixed Oct 27 priority pages are live. The home title is 74 characters, so it will truncate. |
| Social proof | Good (resolved) | No placeholder names found on PDPs. |
| Off-site | Warn | Houzz is the only source an engine used to describe us (Cleveland query). No ModernCre8ve reviews surfaced anywhere else. |

## Assistant test — what came back (Nov 18)

Web-search-grounded answers, one run each. **These vary run to run and are not a ranking.**

| Query | Did ModernCre8ve appear? | Who / what was cited |
|---|---|---|
| Handmade mid-century modern extendable dining table, solid walnut, Ohio | No | Bertu (Oak Harbor, OH) via reach.dog and 1stDibs; Dutch Craft Furniture (Berlin, OH); CustomMade / Maker Marketplace makers. Oct 27: we appeared indirectly via Wescover/CustomMade; not today. |
| ModernCre8ve furniture reviews | No | Nothing about us. Answer returned similarly named stores (Modern Line, Modern Digs). Oct 27: Houzz + Design Milk surfaced. |
| Amish-made Japandi furniture online with white glove delivery | No | Countryside Amish (publishes an llms.txt), Contemporary Craftsman, DutchCrafters, Amish Outlet Store, The Amish House. No one owns "Japandi" here. |
| Modern furniture maker Cleveland, Ohio, solid hardwood custom dining table | **Yes, named first** ("closest fit") | Sourced from **houzz.com/pro/moderncre8ve**, not moderncre8ve.com. Also Alex Sutula, Chagrin Valley Custom Furniture, Wayside Furniture. |

## Top five, ranked by impact

1. **Wax page says three different ship times.** Code fix in this branch: the summary under the title now says "Ships in 3–5 business days" for wood-care products. **Admin:** change "3–7 business days" to "3–5" in the Lareaux's description. (High / Small)
2. **Five empty collections are indexed and listed.** Code: llms.txt now skips empty collections. **Admin (owner call):** add the wax to Housewares; for the other four, either unpublish them from the Hydrogen channel until their products leave Draft, or publish at least one product into each. (High / Small)
3. **Houzz is our AI identity, and it may still have the old Beachwood address.** It's the page the engine used to describe us. Correct the address to 1400 E 36th St, Suite 2802A, Cleveland 44114, the phone to (216) 502-0755, and the lead time to 12–16 weeks. Ask recent buyers for Houzz and Google reviews. The newest Houzz review was 2014 as of Oct 27. (High / Medium)
4. **llms.txt trade link 404s.** Fixed in this branch (`/pages/trade` → `/pages/trade-1`). (Medium / Small)
5. **FAQ page has no FAQPage markup.** The home page has it; the page that actually answers shipping/returns questions doesn't. Add FAQPage JSON-LD to `/pages/faq` from the same Q&A content. (Medium / Medium)

## Appendix

- Every PDP and collection renders two `<h1>`s (one `sr-only` in the route, one visible in the section). Harmless to most crawlers; consider making the sr-only one a `<p>`.
- Home: 4 of 25 images have no alt text. FAQ: 1 of 4.
- Home title 74 chars — suggest "Handcrafted Mid-Century & Scandinavian Furniture | ModernCre8ve" (63).
- Made-to-order furniture is marked `availability: InStock`. schema.org has `MadeToOrder`; check Google merchant-listing support before switching.
- `copy-of-santa-monica-bench-modern-walnut-bench` is still the live handle for the Santa Monica Bench. Changing it in Admin (with a redirect) gives a cleaner URL.
- "Free white glove delivery" (home meta) — confirm it's free on all furniture orders, or drop "Free".
- Still unverified: Google Business Profile address/hours/phone; Houzz address since Oct 27; CustomMade "ships in 6 weeks" and Wescover Payne listings.
