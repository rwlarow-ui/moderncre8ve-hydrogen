# ModernCre8ve Launch Guide

## Migration Status

| Phase | Description | Status |
|-------|-------------|--------|
| 1 | Foundation (branding, SEO, redirects, MCP) | **Done** |
| 2 | Content migration (presets, audit, remove.bg, extraction) | **Done** |
| 3 | Page building (11 pages + 2 templates) | **Done** |
| 4 | Shopify Admin cleanup (images, redirects, collections, SEO) | **Done** |
| 5 | Launch (domain, DNS, go-live) | **Pending** |

### What's live now

- **Oxygen preview:** https://moderncre8ve-v2-6aebe5cb62e16d9300dd.o2.myshopify.dev
- **Repo:** github.com/rwlarow-ui/moderncre8ve-hydrogen (branch: `main`)
- **Shopify CLI:** Authenticated and linked to Moderncre8ve v2
- **Environment:** Synced from Oxygen via `shopify hydrogen env pull`

### What's been done

- 26 active + 3 draft products with SEO titles/descriptions
- 27 background-removed product images uploaded
- 88 SEO redirects imported via Admin API
- 13 Weaverse page JSONs rendering via local fallback
- FurnitureStore structured data + article schema
- Shopify CLI 3.91.0 integrated, env vars synced from Oxygen

---

## Phase 5 Launch Checklist

### Pre-Launch Verification

- [ ] Visit Oxygen URL and spot-check all pages:
  - [ ] Homepage — slideshow, featured products, collection grid
  - [ ] About Us, Contact, FAQ, Custom Orders
  - [ ] Our Materials, Assembly & Care, Shipping Policy, Order Policies
  - [ ] Press, Reviews
  - [ ] Product pages (pick 3–5 products)
  - [ ] Collection pages (pick 3–5 collections)
  - [ ] Cart and checkout flow
- [ ] Verify SEO redirects work (spot-check 5–10 from `redirects-for-shopify.csv`)
- [ ] Confirm structured data in Google Rich Results Test
- [ ] Check mobile responsiveness on phone/tablet

### Domain Assignment

1. Go to **Shopify Admin > Settings > Domains**:
   https://admin.shopify.com/store/moderncre8ve/settings/domains

2. If `moderncre8ve.com` is already connected to the store (for the old Liquid theme), reassign it to the **Hydrogen** storefront

3. Alternatively, go to **Hydrogen settings**:
   https://admin.shopify.com/store/moderncre8ve/hydrogen/1000097972
   and look for the custom domain section

### DNS Configuration

If the domain is managed by an **external registrar** (GoDaddy, Namecheap, Cloudflare, etc.), set these records:

| Type | Name | Value |
|------|------|-------|
| `A` | `@` | `23.227.38.65` |
| `CNAME` | `www` | `shops.myshopify.com` |

If the domain was **purchased through Shopify**, DNS is automatic — only domain assignment (above) is needed.

**DNS propagation** typically takes 5–30 minutes but can take up to 48 hours.

### Post-Launch

- [ ] Verify `moderncre8ve.com` serves the Hydrogen storefront
- [ ] Verify `www.moderncre8ve.com` redirects properly
- [ ] Verify SSL certificate is active (HTTPS)
- [ ] Spot-check 5–10 SEO redirects on the live domain
- [ ] Remove password protection from old storefront (if applicable)
- [ ] Submit updated sitemap to Google Search Console
- [ ] Monitor GSC for crawl errors over the next 7 days
- [ ] Check for stale AMP index entries (`amp.moderncre8ve.com` will stop serving after DNS cutover)
- [ ] Run SEO Truth Layer pipeline after 1 week to compare pre/post metrics

---

## Important Notes

- **This is irreversible** — once DNS points to Oxygen, visitors see the Hydrogen site immediately
- **Old theme** stays in Shopify Admin but will no longer be served
- **Redirects** (88 total) are handled by Shopify, not the Hydrogen app — they work regardless of which storefront is active
- **Customer accounts**, checkout, and order management are unaffected — they're handled by Shopify core
