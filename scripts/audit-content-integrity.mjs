#!/usr/bin/env node

import { readFileSync } from "node:fs";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { dirname, extname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const REPORTS_DIR = resolve(ROOT, "reports");
const FALLBACK_MAP_PATH = resolve(
  ROOT,
  "app/utils/weaverse-fallback.server.ts",
);
const WEAVERSE_PAGES_DIR = resolve(ROOT, "weaverse-pages");
const ENV_PATH = resolve(ROOT, ".env");

const SITE_ORIGIN = "https://moderncre8ve.com";
const STOREFRONT_API_VERSION = "2025-01";
const ADMIN_API_VERSION = "2024-10";
const RUN_DATE = new Date().toISOString().slice(0, 10);

const SEVERITY_RANK = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

const DEMO_COPY_PATTERNS = [
  /\bcoming soon\b/i,
  /\blorem ipsum\b/i,
  /\bdummy\b/i,
  /\bplaceholder\b/i,
  /\bsample\b/i,
  /\bdemo\b/i,
  /\bcopy of\b/i,
];

const SOURCE_MARKER_PATTERNS = [
  /\bplaceholder\b/i,
  /\bsample\b/i,
  /\bdemo\b/i,
  /\bdummy\b/i,
  /\bcopy of\b/i,
  /\bweaverse\b/i,
  /\btest\b/i,
];

const PLACEHOLDER_FILE_RULES = [
  {
    file: "app/sections/featured-products/product-items.tsx",
    patterns: [
      "Show placeholders if no products available",
      "product-placeholder",
      "Product placeholder",
    ],
    issueType: "source_placeholder_product_fallback",
    severity: "medium",
    recommendedFix:
      "Replace synthetic product cards with an explicit empty-state component or skip rendering when the collection has no products.",
    owner: "Storefront engineering",
  },
  {
    file: "app/sections/image-with-text/image.tsx",
    patterns: [
      "IMAGES_PLACEHOLDERS.image",
      'altText: "Placeholder"',
    ],
    issueType: "source_placeholder_image_fallback",
    severity: "medium",
    recommendedFix:
      "Require a real image for published sections or render nothing instead of a placeholder asset.",
    owner: "Storefront engineering",
  },
  {
    file: "app/sections/slideshow/slide.tsx",
    patterns: ["IMAGES_PLACEHOLDERS.banner_1"],
    issueType: "source_placeholder_image_fallback",
    severity: "medium",
    recommendedFix:
      "Guard published slideshow slides so missing images do not fall back to Weaverse placeholder banners.",
    owner: "Storefront engineering",
  },
];

const storefrontCache = new Map();
const adminCache = new Map();

loadDotEnv();

async function main() {
  const fallbackMap = await loadFallbackMap();
  const sourceFindings = [
    ...(await scanFallbackJsonFiles()),
    ...(await scanPlaceholderCodePaths()),
  ];

  const sitemapInventory = await fetchLiveInventory();
  const auditedInventory = await mapWithConcurrency(
    sitemapInventory,
    6,
    (item) => auditLiveItem(item, fallbackMap),
  );

  const allFindings = [
    ...auditedInventory.flatMap((item) => item.findings),
    ...sourceFindings,
  ].sort(sortFindings);

  const summary = buildSummary(auditedInventory, allFindings, fallbackMap);
  const report = {
    generatedAt: new Date().toISOString(),
    canonicalOrigin: SITE_ORIGIN,
    notes: [
      "Canonical production crawl target is https://moderncre8ve.com.",
      "The Oxygen preview URL in AGENTS.md returned a Shopify Oxygen 404 during this audit and was not used.",
    ],
    summary,
    inventory: auditedInventory,
    findings: allFindings,
  };

  await mkdir(REPORTS_DIR, { recursive: true });

  const jsonFilename = `content-audit-${RUN_DATE}.json`;
  const mdFilename = `content-audit-${RUN_DATE}.md`;
  const latestJsonFilename = "content-audit-latest.json";
  const latestMdFilename = "content-audit-latest.md";

  const jsonPath = resolve(REPORTS_DIR, jsonFilename);
  const mdPath = resolve(REPORTS_DIR, mdFilename);
  const latestJsonPath = resolve(REPORTS_DIR, latestJsonFilename);
  const latestMdPath = resolve(REPORTS_DIR, latestMdFilename);

  await writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  await writeFile(mdPath, buildMarkdownReport(report), "utf8");
  await writeFile(latestJsonPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  await writeFile(latestMdPath, buildMarkdownReport(report), "utf8");

  console.log(
    JSON.stringify(
      {
        generatedAt: report.generatedAt,
        auditedUrls: summary.totalUrls,
        flaggedUrls: summary.flaggedUrls,
        sourceOnlyFindings: summary.sourceOnlyFindings,
        findingsBySeverity: summary.findingsBySeverity,
        jsonReport: relative(ROOT, jsonPath),
        markdownReport: relative(ROOT, mdPath),
      },
      null,
      2,
    ),
  );
}

async function fetchLiveInventory() {
  const sitemapIndex = await fetchText(`${SITE_ORIGIN}/sitemap.xml`);
  const sitemapUrls = parseXmlLocs(sitemapIndex);
  const inventory = [];

  for (const sitemapUrl of sitemapUrls) {
    const sitemapType = inferSitemapType(sitemapUrl);
    const xml = await fetchText(sitemapUrl);
    const urls = parseXmlLocs(xml);

    for (const url of urls) {
      inventory.push({
        ...inferInventoryItem(url, sitemapType),
        sitemap: sitemapUrl,
      });
    }
  }

  return inventory;
}

async function auditLiveItem(item, fallbackMap) {
  const html = await fetchText(item.url);
  const title = extractTitle(html);
  const mainHtml = extractMainHtml(html);
  const mainText = normalizeText(extractText(mainHtml));
  const mainTextLength = mainText.length;
  const sectionCount =
    countMatches(mainHtml, /<section\b/gi) +
    countMatches(mainHtml, /data-wv-type=/gi);
  const imageInfo = extractImageInfo(mainHtml);
  const headingText = extractHeadingText(mainHtml);

  const findings = [];

  if (item.pageType === "page" && !fallbackMap.pageHandles.has(item.handle)) {
    const sourceContext = await getSourceContext(item, fallbackMap);
    findings.push(
      createFinding({
        url: item.url,
        pageType: item.pageType,
        issueType: "no_repo_fallback",
        severity: "medium",
        visibleLive: false,
        evidence: [
          `Page handle \`${item.handle}\` is present in the live sitemap but not mapped in ${relative(ROOT, FALLBACK_MAP_PATH)}.`,
          sourceContext.storefrontSummary,
        ].filter(Boolean),
        contentSource:
          "Weaverse Studio page assignment or Shopify page record without a mapped local fallback JSON.",
        recommendedFix:
          "Either add a local fallback mapping for this handle or document that it is intentionally Studio-only.",
        owner: "Content / Weaverse",
      }),
    );
  }

  const emptyReason = detectEmptyState({
    item,
    mainHtml,
    mainText,
    sectionCount,
    imageCount: imageInfo.length,
    headingText,
  });
  if (emptyReason) {
    const sourceContext = await getSourceContext(item, fallbackMap);
    findings.push(
      createFinding({
        url: item.url,
        pageType: item.pageType,
        issueType: "empty_or_thin_live_content",
        severity: "high",
        visibleLive: true,
        evidence: [
          `Rendered <main> text length: ${mainTextLength}`,
          `Section markers: ${sectionCount}`,
          `Image count inside <main>: ${imageInfo.length}`,
          emptyReason,
          sourceContext.storefrontSummary,
          sourceContext.adminSummary,
        ].filter(Boolean),
        contentSource: sourceContext.contentSource,
        recommendedFix:
          "Populate the Weaverse page assignment or fallback JSON so the route renders meaningful body content server-side.",
        owner: sourceContext.owner,
      }),
    );
  }

  const contentMismatchReason = detectPageContentMismatch({
    item,
    title,
    headingText,
    mainText,
  });
  if (contentMismatchReason) {
    const sourceContext = await getSourceContext(item, fallbackMap);
    findings.push(
      createFinding({
        url: item.url,
        pageType: item.pageType,
        issueType: "page_content_mismatch",
        severity: "high",
        visibleLive: true,
        evidence: [
          contentMismatchReason,
          `Visible heading text: ${truncateEvidence(headingText, 180)}`,
          `Rendered <main> text length: ${mainTextLength}`,
          sourceContext.storefrontSummary,
          sourceContext.adminSummary,
        ].filter(Boolean),
        contentSource: sourceContext.contentSource,
        recommendedFix:
          "Verify the Weaverse page assignment for this handle. It appears to be rendering contact-page content instead of route-specific copy.",
        owner: sourceContext.owner,
      }),
    );
  }

  const visibleDemoMatches = findDemoMatches(mainText);
  if (visibleDemoMatches.length > 0) {
    const sourceContext = await getSourceContext(item, fallbackMap);
    findings.push(
      createFinding({
        url: item.url,
        pageType: item.pageType,
        issueType: "demo_or_placeholder_copy",
        severity: "high",
        visibleLive: true,
        evidence: [
          `Visible marker hits: ${visibleDemoMatches.join(", ")}`,
          truncateEvidence(`Main text sample: ${mainText}`),
          sourceContext.storefrontSummary,
        ].filter(Boolean),
        contentSource: sourceContext.contentSource,
        recommendedFix:
          "Replace demo or placeholder copy with production content and remove any temporary merchandising language from the published page.",
        owner: sourceContext.owner,
      }),
    );
  }

  const placeholderImageHits = detectPlaceholderImages(imageInfo);
  if (placeholderImageHits.length > 0) {
    const sourceContext = await getSourceContext(item, fallbackMap);
    findings.push(
      createFinding({
        url: item.url,
        pageType: item.pageType,
        issueType: "placeholder_image_live",
        severity: "high",
        visibleLive: true,
        evidence: placeholderImageHits,
        contentSource: sourceContext.contentSource,
        recommendedFix:
          "Replace placeholder media with real assets or suppress the component until a production asset is configured.",
        owner: sourceContext.owner,
      }),
    );
  }

  const suspiciousHandleReason = detectSuspiciousHandle(item);
  if (suspiciousHandleReason) {
    const sourceContext = await getSourceContext(item, fallbackMap);
    findings.push(
      createFinding({
        url: item.url,
        pageType: item.pageType,
        issueType: "suspicious_handle_or_slug",
        severity: item.pageType === "product" ? "medium" : "low",
        visibleLive: true,
        evidence: [
          suspiciousHandleReason,
          sourceContext.storefrontSummary,
        ].filter(Boolean),
        contentSource: sourceContext.contentSource,
        recommendedFix:
          "Confirm the published handle is intentional. If not, create a clean canonical handle and redirect the old URL.",
        owner: sourceContext.owner,
      }),
    );
  }

  return {
    url: item.url,
    page_type: item.pageType,
    handle: item.handle ?? null,
    blog_handle: item.blogHandle ?? null,
    title,
    status: findings.length > 0 ? "flagged" : "ok",
    visible_text_length: mainTextLength,
    heading_text: headingText,
    section_count: sectionCount,
    image_count: imageInfo.length,
    findings,
  };
}

function detectEmptyState({
  item,
  mainHtml,
  mainText,
  sectionCount,
  imageCount,
  headingText,
}) {
  const textLen = mainText.length;
  const headingLen = headingText.length;

  if (!mainHtml.trim()) {
    return "No <main> content was rendered in the HTML response.";
  }

  if (item.pageType === "page") {
    if (textLen < 180 && sectionCount <= 3 && imageCount <= 1) {
      return "Page body is unusually thin for a CMS page.";
    }
    if (headingLen < 10 && textLen < 260 && sectionCount <= 4) {
      return "Page rendered with minimal heading/body text.";
    }
  }

  if (item.pageType === "article" && textLen < 250) {
    return "Article page rendered with too little body text.";
  }

  if (item.pageType === "blog" && textLen < 180) {
    return "Blog listing rendered with too little body text.";
  }

  return null;
}

function detectPageContentMismatch({ item, title, headingText, mainText }) {
  if (item.pageType !== "page") {
    return null;
  }

  const handle = item.handle ?? "";
  const normalizedHandle = handle.toLowerCase();
  const normalizedHeading = headingText.toLowerCase();
  const normalizedTitle = title.toLowerCase();
  const normalizedText = mainText.toLowerCase();
  const isContactPageHandle = /(contact|inquiry)/.test(normalizedHandle);

  if (
    !isContactPageHandle &&
    normalizedHeading.startsWith("contact us") &&
    normalizedText.startsWith("contact us visit us workshop")
  ) {
    return `Handle \`${handle}\` is rendering contact-page headings instead of page-specific content.`;
  }

  if (
    !isContactPageHandle &&
    normalizedText.startsWith("contact us visit us workshop") &&
    !normalizedTitle.includes("contact")
  ) {
    return `Handle \`${handle}\` is rendering the contact-page content signature.`;
  }

  return null;
}

function detectSuspiciousHandle(item) {
  if (!item.handle) {
    return null;
  }

  if (item.handle.includes("copy-of")) {
    return `Handle \`${item.handle}\` still contains a copy-of prefix.`;
  }

  if (item.handle.endsWith("_")) {
    return `Handle \`${item.handle}\` ends with a trailing underscore.`;
  }

  if (item.pageType === "page" && /-\d+$/.test(item.handle)) {
    return `Handle \`${item.handle}\` looks like a duplicate page slug.`;
  }

  if (item.pageType === "product" && item.handle.endsWith("-fram")) {
    return `Handle \`${item.handle}\` looks truncated.`;
  }

  return null;
}

function detectPlaceholderImages(imageInfo) {
  const hits = [];

  for (const image of imageInfo) {
    const combined = `${image.alt} ${image.src}`.toLowerCase();
    if (
      combined.includes("placeholder") ||
      combined.includes("product-placeholder")
    ) {
      hits.push(
        truncateEvidence(
          `Placeholder-like image detected: alt="${image.alt || ""}" src="${image.src || ""}"`,
        ),
      );
    }
  }

  return hits;
}

async function getSourceContext(item, fallbackMap) {
  const parts = [];
  let owner = "Storefront engineering";

  if (item.pageType === "page") {
    owner = "Content / Weaverse";
    if (fallbackMap.pageHandles.has(item.handle)) {
      parts.push(
        `Mapped fallback JSON: ${fallbackMap.pageHandles.get(item.handle)}`,
      );
    } else {
      parts.push("No mapped local fallback JSON");
    }
  } else if (item.pageType === "product" || item.pageType === "collection") {
    owner = "Merchandising / Shopify";
  } else if (item.pageType === "article" || item.pageType === "blog") {
    owner = "Content / Shopify";
  }

  const storefrontSummary = await getStorefrontSummary(item);
  const adminSummary = await getAdminSummary(item);

  return {
    owner,
    storefrontSummary,
    adminSummary,
    contentSource:
      parts.length > 0
        ? `${parts.join("; ")}; published ${item.pageType} route`
        : `Published ${item.pageType} route`,
  };
}

async function getStorefrontSummary(item) {
  const cacheKey = `storefront:${item.pageType}:${item.blogHandle ?? ""}:${item.handle ?? ""}`;
  if (storefrontCache.has(cacheKey)) {
    return storefrontCache.get(cacheKey);
  }

  let summary = null;

  if (item.pageType === "page") {
    const data = await storefrontQuery(
      `
        query AuditPage($handle: String!) {
          page(handle: $handle) {
            id
            title
            handle
            body
            bodySummary
          }
        }
      `,
      { handle: item.handle },
    );
    const page = data?.page;
    if (page) {
      summary = `Storefront page "${page.title}" exists with body length ${page.body?.length ?? 0}.`;
    }
  } else if (item.pageType === "product") {
    const data = await storefrontQuery(
      `
        query AuditProduct($handle: String!) {
          product(handle: $handle) {
            id
            title
            handle
            description
            vendor
          }
        }
      `,
      { handle: item.handle },
    );
    const product = data?.product;
    if (product) {
      summary = `Storefront product "${product.title}" exists with description length ${product.description?.length ?? 0}.`;
    }
  } else if (item.pageType === "collection") {
    const data = await storefrontQuery(
      `
        query AuditCollection($handle: String!) {
          collection(handle: $handle) {
            id
            title
            handle
            description
            products(first: 1) {
              nodes {
                id
              }
            }
          }
        }
      `,
      { handle: item.handle },
    );
    const collection = data?.collection;
    if (collection) {
      summary = `Storefront collection "${collection.title}" exists with description length ${collection.description?.length ?? 0}.`;
    }
  }

  storefrontCache.set(cacheKey, summary);
  return summary;
}

async function getAdminSummary(item) {
  if (!process.env.SHOPIFY_ADMIN_API_TOKEN || !process.env.PUBLIC_STORE_DOMAIN) {
    return null;
  }

  const cacheKey = `admin:${item.pageType}:${item.blogHandle ?? ""}:${item.handle ?? ""}`;
  if (adminCache.has(cacheKey)) {
    return adminCache.get(cacheKey);
  }

  let summary = null;

  if (item.pageType === "page") {
    const data = await adminQuery(
      `
        query AuditAdminPage($query: String!) {
          pages(first: 1, query: $query) {
            nodes {
              title
              handle
              updatedAt
              body
            }
          }
        }
      `,
      { query: `handle:${item.handle}` },
    );
    const page = data?.pages?.nodes?.[0];
    if (page) {
      summary = `Admin page "${page.title}" last updated ${page.updatedAt} with body length ${page.body?.length ?? 0}.`;
    }
  } else if (item.pageType === "product") {
    const data = await adminQuery(
      `
        query AuditAdminProduct($query: String!) {
          products(first: 1, query: $query) {
            nodes {
              title
              handle
              status
              updatedAt
            }
          }
        }
      `,
      { query: `handle:${item.handle}` },
    );
    const product = data?.products?.nodes?.[0];
    if (product) {
      summary = `Admin product "${product.title}" is ${product.status} and was updated ${product.updatedAt}.`;
    }
  } else if (item.pageType === "collection") {
    const data = await adminQuery(
      `
        query AuditAdminCollection($query: String!) {
          collections(first: 1, query: $query) {
            nodes {
              title
              handle
              updatedAt
            }
          }
        }
      `,
      { query: `handle:${item.handle}` },
    );
    const collection = data?.collections?.nodes?.[0];
    if (collection) {
      summary = `Admin collection "${collection.title}" was updated ${collection.updatedAt}.`;
    }
  }

  adminCache.set(cacheKey, summary);
  return summary;
}

async function storefrontQuery(query, variables) {
  if (!process.env.PUBLIC_STORE_DOMAIN || !process.env.PUBLIC_STOREFRONT_API_TOKEN) {
    return null;
  }

  const response = await fetch(
    `https://${process.env.PUBLIC_STORE_DOMAIN}/api/${STOREFRONT_API_VERSION}/graphql.json`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Storefront-Access-Token":
          process.env.PUBLIC_STOREFRONT_API_TOKEN,
      },
      body: JSON.stringify({ query, variables }),
    },
  );

  if (!response.ok) {
    return null;
  }

  const json = await response.json();
  return json.data ?? null;
}

