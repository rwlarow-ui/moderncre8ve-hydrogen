# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project: ModernCre8ve Hydrogen Storefront

Replacement for moderncre8ve.com — handcrafted modern furniture (mid-century, Scandinavian, Japandi).

- **Store:** moderncre8ve.myshopify.com (26 active + 3 draft products, 16 collections)
- **Template:** Weaverse Aspen (furniture-focused Hydrogen theme)
- **Repo:** github.com/rwlarow-ui/moderncre8ve-hydrogen
- **Deploy target:** Shopify Oxygen
- **Shopify Admin (Hydrogen):** https://admin.shopify.com/store/moderncre8ve/hydrogen/1000097972
- **Weaverse Studio:** https://studio.weaverse.io/dashboard/projects/gkv7k7xwkbfez2rdmkbbzxuw
- **Oxygen URL:** https://moderncre8ve-v2-6aebe5cb62e16d9300dd.o2.myshopify.dev
- **Status:** Phases 1-4 complete. Phase 5 (launch — final deploy, DNS cutover) pending.

### Branding
- **Fonts:** Jost (headings, `--font-sans`) / Spectral (body, `--font-serif`)
- **Logo:** `public/logo.png` (dark), `public/logo-alt.png` (light variant)

#### Color Palette
| Swatch | Hex | RGB | Usage |
|--------|-----|-----|-------|
| Dark Charcoal | `#323640` | 50, 54, 64 | Primary dark / text |
| Emerald Green | `#2CBF96` | 44, 191, 150 | Accent / CTA |
| Warm Cream | `#F2EBD5` | 242, 235, 213 | Background / neutral |
| Amber Gold | `#F2AC29` | 242, 172, 41 | Highlight / secondary accent |
| Coral Red | `#D35055` | 211, 80, 85 | Alert / accent |
| Cool Gray | `#9DA0A7` | 157, 160, 167 | Muted / borders |

### Key Files
| File | Purpose |
|------|---------|
| `app/weaverse/schema.server.ts` | Theme settings (colors, fonts, footer, social links, store info) |
| `app/utils/seo.server.ts` | SEO config (title templates, org schema, descriptions) |
| `app/styles/app.css` | Global styles, font-face declarations, CSS custom properties |
| `app/root.tsx` | Root layout, font preloads |
| `redirects-for-shopify.csv` | SEO redirects for Shopify Admin bulk import |
| `scripts/get-admin-token.mjs` | One-time OAuth script for Shopify Admin API token |

### Admin API Access
- **Token:** `SHOPIFY_ADMIN_API_TOKEN` in `.env` (full admin write scopes)
- **App:** "Claude2" in Shopify Dev Dashboard (Client ID: `fd5964839bc3fb47703bafb47d25d3fc`)
- **OAuth script:** `scripts/get-admin-token.mjs` (HTTPS localhost with self-signed cert)

