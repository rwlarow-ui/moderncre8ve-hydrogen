# ModernCre8ve Hydrogen Storefront

## Migration Status: Phase 4 — Complete | Phase 5 — Launch (Pending)

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

**Remaining:** All 13 JSON files need to be imported into Weaverse Studio. Images to be assigned in Studio.

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