async function adminQuery(query, variables) {
  const response = await fetch(
    `https://${process.env.PUBLIC_STORE_DOMAIN}/admin/api/${ADMIN_API_VERSION}/graphql.json`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": process.env.SHOPIFY_ADMIN_API_TOKEN,
      },
      body: JSON.stringify({ query, variables }),
    },
  );

  if (!response.ok) {
    return null;
  }

  const json = await response.json();
  return json.data ?? null;
}

async function loadFallbackMap() {
  const source = await readFile(FALLBACK_MAP_PATH, "utf8");
  const pageHandles = new Map();

  for (const match of source.matchAll(
    /"PAGE:([^"]+)":\s*\(\)\s*=>\s*import\("\.\.\/\.\.\/weaverse-pages\/([^"]+)"\)/g,
  )) {
    pageHandles.set(match[1], `weaverse-pages/${match[2]}`);
  }

  return {
    pageHandles,
  };
}

async function scanFallbackJsonFiles() {
  const entries = await readdir(WEAVERSE_PAGES_DIR);
  const findings = [];

  for (const entry of entries.sort()) {
    if (extname(entry) !== ".json") continue;

    const absolutePath = resolve(WEAVERSE_PAGES_DIR, entry);
    const relativePath = relative(ROOT, absolutePath);
    const raw = await readFile(absolutePath, "utf8");
    const parsed = JSON.parse(raw);

    const emptyPaths = [];
    walkJson(parsed, "$", (value, pathName) => {
      if (value === "") {
        emptyPaths.push(pathName);
      }
    });

    if (emptyPaths.length > 0) {
      findings.push(
        createFinding({
          url: `source://${relativePath}`,
          pageType: "source-risk",
          issueType: "fallback_json_empty_fields",
          severity: "medium",
          visibleLive: false,
          evidence: [
            `${relativePath} contains ${emptyPaths.length} empty string field(s).`,
            ...emptyPaths.slice(0, 10).map((pathName) => `Empty field: ${pathName}`),
          ],
          contentSource: `Local fallback JSON (${relativePath})`,
          recommendedFix:
            "Fill or remove empty content fields so mapped fallback pages do not render blank components.",
          owner: "Content / Weaverse",
        }),
      );
    }

    const markerHits = findSourceMarkers(raw);
    if (markerHits.length > 0 && entry !== "homepage.json" && entry !== "reviews.json") {
      findings.push(
        createFinding({
          url: `source://${relativePath}`,
          pageType: "source-risk",
          issueType: "fallback_json_demo_markers",
          severity: "low",
          visibleLive: false,
          evidence: [
            `${relativePath} contains marker hits: ${markerHits.join(", ")}.`,
          ],
          contentSource: `Local fallback JSON (${relativePath})`,
          recommendedFix:
            "Confirm these marker strings are not production-facing copy, then remove or replace them if they are placeholders.",
          owner: "Content / Weaverse",
        }),
      );
    }
  }

  return findings;
}

