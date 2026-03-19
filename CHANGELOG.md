# ModernCre8ve Hydrogen Storefront

## Migration Status: Phase 5 — Launch Complete

---

## 1.4.2 — 2026-03-19

### Security Hardening
- Patched critical storefront vulnerabilities across API routes, cart actions, session/cookie handling, and CSP enforcement
- Locked down the Storefront GraphQL proxy with origin checks, header filtering, and version allowlisting
- Added Turnstile + honeypot review protection and capped unsafe query params on search/products endpoints

### SEO & Analytics Quick Wins
- Fixed homepage metadata and rewrote collection meta descriptions for priority collection pages
- Corrected GA4 loading so analytics uses the proper `gtag/js` endpoint
- Enforced single-H1 page structure and added smarter product image alt text generation

### Product Page Conversion & Trust Upgrades
- Added new trust-building Weaverse sections: Quality Guarantee, Craftsmanship Process, and Customer Gallery
- Rebuilt the default product template to include guarantees, highlights, reviews, gallery content, and related products in a stronger conversion order
- Added a Specifications & Details accordion, white glove delivery messaging, Made in the USA highlights, and updated CTA/guarantee copy

### Weaverse / Platform Stability
- Improved collection-card readability with persistent dark overlays and white text
- Fixed Weaverse Studio design-mode sync by restoring fallback behavior when Studio page data is missing
- Restored the Instagram section as a no-op stub so legacy Studio content can load without schema errors
- Updated `@weaverse/hydrogen` to `5.10.0`

### Research & Documentation
- Added customer behavior analysis, SEO findings, competitive brief, market research, and brand voice documentation to support ongoing optimization

---

## 1.4.1 — 2026-03-16

### Fix: Restore Weaverse Studio → Live Publish Flow
- Restored Studio-priority guard in `weaverse-fallback.server.ts` that was removed in commit `6da3daf`
- Pages published in Weaverse Studio now correctly appear on the live site
- Local fallback JSON is only used when Studio has no page configured (as originally intended)

---

## 1.4.0 — 2026-03-05

