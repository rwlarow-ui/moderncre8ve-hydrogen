#!/usr/bin/env bash
# =============================================================================
# UX Audit Issues — moderncre8ve.com Homepage (March 17, 2026)
# Run this script from a terminal where `gh` is authenticated.
# Usage:  chmod +x create-ux-audit-issues.sh && ./create-ux-audit-issues.sh
# =============================================================================

set -euo pipefail

REPO="rwlarow-ui/moderncre8ve-hydrogen"

echo "🏷️  Creating labels (skips if they already exist)..."
gh label create "ux-audit"      --repo "$REPO" --color "7B61FF" --description "UX audit finding"            2>/dev/null || true
gh label create "accessibility"  --repo "$REPO" --color "D93F0B" --description "WCAG / a11y issue"          2>/dev/null || true
gh label create "critical"       --repo "$REPO" --color "B60205" --description "Critical severity"          2>/dev/null || true
gh label create "major"          --repo "$REPO" --color "E4A221" --description "Major severity"             2>/dev/null || true
gh label create "moderate"       --repo "$REPO" --color "FBCA04" --description "Moderate severity"          2>/dev/null || true
gh label create "minor"          --repo "$REPO" --color "0E8A16" --description "Minor severity"             2>/dev/null || true
gh label create "performance"    --repo "$REPO" --color "1D76DB" --description "Performance issue"          2>/dev/null || true
gh label create "content"        --repo "$REPO" --color "C5DEF5" --description "Content / copy issue"       2>/dev/null || true
echo "✅ Labels ready."
echo ""

# ---------------------------------------------------------------------------
# CRITICAL issues
# ---------------------------------------------------------------------------

echo "📝 Creating issues..."

gh issue create --repo "$REPO" \
  --title "A11y: Add H1 heading and fix heading hierarchy" \
  --label "ux-audit,accessibility,critical" \
  --body "$(cat <<'EOF'
## UX Audit Finding — Critical

**Category:** Usability + Accessibility
**WCAG:** 1.3.1 Info and Relationships, 2.4.6 Headings and Labels

### Problem
The homepage has no `<h1>` heading. The first heading is an `<h3>` ("Furniture for Furniture Fanatics"), followed by `<h2>`s, then an `<h5>`. Screen readers and SEO crawlers expect exactly one `<h1>` as the primary page title.

### Impact
- Screen reader users can't orient themselves on the page
- SEO crawlers can't determine the primary topic
- Heading hierarchy is confusing for assistive tech navigation

### Recommendation
1. Add a single `<h1>` as the first heading (e.g., the hero tagline "Made by Hand, Worth the Wait")
2. Ensure all subsequent headings follow a logical `h2` → `h3` cascade
3. Remove the `<h5>` ("Handmade... Nuff Said") and promote/demote to fit the hierarchy

### Files likely affected
- `app/sections/` — hero and content section components
- Weaverse section schemas that define heading levels
EOF
)"

gh issue create --repo "$REPO" \
  --title "A11y: Add aria-labels to social media icon links" \
  --label "ux-audit,accessibility,critical" \
  --body "$(cat <<'EOF'
## UX Audit Finding — Critical

**Category:** Accessibility
**WCAG:** 4.1.2 Name, Role, Value

### Problem
Social media links (Instagram, Facebook) in the footer have no text content and no `aria-label`. Screen readers announce them as empty or unlabeled links.

```html
<!-- Current -->
<a href="https://www.instagram.com/moderncre8ve"></a>
<a href="https://www.facebook.com/Moderncre8ve"></a>
```

### Recommendation
```html
<a href="https://www.instagram.com/moderncre8ve" aria-label="Follow us on Instagram">...</a>
<a href="https://www.facebook.com/Moderncre8ve" aria-label="Follow us on Facebook">...</a>
```

### Files likely affected
- Footer component in `app/sections/` or `app/components/layout/`
EOF
)"

