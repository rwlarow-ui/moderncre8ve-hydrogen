#!/usr/bin/env node

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();

const fallbackSource = readFileSync(
  resolve(root, "app/utils/weaverse-fallback.server.ts"),
  "utf8",
);
const pageRouteSource = readFileSync(
  resolve(root, "app/routes/($locale).pages.$pageHandle.tsx"),
  "utf8",
);
const redirectsCsv = readFileSync(
  resolve(root, "redirects-for-shopify.csv"),
  "utf8",
);

const expectedJsonFallbacks = new Map([
  ["about-us", "weaverse-pages/about-us.json"],
  ["about-us-1", "weaverse-pages/about-us.json"],
  ["assembly-care", "weaverse-pages/assembly-care.json"],
  ["contact-and-inquiry", "weaverse-pages/contact.json"],
  ["contact-us", "weaverse-pages/contact.json"],
  [
    "custom-furniture-crafted-to-perfection",
    "weaverse-pages/custom-orders.json",
  ],
  ["custom-orders", "weaverse-pages/custom-orders.json"],
  ["faq", "weaverse-pages/faq.json"],
  ["mid-century-modern-press-coverage", "weaverse-pages/press.json"],
  ["ordering-policies", "weaverse-pages/order-policies.json"],
  ["our-materials", "weaverse-pages/our-materials.json"],
  ["reviews", "weaverse-pages/reviews.json"],
  [
    "shipping-policy-and-customer-responsibilities",
    "weaverse-pages/shipping-policy.json",
  ],
  ["shipping-policy", "weaverse-pages/shipping-policy.json"],
  ["trade-1", "weaverse-pages/trade.json"],
]);

const expectedGenericFallbacks = new Set([
  "cleveland-workshop-showroom",
  "legal",
  "my-personal-data",
  "privacy-policy",
  "request-personal-data",
  "terms-of-service",
  "wrong-turn",
]);

const expectedRedirects = new Map([
  ["about-us-1", "/pages/about-us"],
  [
    "custom-kitchen-cabinets-cleveland",
    "/pages/custom-furniture-crafted-to-perfection",
  ],
]);

const aprilAuditHandles = new Set([
  "about-us",
  "about-us-1",
  "assembly-care",
  "cleveland-workshop-showroom",
  "custom-furniture-crafted-to-perfection",
  "custom-kitchen-cabinets-cleveland",
  "faq",
  "legal",
  "mid-century-modern-press-coverage",
  "my-personal-data",
  "ordering-policies",
  "our-materials",
  "privacy-policy",
  "request-personal-data",
  "reviews",
  "shipping-policy-and-customer-responsibilities",
  "terms-of-service",
  "trade-1",
  "wrong-turn",
]);

const contactFallbackAllowed = new Set(["contact-and-inquiry", "contact-us"]);
const failures = [];

const mappedFallbacks = parseFallbackMap(fallbackSource);

for (const [handle, expectedFile] of expectedJsonFallbacks) {
  const actualFile = mappedFallbacks.get(handle);
  if (actualFile !== expectedFile) {
    failures.push(
      `PAGE:${handle} should map to ${expectedFile}, got ${actualFile ?? "nothing"}.`,
    );
  }
}

for (const handle of expectedGenericFallbacks) {
  if (
    !sourceContainsSetEntry(
      fallbackSource,
      "SHOPIFY_PAGE_FALLBACK_HANDLES",
      handle,
    )
  ) {
    failures.push(
      `PAGE:${handle} should use the generic Shopify page fallback.`,
    );
  }
}

if (!fallbackSource.includes("PREFER_LOCAL_PAGE_KEYS")) {
  failures.push("Mapped PAGE fallbacks must prefer local content in production.");
}

for (const handle of aprilAuditHandles) {
  const mappedFile = mappedFallbacks.get(handle);
  const hasGenericFallback = expectedGenericFallbacks.has(handle);
  const hasRedirect = expectedRedirects.has(handle);

  if (!(mappedFile || hasGenericFallback || hasRedirect)) {
    failures.push(
      `April audit handle ${handle} has no fallback or safe redirect.`,
    );
  }

  if (
    mappedFile === "weaverse-pages/contact.json" &&
    !contactFallbackAllowed.has(handle)
  ) {
    failures.push(
      `April audit handle ${handle} must not map to contact.json.`,
    );
  }
}

for (const [handle, target] of expectedRedirects) {
  if (!pageRouteHasRedirect(handle, target)) {
    failures.push(
      `Page route should 301 redirect ${handle} to ${target}.`,
    );
  }

  if (!redirectsCsvHasRedirect(handle, target)) {
    failures.push(
      `redirects-for-shopify.csv should include /pages/${handle},${target}.`,
    );
  }
}

if (failures.length > 0) {
  console.error(
    JSON.stringify(
      {
        ok: false,
        failures,
      },
      null,
      2,
    ),
  );
  process.exit(1);
}

console.log(
  JSON.stringify(
    {
      ok: true,
      mappedFallbacks: mappedFallbacks.size,
      genericFallbacks: expectedGenericFallbacks.size,
      redirects: expectedRedirects.size,
    },
    null,
    2,
  ),
);

function parseFallbackMap(source) {
  const map = new Map();
  const fallbackPattern =
    /"PAGE:([^"]+)":\s*\(\)\s*=>\s*import\("\.\.\/\.\.\/weaverse-pages\/([^"]+)"\)/g;

  for (const match of source.matchAll(fallbackPattern)) {
    map.set(match[1], `weaverse-pages/${match[2]}`);
  }

  return map;
}

function sourceContainsSetEntry(source, setName, value) {
  const setStart = source.indexOf(`const ${setName} = new Set([`);
  if (setStart === -1) {
    return false;
  }

  const setEnd = source.indexOf("]);", setStart);
  if (setEnd === -1) {
    return false;
  }

  return source.slice(setStart, setEnd).includes(`"${value}"`);
}

function redirectsCsvHasRedirect(handle, target) {
  return redirectsCsv
    .split("\n")
    .some((line) => line.trim() === `/pages/${handle},${target}`);
}

function pageRouteHasRedirect(handle, target) {
  return new RegExp(
    `"${escapeRegExp(handle)}"\\s*:\\s*"${escapeRegExp(target)}"`,
  ).test(pageRouteSource);
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