### Phase 5: Launch — DNS Cutover to moderncre8ve.com
- Assigned `moderncre8ve.com` domain in Shopify Admin
- DNS cutover complete — site live at [moderncre8ve.com](https://moderncre8ve.com/)
- Removed password protection from old site

---

## 1.3.9 — 2026-03-05

### GA4 / GTM Implementation
- Integrated Google Tag Manager (`G-R1KFYYKE48`) via `PUBLIC_GOOGLE_GTM_ID` env var
- GA4 property `251836602` (Measurement ID: `G-G4Q4Z6MM4B`) connected for site-wide analytics
- Google Cloud project: `mindful-quasar-486518-r9`

---

## 1.3.8 — 2026-02-26

### Lead Time Updates — 12–16 Weeks Furniture, 3–5 Days Wax
- Updated lead time from 2–4 weeks to 12–16 weeks across product pages, FAQ, and order policies
- Added wax product exception: ships within 3–5 business days
- Aligned all shipping/lead time messaging site-wide (product notice, FAQ, order policies, shipping policy)

---

## 1.3.7 — 2026-02-26

### Lead Time Notice SSR Fix
- Added destructuring defaults for `showLeadTime` and `leadTimeText` in the main-product section component
- Fixes the lead time notice not rendering when Weaverse Studio data predates the field (Studio data lacks the property, so the prop was `undefined`)
- Lead time notice now renders out-of-the-box without requiring manual Studio configuration

---

## 1.3.6 — 2026-02-25

### Klaviyo Removed — Newsletter Uses Shopify Customer API
- Deleted Klaviyo API route (`app/routes/($locale).api.klaviyo.ts`)
- Switched footer and popup newsletter forms from `/api/klaviyo` to `/api/customer` (Shopify's built-in customer creation with marketing opt-in)
- Updated response handling to match the customer API's `errorMessage` field
- Removed `KLAVIYO_PRIVATE_API_TOKEN` from `env.d.ts` and `.env.example`

---

## 1.3.5 — 2026-02-25

### Lead Time Notice on Product Pages
- Added lead time callout to all product detail pages, positioned between the Add to Cart button and the accordion details
- Default text: "Handcrafted to order. Please allow 2–4 weeks for production and delivery. Custom orders may require additional time."
- Includes links to the Shipping details and FAQ pages
- Configurable via Weaverse Studio: toggle on/off and customize the lead time text
- Updated product fallback JSON to include lead time by default

---

## 1.3.4 — 2026-02-25

### TypeScript Typecheck Fixes
- Removed non-standard `msUserSelect` CSS property from predictive search results
- Removed extra `buttonType` and `panelType` props from `QuickShopTrigger` (not in component interface)
- Fixed `CollectionsByIdsQuery` → `CollectionByIdsQuery` typo in collection list dynamic section
- Updated `GenericError` component to accept `unknown` error type to match Weaverse `errorComponent` contract
- Made `featuredImage` fields (`id`, `width`, `height`) optional to match Storefront API generated types

### Breadcrumbs Structured Data Fix
- Fixed JSON-LD breadcrumb `@id` and `item` URLs to use absolute URLs (prefixed with store domain) instead of relative paths

### Weaverse Page Aliases
- Added short-handle aliases (`custom-orders`, `shipping-policy`) so both the full Shopify handle and short handle resolve to the correct fallback page JSON

---

## 1.3.3 — 2026-02-25

### Mobile Menu Freeze Fix
- Eliminated nested `Dialog.Root` in mobile menu — the submenu was a second Radix Dialog inside the first, creating conflicting focus traps and duplicate scroll locks that froze touch interaction
- Restructured to a single Dialog with internal state (`activeSubMenu`) to swap between main and submenu views
- Switched from spring to tween animation (250ms ease-out) — spring animations block the main thread on mobile
- Changed initial offset from `-100vw` to `-360px` to match actual panel width
- Removed `backdrop-blur-xs` overlay (GPU-heavy on mobile)
- Added `max-w-[85vw]` to prevent overflow on small screens

### Newsletter Form Fix
- Fixed "Something went wrong" text appearing in DOM before any form submission
- Changed from always-rendered invisible div to conditional render — message only appears after actual submit response

---

## 1.3.2 — 2026-02-24

### Homepage — Real Data for Featured Sections
- Wired `best-sellers` collection to the featured products carousel (was showing "Product Title" / "$0" placeholders)
- Added 6 Shopify collection IDs to the collection grid section (Dining Tables, Bedroom, Living, Coffee Tables, Dining Chairs, Scandinavian)

### Placeholder Images Replaced Site-Wide
- Replaced 34 FPO placeholder SVGs with hero photos across 7 page fallback JSONs
- Pages fixed: Homepage, About Us, Contact, Custom Orders, FAQ, Press, Reviews
- Covers image-with-text sections, team columns, testimonial hotspots, and press columns

---

## 1.3.1 — 2026-02-24

### Footer Hardening
- Hardened footer against Weaverse Studio demo values leaking through `useThemeSettings()` (Toronto address, Weaverse copyright, empty bio)
- Store address, email, and copyright now use code-level fallbacks that override Studio demo data
- Bio fallback strips HTML tags to detect empty `<p></p>` content from Studio

### Weaverse Product Fallback Fix
- Reverted product route fallback guard — PRODUCT Weaverse fallback is a template (`local_PRODUCT`) that always loads for every product route, unlike per-handle page fallbacks
- Product 404 behavior restored: `throw new Response("product", { status: 404 })`

### SEO Keyword Targeting
- Added SEO keyword targeting to Weaverse page section text content

---

## 1.3.0 — 2026-02-24

### Hero Images & Homepage Slideshow
- Added 9 optimized hero images (1920x1080 JPEG, 156–375 KB each) to `public/images/heroes/`
- Set `backgroundImage` on hero-image sections across all 10 page JSONs
- Set `backgroundImage` on 3 homepage slideshow slides
- Images resized from 4096x4096 PNG originals

### SEO Redirect Fix
- Pages route now returns 404 when no Shopify page exists and no local Weaverse fallback is present (page ID must start with `local_`)
- Allows Shopify's URL redirect system to handle old paths (e.g. `/pages/contact` → `/pages/contact-us`)
- Fixed fallback map: `PAGE:contact` → `PAGE:contact-us` to match actual Shopify page handle

### Weaverse Fallback & Config Fixes
- Built proper configs with `projectId` and `requestInfo` when Weaverse API returns empty
- Fixed root item type from `"*"` to `"main"` across all 13 page JSONs

### Contact Page & Footer Fixes
- Added `contact-and-inquiry` handle to Weaverse fallback map
- Local JSON now preferred over Studio demo data for all pages
- Overrode footer store info (was showing Toronto demo address)
- Replaced blank Instagram placeholders with static product images
- Updated Instagram content presets to `@moderncre8ve`

### Pre-Launch Documentation
- Added `LAUNCH.md` — domain assignment, DNS cutover steps, full Phase 5 launch checklist
- Added `PRELAUNCH-REPORT.md` — codebase health audit, SEO/structured data verification, redirect analysis

### Housekeeping
- Trimmed `CLAUDE.md` from 275 to 148 lines (~46% reduction)
- Added `app-connector` to `.gitignore`
- Added Shopify CLI integration and synced Oxygen env vars

---

## 1.2.7 — 2026-02-24

### Pre-Launch Documentation
- Added `LAUNCH.md` — domain assignment, DNS cutover steps, full Phase 5 launch checklist, migration status overview
- Added `PRELAUNCH-REPORT.md` — codebase health audit, SEO/structured data verification, redirect analysis, manual spot-check checklist

---

## 1.2.6 — 2026-02-24

### CLAUDE.md Cleanup
- Trimmed from 275 lines to 148 lines (~46% reduction)
- Removed completed Phase 1-4 task logs, Shopify Admin history, and remaining collections tables
- Condensed Admin API, SEO Truth Layer, MCP Servers, and Environment sections
- Merged redundant subsections (Development Commands, Common Tasks, Component Architecture)
- Kept all actionable development guidance: branding, architecture, import rules, Weaverse workflows

---

## 1.2.5 — 2026-02-23

### Shopify CLI Integration & Env Sync
- Installed Shopify CLI 3.91.0 and authenticated via `shopify auth login`
- Project already linked to **Moderncre8ve v2** Hydrogen storefront
- Pulled Oxygen environment variables via `shopify hydrogen env pull`
- New env vars from Oxygen: `PUBLIC_STOREFRONT_ID`, `PRIVATE_STOREFRONT_API_TOKEN`, `PUBLIC_CUSTOMER_ACCOUNT_API_URL`, `SHOP_ID`
- Admin API token now Shopify-managed (`shpss_` prefix) via CLI auth
- Updated scripts: `get-admin-token.mjs` scopes (redirects → navigation), `import-new-redirects.mjs` with .env loader and auth test

---

## 1.2.4 — 2026-02-23

### Pre-Launch SEO Migration Audit & Critical Fixes

**Full audit:** `SEO_MIGRATION_AUDIT.md` — cross-referenced Google-indexed URLs against new Hydrogen routes and redirect CSV.

**Redirect CSV updated** (77 → 88 redirects):
- Added `/pages/custom-kitchen-cabinets-cleveland` → `/pages/custom-furniture-crafted-to-perfection` (was indexed by Google but marked "skip")
- Added `/collections/all` → `/collections/all-products` (handle mismatch)
- Added 4 indexed-but-missing collections: `scandinavian-design-furniture`, `mid-century-modern`, `mid-century-modern-dining-tables`, `modern-dining-chairs` → `/collections/all-products`
- Added `/collections/all/custom` → `/collections/custom-made-furniture`
- Added 2 tagged blog URL redirects (`/tagged/vintagefurniture`, `/tagged/japandi-bedroom`)
- **Fixed 4 blanket blog redirects** — changed article → blog index to article → article (1:1 preserving URL path under new blog handle)

**Structured data enhancements** (`app/utils/seo.server.ts`):
- Added `FurnitureStore` (LocalBusiness) schema — address, phone, email, geo, hours, priceRange
- Added `author` + `publisher` fields to Article schema (Organization: ModernCre8ve)

**AMP subdomain strategy:**
- `amp.moderncre8ve.com` is Shopify auto-generated; will stop serving when DNS cuts over to Hydrogen/Oxygen
- Post-launch: monitor GSC for stale AMP index entries; remove AMP property from GSC if separate

**Remaining for launch:**
- [ ] Re-import updated redirects CSV to Shopify Admin (88 redirects via `urlRedirectCreate`)
- [ ] Final deploy to Oxygen
- [ ] Assign moderncre8ve.com domain in Shopify Admin
- [ ] DNS cutover
- [ ] Post-launch: verify redirects, monitor GSC crawl errors

---

## 1.2.3 — 2026-02-22

### SEO Truth Layer — Pipeline Operational
- Set up [moderncre8ve-seo-truth-layer](https://github.com/rwlarow-ui/moderncre8ve-seo-truth-layer) repo
- Configured Google Cloud service account (`moderncre8ve-829@mindful-quasar-486518-r9.iam.gserviceaccount.com`)
- Granted access to Google Search Console (Full) and GA4 (Viewer)
- GA4 Property ID: `251836602` | Measurement ID: `G-G4Q4Z6MM4B`
- First pipeline run successful:
  - GSC: 5,551 query rows (Feb 13–20)
  - GA4: 111 page rows (Feb 15–22)
  - Merged truth table: 140 pages
  - 57 action items generated (29 low CTR, 24 striking distance, 3 thin content, 1 revenue opportunity)
- Weekly brief auto-generates every Monday at 11:00 UTC

---

## 1.2.2 — 2026-02-22

### Lint Audit (Biome — Suggested Fixes for Dev Analysis)
- Ran `biome check` — **0 errors**, **20 suggestions** across 10 files (14 auto-fixable)
- No changes applied; logged here for future cleanup consideration

**By rule (20 total):**
| Count | Rule | Category | Fixable | Notes |
|-------|------|----------|---------|-------|
| 5 | `useConsistentTypeDefinitions` | style | Yes | `type` → `interface` preference |
| 5 | `useBlockStatements` | style | Yes | Inline `if` returns → block `{}` |
| 4 | `noReactForwardRef` | nursery | Yes | `forwardRef` deprecated in React 19 — pass `ref` as prop |
| 3 | `noImplicitCoercions` | complexity | Yes | `!!val` → `Boolean(val)` |
| 5 | `noMagicNumbers` | style | No | Extract numeric literals to named constants |
| 1 | `useExhaustiveDependencies` | correctness | Yes | Missing dependency in `useEffect` |
| 1 | `noNoninteractiveElementInteractions` | a11y | No | Non-interactive element has click handler |

**By file:**
| File | Issues |
|------|--------|
| `app/components/cart/cart.tsx` | 5 (coercions, magic numbers, block statements, type defs) |
| `app/components/layout/predictive-search/search-desktop/PopularSearch.tsx` | 4 (block statements, magic numbers, exhaustive deps) |
| `app/components/background-image.tsx` | 2 (implicit coercions) |
| `app/components/button.tsx` | 1 (forwardRef) |
| `app/components/heading.tsx` | 1 (forwardRef) |
| `app/components/image.tsx` | 1 (forwardRef) |
| `app/components/layout/mobile-menu.tsx` | 2 (block statement, forwardRef) |
| `app/components/layout/country-selector.tsx` | 1 (block statement) |
| `app/components/layout/desktop-menu.tsx` | 1 (a11y: non-interactive element interaction) |
| `app/components/layout/header.tsx` | 1 (magic number) |
| `app/components/customer/orders.tsx` | 1 (type → interface) |

---

## 1.2.1 — 2026-02-18

### Fix All Schema Warnings
- Renamed `inspector` → `settings` in all 20 section schemas across the codebase
- Removed empty `settings: []` from testimonial-item schema (was triggering "At least one input is required" validation error)
- Dev server now starts with zero Weaverse schema warnings
- Affected sections: instagram, map, address-item, accordion, content-information, accordion-group, accordion-item, information-item, before-and-after, slider, videos, video, testimonials, hotspot-item, testimonials-item, content, scrolling-text, collection-list-dynamic, collection-items, articles

---

## 1.2.0 — 2026-02-18

### Phase 3 Complete: All Pages Live via Local JSON Fallback
- Verified all 13 Weaverse page JSONs render correctly from local fallback system
- Weaverse Studio has no public write API — pages served via `app/utils/weaverse-fallback.server.ts`
- Studio pages will automatically take priority if created later

**Pages verified (11 pages + 2 templates):**
- [x] Homepage — Slideshow, Highlights, Featured Products, Collection List, Image with Text, Video, Testimonials, Newsletter
- [x] About Us — Hero, Story, Video, Philosophy, Team, Charities
- [x] Contact — Hero, Map, Custom Orders CTA, Shipping CTA
- [x] FAQ — Hero, 4 accordion groups (16 Q&A items)
- [x] Custom Orders — Hero, intro, 4-step process, highlights, CTA
- [x] Our Materials — Hero, 4 wood types, mixed walnut
- [x] Assembly & Care — Hero, assembly accordion, care accordion
- [x] Shipping Policy — Hero, delivery methods, policies accordion
- [x] Order Policies — Hero, 8-item policies accordion
- [x] Press — Hero, intro, 9 press logos, inquiry CTA
- [x] Reviews — Hero, 4 testimonials, highlights badges
- [x] Product Template — Main Product (grid) + Related Products
- [x] Collection Template — Collection Filters + cross-sell

**Deployed to Oxygen** — all pages live at `moderncre8ve-v2-6aebe5cb62e16d9300dd.o2.myshopify.dev`

### Visual Polish TODO (Optional)
- [ ] Assign hero/slide background images from Shopify media library
- [ ] Apply brand color palette to Weaverse theme settings

---

## 1.1.0 — 2026-02-17

### Brand Color Palette Added
- Added official 6-color ModernCre8ve brand palette to CLAUDE.md
  - Dark Charcoal `#323640` — primary dark / text
  - Emerald Green `#2CBF96` — accent / CTA
  - Warm Cream `#F2EBD5` — background / neutral
  - Amber Gold `#F2AC29` — highlight / secondary accent
  - Coral Red `#D35055` — alert / accent
  - Cool Gray `#9DA0A7` — muted / borders
- Source: `MC82.0_FINALCOLORS_081123.png` (finalized Aug 2023)

---

## 1.0.9 — 2026-02-15

### Mokker AI Background Generation Script
- Created `scripts/mokker-backgrounds.mjs` — batch background generation for 27 product images via Mokker AI API
- Supports `--dry-run`, `--start-from`, `--delay` flags; auto-resume skips already-processed images
- Uses Google DNS (8.8.8.8) to bypass local DNS issues with `api.mokker.ai`
- Added `product-images-bg/` to `.gitignore` for generated output
- **Blocked**: Mokker API endpoint (`api.mokker.ai`) is unreachable — AWS ELB decommissioned post-soona acquisition; contacted support@mokker.ai for updated endpoint

---

## 1.0.8 — 2026-02-14

### Phase 4 Complete: All Shopify Admin Cleanup Tasks Executed
All 6 Phase 4 tasks executed via Admin GraphQL API using the OAuth token from v1.0.7.

- **Drafted 3 unavailable products** — Set DRAFT status on `contemporary-dining-bench-vermonter`, `mid-century-modern-bed-frame` (The Quincy), `mid-century-dresser-larchmere-tallboy`
- **Fixed Mar Vista alt text** — Updated 3 images with missing alt text on `scandinavian-oval-dining-table-mar-vista`
- **Imported 77 SEO redirects** — All 77 `urlRedirectCreate` mutations succeeded (8 batches)
- **Uploaded 27 product images** — All 27 background-removed PNGs uploaded via staged uploads + `productCreateMedia` (27/27 succeeded, 0 failed)
- **Cleaned up 4 collections** — Deleted: In Stock, Piper and Fox, Collections-All, Edit these 2025

---

## 1.0.7 — 2026-02-14

### Admin API Access Unlocked
- Obtained Shopify Admin API token with full write scopes via OAuth flow
- Created "Claude2" app in Shopify Dev Dashboard (custom distribution)
- Built `scripts/get-admin-token.mjs` — one-time HTTPS OAuth script with self-signed cert
- Token saved to `.env` as `SHOPIFY_ADMIN_API_TOKEN` (full admin scopes: write_products, write_redirects, write_files, etc.)
- All 6 Phase 4 tasks now unblocked and ready for automated execution

---

## 1.0.6 — 2026-02-14

### Phase 4 Prep: Shopify Admin Cleanup
- Audited all 20 collections via Storefront API (5 empty, 2 missing SEO)
- Verified 77 SEO redirects CSV ready for import
- Verified 27 background-removed product images ready for upload (40 MB in `product-images-nobg/`)
- Connected GitHub repo to Shopify Hydrogen for auto-deploy on push
- Set up Oxygen deployment token (`CI=1 --token`) for scripted deploys
- Attempted Admin API token creation — blocked by Shopify's Jan 2026 custom app deprecation; tasks require manual Shopify Admin work

### Phase 4 TODO — Shopify Admin Tasks (All Completed in v1.0.8)
- [x] **Draft 3 unavailable products** — Done via `productUpdate` mutation
- [x] **Fix Mar Vista alt text** — Done via `productUpdateMedia` mutation
- [x] **Import 77 SEO redirects** — Done via `urlRedirectCreate` mutations (8 batches)
- [x] **Upload 27 product images** — Done via staged uploads + `productCreateMedia` (27/27)

---

## 1.0.5 — 2026-02-14

### Architectural Decision: Hydrogen as Master Version
- Established `my-hydrogen-storefront` as the master rebuild of moderncre8ve.com
- Archived the prior Next.js + Builder.io version (`~/Desktop/Moderncre8ve Rebuild [ARCHIVED]/`)
  - That project reached v0.7.3 (~90%) but was superseded for better Shopify ecosystem integration
- Added `ARCHIVED.md` to the Next.js project with pointers to this active project
- Updated CLAUDE.md with project history section
- Cleaned up deploy script: removed `--builder` flag (Builder.io no longer active), updated Oxygen deploy to use `CI=1 --token` for non-interactive deployments
- Updated global Claude config and memory files to reflect the architectural decision

---

## 1.0.4 — 2026-02-14

### Remaining Core Page JSON Generation
Generated the final 3 Weaverse page import JSON files in `weaverse-pages/`:

**`homepage.json`** — 8 sections:
- Slideshow (3 hero slides: main brand, mid-century dining, Scandinavian/Japandi)
- Highlights (3 value prop badges: Handcrafted in Ohio, Solid Hardwood, Custom Orders)
- Featured Products ("Best Sellers" carousel)
- Collection List Dynamic ("Shop by Category" grid)
- Image with Text (About teaser — founding story CTA)
- Video Embed ("See Our Workshop")
- Testimonials (3 customer reviews: John D., Susan M., Alex P.)
- Newsletter ("Join the ModernCre8ve Family")

**`about-us.json`** — 6 sections:
- Hero Image ("About ModernCre8ve")
- Image with Text — Our Story (founding in 2013, Amish craftsmen)
- Video Embed ("Inside the Workshop")
- Image with Text — Philosophy (design philosophy, sustainability)
- Columns with Images — Team (Randy Larow, The Artisans, Customer Experience)
- Image with Text — Charities ("Rooted in Community")

**`contact.json`** — 4 sections:
- Hero Image ("Contact Us")
- Map with address (Cleveland showroom, hours, phone)
- Image with Text — Custom Orders CTA (links to custom orders page)
- Image with Text — Shipping CTA (white glove delivery, links to shipping policy)

All `type` values verified against `app/weaverse/components.ts`. All content sourced from migrated section presets.

---

## 1.0.3 — 2026-02-14

### Project Links & Setup
- Added Shopify Admin, Weaverse Studio, and Oxygen deployment URLs to CLAUDE.md
- Re-cloned repo into working directory (previous empty directory was a failed install)

### Weaverse Page JSON Generation
Generated 10 Weaverse page import JSON files in `weaverse-pages/`:

**Pages (8):**
- `faq.json` — 6 sections: hero, 4 accordion groups (Ordering, Shipping, Materials, Custom), CTA
- `custom-orders.json` — 5 sections: hero, intro IWT, 4-step columns, highlights, CTA
- `our-materials.json` — 3 sections: hero, 4-wood-type columns, mixed walnut IWT
- `assembly-care.json` — 3 sections: hero, assembly accordion, care accordion
- `shipping-policy.json` — 3 sections: hero, delivery methods accordion, policies accordion
- `order-policies.json` — 2 sections: hero, 8-item policies accordion
- `press.json` — 4 sections: hero, intro IWT, 9 press logos columns, inquiry CTA
- `reviews.json` — 3 sections: hero, 4 testimonials carousel, highlights badges

**Templates (2):**
- `default-product.json` — main-product (grid layout) + related-products
- `default-collection.json` — collection-filters with sidebar, banners, sorting

All files use flat `items[]` array with `children: [{id}]` references matching `WeaverseProjectDataType`. All `type` values verified against registered components in `app/weaverse/components.ts`.

---

## 1.0.2 — 2026-02-14

### Content Extraction & Page Blueprints
- Extracted all 20 Shopify pages via Storefront API (full HTML body content)
- Catalogued 81 registered Weaverse sections available for page building
- Created detailed section-by-section blueprints for all active pages
- Identified 12 active pages to port, 8 pages to skip (empty/superseded/GDPR)

### Product Image Processing
- Processed all 27 available product featured images through remove.bg API
- Background-removed PNGs saved to `product-images-nobg/` directory
- Linked each processed image to its Shopify Admin product edit URL

### Weaverse Studio Setup
- Created page templates: Product, Collection, Page
- Templates ready for page building in Weaverse Studio

### Phase 3 TODO — Pages to Build in Weaverse Studio

**Core Pages**
- [x] Homepage — Slideshow, Highlights, Featured Products, Collection List, Image with Text, Video, Testimonials, Newsletter
- [x] About Us (`/pages/about-us`) — Hero, Story, YouTube video, Philosophy, Team (3 members), Charities
- [x] Contact (`/pages/contact`) — Hero, Map (Cleveland showroom), Custom Piece CTA, Shipping CTA
- [x] FAQ (`/pages/faq`) — Hero, 4 accordion groups (16 Q&A items total)

**Supporting Pages**
- [x] Custom Orders (`/pages/custom-furniture-crafted-to-perfection`) — 4-step process
- [x] Our Materials (`/pages/our-materials`) — Walnut, White Oak, Hard Maple, Cherry
- [x] Assembly & Care (`/pages/assembly-care`) — Assembly instructions, care guidelines
- [x] Shipping Policy (`/pages/shipping-policy-and-customer-responsibilities`) — Full shipping policy
- [x] Order Policies (`/pages/ordering-policies`) — Payment, guarantee, cancellations, damages
- [x] Press (`/pages/mid-century-modern-press-coverage`) — 9 press mentions (HGTV, Domino, etc.)
- [x] Reviews (`/pages/reviews`) — Customer testimonials, value props

**Templates**
- [x] Default Product — Main Product + Related Products
- [x] Default Collection — Collection Filters + cross-sell

**Status:** All 13 JSON files rendering via local fallback (v1.2.0). Images and brand palette to be assigned in Studio as visual polish.

### Phase 4 — Shopify Admin Cleanup (Completed v1.0.8)
- [x] Upload 27 background-removed product images to Shopify
- [x] Import SEO redirects CSV (77 redirects)
- [x] Fix Mar Vista image alt text (3/10 missing)
- [x] Handle 3 unavailable products (set to Draft)
- [x] Delete 4 empty/internal collections (In Stock, Piper and Fox, Collections-All, Edit these 2025)
- [x] ~~Fix SEO on 2 collections~~ — deleted instead (both were empty/internal)

### Phase 5 TODO — Launch
- [ ] Final deploy to Oxygen
- [ ] Assign moderncre8ve.com domain in Shopify Admin
- [ ] Verify all pages, redirects, and SEO
- [ ] Remove password protection from old site
- [ ] DNS cutover

### Original Site Pages Inventory (from Storefront API)
| # | Handle | Status |
|---|--------|--------|
| 1 | `about-us-1` | Port → About Us |
| 2 | `contact-and-inquiry` | Port → Contact |
| 3 | `custom-furniture-crafted-to-perfection` | Port |
| 4 | `mid-century-modern-press-coverage` | Port |
| 5 | `our-materials` | Port |
| 6 | `reviews` | Port |
| 7 | `assembly-care` | Port |
| 8 | `ordering-policies` | Port |
| 9 | `shipping-policy-and-customer-responsibilities` | Port |
| 10 | `faq` | Port |
| 11 | `terms-of-service` | Port (legal) |
| 12 | `privacy-policy` | Port (legal) |
| 13 | `custom-kitchen-cabinets-cleveland` | Skip (minimal) |
| 14 | `about-us` | Skip (empty, superseded) |
| 15 | `contact-us` | Skip (empty, superseded) |
| 16 | `legal` | Skip (empty) |
| 17 | `trade-1` | Skip (empty) |
| 18 | `wrong-turn` | Skip (promo redirect) |
| 19 | `my-personal-data` | Skip (GDPR) |
| 20 | `request-personal-data` | Skip (GDPR) |

---

## 1.0.1 — 2026-02-13

### Section Presets Migration
- Migrated all 16 section presets to ModernCre8ve content (16 files modified)
- Slideshow: 3 hero slides with Shopify CDN images
- Featured Products: "Best Sellers" with real copy
- Image with Text: About teaser with founding story
- Collection List Dynamic: "Shop by Category"
- Testimonials: 3 customer reviews
- Newsletter: "Join the ModernCre8ve Family"
- Highlights: 3 value prop badges (Handcrafted, Solid Hardwood, Custom Orders)
- Hero Image: inner page hero for About/FAQ
- Accordion/FAQ: 5 real FAQ items with policies
- Map/Contact: Cleveland showroom address, phone, hours

### Product & Collection Audit
- 27 available products, 3 unavailable
- All 27 products have SEO titles and descriptions
- 27 collections total, 6 empty, 2 missing SEO
- Mar Vista: 3/10 images missing alt text

### Deployment
- Committed and pushed to GitHub (main)
- Deployed to Shopify Oxygen (`npx shopify hydrogen deploy --env production`)

### Infrastructure
- Created `.mcp.json` with Ahrefs, Figma, Shopify, Shopify Dev servers
- Added `REMOVE_BG_API_KEY` to `.env`
- Updated CLAUDE.md with MCP server notes and Shopify Admin TODOs

---

## 1.0.0 — 2026-02-12

### ModernCre8ve Branding Migration

**Fonts**
- Swapped Tenor Sans / Open Sans → Jost (headings) / Spectral (body)
- Updated `@font-face`, CSS custom properties, and preload links

**Colors**
- Text: `#000000`, subtle: `#777777`
- Footer: black background (`#000000`), white text (`#ffffff`)
- Primary buttons: `#333333` background, `#ffffff` text
- Sale badge: `#d3122a`

**Logo & Favicon**
- Added ModernCre8ve logo (`public/logo.png`, `public/logo-alt.png`)
- Replaced favicon with ModernCre8ve favicon

**SEO**
- Title template: `"%s | ModernCre8ve"`
- Default description: "Handcrafted modern furniture made in Cleveland, Ohio"
- Organization schema with ModernCre8ve social links
- Removed all Weaverse demo store references

**Store Info**
- Address: 1400 E 36th Street, Suite 2802A, Cleveland, OH 44114
- Email: info@moderncre8ve.com
- Phone: (216) 502-0755
- Social: Instagram + Facebook (@moderncre8ve)
- Copyright: "2026 ModernCre8ve"

**Environment**
- Fixed checkout domain: `moderncre8ve.myshopify.com` (was `www.weaverse.dev`)
- Generated secure `SESSION_SECRET` (was `"foobar"`)

**SEO Redirects**
- Generated `redirects-for-shopify.csv` (77 redirects) for Shopify Admin bulk import

---

# @weaverse/pilot (upstream)

## 5.1.8

### Patch Changes

- Updated dependencies
  - @weaverse/hydrogen@5.3.1

## 5.1.7

### Patch Changes

- Updated dependencies
  - @weaverse/hydrogen@5.3.0

## 5.1.6

### Patch Changes

- Updated dependencies
  - @weaverse/hydrogen@5.2.5

## 5.1.5

### Patch Changes

- Updated dependencies [43f3da3]
  - @weaverse/hydrogen@5.2.4

## 5.1.4

### Patch Changes

- @weaverse/hydrogen@5.2.3

## 5.1.3

### Patch Changes

- Updated dependencies
  - @weaverse/hydrogen@5.2.2

## 5.1.2

### Patch Changes

- Updated dependencies
  - @weaverse/hydrogen@5.2.1

## 5.1.1

### Patch Changes

- Updated dependencies
  - @weaverse/hydrogen@5.2.0
  - @weaverse/schema@0.4.0

## 5.0.0

### Patch Changes

- Updated dependencies
- Updated dependencies
- Updated dependencies [7164bdb]
  - @weaverse/hydrogen@5.0.0

## 5.0.0-next.1

### Patch Changes

- Updated dependencies
  - @weaverse/hydrogen@5.0.0-next.1

## 3.5.6-next.0

### Patch Changes

- Updated dependencies
  - @weaverse/hydrogen@5.0.0-next.0

## 3.5.3

### Patch Changes

- Updated dependencies
  - @weaverse/hydrogen@4.2.1

## 3.5.3

### Patch Changes

- Updated dependencies
  - @weaverse/hydrogen@4.2.0
