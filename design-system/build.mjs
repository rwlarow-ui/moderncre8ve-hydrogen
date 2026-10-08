#!/usr/bin/env node
/**
 * Builds the live component files for the ModernCre8ve design system:
 *
 *   dist/bundle.js   one IIFE classic script → window.ModernCre8ve
 *                    (reads window.React / window.ReactDOM; React is not bundled)
 *   dist/bundle.css  the Tailwind utilities those components use, compiled
 *                    with the storefront's own @theme / @utility blocks
 *
 * Usage:  node design-system/build.mjs [outDir]   (default design-system/dist)
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { compile } from "@tailwindcss/node";
import { Scanner } from "@tailwindcss/oxide";
import * as esbuild from "esbuild";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const outDir = path.resolve(process.argv[2] ?? path.join(here, "dist"));
const NAMESPACE = "ModernCre8ve";
const COMPONENTS = [
  "Button",
  "SaleBadge",
  "NewBadge",
  "BestSellerBadge",
  "BundleBadge",
  "SoldOutBadge",
  "VariantPrices",
  "CompareAtPrice",
  "StarRating",
];

await mkdir(outDir, { recursive: true });

// ---------------------------------------------------------------- JS bundle
const globals = {
  react: "window.React",
  "react-dom": "window.ReactDOM",
  "react/jsx-runtime": "window.__mc8JsxRuntime",
  "react/jsx-dev-runtime": "window.__mc8JsxRuntime",
};

/** react, react-dom and the JSX runtime resolve to the page's globals. */
const reactGlobals = {
  name: "react-globals",
  setup(build) {
    build.onResolve(
      { filter: /^react(-dom)?(\/jsx-(dev-)?runtime)?$/ },
      (a) => ({
        path: a.path,
        namespace: "react-global",
      }),
    );
    build.onLoad({ filter: /.*/, namespace: "react-global" }, (a) => ({
      contents: `module.exports = ${globals[a.path]};`,
      loader: "js",
    }));
  },
};

/** `~/page-builder` and `@shopify/hydrogen` resolve to the shims. */
const shims = {
  name: "shims",
  setup(build) {
    build.onResolve({ filter: /^~\/page-builder$/ }, () => ({
      path: path.join(here, "shims/page-builder.ts"),
    }));
    build.onResolve({ filter: /^@shopify\/hydrogen$/ }, () => ({
      path: path.join(here, "shims/hydrogen.tsx"),
    }));
    build.onResolve({ filter: /^~\// }, (a) =>
      build.resolve(`./${a.path.slice(2)}`, {
        resolveDir: path.join(root, "app"),
        kind: a.kind,
      }),
    );
  },
};

// A tiny jsx-runtime over createElement, installed before the bundle runs.
const jsxShim = `window.__mc8JsxRuntime=window.__mc8JsxRuntime||(function(R){function j(t,p,k){var c=p&&p.children;var q={};for(var n in p)if(n!=="children")q[n]=p[n];if(k!==undefined)q.key=k;return c===undefined?R.createElement(t,q):Array.isArray(c)?R.createElement.apply(null,[t,q].concat(c)):R.createElement(t,q,c)}return{jsx:j,jsxs:j,jsxDEV:j,Fragment:R.Fragment}})(window.React);`;

const result = await esbuild.build({
  entryPoints: [path.join(here, "entry.ts")],
  bundle: true,
  format: "iife",
  globalName: `__${NAMESPACE}`,
  platform: "browser",
  target: "es2019",
  minify: true,
  write: false,
  jsx: "automatic",
  define: { "process.env.NODE_ENV": '"production"' },
  plugins: [reactGlobals, shims],
  logLevel: "warning",
});

const header = `/* @ds-bundle: ${JSON.stringify({
  format: 4,
  namespace: NAMESPACE,
  components: COMPONENTS.map((name) => ({ name })),
})} */`;
let js = `${header}\n${jsxShim}\n${result.outputFiles[0].text}\nwindow.${NAMESPACE}=__${NAMESPACE};\n`;
js = js.replace(/<\/script/gi, "<\\/script").replace(/<!--/g, "<\\!--");
await writeFile(path.join(outDir, "bundle.js"), js);

// --------------------------------------------------------------- CSS bundle
// Lift the storefront's own @theme / @utility blocks out of app.css so the
// utilities compile against the same theme the live site uses.
const appCss = await readFile(path.join(root, "app/styles/app.css"), "utf8");
function topLevelBlocks(css, prefixes) {
  const out = [];
  let i = 0;
  while (i < css.length) {
    const at = css.indexOf("@", i);
    if (at < 0) break;
    const head = css.slice(at, css.indexOf("{", at));
    const open = css.indexOf("{", at);
    if (open < 0) break;
    let depth = 0;
    let j = open;
    for (; j < css.length; j++) {
      if (css[j] === "{") depth++;
      else if (css[j] === "}" && --depth === 0) break;
    }
    if (prefixes.some((p) => head.startsWith(p)))
      out.push(css.slice(at, j + 1));
    i = j + 1;
  }
  return out;
}
const themeBlocks = topLevelBlocks(appCss, ["@theme", "@utility strike"]).join(
  "\n\n",
);

// Preflight too: the storefront ships it, and without it buttons lose
// `font: inherit` and keep the browser's default border and background.
const input = `@import "tailwindcss/theme.css" layer(theme);
@import "tailwindcss/preflight.css" layer(base);
@import "tailwindcss/utilities.css" layer(utilities);
${themeBlocks}
`;
const compiler = await compile(input, { base: root, onDependency() {} });
const scanner = new Scanner({
  sources: [
    {
      base: path.join(root, "app/components"),
      pattern: "button.tsx",
      negated: false,
    },
    {
      base: path.join(root, "app/components"),
      pattern: "star-rating.tsx",
      negated: false,
    },
    {
      base: path.join(root, "app/components/product"),
      pattern: "badges.tsx",
      negated: false,
    },
    {
      base: path.join(root, "app/components/product"),
      pattern: "variant-prices.tsx",
      negated: false,
    },
  ],
});
const css = compiler.build(scanner.scan());
await writeFile(
  path.join(outDir, "bundle.css"),
  `/* ModernCre8ve — generated by design-system/build.mjs from app/components and app/styles/app.css */\n${css}`,
);

console.log(
  `wrote ${path.relative(root, outDir)}/bundle.js (${(js.length / 1024).toFixed(1)} KB) and bundle.css (${(css.length / 1024).toFixed(1)} KB)`,
);