gh issue create --repo "$REPO" \
  --title "A11y: Add visible keyboard focus styles to all interactive elements" \
  --label "ux-audit,accessibility,critical" \
  --body "$(cat <<'EOF'
## UX Audit Finding — Critical

**Category:** Accessibility
**WCAG:** 2.4.7 Focus Visible

### Problem
No visible `:focus` or `:focus-visible` styles were detected. Keyboard-only users cannot see which element is currently focused, making the site effectively unusable without a mouse.

### Impact
Affects all keyboard users, including power users using Tab navigation and assistive technology users.

### Recommendation
Add clear focus indicators to all interactive elements (links, buttons, form inputs, nav items):

```css
:focus-visible {
  outline: 2px solid #2CBF96; /* Emerald Green accent */
  outline-offset: 2px;
}
```

### Files likely affected
- `app/styles/app.css`
- `app/weaverse/style.tsx`
EOF
)"

gh issue create --repo "$REPO" \
  --title "A11y: Add descriptive alt text to all product images" \
  --label "ux-audit,accessibility,critical" \
  --body "$(cat <<'EOF'
## UX Audit Finding — Critical

**Category:** Accessibility
**WCAG:** 1.1.1 Non-text Content

### Problem
Multiple product and collection images use `alt=""` (empty alt) or lack descriptive alt text. Empty alt tells screen readers to skip the image entirely, which means visually impaired users miss key product information.

### Good examples already on the site
- `alt="Modern Walnut Bed Frame - Sleek Design for a Modern Bedroom"`
- `alt="The Mansfield Moderncre8ve Minimalist Bed Frame"`

### Recommendation
1. Audit all `<img>` tags on the homepage
2. Add descriptive alt text to every product/collection image
3. Reserve `alt=""` only for truly decorative images (borders, spacers)
4. Use format: "[Product Name] — [key visual detail]"

### Files likely affected
- Product card components in `app/sections/` and `app/components/`
- Weaverse section schemas for image sections
- Shopify product data (alt text can be set in Shopify Admin too)
EOF
)"

gh issue create --repo "$REPO" \
  --title "Perf: Page never reaches idle state — audit JS payload" \
  --label "ux-audit,performance,critical" \
  --body "$(cat <<'EOF'
## UX Audit Finding — Critical

**Category:** Performance
**Metric:** Core Web Vitals (LCP, TBT, TTI)

### Problem
The homepage never reaches the browser's `document_idle` state. Automated tooling repeatedly failed to capture screenshots after 8+ seconds of waiting. This signals heavy, persistent JS execution that likely impacts:
- **Largest Contentful Paint (LCP)**
- **Total Blocking Time (TBT)**
- **Time to Interactive (TTI)**

### Likely causes
- React Router manifest + multiple JS bundles loading sequentially
- Google Tag Manager (`G-R1KFYYKE48`) executing inline
- Possible chat widget or third-party scripts
- Full React hydration of below-fold content

### Recommendation
1. Run Lighthouse / PageSpeed Insights and record baseline scores
2. Audit all third-party scripts — defer non-critical ones
3. Lazy-load below-fold sections (collections grid, featured products)
4. Consider partial hydration or islands architecture for static sections
5. Check if any scripts are polling or running intervals that prevent idle

### Files likely affected
- `app/root.tsx` — script loading order
- `app/entry.client.tsx` — hydration strategy
- GTM integration code
EOF
)"

gh issue create --repo "$REPO" \
  --title "Content: Remove 'Example Product Title' placeholder from production" \
  --label "ux-audit,content,critical" \
  --body "$(cat <<'EOF'
## UX Audit Finding — Critical

**Category:** Content
**Severity:** Critical (trust issue)

### Problem
At least one product card on the homepage displays "Example Product Title" — this is template/demo text that was never replaced with real product data.

### Impact
Placeholder content on a production site immediately erodes visitor trust, especially for a store selling $2K–$3K furniture.

