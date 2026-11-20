---
name: analytics-ga4
description: GA4 / Google Analytics reference for the ModernCre8ve storefront — live measurement ID, property, stream, other IDs not to use, Google Cloud project and service account, and how the SEO Truth Layer pipeline runs. Use when touching analytics, PUBLIC_GOOGLE_GTM_ID, custom-analytics.tsx, GA4 reports, or the SEO Truth Layer.
---

# Google Analytics / GTM

- **GA4 Measurement ID (live):** `G-G4Q4Z6MM4B` — the only data stream ("Moderncre8ve", stream 2149185054) of property `251836602`, the property reports and the SEO Truth Layer read. Set via the `PUBLIC_GOOGLE_GTM_ID` env var (the name says GTM, the value is a GA4 measurement ID; there is no GTM container). The **live** value is whatever Oxygen holds, rendered by `app/components/root/custom-analytics.tsx` — there is no ID in the repo. Set on 2026-10-08; confirmed loading on the live site 2026-10-13. `npx shopify hydrogen env list` needs interactive auth. Keep local `.env` in step with Oxygen.
- **GA4 Property:** `251836602`
- **Other IDs** — do not set `PUBLIC_GOOGLE_GTM_ID` to these: `G-R1KFYYKE48` is the Weaverse demo ID (remove everywhere); `G-08LS6GEXG3` is "g4 new", a connected site tag on the stream above and the ID Shopify's Google & YouTube app shows — not the storefront's measurement ID. (Earlier versions of CLAUDE.md had `G-08LS6GEXG3` as live and `G-G4Q4Z6MM4B` as superseded; that was wrong.)
- **Google Cloud Project:** `mindful-quasar-486518-r9`
- **Service Account:** `moderncre8ve-829@mindful-quasar-486518-r9.iam.gserviceaccount.com`
- **SEO Truth Layer:** source is vendored at `seo-truth-layer/`, but the pipeline **runs daily at 14:00 UTC from the separate `github.com/rwlarow-ui/moderncre8ve-seo-truth-layer` repo**. GitHub only executes workflows under the root `.github/workflows/`, so `seo-truth-layer/.github/workflows/seo-pipeline.yml` in this repo never runs. Its secrets (`GA4_PROPERTY_ID`, `GOOGLE_SA_JSON`, `RESEND_API_KEY`, `SITE_URL`) live on that other repo.
