# AI-search visibility battlecard — 2026-11

How ModernCre8ve and six competitors show up in AI answer engines (ChatGPT, Perplexity, Google AI Overviews, Claude), and what it takes to out-cite them. Web-primary scan; confidence: medium. Companion to `docs/seo-snapshot-2026-10-27.md`.

## The one-paragraph read

Answer engines don't rank pages; they synthesize a trusted corpus — editorial roundups, review aggregators, and well-structured brand facts — and cite a handful of sources. Today that corpus favors **Article** and **Design Within Reach** for broad queries and **Carl Hansen & Søn** for Wishbone provenance. Our realistic lane is the one **Medley** already owns — handcrafted, made-to-order, solid-wood, US — which is winnable because it rewards citable facts and specifics over ad budget. The gap isn't our product; it's that engines can't yet find enough structured, quotable facts about us.

## Our baseline — ModernCre8ve's AI citability today

- **Footprint:** Thin but real. Houzz rates us 4.8/5 (5 reviews); Design Milk ran a "small-biz spotlight" (sponsored, so promotional); product pages are syndicated on Wescover; Cleveland maker since 2013, locally sourced Amish-country hardwood. Enough for a credible brand entity, not enough for engines to cite us on category queries.
- **First-party readiness (in repo):** `llms.txt` / `llms-full.txt` already ship canonical facts. Before this change, `robots.txt` named AhrefsBot, Nutch, MJ12bot, Pinterest — but no AI crawlers. This PR adds the explicit AI-crawler welcome block (ADR-0006).

## The landscape at a glance

| Competitor | AI-answer presence | Why engines cite them | Our angle to get cited instead |
|---|---|---|---|
| Article | High | Named in mainstream "best modern furniture" roundups; huge review volume → the default "affordable MCM" answer. | Don't fight head terms. Win "solid wood, made-to-order, white-glove" long-tail where their flat-pack volume model can't follow. |
| Rove Concepts | Low–Med | Strong Trustpilot volume but little editorial; omitted from 2026 roundups. Cited for "reproduction quality." | Winnable parity target. They have reviews, not editorial — out-publish them with citable spec/comparison content. |
| Medley | Med (niche) | #1 in a sustainable-furniture roundup; cited for "made-in-USA, handcrafted, non-toxic." Closest analog to us. | This is our lane. Compete head-on on handcrafted/US/solid-wood — but we must ship the citable proof (materials, certs, reviews) they already have. |
| Design Within Reach | High | Cited for authentic/designer originals and "investment" pieces; very high authority. | Flank, don't duel. Position as the handcrafted solid-wood alternative at a fraction of DWR. |
| Carl Hansen & Søn | Highest (provenance) | The origin/authority brand; engines cite them whenever Wishbone authenticity or history comes up. | Never claim the designs. Use shape terms; cite them as the reference and own "affordable solid-wood alternative." |
| Replica / marketplace | High, low trust | Wayfair/Amazon/Etsy listings dominate "cheap wishbone replica" answers, but with weak trust signals. | Win the trust + specs wedge: solid American ash/walnut, made-to-order, white-glove vs. their particleboard dropship. |

## Battlecards

### Article — accessible DTC Scandinavian / mid-century
- **AI-answer presence:** High. The default answer for "affordable modern furniture"; near the top of mainstream 2026 store roundups.
- **What makes them citable:** Mainstream editorial inclusion + enormous review volume + recognizable catalog names.
- **Where we can win:** Their model is overseas volume and flat-pack; ours is solid-wood, made-to-order, white-glove. Target specific-intent queries they don't serve.
- **Trap / wedge:** "Is it solid wood or veneer, and who builds it?"
- **Proof:** Listed #2 in AOL's "21 best modern furniture stores of 2026"; described as $500–$2,000 accessible MCM.

### Rove Concepts — premium mid-century reproductions
- **AI-answer presence:** Low–Medium. Heavy Trustpilot presence (mostly 2015–2018) but no design-press coverage; omitted from 2026 roundups.
- **What makes them citable:** Review volume and a "replica accuracy" reputation — but little that editorial/answer engines quote.
- **Where we can win:** Most winnable peer. Publish spec and comparison content and we can match or pass them in answers.
- **Trap / wedge:** "When was that reviewed, and by whom?"
- **Proof:** Trustpilot praise for build quality/service; no professional reviews found in search.