### Recommendation
1. Identify the source: is this a Weaverse fallback JSON, a Shopify draft product, or a hardcoded schema default?
2. Replace with a real product or remove the card entirely
3. Audit other pages for similar placeholder content

### Files likely affected
- `weaverse-pages/` fallback JSONs
- Weaverse Studio saved page data
- Possibly a draft product in Shopify Admin
EOF
)"

# ---------------------------------------------------------------------------
# MAJOR issues
# ---------------------------------------------------------------------------

gh issue create --repo "$REPO" \
  --title "A11y: Ensure dropdown nav is keyboard-accessible" \
  --label "ux-audit,accessibility,major" \
  --body "$(cat <<'EOF'
## UX Audit Finding — Major

**Category:** Accessibility
**WCAG:** 2.1.1 Keyboard

### Problem
Navigation dropdowns (Collections, Furniture) appear to require hover to reveal submenus. Keyboard-only and touch users may not be able to access subcategory links.

### Recommendation
1. Ensure dropdowns open on `Enter`/`Space` key press
2. Allow arrow key navigation within the dropdown
3. Close on `Escape`
4. Test the full nav flow using only keyboard (Tab → Enter → Arrow → Escape)

### Files likely affected
- Navigation/header component in `app/components/layout/`
EOF
)"

gh issue create --repo "$REPO" \
  --title "A11y: Verify skip-to-content link is visible on focus" \
  --label "ux-audit,accessibility,major" \
  --body "$(cat <<'EOF'
## UX Audit Finding — Major

**Category:** Accessibility
**WCAG:** 2.4.1 Bypass Blocks

### Problem
A skip-to-content link (`<a href="#mainContent">`) exists, which is great. However, it may be permanently hidden (not revealed on keyboard focus), which defeats its purpose.

### Recommendation
Ensure the skip link becomes visible when focused:

```css
.skip-to-content {
  position: absolute;
  left: -9999px;
}
.skip-to-content:focus {
  position: static;
  display: block;
  padding: 1rem;
  background: #323640;
  color: #F2EBD5;
  text-align: center;
  z-index: 9999;
}
```
EOF
)"

gh issue create --repo "$REPO" \
  --title "A11y: Add label to newsletter form input" \
  --label "ux-audit,accessibility,major" \
  --body "$(cat <<'EOF'
## UX Audit Finding — Major

**Category:** Accessibility
**WCAG:** 3.3.2 Labels or Instructions

### Problem
The newsletter/email signup form input has no associated `<label>` element. The visible label appears to say "Website" (possibly a honeypot field displaying incorrectly). Placeholder text alone is not a sufficient label for screen readers.

### Recommendation
1. Add a proper `<label for="email-input">Email address</label>` associated via `for`/`id`
2. Verify the "Website" label is actually a hidden honeypot and not displayed to users
3. Change the submit button from "Send" to "Subscribe" for clarity

### Files likely affected
- Footer component or newsletter section in `app/sections/` or `app/components/`
EOF
)"

gh issue create --repo "$REPO" \
  --title "A11y: Add lang attribute to html element" \
  --label "ux-audit,accessibility,major" \
  --body "$(cat <<'EOF'
## UX Audit Finding — Major

**Category:** Accessibility
**WCAG:** 3.1.1 Language of Page

### Problem
The `<html>` element may be missing the `lang="en"` attribute. Without it, screen readers may use the wrong pronunciation engine.

### Recommendation
Ensure `<html lang="en">` is set in the root template.

### Files likely affected
- `app/root.tsx`
EOF
)"

gh issue create --repo "$REPO" \
  --title "A11y: Verify color contrast meets WCAG AA across all sections" \
  --label "ux-audit,accessibility,major" \
  --body "$(cat <<'EOF'
## UX Audit Finding — Major

**Category:** Accessibility
**WCAG:** 1.4.3 Contrast (Minimum)

### Problem
While primary text appears to pass contrast checks, footer text and text over image overlays may fall below the 4.5:1 ratio required for normal text (or 3:1 for large text).

