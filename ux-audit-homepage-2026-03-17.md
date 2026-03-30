# UX Audit: moderncre8ve.com Homepage

**Date:** March 17, 2026
**Auditor:** Claude (design critique + WCAG 2.1 AA accessibility review)
**Page:** https://moderncre8ve.com/

---

## Overall Impression

The homepage does a good job communicating ModernCre8ve's core value proposition — handcrafted, made-to-order furniture with an artisan sensibility. The visual hierarchy is generally strong, and the content is well-written. However, there are meaningful accessibility gaps, some structural HTML issues, and a few usability patterns that could be improved to better serve all visitors and strengthen conversion.

---

## Usability

| # | Finding | Severity | Recommendation |
|---|---------|----------|----------------|
| 1 | **No H1 heading on the page.** The first heading is an `<h3>`, followed by `<h2>`s. Screen readers and SEO crawlers expect exactly one `<h1>` as the primary page title. | 🔴 Critical | Add a single `<h1>` as the first heading (e.g., the hero tagline "Made by Hand, Worth the Wait") and ensure subsequent headings follow a logical h2 → h3 hierarchy. |
| 2 | **"Example Product Title" placeholder visible.** At least one product card displays template/demo text instead of a real product name. | 🔴 Critical | Replace all placeholder content with real product data or remove the card entirely. This erodes trust. |
| 3 | **Page never reaches browser idle state.** The page's scripts prevent `document_idle` from firing, which caused repeated screenshot failures in automated tooling. This signals heavy JS execution that likely impacts Core Web Vitals (LCP, TBT). | 🔴 Critical | Audit third-party scripts (GTM, analytics, any chat widgets) and defer non-essential JS. Consider lazy-loading below-fold sections and reducing the React hydration payload. |
| 4 | **Generic CTA text.** Buttons like "View details," "EXPLORE NOW," and "Shop Collections" appear repeatedly without specificity about what collection or product the user will see. | 🟡 Moderate | Make CTAs descriptive: "Shop Scandinavian Collection," "View The Mansfield Bed Frame," etc. This helps both usability and screen reader navigation. |
| 5 | **No visible customer reviews or testimonials on the homepage.** For a $2,000–$3,500 average order, social proof is essential. | 🟡 Moderate | Add a reviews/testimonials section above the fold or near featured products. Even 2–3 curated quotes with names would significantly boost trust. |
| 6 | **Newsletter form labeled "Website" with a "Send" button.** The form purpose is ambiguous — is it email signup or a contact form? The label "Website" suggests a honeypot field is displaying instead of the email input label. | 🟡 Moderate | Audit the newsletter form markup. Ensure the visible label says "Email address" (not "Website"), and change the button to "Subscribe" or "Join Our List." |

---

## Visual Hierarchy

**What draws the eye first:** The hero slideshow with "Made by Hand, Worth the Wait" — this is correct and effective for establishing the brand promise.

**Reading flow:** Hero → featured collections grid → "Handmade... Nuff Said" statement → Shop the Look section → featured products (Mansfield, Mar Vista, Seymour) → footer. The flow is logical but long — the page packs a lot of content before reaching shoppable products.

**Emphasis concern:** The featured products (The Mansfield, Mar Vista, Seymour) appear quite far down the page. Users who want to browse and buy may scroll past multiple brand-story sections before seeing anything they can add to cart. Consider surfacing 2–3 bestsellers higher.

---

## Accessibility (WCAG 2.1 AA)

### Perceivable

| # | Issue | WCAG Criterion | Severity | Recommendation |
|---|-------|---------------|----------|----------------|
| 1 | Multiple product images use `alt=""` (empty alt) or lack descriptive alt text entirely. | 1.1.1 Non-text Content | 🔴 Critical | Add descriptive alt text to all product images (e.g., "The Mansfield minimalist walnut bed frame in a modern bedroom"). Reserve `alt=""` only for truly decorative images. |
| 2 | Color contrast needs verification: `#524B46` text on `#FFFFFF` background (~5.8:1 passes), but footer text `#24211E` on `#EBE8E5` may fall below 4.5:1 for smaller text. | 1.4.3 Contrast (Minimum) | 🟡 Major | Run a contrast check on all text/background combinations, especially in the footer and over image overlays. Ensure all body text meets 4.5:1 and large text meets 3:1. |

### Operable

