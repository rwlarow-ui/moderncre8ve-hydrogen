# ModernCre8ve Hydrogen Storefront

## 1.0.1 — 2026-02-13

### Migration Status Check
- Verified all environment variables configured (13 vars: Storefront API, Weaverse, Customer Account API)
- Verified 25 Weaverse sections available (slideshow, featured products, testimonials, image gallery, etc.)
- Confirmed branding, SEO, and redirect CSV complete

### Remaining Migration Tasks
- Import `redirects-for-shopify.csv` (77 redirects) in Shopify Admin
- Build static pages (Home, About, Contact, FAQ) in Weaverse Studio
- Deploy to Shopify Oxygen
- DNS cutover — assign moderncre8ve.com in Shopify Admin

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