async function scanPlaceholderCodePaths() {
  const findings = [];

  for (const rule of PLACEHOLDER_FILE_RULES) {
    const absolutePath = resolve(ROOT, rule.file);
    const source = await readFile(absolutePath, "utf8");
    const lines = source.split("\n");
    const evidence = [];

    for (const pattern of rule.patterns) {
      const lineNumber = lines.findIndex((line) => line.includes(pattern));
      if (lineNumber !== -1) {
        evidence.push(`${rule.file}:${lineNumber + 1} contains "${pattern}".`);
      }
    }

    if (evidence.length > 0) {
      findings.push(
        createFinding({
          url: `source://${rule.file}`,
          pageType: "source-risk",
          issueType: rule.issueType,
          severity: rule.severity,
          visibleLive: false,
          evidence,
          contentSource: `Hydrogen section fallback logic (${rule.file})`,
          recommendedFix: rule.recommendedFix,
          owner: rule.owner,
        }),
      );
    }
  }

  return findings;
}

function inferInventoryItem(url, sitemapType) {
  const pathname = new URL(url).pathname.replace(/\/+$/, "");
  const segments = pathname.split("/").filter(Boolean);

  if (sitemapType === "pages") {
    return {
      url,
      pageType: "page",
      handle: segments.at(-1) ?? null,
    };
  }

  if (sitemapType === "products") {
    return {
      url,
      pageType: "product",
      handle: segments.at(-1) ?? null,
    };
  }

  if (sitemapType === "collections") {
    return {
      url,
      pageType: "collection",
      handle: segments.at(-1) ?? null,
    };
  }

  if (sitemapType === "blogs") {
    return {
      url,
      pageType: "blog",
      handle: segments.at(-1) ?? null,
      blogHandle: segments.at(-1) ?? null,
    };
  }

  if (sitemapType === "articles") {
    return {
      url,
      pageType: "article",
      handle: segments.at(-1) ?? null,
      blogHandle: segments.at(-2) ?? null,
    };
  }

  return {
    url,
    pageType: sitemapType ?? "unknown",
    handle: segments.at(-1) ?? null,
  };
}