### Recommendation
1. Run a contrast audit on all text/background combinations
2. Pay special attention to: footer text on cream background, text overlaid on hero images, muted/gray text (`#9DA0A7` Cool Gray)
3. Ensure all body text ≥ 4.5:1 and large text ≥ 3:1
EOF
)"

# ---------------------------------------------------------------------------
# MODERATE issues
# ---------------------------------------------------------------------------

gh issue create --repo "$REPO" \
  --title "UX: Replace generic CTAs with descriptive, contextual labels" \
  --label "ux-audit,content,moderate" \
  --body "$(cat <<'EOF'
## UX Audit Finding — Moderate

**Category:** Usability + Content

### Problem
CTAs use generic text: "View details," "EXPLORE NOW," "Shop Collections," "Learn More." These don't tell users what they'll see when they click, and they're inconsistent in casing (ALL CAPS vs sentence case vs title case).

### Recommendation
1. Make CTAs specific: "Shop Scandinavian Collection," "View The Mansfield," etc.
2. Standardize casing — pick one style (sentence case recommended) and use it everywhere
3. Differentiate primary vs secondary CTA styling consistently
EOF
)"

gh issue create --repo "$REPO" \
  --title "UX: Add customer reviews / testimonials to homepage" \
  --label "ux-audit,moderate" \
  --body "$(cat <<'EOF'
## UX Audit Finding — Moderate

**Category:** Usability / Trust

### Problem
No customer reviews or testimonials appear on the homepage. For average orders of $2K–$3.5K with 12–16 week lead times, social proof is critical to conversion.

### Recommendation
1. Add a reviews/testimonials section — ideally above the fold or near featured products
2. Even 2–3 curated quotes with customer names and locations would help
3. Consider integrating a reviews app (Judge.me, Stamped, etc.) for dynamic reviews
EOF
)"

gh issue create --repo "$REPO" \
  --title "UX: Surface shoppable products higher on the page" \
  --label "ux-audit,moderate" \
  --body "$(cat <<'EOF'
## UX Audit Finding — Moderate

**Category:** Usability / Conversion

### Problem
Featured products (The Mansfield, Mar Vista, Seymour) appear far down the page, below multiple brand-story sections. Users who want to browse and buy must scroll through a lot of content before reaching anything they can add to cart.

### Recommendation
Move 2–3 bestselling product cards higher on the page — either interspersed with brand story sections or in a dedicated "Bestsellers" row near the top.
EOF
)"

# ---------------------------------------------------------------------------
# MINOR issues
# ---------------------------------------------------------------------------

gh issue create --repo "$REPO" \
  --title "A11y: Add aria-labels to distinguish nav landmarks" \
  --label "ux-audit,accessibility,minor" \
  --body "$(cat <<'EOF'
## UX Audit Finding — Minor

**Category:** Accessibility
**WCAG:** 4.1.2 Name, Role, Value

### Problem
Multiple `<nav>` elements (header nav, footer nav) lack `aria-label` attributes, making them indistinguishable to screen reader users.

### Recommendation
```html
<nav aria-label="Main navigation">...</nav>
<nav aria-label="Footer navigation">...</nav>
```
EOF
)"

gh issue create --repo "$REPO" \
  --title "UX: Standardize product card format across homepage" \
  --label "ux-audit,content,minor" \
  --body "$(cat <<'EOF'
## UX Audit Finding — Minor

**Category:** Visual Consistency

### Problem
Product cards are inconsistent: some show price ranges ($2,113.20–$2,899.80), some show flat prices ($299), and at least one shows placeholder text. The inconsistency makes the grid look unpolished.

### Recommendation
Ensure all product cards follow the same template: image → name → price (or price range) → material options (if applicable).
EOF
)"

echo ""
echo "✅ All 16 UX audit issues created successfully!"
echo "   View them: gh issue list --repo $REPO --label ux-audit"
