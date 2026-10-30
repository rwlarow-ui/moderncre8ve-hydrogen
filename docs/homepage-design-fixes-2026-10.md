# Homepage design fixes: engineering spec

**Date:** 2026-10-30 · **Owner:** Rob LaRow · **Status:** Proposed
**Source:** design critique of the live site, 2026-10-30. Checked at 1440×900 and 375×812 on `/` and `/products/bossa-nova-modern-dining-table-small-handmade-ohio`.
**Scope:** the critique's top three recommendations. Other findings, such as heading case, contrast and the currency selector, are listed under [Out of scope](#out-of-scope) so they don't get lost.

| # | Fix | Where the change lives | Effort |
|---|---|---|---|
| 1 | Featured products: fill the row and hide the arrows when there is nothing to scroll | Shopify Admin (collection) + `app/sections/featured-products/product-items.tsx` | S |
| 2 | Footer: add Help links and remove the duplicate newsletter form | Shopify Admin (menu) + `app/page-builder/pages/homepage.ts` + theme settings | S |
| 3 | Hero and highlights: one-column hero with a gradient behind the text; smaller badge headings with body copy | `app/sections/slideshow/slide.tsx`, `app/components/overlay.tsx`, `app/sections/highlights/badge.tsx`, `homepage.ts` | M |

Fixes 1 and 2 are mostly **store data**, so their Admin steps can ship today with no deploy. The code parts and fix 3 go through a normal PR.

---

## 1. Featured products: "Designs Worth the Wait"

### What users see
At desktop size the carousel shows **one** product (The Santa Monica) in a row built for four. The other three slots are empty, and a "next" arrow under them does nothing.

### Root cause
- **Data.** `home-featured-items` (`app/page-builder/pages/homepage.ts:212`) loads the `best-sellers` collection with `productsToShow: 8`, `slidesPerView: 4`. The collection has 8 products, but **7 are DRAFT** (checked through the Admin API on 2026-10-30). The Storefront API returns only products that are active **and** published to the storefront's sales channel:

  | Product | Status |
  |---|---|
  | The Santa Monica: Mid-Century Modern Extendable Dining Table | ACTIVE |
  | The Mansfield | DRAFT |
  | The Mar Vista, Scandinavian Oval Dining Table | DRAFT |
  | The Seymour - Modern Dining Chair | DRAFT |
  | The Bosco: Walnut Mid Century Modern Bed | DRAFT |
  | The Santa Monica Extension Table | DRAFT |
  | Mid-Century Modern Walnut Nightstand | DRAFT |
  | Wookie Modern Wood Bed Frame | DRAFT |

  The "Shop All" button and the main menu's *Furniture → Best Sellers* both point at the same collection, so `/collections/best-sellers` has the same problem.
- **Code.** The homepage uses `layout: "carousel"`, which renders the same Swiper (`product-items.tsx:268–345`) at every width. Its `breakpoints` set 1 slide per view under 640px, 2 from 640px, 3 from 768px and 4 from 1024px (lines 286–298). The prev/next buttons below it are always rendered. When everything fits, Swiper sets `isBeginning` and `isEnd` to true, so both buttons show as disabled at 50% opacity instead of being hidden. (The separate mobile Swiper at line ~184 belongs to `layout: "grid"` only.) The buttons are also targeted by the global class selectors `.featured-products-next` / `.featured-products-prev`, so two featured-products sections on the same page would control each other's carousels.

### Change
**Admin (no deploy):**
1. Make sure at least 4 (ideally 8) products in `best-sellers` are **both** `ACTIVE` **and published to the Hydrogen storefront's sales channel**. Do this by publishing the drafts that are ready to sell or by adding other products. Setting a product to `ACTIVE`, or adding it to the collection, does not publish it to the headless channel, and the Storefront API returns only products published there. Check *Product → Publishing* in Admin, or the product's `resourcePublications` in the Admin API. Which products to feature is a merchandising decision for Rob.
2. If drafts are kept in the collection for later, that's fine. Only products published to the storefront channel are counted.

**Code:**
1. Hide the arrows based on what Swiper reports for the current viewport, not a fixed product count, so they hide only when this screen size has nothing to scroll. Swiper's `watchOverflow` is on by default and sets `swiper.isLocked` when all slides fit at the active breakpoint:
   ```tsx
   const [isLocked, setIsLocked] = useState(false);
   const syncLock = (s: SwiperType) => setIsLocked(s.isLocked);
   // <Swiper onSwiper={syncLock} onBreakpoint={syncLock} onResize={syncLock} … >
   // ...
   {!isLocked && (<div className="flex justify-center gap-2">…</div>)}
   ```
   With 2–4 products on a phone or tablet, the arrows stay visible because they still scroll there. At 1440px with ≤ 4 products, they hide. Apply the same lock check to the `grid` layout's mobile Swiper (line ~184).