function inferSitemapType(url) {
  const match = url.match(/\/sitemap\/([^/]+)\//);
  return match?.[1] ?? "unknown";
}

function parseXmlLocs(xml) {
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);
}

function extractTitle(html) {
  return decodeHtmlEntities(html.match(/<title>([^<]*)<\/title>/i)?.[1] ?? "");
}

function extractMainHtml(html) {
  return html.match(/<main\b[^>]*>([\s\S]*?)<\/main>/i)?.[1] ?? "";
}

function extractHeadingText(html) {
  const matches = [
    ...html.matchAll(/<h[1-6]\b[^>]*>([\s\S]*?)<\/h[1-6]>/gi),
  ].map((match) => normalizeText(extractText(match[1])));
  return normalizeText(matches.join(" "));
}

function extractImageInfo(html) {
  const images = [];

  for (const match of html.matchAll(/<img\b[^>]*>/gi)) {
    const tag = match[0];
    images.push({
      alt: decodeHtmlEntities(extractAttribute(tag, "alt") ?? ""),
      src: decodeHtmlEntities(extractAttribute(tag, "src") ?? ""),
    });
  }

  return images;
}

function extractAttribute(tag, name) {
  const match = tag.match(new RegExp(`${name}="([^"]*)"`, "i"));
  return match?.[1] ?? null;
}

