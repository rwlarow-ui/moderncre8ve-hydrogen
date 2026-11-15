# Revamped SEO Plan — Hydrogen Storefront (2026)

**Goal:** Move from "SEO basics are present" to a measured, conversion-attributed program that uses Shopify data + GA4, is mobile-first, and is readable by AI/agentic search engines.

**Recommended tooling:** an **MCP-native stack** so the whole loop is agent-drivable from here — no Ahrefs, no Semrush.
**Priority 1:** Close the conversion attribution loop.

---

## The MCP-native SEO stack

You already have the SEO *foundation* in code — strong JSON-LD, sitemaps, robots.txt, and a GTM `dataLayer` scaffold. You don't need a tool to create basics; you need MCPs to **measure, prioritize, attribute, and drive agentically**. Mapped to your priorities:

| Need | MCP tool | Why this one |
|---|---|---|
| **Conversion attribution loop (P1)** | **Supermetrics** | MCP-native aggregator that unifies **GA4 + Google Search Console + Shopify + ad platforms** into one queryable source. This *is* the conversion loop, exposed as MCP tools an agent can pull. Available via the marketing plugin in this session. |
| **Revenue ground truth** | **Shopify** (already connected) | Orders, products, and `run-analytics-query` (ShopifyQL) for revenue-by-channel reconciliation. Already live here. |
| **Competitive / market / keyword intel** | **Similarweb** | All-in-one, MCP-native. Traffic & engagement, traffic sources, website rank, similar sites, referrals, audience interests — the competitive layer that replaces Ahrefs/Semrush. ~22 MCP tools. |
| **Agentic / AI-search visibility (long-term)** | **Local Falcon** *(optional)* | "AI visibility and local search intelligence" — tracks how your brand shows up in AI answers and local search. Directly serves the agentic-search goal; strongest if you have any local/geo relevance. |

**Why this beats a single SaaS:** Similarweb gives competitive/market data but **never sees your revenue** — that lives in Shopify + GA4. Supermetrics + Shopify supply the first-party conversion data; Similarweb adds the outside-in market view. Because all three are MCPs, the agent can run the whole audit-to-attribution loop without you logging into dashboards.

**Note on the data sources:** Google Search Console and GA4 are the authoritative, free conversion-loop inputs. Supermetrics is the MCP that exposes them programmatically; you still verify the property and submit `sitemap.xml` in GSC directly.

---

## Current state — what's already in your repo

| Area | File | Status |
|---|---|---|
| Structured data (JSON-LD) | `app/utils/seo.server.ts` | **Strong.** Organization, Product, Offer, BreadcrumbList, CollectionPage, Article, SearchAction. |
| Meta / SEO tags | `app/root.tsx`, route `meta` exports via `getSeoMeta` | Working, Hydrogen-native. |
| Sitemaps | `routes/($locale).[sitemap.xml].tsx`, `sitemap.$type.$page[.xml].tsx` | Working, sourced from Shopify. |
| robots.txt | `routes/[robots.txt].tsx` | Working, blocks checkout/cart/preview. |
| Analytics events | `app/components/root/custom-analytics.tsx` | **Half-built.** Pushes `page_viewed`, `product_viewed`, `cart_updated` to `window.dataLayer` but mostly `console.log`; no confirmed GTM/GA4 container, and no purchase/checkout events. |
| Data endpoints | `routes/($locale).api.*.ts` (predictive-search, product(s), featured-items, review, klaviyo) | JSON UX endpoints — relevant to Core Web Vitals/UX, not crawlers directly. |

**The gap that matters most:** the `dataLayer` fires but nothing reliably consumes it into GA4, and there are no conversion events. You're collecting signal and dropping it.

---

## Priority 1 — Conversion attribution loop (near-term)

Objective: see which keywords and landing pages actually drive Shopify revenue, not just traffic.

1. **Stand up GA4 + GTM properly.**
   - Confirm a GA4 property + GTM container exist; inject the GTM container via Hydrogen's `Script` with the existing `nonce` (CSP-safe — you already pass `nonce` in `custom-analytics.tsx`).
   - In GTM, create GA4 event tags that read the existing `dataLayer` pushes (`page_viewed`, `product_viewed`, `cart_updated`).