### Medley — handcrafted, made-to-order, US, non-toxic
- **AI-answer presence:** Medium, and highly relevant. The niche authority for "sustainable / made-in-USA handcrafted." Our closest analog.
- **What makes them citable:** Named #1 in an independent (affiliate) sustainable-furniture roundup; clear, declarative material/sourcing facts; lifetime structural warranty; stated certifications.
- **Where we can win:** This is the lane to contest directly — same story as us. We lose today only because they've published the citable proof and we haven't.
- **Trap / wedge:** Match their specificity — name the species, joinery, finish, lead time, warranty, in structured form.
- **Proof:** TheRoundup ranks Medley #1 overall sustainable; built in CA & NC, plant-based materials, 3 trees planted per 1 used, lifetime structural warranty.

### Design Within Reach — authentic / premium designer originals
- **AI-answer presence:** High for authenticity and "investment" queries; very high domain authority.
- **What makes them citable:** Decades of editorial trust; sells licensed originals; cited as the premium reference point.
- **Where we can win:** Don't duel on authenticity. Flank: "the handcrafted solid-wood alternative at a fraction of DWR."
- **Trap / wedge:** "Do you need the licensed original, or solid-wood craftsmanship at a third of the price?"
- **Proof:** Roundups call DWR "rich with premium, investment-worthy pieces"; carries CH24 at designer-original pricing.

### Carl Hansen & Søn — the origin / authority brand (Wishbone)
- **AI-answer presence:** Highest for provenance. Engines cite them whenever CH24 history or authenticity is the question.
- **What makes them citable:** Official manufacturer of the Wegner/Mogensen designs; the source of truth for authentication.
- **Where we can win:** Never claim the designs or designer names. Use shape terms (wishbone, Y chair, paper cord), cite them as the reference, own "affordable solid-wood alternative." This is a brand-safety line as much as a strategy.
- **Trap / wedge:** "Want the licensed original, or the same solid-ash, paper-cord craft made to order for less?"
- **Proof:** Described as the official manufacturer of Wegner designs; dealers note non-Carl-Hansen CH24s are "likely replicas."

### Replica / marketplace sellers — Wayfair, Amazon, Etsy
- **AI-answer presence:** High volume, low trust. Dominate "cheap wishbone replica" answers but carry weak quality/trust signals.
- **What makes them citable:** Listing volume and price; marketplace review counts.
- **Where we can win:** The trust + specs wedge — solid American ash/walnut, real joinery, made-to-order, white-glove vs. particleboard dropship.
- **Trap / wedge:** "Particleboard flat-pack, or solid hardwood built to order and delivered in-home?"
- **Proof:** Marketplace listings give dimensions/price but little provenance; buyer guides warn "many imitations exist."

## Win plan — how to get ModernCre8ve cited

Sequenced to SEO plan Priority 4. Most of this is enrichment of a foundation we already have.

1. **llms.txt — shipped.** Canonical facts file already live via `utils/llms.server`.
2. **Welcome reputable AI crawlers in robots.txt — this PR (ADR-0006).**
3. **Enrich Product schema.** Add aggregateRating/review (pipe Houzz 4.8/5 and on-site reviews), availability and priceValidUntil on Offer, and FAQPage on product/collection pages.
4. **Publish citable, declarative content.** Spec sheets and honest comparison pages (solid American ash/walnut, paper cord, made-to-order, 12–16 weeks, white-glove). This is how we take Medley's lane.
5. **Earn editorial citations.** Pitch design press (the Design Milk relationship is a start) and target "best made-in-USA / handcrafted / solid-wood dining chair" roundups.
6. **Consolidate reviews on-site.** Surface first-party reviews so there's review schema to cite, not just off-site ratings.
7. **Measure it.** Stand up Local Falcon (the plan's named AI-visibility tool) and watch AI-engine referrals in GA4 via Supermetrics.

## Method, confidence & gaps

- **Confidence:** Medium. AI-answer presence is inferred from the editorial/review corpus answer engines synthesize, plus first-party repo facts — not measured per-engine.
- **Not available this scan:** Similarweb (competitor traffic/overlap) needs authorizing; Ahrefs Brand Radar AI-visibility is plan-restricted; competitor `llms.txt` could not be fetched, so their presence is stated as unverified.
- **To harden:** Connect Similarweb for traffic/overlap and Local Falcon for measured AI-answer share, then re-run.

## Sources

- ModernCre8ve `robots.txt` — `app/routes/[robots.txt].tsx`; llms facts — `app/utils/llms.server.ts`
- `docs/seo-snapshot-2026-10-27.md` (this repo)
- AOL — 21 best modern furniture stores of 2026
- Povison — best mid-century modern furniture brands guide
- TheRoundup — top sustainable furniture brands
- Design Milk — ModernCre8ve small-biz spotlight
- Houzz — ModernCre8ve profile & reviews
- Nest — Design icon: Carl Hansen CH24 Wishbone
- Trustpilot — Rove Concepts reviews