function extractText(html) {
  return decodeHtmlEntities(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<svg[\s\S]*?<\/svg>/gi, " ")
      .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
      .replace(/<[^>]+>/g, " "),
  );
}

function decodeHtmlEntities(text) {
  return text
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) =>
      String.fromCharCode(Number.parseInt(code, 16)),
    )
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function normalizeText(text) {
  return text.replace(/\s+/g, " ").trim();
}

function countMatches(text, regex) {
  return [...text.matchAll(regex)].length;
}

function findDemoMatches(text) {
  return DEMO_COPY_PATTERNS.filter((pattern) => pattern.test(text)).map(
    (pattern) => pattern.source,
  );
}

function findSourceMarkers(text) {
  return SOURCE_MARKER_PATTERNS.filter((pattern) => pattern.test(text)).map(
    (pattern) => pattern.source,
  );
}

function walkJson(value, pathName, visitor) {
  visitor(value, pathName);

  if (Array.isArray(value)) {
    value.forEach((item, index) => {
      walkJson(item, `${pathName}[${index}]`, visitor);
    });
    return;
  }

  if (value && typeof value === "object") {
    for (const [key, nestedValue] of Object.entries(value)) {
      walkJson(nestedValue, `${pathName}.${key}`, visitor);
    }
  }
}

