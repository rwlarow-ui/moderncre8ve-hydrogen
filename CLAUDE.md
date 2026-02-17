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

Source: `MC82.0_FINALCOLORS_081123.png`

### Key Files
| File | Purpose |
|------|---------|
| `app/weaverse/schema.server.ts` | Theme settings (colors, fonts, footer, social links, store info) |
| `app/utils/seo.server.ts` | SEO config (title templates, org schema, descriptions) |
| `app/styles/app.css` | Global styles, font-face declarations, CSS custom properties |
| `app/root.tsx` | Root layout, font preloads |
| `redirects-for-shopify.csv` | 77 SEO redirects for Shopify Admin bulk import |
| `weaverse-pages/` | 8 page + 2 template JSON files for Weaverse Studio import |
| `scripts/get-admin-token.mjs` | One-time OAuth script for Shopify Admin API token |

### Deployment Status
| Phase | Status |
|-------|--------|
| 1. Foundation (branding, SEO, redirects, MCP) | Done |
| 2. Content migration (presets, audit, remove.bg, content extraction) | Done |
| 3. Page building (11 pages + 2 templates in Weaverse Studio) | **In Progress** — 3 done in Studio, 8 page + 2 template JSONs generated in `weaverse-pages/` |
| 4. Shopify Admin cleanup (images, redirects, collections, SEO) | **Done** — All 6 tasks completed via Admin API |
| 5. Launch (final deploy, DNS cutover) | Pending |

See `CHANGELOG.md` for full details and page-by-page TODO list.

### Shopify Admin — Completed (Phase 4)

All tasks executed via Admin GraphQL API (v1.0.8):
- **27 product images uploaded** — background-removed PNGs via staged uploads
- **77 SEO redirects imported** — via `urlRedirectCreate` mutations
- **3 products drafted** — `vermonter`, `quincy bed`, `larchmere tallboy`
- **Mar Vista alt text fixed** — 3 images updated
- **4 collections deleted** — In Stock, Piper and Fox, Collections-All, Edit these 2025

**Remaining collections** (not empty, kept):
| Collection | Handle | Note |
|-----------|--------|------|
| Mid Century Modern Coffee Tables | `mid-century-modern-coffee-tables` | May need products added |
| Custom Made Furniture | `custom-made-furniture` | May need products added |
| Housewares | `housewares` | May need products added |

**Optional**
| Task | Where | Details |
|------|-------|---------|
| Enable inventory scope | Settings > Apps > Storefront API | Add `unauthenticated_read_product_inventory` scope if stock display is needed |

### Project History
- **This is the master version** of the moderncre8ve.com rebuild
- A prior Next.js + Builder.io version exists at `~/Desktop/Moderncre8ve Rebuild [ARCHIVED]/` (archived 2026-02-14)
- The archived version reached v0.7.3 (~90% complete) but was superseded by this Hydrogen + Weaverse approach for better Shopify ecosystem integration
- SEO data, redirect rules, and content extraction from the archived project informed this build

### Admin API Access
- **Token:** `SHOPIFY_ADMIN_API_TOKEN` in `.env` (full admin write scopes)
- **App:** "Claude2" in Shopify Dev Dashboard (custom distribution)
- **Client ID:** `fd5964839bc3fb47703bafb47d25d3fc`
- **OAuth script:** `scripts/get-admin-token.mjs` (HTTPS localhost with self-signed cert)
- **Scopes:** write_products, write_redirects, write_files, and all other admin scopes

### MCP Servers (This Project)
Configured in `~/Desktop/my-hydrogen-storefront/.mcp.json`:
- **Ahrefs** — SEO analysis
- **Figma** — Design reference
- **Shopify** — Storefront API (read-only)
- **Shopify Dev** — Shopify developer documentation and schema tools

> **Note:** Composer and Crypto.com MCP servers visible in Claude sessions are from the **OWS Next.js project** (`~/Desktop/UW/options-wall-scanner-next`), not this project. They are irrelevant here.

## Development Commands

### Core Development
- `npm run dev` - Start development server on port 3456 with codegen
- `npm run dev:ca` - Start dev server with customer account API (unstable)
- `npm run build` - Build for production with codegen
- `npm run preview` - Preview production build
- `npm run start` - Start production server
- `npm run typecheck` - Run TypeScript type checking
- `npm run codegen` - Generate GraphQL types and schema

