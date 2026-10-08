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

Two stand-ins replace what needs the running store (`shims/`):

- `~/page-builder` → `useThemeSettings()` returns `getThemeSettings()`, the same
  defaults from `theme-schema.server.ts` the root loader serves.
- `@shopify/hydrogen` → `useMoney` / `<Money />` via `Intl.NumberFormat`.

Copy `bundle.js` and `bundle.css` to the design system's `components/` folder
to update it.