function createFinding({
  url,
  pageType,
  issueType,
  severity,
  visibleLive,
  evidence,
  contentSource,
  recommendedFix,
  owner,
}) {
  return {
    url,
    page_type: pageType,
    issue_type: issueType,
    severity,
    visible_live: visibleLive,
    evidence,
    content_source: contentSource,
    recommended_fix: recommendedFix,
    owner,
  };
}

function buildSummary(inventory, findings, fallbackMap) {
  const totalUrls = inventory.length;
  const flaggedUrls = inventory.filter((item) => item.status === "flagged").length;
  const sourceOnlyFindings = findings.filter((finding) =>
    finding.url.startsWith("source://"),
  ).length;

  const findingsBySeverity = findings.reduce(
    (accumulator, finding) => {
      accumulator[finding.severity] = (accumulator[finding.severity] ?? 0) + 1;
      return accumulator;
    },
    { critical: 0, high: 0, medium: 0, low: 0 },
  );

  const flaggedByType = inventory.reduce((accumulator, item) => {
    if (item.status !== "flagged") {
      return accumulator;
    }
    accumulator[item.page_type] = (accumulator[item.page_type] ?? 0) + 1;
    return accumulator;
  }, {});

  return {
    totalUrls,
    flaggedUrls,
    okUrls: totalUrls - flaggedUrls,
    sourceOnlyFindings,
    findingsBySeverity,
    flaggedByType,
    mappedFallbackPages: fallbackMap.pageHandles.size,
  };
}