### SEO Truth Layer
Separate project for weekly SEO pipeline (GSC + GA4 data).
- **Repo:** [moderncre8ve-seo-truth-layer](https://github.com/rwlarow-ui/moderncre8ve-seo-truth-layer)
- **Local:** `~/Desktop/UW/moderncre8ve-seo-truth-layer`
- **Run locally:** `cd ~/Desktop/UW/moderncre8ve-seo-truth-layer && python3 -m src.main`

### MCP Servers
Configured in `.mcp.json`: Ahrefs, Figma, Shopify (Storefront API), Shopify Dev (docs/schema).
Composer and Crypto.com servers visible in sessions are from OWS project — irrelevant here.

## Development Commands

- `npm run dev` — Dev server on port 3456 with codegen
- `npm run build` — Production build with codegen
- `npm run preview` — Preview production build
- `npm run typecheck` — TypeScript type checking
- `npm run codegen` — Generate GraphQL types and schema
- `npm run biome` / `npm run biome:fix` — Lint / auto-fix
- `npm run format` / `npm run format:check` — Format with Biome
- `npm run e2e` / `npm run e2e:ui` — Playwright tests
- `npm run clean` — Remove build artifacts and dependencies

## Architecture Overview

**Shopify Hydrogen** storefront with **React Router v7** (not Remix) and **Weaverse** visual page builder.

### Framework Stack
- **Hydrogen 2025.5.0** — Shopify's React commerce framework
- **React Router v7** — File-based routing (NOT Remix)
- **Weaverse** — Visual page builder with component system
- **Vite** — Build tool and dev server
- **Biome** — Linting and formatting
- **TailwindCSS v4** — Styling

### Key Directory Structure
```
app/
├── components/          # Reusable UI components
├── sections/           # Weaverse page-building sections
├── routes/             # File-based routing (React Router)
├── weaverse/           # Weaverse integration and config
├── hooks/              # Custom React hooks
├── utils/              # Utility functions
├── graphql/            # GraphQL fragments and queries
└── styles/             # Global styles
```

### Critical Import Rules
**ALWAYS use React Router imports, NEVER Remix:**
```js
// CORRECT
import { useLoaderData, Link, Form } from 'react-router';

// WRONG — do not use
import { useLoaderData, Link, Form } from '@remix-run/react';
```

### Weaverse Integration
- All page content managed through Weaverse's visual builder
- Components registered in `app/weaverse/components.ts`
- Section components in `app/sections/` with schema exports
- Theme settings in `app/weaverse/schema.server.ts`
- Global styles in `app/weaverse/style.tsx` driven by theme settings
- Use `withWeaverse` HOC on root App component
- **Fallback types:** PAGE fallbacks are per-handle (`local_PAGE_about_us`), but PRODUCT/COLLECTION fallbacks are templates (`local_PRODUCT`) that always match — cannot be used as "page exists" signals
- **Studio overrides:** `useThemeSettings()` values from Studio can contain demo data; footer hardcodes store info as fallbacks (see `app/components/layout/footer.tsx`)

### Component Architecture
- **Components**: Reusable UI elements (`app/components/`)
- **Sections**: Full-width page-building blocks (`app/sections/`)
- Every section exports a `schema` via `createSchema()` and a `loader` for data fetching

### GraphQL & Data Fetching
- **Generated types** in `storefront-api.generated.d.ts` (DO NOT edit directly)
- **Fragments** in `app/graphql/fragments.ts`, **queries** in `app/graphql/queries.ts`
- Regenerate with `npm run codegen` after schema changes

## Development Workflows

### Adding New Weaverse Sections
1. Create component in `app/sections/[section-name]/index.tsx`
2. Export default component with `forwardRef`
3. Export `schema` object with `createSchema()`
4. Optionally export `loader` function for data fetching
5. Register in `app/weaverse/components.ts`

### Component Schema Requirements
```tsx
export let schema = createSchema({
  type: 'my-section',
  title: 'My Section',
  settings: [  // Use "settings", NOT "inspector"
    {
      group: 'Content',
      inputs: [
        {
          type: 'text',
          name: 'heading',
          label: 'Heading',
          defaultValue: 'Default heading',
        },
      ],
    },
  ],
});
```

### File-based Routing
- Routes in `app/routes/` follow React Router v7 conventions
- Locale-aware: `($locale).page-name.tsx`
- Dynamic: `($locale).products.$productHandle.tsx`
- API: `($locale).api.endpoint.ts`

### Code Quality Standards
- **TypeScript**: Strict mode disabled, but use types where beneficial
- **Biome**: Config in `biome.json` (extends `@weaverse/biome`)
- **Formatting**: Double quotes, semicolons required
- **Imports**: Use `~/*` alias for app directory imports

### Environment Configuration
Required env vars: `PUBLIC_STORE_DOMAIN`, `PUBLIC_STOREFRONT_API_TOKEN`, `WEAVERSE_PROJECT_ID`, `SESSION_SECRET`, `SHOPIFY_ADMIN_API_TOKEN`

### Common Tasks
- **Update GraphQL**: Edit `app/graphql/`, run `npm run codegen`
- **Add theme settings**: Edit `app/weaverse/schema.server.ts` + `app/weaverse/style.tsx`, use `useThemeSettings()` hook
- **Debug**: GraphiQL at `localhost:3456/graphiql`, network at `localhost:3456/debug-network`
- **Deploy**: Build with `npm run build`, deploy to Shopify Oxygen
