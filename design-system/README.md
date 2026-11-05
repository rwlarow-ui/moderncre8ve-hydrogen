# design-system/

Builds the live component files for the ModernCre8ve design system artifact.

```sh
npm ci
node design-system/build.mjs            # → design-system/dist/
node design-system/build.mjs <outDir>   # or write somewhere else
```

Outputs:

- `bundle.js` — one IIFE classic script assigning `window.ModernCre8ve`. It reads
  `window.React` / `window.ReactDOM` (React is not bundled) and starts with the
  `@ds-bundle` header the design system reads.
- `bundle.css` — Tailwind preflight plus the utilities those components use,
  compiled against the `@theme` / `@utility` blocks lifted from
  `app/styles/app.css`.

What's in it is listed in `entry.ts` — each export is the storefront's own
component, imported unchanged from `app/`. To add one, export it there, add its
name to `COMPONENTS` and its source file to the scanner list in `build.mjs`.

Stand-ins replace what needs the running store (`shims/`):

- `~/page-builder` → `useThemeSettings()` returns `getThemeSettings()`, the same
  defaults from `theme-schema.server.ts` the root loader serves.
- `@shopify/hydrogen` → `useMoney` / `<Money />` via `Intl.NumberFormat`,
  and `<Image />` via a native image inside the storefront's loading wrapper.
- `react-router` → native anchor navigation with no root loader data. This
  lets the storefront's own locale-aware `Link` render outside a router.

`TrustStrip` and `CollectionCard` are included alongside the buttons, badges,
prices and star rating. `CollectionCard` takes the same props as in the store:
`collection` (including `products.nodes`), `imageAspectRatio`,
`collectionNameColor`, and optional `ctaText` / `loading`. Empty collections
render nothing; a missing collection image falls back to the first product's
media. The CSS scan includes the shared `Image` and `Link` sources so their
loading and interaction styles are available too.

Copy `bundle.js` and `bundle.css` to the design system's `components/` folder
to update it.