function buildMarkdownReport(report) {
  const topFindings = report.findings
    .filter((finding) => finding.visible_live)
    .slice(0, 20);
  const sourceRisks = report.findings
    .filter((finding) => !finding.visible_live)
    .slice(0, 20);

  const lines = [
    "# Content Audit",
    "",
    `Generated: ${report.generatedAt}`,
    "",
    "## Summary",
    "",
    `- Audited URLs: ${report.summary.totalUrls}`,
    `- Flagged live URLs: ${report.summary.flaggedUrls}`,
    `- Source-only findings: ${report.summary.sourceOnlyFindings}`,
    `- Severity counts: critical ${report.summary.findingsBySeverity.critical}, high ${report.summary.findingsBySeverity.high}, medium ${report.summary.findingsBySeverity.medium}, low ${report.summary.findingsBySeverity.low}`,
    "",
    "## Highest Priority Live Findings",
    "",
  ];

  if (topFindings.length === 0) {
    lines.push("- None");
  } else {
    for (const finding of topFindings) {
      lines.push(
        `- [${finding.severity}] ${finding.page_type} ${finding.url} -> ${finding.issue_type}`,
      );
      lines.push(`  Evidence: ${finding.evidence.join(" | ")}`);
      lines.push(`  Source: ${finding.content_source}`);
      lines.push(`  Fix: ${finding.recommended_fix}`);
    }
  }

  lines.push("", "## Source Risks", "");

  if (sourceRisks.length === 0) {
    lines.push("- None");
  } else {
    for (const finding of sourceRisks) {
      lines.push(
        `- [${finding.severity}] ${finding.url.replace("source://", "")} -> ${finding.issue_type}`,
      );
      lines.push(`  Evidence: ${finding.evidence.join(" | ")}`);
      lines.push(`  Fix: ${finding.recommended_fix}`);
    }
  }

  lines.push("", "## Flagged URL Inventory", "");

  for (const item of report.inventory.filter((entry) => entry.status === "flagged")) {
    lines.push(`- ${item.page_type} ${item.url}`);
    lines.push(`  Findings: ${item.findings.map((finding) => finding.issue_type).join(", ")}`);
  }

  lines.push("");

  return `${lines.join("\n")}\n`;
}