2. Replace the global class selectors with per-instance element refs, so each section controls only its own carousel. The refs are `null` during the render in which Swiper initializes, so passing `prevRef.current` / `nextRef.current` straight into `navigation` leaves the buttons unbound. Bind them in `onBeforeInit` instead:
   ```tsx
   const prevRef = useRef<HTMLButtonElement>(null);
   const nextRef = useRef<HTMLButtonElement>(null);
   // <Swiper
   //   modules={[Navigation]}
   //   onBeforeInit={(s) => {
   //     if (typeof s.params.navigation === "object") {
   //       s.params.navigation.prevEl = prevRef.current;
   //       s.params.navigation.nextEl = nextRef.current;
   //     }
   //   }}
   // >
   ```
   Keep the buttons always in the DOM (hidden with a `hidden` class when locked, not unmounted) so the refs stay bound across breakpoint changes. If they must be conditionally mounted, use callback refs stored in state, then call `swiper.navigation.destroy(); swiper.navigation.init(); swiper.navigation.update();` when they change.
3. Optional: set Swiper's `centerInsufficientSlides` so a row with fewer products than `slidesPerView` is centered instead of hugging the left edge.

### Acceptance criteria
- [ ] At 1440px wide, the homepage shows ≥ 4 product cards in "Designs Worth the Wait".
- [ ] Each featured product is `ACTIVE` and published to the Hydrogen channel (shown in the Storefront API response, not only in Admin).
- [ ] Arrow visibility follows the viewport. Test by pointing a branch preview at a collection of 3 products: arrows hidden and cards centered at 1440px; arrows visible and working at 375px (1 per view) and 640px (2 per view).
- [ ] With > 4 products, the arrows appear at every width, work, and disable correctly at each end, including after resizing across a breakpoint.
- [ ] Two `featured-products` sections on one page scroll independently, and both sets of arrows work on first load (no unbound buttons).

---

## 2. Footer: Help links and one newsletter form

### What users see
- The footer's only navigation is **Blog** and **Legal**, plus Sitemap in the bottom bar. There is no Shipping, Lead Times, Returns/Guarantee, FAQ, Assembly & Care or Contact link. For $5k furniture with a 12–16 week build, those are the links people look for before they buy.
- The homepage ends with **two newsletter forms in a row**: the "Design Notes" section (*Subscribe*), then the footer's "STAY IN TOUCH" block (*SEND*). They have different copy and different button labels, and both post to the same `/api/customer` endpoint.

### Root cause
- **Menu data.** The footer renders the Shopify menu with handle `footer` (`app/utils/root.server.ts:71` → `FooterMenu`, `app/components/layout/footer.tsx:628`). That menu is titled **"[DRAFT] - Footer - (Blog + Info)"** and has just two flat items (Blog, Legal). Two better menus already exist in Admin but nothing uses them:
  - `footer-quick-links`: Our Guarantee, Shipping Info, Terms of Service, Assembly & Care, Privacy Policy
  - `footer-info`: About Us, Blog, FAQs
- **Rendering.** `FooterMenu` already supports nested menus. Each top-level item becomes a column on desktop (`md:grid-cols-4`) and an accordion on mobile. A flat menu is what makes it look empty.
- **Newsletter.** The footer form is always rendered (`footer.tsx:508`) from theme settings (`theme-schema.server.ts:1284`, default "STAY IN TOUCH" / "Send"). The homepage adds its own `home-newsletter` section (`homepage.ts:452`).

### Change
**Admin (no deploy):** rebuild the `footer` menu as **nested** groups and drop "[DRAFT]" from its title. Every target below returned 200 on the live site on 2026-10-30.

| Column | Items |
|---|---|
| **Shop** | All Furniture `/collections/all-products` · Dining `/collections/dining` · Living `/collections/living` · Bedroom `/collections/bedroom` · Custom Orders `/pages/custom-orders` |
| **Help** | Shipping & Lead Times `/pages/shipping-policy-and-customer-responsibilities` · Ordering & Guarantee `/pages/ordering-policies` · Assembly & Care `/pages/assembly-care` · FAQ `/pages/faq` · Contact `/pages/contact-and-inquiry` |
| **Company** | About Us `/pages/about-us` · Our Materials `/pages/our-materials` · Reviews `/pages/reviews` · Trade `/pages/trade-1` · Blog `/blogs/mid-century-modern-scandi-japandi-design-blog` |
| **Legal** | Privacy Policy `/policies/privacy-policy` · Terms of Service `/policies/terms-of-service` |

