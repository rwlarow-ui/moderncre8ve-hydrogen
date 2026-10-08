# ModernCre8ve Hydrogen Storefront

Storefront for [moderncre8ve.com](https://moderncre8ve.com): handcrafted modern furniture (mid-century, Scandinavian, Japandi). Built on Shopify Hydrogen with React Router v7 and an in-repo page builder, and deployed to Shopify Oxygen.

## Stack

Hydrogen, React Router v7 (not Remix), Vite, TailwindCSS v4, Biome, TypeScript.

## Getting started

```bash
npm install
cp .env.example .env   # fill in your store's values
npm run dev            # http://localhost:3456, with GraphQL codegen
```

Required environment variables are listed in `.env.example`. Never commit `.env`.

## Commands

| Command | Purpose |
|---------|---------|
| `npm run dev` | Dev server on port 3456 with codegen |
| `npm run build` | Production build |
| `npm run typecheck` | TypeScript type checking |
| `npm run codegen` | Regenerate GraphQL types after schema changes |
| `npm run biome` | Lint (errors only) |
| `npm run biome:fix` | Lint and auto-fix |
| `npm run check:collections` | Verify every Shopify collection is published to the storefront (needs `.env`) |

## Architecture

```
app/
├── components/     # Reusable UI (layout, product, cart)
├── sections/       # Page-building sections
├── routes/         # File-based routes (React Router v7)
├── page-builder/   # Renderer, schema, theme settings, page compositions
├── hooks/          # Custom React hooks
├── utils/          # Utilities
├── graphql/        # Fragments and queries
└── styles/         # Global styles
```

### Page builder

- A route loader calls `loadPage({ context, request }, { type, handle })` and renders the result with `<PageContent pageData={pageData} />`.
- Page compositions are typed modules in `app/page-builder/pages/`; `getPageDefinition()` maps a page type or handle to one. Product, collection, blog, article, all-products and collection-list pages use shared templates. A Shopify page with no bespoke composition falls back to `app/page-builder/pages/page.ts`.
- Sections live in `app/sections/`, export a `schema` built with `createSchema()`, and are registered in `app/page-builder/components.ts`. A section's props are its schema defaults overlaid with the saved item data.
- Theme settings (colors, fonts, footer, social links) are defined in `app/page-builder/theme-schema.server.ts`, applied by `app/page-builder/global-style.tsx`, and read in components with `useThemeSettings()`.

### Analytics

GA4 is loaded in `app/components/root/custom-analytics.tsx` using the measurement ID in `PUBLIC_GOOGLE_GTM_ID` (the variable name is historical; there is no GTM container). Consent follows Shopify's Customer Privacy state. Checkout `purchase` events come from Shopify's Google & YouTube pixel, not this repo.

## Deployment

Deployed to Shopify Oxygen. See `CLAUDE.md` for project conventions and store knowledge.
