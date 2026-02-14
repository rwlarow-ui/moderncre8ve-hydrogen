# ModernCre8ve Hydrogen Storefront

## Migration Status: Phase 3 — Page Building (In Progress)

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
- [ ] Homepage — Slideshow, Highlights, Featured Products, Collection List, Image with Text, Video, Testimonials, Newsletter
- [ ] About Us (`/pages/about-us`) — Hero, Story, YouTube video, Philosophy, Team (3 members), Charities
- [ ] Contact (`/pages/contact`) — Hero, Map (Cleveland showroom), Custom Piece CTA, Shipping CTA
- [ ] FAQ (`/pages/faq`) — Hero, 4 accordion groups (16 Q&A items total)

**Supporting Pages**
- [ ] Custom Orders (`/pages/custom-furniture-crafted-to-perfection`) — 4-step process
- [ ] Our Materials (`/pages/our-materials`) — Walnut, White Oak, Hard Maple, Cherry
- [ ] Assembly & Care (`/pages/assembly-care`) — Assembly instructions, care guidelines
- [ ] Shipping Policy (`/pages/shipping-policy-and-customer-responsibilities`) — Full shipping policy
- [ ] Order Policies (`/pages/ordering-policies`) — Payment, guarantee, cancellations, damages
- [ ] Press (`/pages/mid-century-modern-press-coverage`) — 9 press mentions (HGTV, Domino, etc.)
- [ ] Reviews (`/pages/reviews`) — Customer testimonials, value props

**Templates**
- [ ] Default Product — Main Product + Related Products
- [ ] Default Collection — Collection Filters + cross-sell

### Phase 4 TODO — Shopify Admin Cleanup
- [ ] Upload 27 background-removed product images to Shopify
- [ ] Import SEO redirects CSV (77 redirects)
- [ ] Fix Mar Vista image alt text (3/10 missing)
- [ ] Handle 3 unavailable products (restock, draft, or remove)
- [ ] Delete or populate 6 empty collections
- [ ] Fix SEO on 2 collections (Collections-All, Edit these 2025)

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