Use `/policies/*` for the legal links, not the `/pages/terms-of-service` / `/pages/privacy-policy` copies that `footer-quick-links` points at, so the footer has one canonical URL per policy. Once the new menu is live, `footer-quick-links` and `footer-info` can be deleted.

**Code (one newsletter form per page):**
1. Remove the `home-newsletter` section from `homepage.ts`, both the child reference at line 32 and the four section items from line 452 on. The footer form then becomes the only one on every page, including the homepage.
2. Change the theme-setting defaults in `theme-schema.server.ts` to the stronger homepage copy, so the remaining form reads the same everywhere:
   - `newsletterTitle`: `Design Notes`
   - `newsletterDescription`: `New designs, material deep-dives, and studio updates — no spam, just substance.`
   - `newsletterPlaceholder`: `Enter your email`
   - `newsletterButtonText`: `Subscribe`
3. Check that nothing else uses the `newsletter` section before deleting it: `grep -rn '"newsletter"' app/page-builder/pages`. Keep the section component itself, since other compositions may add it later.

> Alternative considered: keep the homepage section and hide the footer form only on `/`. Rejected because it needs a route-aware footer for one page, and every other page already relies on the footer form.

### Acceptance criteria
- [ ] Desktop footer shows four labelled columns (Shop, Help, Company, Legal). On mobile they collapse into accordions.
- [ ] Every footer link returns 200 (`curl -s -o /dev/null -w '%{http_code}'`).
- [ ] Each page shows exactly one email signup form. The homepage's last section before the footer is "From Sketch to Sawdust".
- [ ] Footer signup still creates a customer through `/api/customer` (submit a test address on the branch preview, check Shopify Admin → Customers, then delete the test customer).

---

## 3. Hero and highlights hierarchy

### What users see
- **Desktop hero:** the headline sits in the left half, the subheading ("Furniture for People Who Notice") is small *under* the headline, and the paragraph + button float in the right half over the busiest part of the photo (the lamp and the wall art). The reader has to go headline → subheading → jump right to the paragraph. The headline is centered, the subheading is left-aligned.
- **Mobile hero:** the H1 wraps to four lines at 55px, which pushes the button to the bottom of the screen. The paragraph sits on dark wood grain and is hard to read.
- **Highlights strip ("Designed, Not Decorated" …):** headings render at roughly 48px, larger than the section titles that follow, and **no body copy appears**, so the strip reads as three big slogans.

### Root cause
- **Slide layout** (`app/sections/slideshow/slide.tsx:174–235`): a hard-coded `lg:flex-row` with a "Left Column: Heading + Subheading" and a "Right Column: Description + CTA". The subheading is rendered after the heading and defaults to `text-left` (line 157), while the heading defaults to `center`.
- **Overlay** (`app/components/overlay.tsx:37`): one flat color at `overlayOpacity` (40% on all three slides). It darkens the whole photo evenly instead of where the text sits.
- **Badge** (`app/sections/highlights/badge.tsx`): this is a bug. Each badge in `homepage.ts` has a `content` field (for example "Every detail is intentional — from the grain direction to the joint…"), but `HighlightsBadge` never reads it. `content` ends up in `...rest` (line 42) and is spread onto the wrapper `<div>` (line 170) as a stray HTML `content="…"` attribute. The heading uses `size="default"` and the badge sets no tag, so it inherits global heading styles.

### Change
**`slide.tsx`: one-column, eyebrow-first layout**
1. Replace the two-column wrapper with a single column, bottom-left aligned at all widths, capped around `max-w-2xl`:
   - **subheading** (rendered first as an eyebrow: `text-sm uppercase tracking-widest`)
   - **heading**
   - **paragraph**
   - **button**
2. Make alignment one setting for the whole block (`contentAlignment: "left" | "center"`, default `left`) instead of separate heading and subheading alignments. Keep the old props readable for one release so existing data doesn't break, and ignore them.
3. Cap the heading size so the H1 fits in 2–3 lines on a 375px screen. Use the existing `size: "custom"` path with `mobileSize` about 36px and `desktopSize` about 56px for the three home slides. Avoid a global change to `h1`.