2. **Add the missing conversion events** in `custom-analytics.tsx`:
   - Subscribe to `AnalyticsEvent.PRODUCT_ADD_TO_CART` (you have `add-to-cart-button.tsx`), checkout start, and **purchase**. Push GA4 ecommerce-shaped payloads (`items`, `value`, `currency`, `transaction_id`).
   - Purchase confirmation for Shopify checkout lives on Shopify's checkout domain — capture it via GA4 + Shopify's native GA4 integration / Customer Events (Web Pixel) so headless storefront sessions stitch to orders.

3. **Wire the data sources through Supermetrics (MCP).**
   - Connect GA4 + Google Search Console via Supermetrics so query, click, session, and conversion data are pullable as MCP tools.
   - Verify the property in **Google Search Console** (submit `sitemap.xml`) if not already — this is the free, authoritative source for query-level data.

4. **Join to Shopify revenue.**
   - Use GA4's ecommerce reports for online attribution, and reconcile against Shopify order/UTM data (Shopify Admin analytics or the Shopify MCP `run-analytics-query`) for ground truth on revenue by channel/landing page.

**Definition of done:** a single view (Supermetrics GA4/GSC + Shopify) answering "which organic landing pages and queries produced orders and how much revenue" for the last 28 days.

---

## Priority 2 — Keyword + competitive gaps

- Use **Similarweb** (MCP) to pull competitor traffic, traffic sources, top pages, and audience overlap for 2–3 competitors.
- Cross-reference with your own GSC query data (via Supermetrics) to find high-intent, winnable queries your competitors capture and you don't.
- Map those queries to existing collection/product pages; flag pages that need to be created. Track movement against Priority 1's revenue view.

---

## Priority 3 — Technical + mobile / Core Web Vitals (long-term, mobile-first)

- **PageSpeed/CrUX** for LCP, CLS, INP on the real Hydrogen routes (home, collection, product). Pull CrUX/field data into the loop; run Lighthouse in CI against the same templates.
- Hydrogen levers already available to you: Shopify CDN image optimization, route-level loaders, Vite warming/lazy loading. Audit `api.predictive-search` and image sizing on `products.$productHandle.tsx` for mobile payload.
- Track Core Web Vitals **by device** in GA4 (the `web-vitals` events) so mobile regressions surface against conversion.
- Target: green CWV on mobile for the product + collection templates, since that's where revenue and crawl budget concentrate.

---

## Priority 4 — Agentic / AI search readiness (long-term, low cost)

Your JSON-LD is already most of the work — this is enrichment, not a rebuild.

- **Deepen existing schema** in `seo.server.ts`: add `aggregateRating`/`review` to Product (you have an `api.review.$productHandle` endpoint to source it), `availability` and `priceValidUntil` on Offer, and `FAQPage` schema on product/collection pages.
- **Add `llms.txt`** (and keep `robots.txt` permissive to reputable AI crawlers per your policy) so answer engines can find canonical product/brand facts.
- **Write citable, factual copy** — clear product specs, comparison content, and Q&A blocks that AI answer engines can quote. Structured, declarative facts beat marketing prose for agentic retrieval.
- **Track AI visibility with Local Falcon (MCP)** — measure how your brand/products surface in AI answers and local search, and monitor AI-engine referrals in GA4 (via Supermetrics) to see if agentic traffic converts.

---

## 90-day sequence

| Weeks | Focus | Outcome |
|---|---|---|
| 1–2 | Connect Supermetrics (GA4 + GSC) + confirm Shopify MCP; submit sitemap | MCP data flowing |
| 2–4 | Fix `dataLayer` → GA4; add cart/checkout/purchase events | Conversion loop closed (Priority 1 done) |
| 4–6 | Similarweb competitive pull → keyword/page mapping | Prioritized content/optimization backlog |
| 6–10 | Technical fixes + mobile CWV on product/collection | Green mobile CWV on revenue templates |
| 10–12 | Schema enrichment (reviews, FAQ), `llms.txt`, Local Falcon AI-visibility tracking | Agentic-search foundation shipped |

---

*Tool recommendation reflects your stated preferences: MCP-native, not Ahrefs, not Semrush, conversion attribution first. The stack is Supermetrics (conversion loop) + Shopify (revenue) + Similarweb (competitive) + optional Local Falcon (AI visibility). Connect buttons for the unconnected ones are in chat.*
