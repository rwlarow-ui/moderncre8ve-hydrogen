# AGENTS.md

This file provides guidance to Codex (Codex.ai/code) when working with code in this repository.

## Project: ModernCre8ve Hydrogen Storefront

Handcrafted modern furniture (mid-century, Scandinavian, Japandi) — moderncre8ve.com rebuild.

- **Store:** moderncre8ve.myshopify.com (26 active + 3 draft products, 16 collections)
- **Template:** Weaverse Aspen (furniture-focused Hydrogen theme)
- **Repo:** github.com/rwlarow-ui/moderncre8ve-hydrogen
- **Deploy target:** Shopify Oxygen
- **Current version:** 1.3.8 (see `CHANGELOG.md` for full history)
- **Status:** Phases 1–4 complete. Phase 5 (launch — DNS cutover to moderncre8ve.com) pending.

### Links
| Resource | URL |
|----------|-----|
| Oxygen (live) | https://moderncre8ve-v2-6aebe5cb62e16d9300dd.o2.myshopify.dev |
| Shopify Admin | https://admin.shopify.com/store/moderncre8ve/hydrogen/1000097972 |
| Weaverse Studio | https://studio.weaverse.io/dashboard/projects/gkv7k7xwkbfez2rdmkbbzxuw |

### Store Knowledge
- **Lead times:** All furniture 12–16 weeks (handcrafted to order). Wax products ship in 3–5 business days.
- **Newsletter:** Uses Shopify Customer API (`/api/customer`). Klaviyo was removed in v1.3.6.
- **Delivery:** White glove in-home delivery with assembly for 95%+ of orders.

### Branding
- **Fonts:** Jost (headings, `--font-sans`) / Spectral (body, `--font-serif`)
- **Logo:** `public/logo.png` (dark), `public/logo-alt.png` (light variant)

#### Color Palette
| Swatch | Hex | Usage |
|--------|-----|-------|
| Dark Charcoal | `#323640` | Primary dark / text |
| Emerald Green | `#2CBF96` | Accent / CTA |
| Warm Cream | `#F2EBD5` | Background / neutral |
| Amber Gold | `#F2AC29` | Highlight / secondary accent |
| Coral Red | `#D35055` | Alert / accent |
| Cool Gray | `#9DA0A7` | Muted / borders |

### Key Files
| File | Purpose |
|------|---------|
| `app/weaverse/schema.server.ts` | Theme settings (colors, fonts, footer, social links) |
| `app/weaverse/style.tsx` | Global CSS driven by theme settings |
| `app/utils/seo.server.ts` | SEO config (title templates, org schema) |
| `app/utils/weaverse-fallback.server.ts` | Page handle → fallback JSON mapping |
| `app/sections/main-product/index.tsx` | Product page template (lead time, variants, ATC) |
| `app/styles/app.css` | Global styles, font-face, CSS custom properties |
| `app/root.tsx` | Root layout, font preloads |

### Admin API Access
- **Token:** `SHOPIFY_ADMIN_API_TOKEN` in `.env` (full admin write scopes)
- **Weaverse Admin Proxy:** `https://weaverse.io/api/admin-graphql` with Bearer token (manages Shopify Admin API calls)
- **App:** "Claude2" in Shopify Dev Dashboard (Client ID: `fd5964839bc3fb47703bafb47d25d3fc`)

### Google Analytics / GTM
- **GTM ID:** `G-R1KFYYKE48` (set via `PUBLIC_GOOGLE_GTM_ID` env var)
- **GA4 Property:** `251836602` / Measurement ID: `G-G4Q4Z6MM4B`
- **Google Cloud Project:** `mindful-quasar-486518-r9`
- **Service Account:** `moderncre8ve-829@mindful-quasar-486518-r9.iam.gserviceaccount.com`
- **SEO Truth Layer:** `github.com/rwlarow-ui/moderncre8ve-seo-truth-layer` (weekly pipeline)

