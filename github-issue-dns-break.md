# P0: Site down — DNS not resolving after Cloudflare setup

## Bug: Site showing grey screen / "(section background)" text

**Severity:** P0 — production site is down
**Detected:** 2026-03-15
**URL:** https://moderncre8ve.com

### Symptoms

- Homepage shows a grey screen with "(section background)" text visible
- Page hangs indefinitely (never finishes loading)
- Browser tab title eventually shows "Home | ModernCre8ve" but content never renders

### Root Cause

Cloudflare was added as DNS proxy for moderncre8ve.com, but nameserver propagation is incomplete. The domain registrar has not yet been updated (or changes haven't propagated) to Cloudflare's assigned nameservers.

This causes DNS resolution to enter a limbo state where requests partially route but never complete.

### Resolution Checklist

- [ ] Update nameservers at registrar to Cloudflare-assigned NS values
- [ ] Verify Cloudflare DNS records: CNAME `@` → `shops.myshopify.com` + CNAME `www` → `shops.myshopify.com`
- [ ] Set Cloudflare SSL/TLS to **Full** (not Strict or Flexible)
- [ ] Verify `moderncre8ve.com` as custom domain in Shopify Admin → Settings → Domains
- [ ] Wait for NS propagation (up to 48h, usually under 1h)
- [ ] Test homepage, product pages, and collections all render

### Notes

- No code changes caused this — git history shows only hero images and SEO data since last working deploy
- "(section background)" text is from `background-image.tsx` alt text, visible when CSS/images fail to load
- Oxygen deployment is healthy; issue is purely DNS routing through Cloudflare
- Related to Phase 5 (DNS cutover) from CLAUDE.md