| # | Issue | WCAG Criterion | Severity | Recommendation |
|---|-------|---------------|----------|----------------|
| 3 | Skip-to-content link exists (`<a href="#mainContent">`) but may not be visually revealed on focus. | 2.4.1 Bypass Blocks | 🟡 Major | Verify the skip link becomes visible when focused via keyboard. Add CSS like `:focus { position: static; ... }` if it's permanently hidden. |
| 4 | No visible `:focus` or `:focus-visible` styles detected in CSS. Keyboard users can't see where they are on the page. | 2.4.7 Focus Visible | 🔴 Critical | Add clear focus indicators (outline or ring) to all interactive elements: links, buttons, form inputs, and nav items. |
| 5 | Navigation requires hover to reveal dropdown submenus (Collections, Furniture). Keyboard-only and touch users may not be able to access them. | 2.1.1 Keyboard | 🟡 Major | Ensure dropdown menus open on Enter/Space and are navigable with arrow keys. Test with keyboard-only navigation. |

### Understandable

| # | Issue | WCAG Criterion | Severity | Recommendation |
|---|-------|---------------|----------|----------------|
| 6 | Newsletter form input lacks a visible `<label>` element. Placeholder text alone is not sufficient. | 3.3.2 Labels or Instructions | 🟡 Major | Add a proper `<label>` element associated with the email input via `for`/`id` pairing. |
| 7 | `<html>` tag may be missing `lang="en"` attribute. | 3.1.1 Language of Page | 🟡 Major | Add `lang="en"` to the `<html>` element so screen readers use the correct pronunciation engine. |

### Robust

| # | Issue | WCAG Criterion | Severity | Recommendation |
|---|-------|---------------|----------|----------------|
| 8 | Social media links (Instagram, Facebook) have no text content and no `aria-label`. Screen readers announce them as empty links. | 4.1.2 Name, Role, Value | 🔴 Critical | Add `aria-label="Follow us on Instagram"` and `aria-label="Follow us on Facebook"` to each icon link. |
| 9 | Navigation `<nav>` elements lack `aria-label` attributes to distinguish primary nav from footer nav. | 4.1.2 Name, Role, Value | 🟢 Minor | Add `aria-label="Main navigation"` and `aria-label="Footer navigation"` to differentiate landmarks. |

---

## Consistency

| Element | Issue | Recommendation |
|---------|-------|----------------|
| Heading levels | Jumps from H3 → H2 → H5 → H2 → H3 with no H1. Inconsistent sizing hierarchy. | Establish a strict H1 → H2 → H3 cascade and stick to it across all sections. |
| CTA button styles | Mix of "Shop Collections," "EXPLORE NOW" (all caps), "View details" (sentence case), "Learn More" (title case). | Standardize on one casing style and one verb pattern for primary vs. secondary CTAs. |
| Product card format | Some cards show price ranges ($2,113.20–$2,899.80), some show flat prices ($299), and at least one shows placeholder text. | Ensure all product cards follow the same template: image, name, price, material options (if applicable). |

---

## What Works Well

The **brand story is compelling and clearly communicated** — the handcrafted, made-to-order positioning comes through in copy like "Made by Hand, Worth the Wait" and "Every piece handcrafted to order." The **contact information is easy to find** in the footer with address, phone, email, and hours. The **collection taxonomy** (Scandinavian, Mid Century Modern, Japandi) is well-organized and speaks directly to the target audience. And the **structured data** (JSON-LD with Organization and FurnitureStore types) is a strong SEO foundation.

---

## Priority Recommendations

### 1. Fix critical accessibility gaps (Impact: High, Effort: Low)
Add a proper `<h1>`, add `aria-label` to icon links and nav elements, add `lang="en"` to `<html>`, and ensure all images have meaningful alt text. These are quick fixes that dramatically improve screen reader usability and SEO.

### 2. Add visible keyboard focus styles (Impact: High, Effort: Low)
Implement `:focus-visible` outlines on all interactive elements. Without this, keyboard-only users (including many power users and assistive tech users) literally cannot navigate the site.

### 3. Address page performance / idle-state issue (Impact: High, Effort: Medium)
The page never reaches idle, which signals heavy JS execution. Audit all scripts, defer non-critical ones, and lazy-load below-fold content. This affects Core Web Vitals, SEO ranking, and real user experience — especially on mobile.

### 4. Remove placeholder content (Impact: High, Effort: Trivial)
The "Example Product Title" card needs to be replaced or removed immediately. Placeholder content on a production site is a trust-killer.

### 5. Surface products higher and add social proof (Impact: Medium, Effort: Medium)
Move 2–3 bestselling products higher on the page (above or alongside the brand story sections). Add a short testimonials section. For average orders in the $2K–$3K range, buyers need reassurance before they'll scroll deep.

### 6. Improve CTA specificity and form labeling (Impact: Medium, Effort: Low)
Replace generic "View details" and "EXPLORE NOW" with descriptive, contextual labels. Fix the newsletter form to show a proper email label and "Subscribe" button.