function sortFindings(left, right) {
  return (
    SEVERITY_RANK[left.severity] - SEVERITY_RANK[right.severity] ||
    left.url.localeCompare(right.url)
  );
}

function truncateEvidence(text, maxLength = 240) {
  if (text.length <= maxLength) {
    return text;
  }

  return `${text.slice(0, maxLength - 3)}...`;
}

async function fetchText(url) {
  const response = await fetch(url, {
    headers: {
      "User-Agent": "ModernCre8ve Content Audit",
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: HTTP ${response.status}`);
  }

  return response.text();
}

async function mapWithConcurrency(items, concurrency, mapper) {
  const results = new Array(items.length);
  let currentIndex = 0;

  async function worker() {
    while (currentIndex < items.length) {
      const index = currentIndex;
      currentIndex += 1;
      results[index] = await mapper(items[index], index);
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, () => worker()),
  );

  return results;
}

function loadDotEnv() {
  try {
    const envFile = readFileSync(ENV_PATH, "utf8");
    for (const line of envFile.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const separatorIndex = trimmed.indexOf("=");
      if (separatorIndex === -1) continue;

      const key = trimmed.slice(0, separatorIndex).trim();
      let value = trimmed.slice(separatorIndex + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      if (!process.env[key]) {
        process.env[key] = value;
      }
    }
  } catch {}
}

await main();
