// Drives the running Hydrogen dev server with the repo's own Playwright + system Chrome.
// Usage: node .claude/skills/run-my-hydrogen-storefront/driver.mjs <shot|text|flow> [args]
//   shot <path> [out.png]   screenshot BASE+path (full page)
//   text <path> <selector>  print innerText of selector
//   flow [outdir]           home -> collection -> product -> add to cart, screenshot each step
import { chromium } from "@playwright/test";
import { mkdirSync } from "node:fs";

const BASE = process.env.BASE_URL || "http://localhost:3456";
const [cmd, a1, a2] = process.argv.slice(2);

const browser = await chromium.launch({ channel: "chrome", headless: true });
// bypassCSP: in dev, app/utils/csp.ts's script-src drops 'self', so Vite's /app/*.tsx modules are blocked and nothing hydrates.
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, bypassCSP: true });
// In dev the worker's Host header != the browser's Origin, so React Router's CSRF check 400s every
// same-origin POST (add to cart, newsletter...). Supplying x-forwarded-host makes the check pass.
await ctx.route(`${BASE}/**`, (route) => {
  const req = route.request();
  if (req.method() === "GET") return route.continue();
  return route.continue({ headers: { ...req.headers(), "x-forwarded-host": new URL(BASE).host } });
});
const page = await ctx.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
page.on("console", (m) => m.type() === "error" && errors.push(`console: ${m.text()}`));

page.on("response", (r) => r.status() >= 400 && errors.push(`http ${r.status()} ${r.request().method()} ${r.url().slice(0, 140)}`));

const go = async (p) => {
  const r = await page.goto(BASE + p, { waitUntil: "networkidle", timeout: 90000 });
  if (!r.ok()) throw new Error(`${p} -> ${r.status()}`);
};

try {
  if (cmd === "shot") {
    await go(a1 || "/");
    const out = a2 || "shot.png";
    await page.screenshot({ path: out, fullPage: true });
    console.log(`${out} title=${await page.title()}`);
  } else if (cmd === "text") {
    await go(a1);
    console.log(await page.locator(a2).first().innerText());
  } else if (cmd === "flow") {
    const dir = a1 || ".";
    mkdirSync(dir, { recursive: true });
    await go("/");
    await page.screenshot({ path: `${dir}/1-home.png` });
    await go("/collections");
    await page.screenshot({ path: `${dir}/2-collections.png` });
    await go("/products");
    await page.screenshot({ path: `${dir}/2b-products.png` });
    const href = await page
      .locator('a[href*="/products/"]')
      .evaluateAll((as) =>
        as.map((a) => a.getAttribute("href")).find((h) => h && !h.endsWith("/products/")),
      );
    console.log("product:", href);
    await go(href);
    await page.screenshot({ path: `${dir}/3-product.png` });
    await page.getByRole("button", { name: /add to cart/i }).first().click();
    await page.waitForTimeout(4000);
    await page.screenshot({ path: `${dir}/4-cart.png` });
    console.log("cart text:", (await page.locator("body").innerText()).match(/cart[^\n]*/i)?.[0]);
  } else {
    console.error("usage: shot <path> [out] | text <path> <selector> | flow [outdir]");
    process.exitCode = 2;
  }
} finally {
  if (errors.length) console.log(`browser errors (${errors.length}):\n` + errors.slice(0, 8).join("\n"));
  await browser.close();
}
