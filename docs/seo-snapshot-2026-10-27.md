# Search & AI Visibility Snapshot + Two-Week Sprint

ModernCre8ve · moderncre8ve.com · Snapshot Oct 27, 2026 · Sprint Oct 28 – Nov 10

> **Status as of Nov 2, 2026.** The code fixes from this audit shipped in [#132](https://github.com/rwlarow-ui/moderncre8ve-hydrogen/pull/132), merged Oct 28. Wax and imported (vendor *Piper + Fox Co.*) products drop the furniture-only sections, and wax shows "Ships within 3–5 business days". Import-vendor products no longer get `countryOfOrigin: US`. The placeholder "In Your Home" names and the empty "What Our Customers Say" heading are gone. The bed-frame priority handle is fixed. `/llms.txt` has a Contact section. Everything else here is Shopify Admin data, off-site listings or an owner decision, and is still open unless marked otherwise. The snapshot below is unchanged from Oct 27.

## Overview

The technical foundation is now in good shape. Crawlers, including the AI ones, can reach the site. Pages render on the server. `llms.txt` and `llms-full.txt` are live, and the home meta is fixed. What holds the site back now is **facts that disagree**. Lead times differ across about 35 listings, and the wax page still promises a 12–16 week build. The structured data says "Made in US" on products whose Shopify listings say China. Off-site listings carry an old address and old lead times. Machines can read the site; they just can't always tell which version of a fact is true.

- **Crawl & render: Good.** robots.txt blocks no AI crawlers. Main content is in the raw HTML. Sitemap index with 5 child sitemaps.
- **Fact consistency: Critical.** Lead times, product origin and testimonials contradict each other across pages.
- **New seating (Xin Yean): 17 items.** 16 chairs and stools plus a desk, made in China. None are in Shopify yet, so week 2 can launch them right the first time.

### What changed since the Oct 21 pull

- **\[Fixed\]** Home meta description is now 152 characters (was 163); the title is 67.
- **\[Shipped\]** `/llms.txt` and `/llms-full.txt` are live: 23 collections, 25 products with from-prices, lead times and delivery.
- **\[In code\]** Product JSON-LD now adds `countryOfOrigin` and `isRelatedTo` (table ↔ chair). I couldn't confirm the live rendered output from here; run the Rich Results Test (Day 5).
- **\[Still open\]** The wax page still shows the 12–16 week and white-glove blocks. `PRIORITY_COLLECTION_HANDLES` still lists `modern-bed-frames`; the real handle is `handmade-modern-bed-frames`. The Santa Monica Ext title and meta are unchanged. The description cleanups from the Oct 21 catalog doc haven't been done.

## Scorecard

| Area                     | Status           | What I found (Oct 27)                                                                                                                                                                                                                                                                                                                                                       |
|--------------------------|------------------|-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| AI crawler access        | **\[Good\]**     | No rule blocks GPTBot, ClaudeBot, PerplexityBot or Google-Extended. Only Nutch is fully disallowed; Ahrefs and MJ12 have crawl delays. **No change needed.**                                                                                                                                                                                                                |
| Renderability            | **\[Good\]**     | Hydrogen renders on the server: hero copy, products, prices, FAQs and footer are all in the raw HTML.                                                                                                                                                                                                                                                                       |
| Sitemap                  | **\[Good\]**     | A sitemap index (products, pages, collections, articles, blogs) listed in robots.txt.                                                                                                                                                                                                                                                                                       |
| llms.txt                 | **\[Warn\]**     | Live and useful. It has no phone, email or street address (it only links /pages/trade). It files wax under "lead time". A "Copy of Santa Monica Bench" duplicate is listed.                                                                                                                                                                                                 |
| Structured data          | **\[Critical\]** | Rich coverage in code (FurnitureStore, Organization, FAQPage, Product, BreadcrumbList). But `countryOfOrigin: US` is emitted for *every* product except Seymour. Two active products (Wishbone Counter Stool, Oak Bedside) say "Place of Origin: China" in Shopify. The code also marks Seymour non-US while its listing says Amish-made. One of these is wrong either way. |
| Lead times               | **\[Critical\]** | The site says 12–16 weeks for furniture and 3–5 days for wax. The wax page says 12–16 weeks. About 35 listings still have 4–6, 6–8, 6–12 or 8–14 weeks in the description body.                                                                                                                                                                                             |
| Social proof             | **\[Critical\]** | The "In Your Home" gallery shows the same four names (Sarah M., Chicago; Michael T., Austin; …) on every product, including wax. They're hard-coded defaults in `app/sections/customer-gallery/index.tsx`. The Santa Monica Ext page has an empty "What Our Customers Say" heading.                                                                                         |
| Priority PDP metadata    | **\[Warn\]**     | The Santa Monica Ext title leaves out "Santa Monica" and "extendable". Its meta and the wax meta are auto-truncated mid-sentence. The H1 renders twice on the Santa Monica Ext page.                                                                                                                                                                                        |
| Dining chairs collection | **\[Warn\]**     | Only 2 chairs show (Vista, Seymour); Capri, Sylvan and Fern are unlisted. 4 of 5 FAQ questions have no answer. The intro mentions teak, which you don't sell.                                                                                                                                                                                                               |
| Off-site facts           | **\[Warn\]**     | Houzz shows a Beachwood, OH 44122 address (4.8★, 5 reviews, newest from 2014). CustomMade's Sputnik says "Ships in 6 weeks". The Wescover Payne listing is an old quick-ship. I couldn't check Google Business Profile.                                                                                                                                                     |
| Contact consistency      | **\[Warn\]**     | The footer says info@, the FAQ says inquiry@, and the old Liquid store says support@. Pick one public address.                                                                                                                                                                                                                                                              |

## Assistant test: what came back

Run Oct 27 with web search as a stand-in for what assistants retrieve. I couldn't query ChatGPT or Perplexity directly from here. Results change from run to run; this is a baseline to repeat monthly, not a ranking.

| Query a customer might ask                                              | Did ModernCre8ve appear? | Who / what was cited                                                                                                                                                                                                   |
|-------------------------------------------------------------------------|--------------------------|------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| Handmade mid-century modern extendable dining table, solid walnut, Ohio | **\[Indirectly\]**       | Via third-party listings only: Wescover (Payne quick-ship) and CustomMade (Sputnik, with a stale "ships in 6 weeks"). moderncre8ve.com itself didn't surface. Bertu Furniture (Oak Harbor, OH) held the 1stDibs spots. |
| ModernCre8ve furniture reviews                                          | **\[Partly\]**           | Houzz (4.8★, 5 reviews, Beachwood address) and a 2021 sponsored Design Milk spotlight. No Google reviews surfaced.                                                                                                     |
| Amish-made Japandi furniture online with white glove delivery           | **\[No\]**               | Contemporary Craftsman, The Amish House and Countryside Amish Furniture, which also publishes an llms.txt.                                                                                                             |

Takeaway: assistants currently learn about you mostly from *other people's pages*, and those pages have old facts. Fixing the off-site listings is worth as much as fixing your own pages.

## Top five fixes, ranked by impact

| \#  | Fix                                                                                                                                                                                                                                                                          | Impact | Effort |
|-----|------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|--------|--------|
| 1   | **One source of truth for lead time.** Store it in a product metafield (or derive it from product type). Render the lead-time and white-glove blocks only for furniture. Strip the lead-time text from description bodies. This fixes wax and about 35 listings in one pass. | High   | Medium |
| 2   | **Settle origin messaging before the new seating ships.** Decide how imported Piper & Fox seating is described. Then make schema `countryOfOrigin` per product (not a default "US"), and keep "Amish / Ohio / no overseas production" boilerplate off imported items.        | High   | Medium |
| 3   | **Verify or remove the "In Your Home" names.** If they aren't real customers with real photos, remove the section until they are. Hide the empty "What Our Customers Say" heading.                                                                                           | High   | Small  |
| 4   | **Correct off-site facts.** Fix the Houzz address. Update or retire the CustomMade and Wescover listings. Confirm Google Business Profile shows the Cleveland 44114 address, (216) 502-0755 and Mon–Fri 9–5 ET.                                                              | High   | Medium |
| 5   | **Priority page copy.** New titles and metas for Santa Monica Ext and wax, answered FAQs on the chair collection, and contact facts in llms.txt (copy blocks below).                                                                                                         | Medium | Small  |

**Why \#2 and \#3 rank this high:** structured data or testimonials that say something untrue are the riskiest things on a site. Search engines can drop rich results for them, and a customer who gets a China-made chair after reading "no overseas production" has a real complaint. This isn't about rankings; it's about the site being accurate.

## Two-week sprint

Week 1 is the existing catalog; week 2 launches wave 1 of the new Xin Yean seating. Owner marks a decision only you can make. Catalog edits go in batches of 25 or fewer, and you see each batch before it's applied.

### Week 1: existing products

**Day 1 · Wed Oct 28**

*Owner decisions (30 min)*

- Lead time by product type: furniture 12–16 weeks, wax 3–5 days. Anything else, such as quick-ship or Piper & Fox seating?
- How should imported seating be described site-wide? (The Xin Yean order is all made in China.) Is the Wishbone stool staying active?
- Are the "In Your Home" names real? If not, remove them.
- White glove: "included" vs the `white-glove-delivery-upgrade` product vs "95%+". Pick one sentence.
- One public email: info@ or inquiry@.

**Day 2 · Thu Oct 29**

- ~~Code PR: lead time from a metafield or product type, and furniture-only lead-time and white-glove blocks (fixes wax).~~ Done in #132.
- ~~Same PR: `handmade-modern-bed-frames` in `PRIORITY_COLLECTION_HANDLES`; remove or replace the placeholder gallery defaults; hide empty review headings.~~ Done in #132. The duplicate PDP H1 comes from description HTML, so fix it in Shopify Admin.
- ~~Same PR: per-product origin and a contact section in llms.txt.~~ Done in #132.
- ~~Check on the Oxygen preview, then merge.~~ Merged Oct 28.

**Day 3 · Fri Oct 30**

- Catalog batch 1 (≤25): strip old lead-time lines and "ALL ORDERS SHIP FREE / price includes tax" boilerplate, if you confirm that's no longer the policy.
- Oct 21 doc cleanups: raw JSON-LD in Round Walnut; visible alt-text lists in Sputnik and Caipirinha (move them into image alt fields); Wookie code fences; Santa Monica Ext duplicate paragraph; retitle Provo as a coffee table; Danish desk "Sold out" text.

**Day 4 · Mon Nov 2**

- Catalog batch 2 (the remaining lead-time listings).
- Titles and metas for Santa Monica Ext and wax (below), then Mar Vista, Santa Monica and the credenza from the keyword map.
- Readable handles plus 301 redirects for the random-ID products (Wishbone, Oak Bedside).

**Day 5 · Tue Nov 3**

- Chair collection: paste the FAQ answers and the new intro; decide whether Capri, Sylvan and Fern should be relisted.
- Off-site: Houzz address; CustomMade and Wescover listings; check Google Business Profile.
- Verify: Rich Results Test on the home page, Santa Monica Ext and wax; GSC URL inspection; resubmit the sitemap.

### Week 2: new seating, wave 1 (6 dining chairs)

**Day 6 · Wed Nov 4**

*Owner decisions*

- Fill in the decision sheet in the launch kit: your model names, retail prices, stock vs to-order lead time, delivery method, warranty shown, and Piper & Fox vs ModernCre8ve on the page.
- Confirm wave 1: CW8148, CW8148A, CW2701, CW8141, CW8138, CS7268.

**Day 7 · Thu Nov 5**

- Create the 6 wave-1 products as drafts in Shopify: readable handles; accurate materials and "Made in China"; sizes in inches; set variants if sold in sets; descriptive alt text; SEO title and meta.
- Specs metafields (seat height, frame material, upholstery): add the six handles and their attributes to `PRODUCT_PLAN` (`scripts/product-attributes.plan.mjs`), dry-run `npm run sync:attributes`, then `npm run sync:attributes -- --apply`. Collections: `piper-fox` and `modern-dining-chairs`.

**Day 8 · Fri Nov 6**

- Set vendor *Piper + Fox Co.* on the 6 products (this drops the furniture boilerplate and US origin automatically, since #132). Code: add the 6 handles to `DINING_CHAIRS` in `app/utils/product-relations.ts`.
- Publish the `piper-fox` collection with its intro and FAQ; check it returns 200 (`npm run check:collections`). Confirm the chairs show in `/llms-full.txt`.

**Day 9 · Mon Nov 9**

- Add the table and chair pairing matrix to the chair collection and each new chair page (walnut chairs with Santa Monica; ash paper-cord chairs with Japandi tables).
- Add the new chairs to related products on dining-table PDPs. Take or source photos of them at your tables when the samples land.

**Day 10 · Tue Nov 10**

- Launch QA: publish; Rich Results Test on two new chairs (check that `countryOfOrigin` is absent, not `US`: import-vendor products emit no origin); GSC request indexing; sitemap.
- Baseline the assistant test with new queries: "solid walnut dining chair", "paper cord dining chair natural ash", "dining chairs for a walnut mid-century table". Waves 2 and 3 follow the same steps.

**Recheck on Dec 10, 2026**, 30 days after the wave-1 seating launch. Search and AI visibility take at least that long to move, so don't judge week 1 changes before early December.

## Copy blocks: existing catalog

### robots.txt

**\[No change\]**

AI and search crawlers are already allowed. Leave it as is.

### Santa Monica Extension: title and meta

**\[Warn\]**63 / 149 chars

**SEO title**

    Santa Monica Extendable Mid-Century Dining Table | ModernCre8ve

**Meta description**

    Solid hardwood mid-century modern extendable dining table with a butterfly leaf. Handmade to order in Ohio in 12–16 weeks, with white glove delivery.

### Lareaux's Furniture Wax: title and meta

**\[Critical\]**59 / 144 chars

**SEO title**

    Lareaux's Furniture Wax for Solid Wood, 8 oz | ModernCre8ve

**Meta description**

    Handcrafted furniture wax that protects and refreshes solid wood finishes. 8 oz. Ships in 3–5 business days, separate from furniture lead times.

### llms.txt: add contact facts and tidy lead time

**Done in #132.** `app/utils/llms.server.ts` now lists wax separately from the furniture lead time, notes that some seating is imported, and has a Contact section (phone, email, address, hours).

### Schema: origin per product, not a default "US"

**Done in #132, by vendor rather than a handle list.** `productClass()` (`app/utils/product-class.ts`) treats vendor *Piper + Fox Co.* as imported, and those products get no `countryOfOrigin`. **For each new Xin Yean chair, set the vendor to "Piper + Fox Co." in Shopify** and the page and schema follow. Add each chair handle to `DINING_CHAIRS` in `app/utils/product-relations.ts` to link it to the tables.

### Modern Dining Chairs: intro and FAQ answers

**\[Warn\]**

**Collection intro (replaces the teak sentence)**

    Solid wood dining chairs in mid-century modern and Scandinavian designs, built to sit comfortably through long dinners. Choose your wood and upholstery, and pair them with any of our dining tables.

**FAQ answers**

    Q: How many dining chairs do I need?
    A: Allow about 24 inches of table length per person. As a guide: a 60" table seats 4–6, a 72" table seats 6, an 84" table seats 6–8, and a 96" table seats 8–10. Extension tables seat more with the leaf in.

    Q: Can I mix different dining chair styles at one table?
    A: Yes. The easiest way is to keep one thing constant, such as wood species, seat height or color, and vary the rest. Many people use two arm chairs at the ends and side chairs along the length.

    Q: What is the lead time for handmade dining chairs?
    A: Our handcrafted chairs are made to order in 12–16 weeks and arrive with white glove delivery.

    Q: Are solid wood dining chairs durable enough for daily use?
    A: Yes. Solid hardwood chairs with proper joinery handle daily use for decades, and scratches can be refinished, which isn't possible with veneer or MDF.

The new Xin Yean chairs will have a different lead time and origin, so edit answer 3 (or scope it to Ohio-made chairs) before they go live.

## New seating launch kit: Xin Yean order PI20260826

**Correction to the plan:** "Lucia" is the supplier's contact person (Lucia Tang at Shenzhen Xin Yean Furniture). It isn't a chair model, and there's no rounded bouclé chair on this order. The 90-day plan's "Lucia & Xin Yen chairs" appear to come from the contact and company names. What you're actually adding is **17 pieces: 16 chairs and stools plus 1 writing desk**, all made in Shenzhen, China, mostly in solid American ash or walnut. The kit below is built from the invoice, not the plan.

### Facts the listings must state accurately

- **Origin:** made in China (Shenzhen) from American ash or walnut. "Solid American walnut, made in China" is accurate and quotable. "Handcrafted in Ohio", "Amish-made" and "no overseas production" must never appear on these pages, so the furniture boilerplate has to be switched off for them (fix \#1 and \#2).
- **Materials, word for word:** CP1305 and CP1308 are *PU (faux leather)*, not leather. CW8142's seat is *plywood with ash veneer*, so don't call it a solid wood seat. CS2722 and CS2768 are saddle leather.
- **Lead time:** the supplier needs 45 days to produce, plus ocean freight (DDP). Whether you sell from stock or to order sets what the page says. Decide this on Day 6.
- **Warranty:** the supplier gives 1 year. Your 30-day guarantee and "Lifetime Structural Warranty" blocks show on every product page today, so decide whether that lifetime warranty applies to these pieces before they go live.
- **Names:** several designs closely follow well-known mid-century originals. Use your own model names and plain descriptions ("paper-cord dining chair in natural ash"). Keep designer and trademarked model names out of titles, tags and alt text; the active "Wishbone Counter Stool" listing already does this. I'm not a lawyer, so get a quick check if you want to reference originals at all.

### The 17 pieces, in customer terms

Sizes converted from the invoice's cm. "Arm" is read from the invoice photos, so confirm it. Retail prices aren't on the invoice; the plan's band was \$199–\$399.

| Model   | Type            | Size                         | Material (as it should read)                              | Suggested wave              |
|---------|-----------------|------------------------------|-----------------------------------------------------------|-----------------------------|
| CW8148  | Dining chair    | 19.7×18.9×29.5" · seat 18.1" | Solid American walnut frame and seat                      | 1: pairs with walnut tables |
| CW8148A | Dining armchair | 23.6×22.8×33.1" · seat 17.3" | Solid American walnut frame and seat                      | 1: head-of-table pair       |
| CW2701  | Dining chair    | 20.5×18.9×32.3" · seat 17.3" | Solid American ash, natural; paper-cord seat              | 1: Japandi / Scandi         |
| CW8141  | Dining chair    | 21.7×19.3×30.3"              | Solid American ash, natural; paper-cord seat              | 1                           |
| CW8138  | Dining chair    | 19.7×16.5×30.3" · seat 17.3" | Solid American ash, walnut stain; natural paper-cord seat | 1                           |
| CS7268  | Dining armchair | 23.2×21.3×30.7"              | Solid ash, soaped finish                                  | 1                           |
| CW8137  | Dining armchair | 22×19.7×29.1" · seat 16.9"   | Solid American ash, natural; paper-cord seat              | 2                           |
| CW2716  | Dining armchair | 21.7×21.3×31.1" · seat 17.3" | Solid American ash frame and seat                         | 2                           |
| CW8142  | Dining armchair | 21.3×19.1×28.3" · seat 17.9" | Solid American ash frame; plywood seat with ash veneer    | 2                           |
| CS2722  | Dining chair    | 22×18.9×33.3"                | Saddle leather; solid American ash, natural               | 2                           |
| CP1305  | Dining chair    | 19.3×21.7×33.1" · seat 17.7" | PU (faux leather) seat; solid ash, dark walnut stain      | 2                           |
| CP1308  | Dining armchair | 20.9×19.3×29.5"              | PU (faux leather) seat; solid ash, dark walnut stain      | 2                           |
| SW8292  | Low stool       | 16.1×20.1×18.5"              | Solid walnut                                              | 3: stools                   |
| SW8292M | Counter stool   | 16.1×20.1×27.2"              | Solid American walnut                                     | 3                           |
| SW8292H | Bar stool       | 16.1×20.1×30.7"              | Solid American walnut                                     | 3                           |
| CS2768  | Lounge chair    | 25.6×28×29.1"                | Saddle leather sling; solid natural ash frame             | 3                           |
| DT7258  | Writing desk    | 55.1×26.8×29.5"              | American ash top; solid ash legs                          | 3                           |

Why wave 1 is these six: they're dining chairs that pair directly with the tables you already rank for (walnut with Santa Monica, ash paper-cord with Japandi). That's where the "Complete the Dining Room" cross-sell and the `isRelatedTo` schema pay off first.

### Owner decisions for Day 6

**Decision sheet**

    Brand on the page: [ModernCre8ve | Piper & Fox]
    Model names (your own) for wave 1: CW8148 [ ] · CW8148A [ ] · CW2701 [ ] · CW8141 [ ] · CW8138 [ ] · CS7268 [ ]
    Retail price per chair / per set of 2, 4, 6: [ ]
    Sold from stock or to order? Customer lead time: [ ]
    Delivery method for chairs: [white glove | freight | parcel]
    Warranty shown: [1 year | other]
    Wood/finish options offered (beyond the invoice finish): [ ]
    Wishbone Counter Stool (already active, China origin): keep / retire / rename

### Templates (one per product)

**SEO title pattern (≤60 chars)**

    The [Name] Walnut Dining Chair | ModernCre8ve
    The [Name] Paper-Cord Dining Chair, Natural Ash | ModernCre8ve

**Meta description: CW8148 example (fill brackets; ≤155)**

    The [Name]: a solid American walnut dining chair with a sculpted wood seat, 18" seat height. Sold single or in sets. [Lead time / delivery].

**Product description: CW8148 example**

    The [Name] is a solid walnut dining chair with a shaped wood seat and a low, curved backrest. It's sized for a standard 30" dining table and pairs naturally with our walnut tables.

    At a glance
    - Material: solid American walnut frame and seat
    - Size: 19.7" W × 18.9" D × 29.5" H
    - Seat height: 18.1"
    - Made in: China
    - Sold as: [single / sets of 2, 4, 6]
    - Lead time: [ ]
    - Delivery: [method]
    - Warranty: [ ]

    Pairs well with
    The Santa Monica and Santa Monica Extension tables in walnut. Add the [Name] armchair (CW8148A) at each end.

    Care
    Dust with a soft dry cloth. Wipe spills promptly. Refresh the finish with Lareaux's Furniture Wax.

**Alt text pattern**

    The [Name] dining chair in solid walnut, front three-quarter view
    The [Name] dining chair, side profile showing the curved backrest
    Six [Name] walnut dining chairs at the Santa Monica dining table

**Collection FAQ for the new seating**

    Q: Where are these chairs made?
    A: They're made for us in China from solid American ash or walnut. Our tables, beds and case goods are handcrafted in Ohio.

    Q: Will these chairs fit under my dining table?
    A: Seat heights run 17–18", sized for standard 30"-high tables. Allow about 24" of table length per chair, and about 27" for armchairs.

    Q: How long do they take to arrive?
    A: [Lead time], delivered by [method].

    Q: Which chairs match a walnut table?
    A: The [Name] side chair and armchair in solid walnut, or the walnut-stained ash [Name] with a paper-cord seat.

Schema needs no hand-pasting. The storefront builds Product JSON-LD from the Shopify fields. Set vendor *Piper + Fox Co.* and add each handle to `DINING_CHAIRS` (Day 8), and the origin and table pairing follow automatically. Don't put the supplier's bank or payment details in any Shopify field or repo file.

## Appendix: everything else found

- Home hero images have empty alt text. That's fine for decorative images; give descriptive alt to any that show a product.
- No visible breadcrumb on product pages; BreadcrumbList is in the code only.
- The llms-full list has overlapping collection names ("Featured", "All Products", "All products: Scandinavian Modern…"). Consider hiding the duplicate collections from the storefront.
- Old Liquid store (`moderncre8ve.myshopify.com`) pages were still indexed with "ships within 8 weeks" copy (issue \#62, Oct 21). Check GSC removals.
- The en-it locale copy is indexed (Oct 21 catalog doc).
- The Housewares collection meta misspells the brand ("Modern Crea8ive") and uses "Best Cost Guaranteed" language.
- The new-products collection is titled "Mid-Century Modern Dining Sets".
- Several Piper + Fox drafts have raw supplier titles and placeholder spec text ("#originPlace#", "#dangerFlag#"). Clean them up before any of them go active.
- The Dining Chairs collection page shows the Seymour URL in maple, but maple appears nowhere in the copy.

Sources for this snapshot: the live pages at moderncre8ve.com (home, Santa Monica Extension, wax, Modern Dining Chairs, robots.txt, sitemap.xml, llms.txt, llms-full.txt) fetched Oct 27, 2026; the Shopify catalog through the store connector; the repo on main (fa68132) including `CHANGELOG.md`, `docs/90-day-plan-2026-10.md` and `app/utils/product-relations.ts`; the Oct 21 fresh pull and catalog cleanup doc; and web search for the assistant test.