**`overlay.tsx`: gradient option**
1. Add `overlayStyle: "solid" | "gradient"` (default `solid`, so other sections don't change).
2. For `gradient`, render `linear-gradient(to top, rgb(0 0 0 / 0.65) 0%, rgb(0 0 0 / 0.35) 40%, transparent 70%)`, multiplied by `overlayOpacity / 100`, behind the content.
3. In `homepage.ts`, set `overlayStyle: "gradient"` on `home-slide-1..3`. The existing `text-shadow` can stay as a fallback.

**`badge.tsx`: render the body copy and step the heading down**
1. Add `content?: string` to `HighlightsBadgeProps` and destructure it, so it is no longer spread onto the DOM.
2. Render it under the heading as a `<p>` in the body font at `text-base`, `max-w-xs`, centered, color `badgeTextColor` at about 80% opacity.
3. Add a `textarea` input `content` to the schema's "Heading" group (or a new "Content" group) so it can be edited.
4. Default the badge heading to `h3` and a custom size of about 24px mobile / 28px desktop, so it sits below the section titles (`Designs Worth the Wait` etc.) in the hierarchy.
5. In `homepage.ts`, set `headingTagName: "h3"` on `home-badge-1..3` explicitly. The `content` copy is already there.

### Acceptance criteria
- [ ] Desktop hero, all three slides: eyebrow → headline → paragraph → button in one column, all with the same alignment, none of it over the lamp or wall art in slide 1.
- [ ] Mobile hero (375×812): H1 ≤ 3 lines, button fully visible without scrolling.
- [ ] Hero paragraph on the gradient measures ≥ 4.5:1 contrast at its darkest-photo point (check in DevTools at mobile and desktop sizes).
- [ ] Highlights: each badge shows icon, a heading of about 24–28px and its body copy. The badge headings are visibly smaller than "Designs Worth the Wait".
- [ ] No `content` attribute on the badge wrapper `<div>` in the rendered HTML.
- [ ] Other compositions that use `slideshow-slide` or `highlights-badge` look unchanged, or better. Check with `grep -rln 'slideshow-slide\|highlights-badge' app/page-builder/pages`.

---

## Rollout

1. **Admin first:** fill `best-sellers` and rebuild the `footer` menu. These take effect immediately with no deploy. Recheck the homepage afterwards.
2. **One PR per fix** (`fix/featured-products-arrows`, `fix/footer-newsletter`, `feat/hero-one-column`) so each Oxygen preview can be reviewed on its own. Pushing any branch builds a preview environment.
3. For each PR: `npm run typecheck`, `npm run build`, `npm run biome:fix`. Take screenshots at 1440×900 and 375×812 on the preview (the `run-my-hydrogen-storefront` skill can capture them) and attach them to the PR.
4. After merging to `main`: `curl -sI https://moderncre8ve.com/` stays 200 with `powered-by: … Hydrogen`, then do a visual check of `/`.
5. Add a line per fix to `CHANGELOG.md` and bump the patch version in `package.json`.

## Out of scope

These came up in the same critique but are not part of fixes 1–3. Candidates for `docs/tech-debt-2026-10.md`:

- **Blank page if scripts fail.** `<body>` starts at `opacity: 0` and becomes visible only after the client JS adds `opacity-100!`. A headless capture with Shopify's CDN blocked showed a fully blank page. Make the page visible by default or set opacity in an inline `<noscript>`-safe way. This may be related to the 2026-10-09 "blank page" report.
- **Announcement bar** is cut off at every width ("Handcrafted to order in Cleveland, Ohi…").
- **"Find Your Style"** intro mentions styles (Mid-century, Scandinavian, Japandi) but the tiles are rooms and furniture types.
- **Heading case:** "WORTH THE WAIT, IN THEIR WORDS" is all caps; other section titles use Title Case. Section intro text and buttons are left-aligned under centered titles.
- **Contrast:** emerald `#2CBF96` on light grey is about 2:1 (the "Customer Reviews" eyebrow) and white on emerald is about 2.3:1 (the "NEW" badge). Both fail WCAG AA.
- **Currency selector** wraps onto two lines ("United States - / USD") in the top bar and the footer.
- **Mobile logo** sits about 19px left of center.
- **Product page:** the Shop Pay button outweighs Add to Cart, the material picker is a text dropdown rather than wood swatches, and the lead time is repeated.
- **Unused menus with a broken link:** `collections` menu has Japandi → `/collections/japandi/Scandi`. Delete it along with `main-menu-demo` if unused.