### MCP Servers
Configured in `.mcp.json`: Figma, Shopify (Storefront API), Shopify Dev (docs/schema).
Composer and Crypto.com servers visible in sessions are from another project — irrelevant here.

> **Ahrefs (informational):** The Ahrefs MCP connection was removed (was a stdio server in `.mcp.json`). Historical Ahrefs keyword data (March 2026) still informs SEO copy — see the comment in `app/utils/collection-seo-descriptions.ts` — and `AhrefsBot`/`AhrefsSiteAudit` crawl directives remain in `app/routes/[robots.txt].tsx`. Neither depends on the live MCP connection.

## Development Commands

- `npm run dev` — Dev server on port 3456 with codegen
- `npm run build` — Production build
- `npm run typecheck` — TypeScript type checking
- `npm run codegen` — Regenerate GraphQL types after schema changes
- `npm run biome:fix` — Lint and auto-fix with Biome

## Architecture

**Shopify Hydrogen** storefront with **React Router v7** (not Remix) and **Weaverse** visual page builder.

### Stack
Hydrogen 2025.5.0, React Router v7, Weaverse, Vite, Biome, TailwindCSS v4

### Directory Structure
```
app/
├── components/     # Reusable UI (layout, product, cart)
├── sections/       # Weaverse page-building sections
├── routes/         # File-based routing (React Router v7)
├── weaverse/       # Weaverse integration and config
├── hooks/          # Custom React hooks
├── utils/          # Utility functions
├── graphql/        # GraphQL fragments and queries
└── styles/         # Global styles
weaverse-pages/     # 13 local fallback JSONs (11 pages + 2 templates)
```

### Critical: React Router, Not Remix
```js
// CORRECT
import { useLoaderData, Link, Form } from 'react-router';
// WRONG — never use
import { useLoaderData, Link, Form } from '@remix-run/react';
```

### Weaverse Data Flow
- **Studio data takes precedence** over local fallback JSON and schema `defaultValue`
- If a schema field is added after Studio data was saved, the component receives `undefined` for that field — use **destructuring defaults** (e.g., `showLeadTime = true`) to handle this
- Fallback JSONs in `weaverse-pages/` serve as baseline when Studio has no data
- PAGE fallbacks are per-handle (`local_PAGE_about_us`); PRODUCT/COLLECTION fallbacks are templates (`local_PRODUCT`) that always match
- `useThemeSettings()` values from Studio can contain demo data; footer hardcodes store info as fallbacks

### Component Schema
```tsx
export let schema = createSchema({
  type: 'my-section',
  title: 'My Section',
  settings: [  // Use "settings", NOT "inspector"
    {
      group: 'Content',
      inputs: [{ type: 'text', name: 'heading', label: 'Heading', defaultValue: 'Default' }],
    },
  ],
});
```

### Routing
- Routes in `app/routes/` follow React Router v7 conventions
- Locale-aware: `($locale).page-name.tsx`
- Dynamic: `($locale).products.$productHandle.tsx`
- API: `($locale).api.endpoint.ts`

### Code Standards
- **TypeScript**: Strict mode disabled; use types where beneficial
- **Biome**: Double quotes, semicolons required. Config extends `@weaverse/biome`
- **Imports**: Use `~/*` alias for app directory

### Environment
Required: `PUBLIC_STORE_DOMAIN`, `PUBLIC_STOREFRONT_API_TOKEN`, `WEAVERSE_PROJECT_ID`, `SESSION_SECRET`, `SHOPIFY_ADMIN_API_TOKEN`, `PUBLIC_GOOGLE_GTM_ID`

### Common Tasks
- **Update GraphQL**: Edit `app/graphql/`, run `npm run codegen`
- **Add theme settings**: Edit `schema.server.ts` + `style.tsx`, use `useThemeSettings()`
- **New Weaverse section**: Create in `app/sections/`, export `schema` via `createSchema()`, register in `app/weaverse/components.ts`
- **Debug**: GraphiQL at `localhost:3456/graphiql`
- **Deploy**: Use `~/.Codex/scripts/deploy.sh` (see global AGENTS.md for flags)