### Code Quality
- `npm run biome` - Run linting (error level only)
- `npm run biome:fix` - Auto-fix linting issues
- `npm run format` - Format code with Biome
- `npm run format:check` - Check formatting without changes

### Testing
- `npm run e2e` - Run Playwright end-to-end tests
- `npm run e2e:ui` - Run Playwright tests with UI

### Maintenance
- `npm run clean` - Remove build artifacts and dependencies

## Architecture Overview

This is a **Shopify Hydrogen storefront** built with **React Router v7** (not Remix) and integrated with **Weaverse** for visual page building. Key architectural decisions:

### Framework Stack
- **Hydrogen 2025.5.0** - Shopify's React framework for commerce
- **React Router v7** - File-based routing (NOT Remix - see import rules below)
- **Weaverse** - Visual page builder with component system
- **Vite** - Build tool and dev server
- **Biome** - Linting and formatting (replaces ESLint/Prettier)
- **TailwindCSS v4** - Styling with CSS-in-JS approach

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
// ✅ CORRECT
import { useLoaderData, Link, Form } from 'react-router';

// ❌ WRONG
import { useLoaderData, Link, Form } from '@remix-run/react';
```

### Weaverse Integration
- All page content is managed through Weaverse's visual builder
- Components must be registered in `app/weaverse/components.ts`
- Section components live in `app/sections/` with proper schema exports
- Theme settings defined in `app/weaverse/schema.server.ts`
- Use `withWeaverse` HOC on root App component

### Component Architecture
- **Components**: Small, reusable UI elements (`app/components/`)
- **Sections**: Full-width page-building blocks (`app/sections/`)
- **Weaverse Schema**: Every section must export a `schema` object using `createSchema()`
- **Data Loading**: Use component `loader` functions for server-side data fetching

### Styling Approach
- **TailwindCSS v4** with CSS-in-JS setup via Vite plugin
- **Design tokens** managed through Weaverse theme settings
- **Global styles** in `app/weaverse/style.tsx` driven by theme settings
- **Component-specific** styles using Tailwind classes

### GraphQL & Data Fetching
- **Storefront API** for product/collection data
- **Generated types** in `storefront-api.generated.d.ts` (DO NOT edit directly)
- **Fragments** defined in `app/graphql/fragments.ts`
- **Queries** in `app/graphql/queries.ts`
- **Regenerate types** with `npm run codegen` after schema changes

### Testing Setup
- **Playwright** for end-to-end testing
- Test files in `tests/` directory
- Configuration in `playwright.config.ts`

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
- Locale-aware routes: `($locale).page-name.tsx`
- Dynamic routes: `($locale).products.$productHandle.tsx`
- API routes: `($locale).api.endpoint.ts`

### Code Quality Standards
- **TypeScript**: Strict mode disabled, but use types where beneficial
- **Linting**: Biome configuration in `biome.json` (extends `@weaverse/biome`)
- **Formatting**: Double quotes, semicolons required
- **Imports**: Use `~/*` alias for app directory imports

### Environment Configuration
Required environment variables:
- `PUBLIC_STORE_DOMAIN` - Shopify store domain
- `PUBLIC_STOREFRONT_API_TOKEN` - Storefront API access token
- `WEAVERSE_PROJECT_ID` - Weaverse project identifier
- `SESSION_SECRET` - Session encryption key
- `SHOPIFY_ADMIN_API_TOKEN` - Admin API token (obtained via `scripts/get-admin-token.mjs`)

### Performance Considerations
- **Server-side rendering** with hydration
- **Component lazy loading** via Vite warming
- **GraphQL caching** using Hydrogen's cache strategies
- **Image optimization** with Shopify CDN
- **Asset inlining** disabled for CSP compliance

## Common Tasks

### Updating GraphQL Schema
1. Modify queries in `app/graphql/`
2. Run `npm run codegen`
3. Update TypeScript types as needed

### Adding Theme Settings
1. Edit `app/weaverse/schema.server.ts`
2. Add corresponding styles in `app/weaverse/style.tsx`
3. Use `useThemeSettings()` hook in components

### Debugging
- **Dev tools**: http://localhost:3456/graphiql
- **Network requests**: http://localhost:3456/debug-network
- **Hydrogen logs**: Check terminal output during development

### Deployment
- **Shopify Oxygen**: Native Hydrogen deployment platform
- **Build command**: `npm run build`
- **Environment**: Ensure all env vars are configured
