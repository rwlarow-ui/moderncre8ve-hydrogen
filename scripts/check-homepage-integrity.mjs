#!/usr/bin/env node

const baseUrl = process.env.BASE_URL || "http://127.0.0.1:3000";

const requiredPaths = [
  "/collections",
  "/collections/mid-century-modern-dining-tables",
  "/collections/scandinavian-design-furniture",
  "/collections/all-products",
  "/products/minimalist-bed-frame-ohio",
  "/products/scandinavian-oval-dining-table-mar-vista",
  "/products/the-seymour-modern-dining-chair",
  "/pages/about-us",
  "/blogs/mid-century-modern-scandi-japandi-design-blog",
  "/policies/privacy-policy",
  "/sitemap-html",
];

const homepageBlockers = [
  {
    label: "stale_about_link",
    test: ({ html, links }) =>
      html.includes("/faq/about-us-1") || links.includes("/faq/about-us-1"),
    message: "Homepage contains stale /faq/about-us-1 link.",
  },
  {
    label: "generic_products_link",
    test: ({ links }) => links.includes("/products/"),
    message: 'Homepage contains generic "/products/" detail link.',
  },
  {
    label: "placeholder_title",
    test: ({ text }) => /example product title/i.test(text),
    message: "Homepage contains placeholder product copy.",
  },
  {
    label: "placeholder_image",
    test: ({ html, text }) =>
      html.includes("fpo-product-lamp-2-1024x1024.svg") ||
      /product placeholder/i.test(text),
    message: "Homepage contains placeholder product imagery or alt text.",
  },
];

const destinationBlockers = [
  {
    label: "page_content_mismatch",
    test: (text) => /contact us visit us sign up & save 15%/i.test(text),
    message:
      'Destination renders known contact-page mismatch copy "CONTACT US VISIT US SIGN UP & SAVE 15%".',
  },
  {
    label: "404_copy",
    test: (text) =>
      /we['’]ve lost this page|couldn[’']t find the page you[’']re looking for/i.test(
        text,
      ),
    message: "Destination renders 404 copy.",
  },
  {
    label: "placeholder_title",
    test: (text) => /example product title/i.test(text),
    message: "Destination renders placeholder product copy.",
  },
];

async function main() {
  const homepageUrl = new URL("/", baseUrl).toString();
  const homepageHtml = await fetchText(homepageUrl);
  const cleanedHomepageHtml = sanitizeHtml(homepageHtml);
  const homepageBodyHtml = extractBodyHtml(cleanedHomepageHtml);
  const homepageText = normalizeText(cleanedHomepageHtml);
  const homepageLinks = extractInternalLinks(homepageBodyHtml);
  const uniqueHomepageLinks = [...new Set(homepageLinks)];

  const failures = [];

  for (const blocker of homepageBlockers) {
    if (blocker.test({ html: cleanedHomepageHtml, text: homepageText, links: uniqueHomepageLinks })) {
      failures.push({
        scope: "homepage",
        check: blocker.label,
        message: blocker.message,
      });
    }
  }

  for (const requiredPath of requiredPaths) {
    if (!uniqueHomepageLinks.includes(requiredPath)) {
      failures.push({
        scope: "homepage",
        check: "missing_required_link",
        message: `Homepage is missing required internal link ${requiredPath}.`,
      });
    }
  }

  const destinationResults = [];
  for (const path of uniqueHomepageLinks) {
    if (shouldSkipLink(path)) {
      continue;
    }

    const url = new URL(path, baseUrl).toString();
    const response = await fetch(url, { redirect: "follow" });
    const html = await response.text();
    const cleanedHtml = sanitizeHtml(html);
    const text = normalizeText(extractMainHtml(cleanedHtml) || cleanedHtml);
    const issues = [];

    if (response.status >= 400) {
      issues.push(`http_${response.status}`);
      failures.push({
        scope: "destination",
        check: `http_${response.status}`,
        message: `${path} returned HTTP ${response.status}.`,
      });
    }

    for (const blocker of destinationBlockers) {
      if (blocker.test(text)) {
        issues.push(blocker.label);
        failures.push({
          scope: "destination",
          check: blocker.label,
          message: `${path}: ${blocker.message}`,
        });
      }
    }

    destinationResults.push({
      path,
      finalUrl: response.url,
      status: response.status,
      issues,
    });
  }

  const summary = {
    baseUrl,
    homepageLinks: uniqueHomepageLinks,
    checkedDestinations: destinationResults.length,
    failures,
  };

  if (failures.length) {
    console.error(JSON.stringify(summary, null, 2));
    process.exitCode = 1;
    return;
  }

  console.log(JSON.stringify(summary, null, 2));
}

function extractInternalLinks(html) {
  return [...html.matchAll(/href="([^"]+)"/g)]
    .map((match) => match[1])
    .filter((href) => href.startsWith("/") && !href.startsWith("//"));
}

function extractBodyHtml(html) {
  return (html.match(/<body[\s\S]*?<\/body>/i) || [])[0] || html;
}

function extractMainHtml(html) {
  return (html.match(/<main[\s\S]*?<\/main>/i) || [])[0] || "";
}

function sanitizeHtml(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ");
}

function normalizeText(html) {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function shouldSkipLink(path) {
  return (
    path === "/favicon.ico" ||
    path.startsWith("/assets/") ||
    /\.(?:css|js|mjs|json|map|png|jpe?g|webp|gif|svg|ico|woff2?|ttf|otf)$/i.test(
      path,
    ) ||
    path.startsWith("/cdn/") ||
    path.startsWith("/cart") ||
    path.startsWith("/account")
  );
}

async function fetchText(url) {
  const response = await fetch(url, { redirect: "follow" });
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status}`);
  }
  return response.text();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
