#!/usr/bin/env node
/** Read-only Shopify audit and local batch preparation. Never publishes products. */
import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("../", import.meta.url));
const DIR = resolve(ROOT, "docs/catalog-rollout-2026-11");
export const APPROVALS = [
  "pricing",
  "fulfillment",
  "specifications",
  "origin",
  "inventory",
  "content",
  "imagery",
  "merchandising",
];
export const WAVE_COUNTS = { 1: 9, 2: 10, 3: 22, 4: 14, consolidation: 5 };
export const PRODUCT_FIELDS = `
  id handle title status updatedAt productType vendor tags descriptionHtml
  mediaCount { count } seo { title description }
  collections(first:50) { nodes { id handle title } pageInfo { hasNextPage endCursor } }
  resourcePublicationsV2(first:50, onlyPublished:false) {
    nodes { isPublished publication { id catalog { id title } } }
    pageInfo { hasNextPage endCursor }
  }`;
export const VARIANT_FIELDS = `
  id title sku price inventoryQuantity inventoryPolicy availableForSale
  selectedOptions { name value }
  inventoryItem { id tracked countryCodeOfOrigin }`;
export const SNAPSHOT_QUERY = `query CatalogRolloutSnapshot($query:String!) {
  products(first:5, query:$query) { nodes { ${PRODUCT_FIELDS}
    variants(first:50) { nodes { ${VARIANT_FIELDS} } pageInfo { hasNextPage endCursor } }
  } pageInfo { hasNextPage endCursor } }
}`;
export const MORE_VARIANTS_QUERY = `query MoreVariants($query:String!, $after:String!) {
  products(first:1, query:$query) { nodes { id
    variants(first:50, after:$after) { nodes { ${VARIANT_FIELDS} } pageInfo { hasNextPage endCursor } }
  } }
}`;

export function fingerprint(product) {
  return createHash("sha256").update(JSON.stringify(product)).digest("hex");
}

export function validateRegister(register, snapshot) {
  const errors = [];
  const ids = register.entries.map((e) => e.id);
  const handles = register.entries.map((e) => e.handle);
  const protectedIds = new Set(register.protectedProducts.map((p) => p.id));
  if (
    ids.length !== 60 ||
    new Set(ids).size !== 60 ||
    new Set(handles).size !== 60
  )
    errors.push("Expected exactly 60 unique target IDs and handles.");
  if (protectedIds.size !== 4 || ids.some((id) => protectedIds.has(id)))
    errors.push("Four protected products must remain outside the target list.");
  if (register.maxBatchSize !== 5)
    errors.push("Maximum batch size must be five.");
  if (register.publicationId !== snapshot.publication.id)
    errors.push("Snapshot and register publication IDs differ.");
  const byId = new Map(snapshot.products.map((p) => [p.id, p]));
  if (byId.size !== snapshot.products.length)
    errors.push("Duplicate snapshot product IDs.");
  for (const entry of [...register.entries, ...register.protectedProducts]) {
    const product = byId.get(entry.id);
    if (!product || product.handle !== entry.handle)
      errors.push(`Missing product or changed handle: ${entry.handle}`);
  }
  if (
    snapshot.products.some(
      (p) => !ids.includes(p.id) && !protectedIds.has(p.id),
    )
  )
    errors.push("Snapshot includes out-of-scope products.");
  for (const [wave, count] of Object.entries(WAVE_COUNTS)) {
    if (register.entries.filter((e) => e.wave === wave).length !== count)
      errors.push(`Wave ${wave} must contain ${count} items.`);
  }
  for (const p of snapshot.products) {
    for (const field of ["collections", "resourcePublicationsV2", "variants"]) {
      if (!p[field] || p[field].pageInfo?.hasNextPage !== false)
        errors.push(`Incomplete ${field}: ${p.handle}`);
    }
  }
  return errors;
}

export function contentFindings(product) {
  const html = product.descriptionHtml ?? "";
  const findings = [];
  if (!html.trim()) findings.push("Missing product description");
  if (
    /\b(?:4\s*[-–]\s*6|6\s*[-–]\s*8|8\s*[-–]\s*10|8|10)\s*weeks?\b/i.test(html)
  )
    findings.push(
      "Obsolete production lead time; confirm and replace with 12–16 weeks",
    );
  if (/prices?\s+include[\s\S]{0,200}?(?:<strong>)?tax\b/i.test(html))
    findings.push("Tax-included claim needs correction");
  if (
    /href=["'](?:http[^"']*%20[^"']*|\/(?:about-us|our-amish-craftsmanship|warranty-and-guarantee|learn-more-craftsmanship))(?:["'])/i.test(
      html,
    )
  )
    findings.push("Malformed or legacy internal link");
  if (/\b(?:two.year|2.year) warranty\b/i.test(html))
    findings.push("Warranty conflicts with storefront one-year promise");
  if (!product.productType) findings.push("Missing product type");
  if (
    product.handle === "the-modern-coffee-table-provo" &&
    /dining/i.test(product.title)
  )
    findings.push(
      "Provo title conflicts with coffee-table dimensions and type",
    );
  if (
    product.handle === "the-seymour-modern-dining-chair" &&
    /Amish|Ohio|made in (?:the )?USA/i.test(html)
  )
    findings.push(
      "Seymour origin claims conflict with repository non-US classification",
    );
  if (product.handle === "mid-century-modern-floor-lamp-warwick")
    findings.push(
      "Verify lamp origin, fulfillment and delivery treatment separately",
    );
  if ((product.mediaCount?.count ?? 0) === 0)
    findings.push("Missing product media");
  if (!product.collections.nodes.length)
    findings.push("No collection placement");
  if (product.variants.nodes.some((v) => v.inventoryQuantity < 0))
    findings.push("Negative inventory requires review");
  if (
    product.variants.nodes.some(
      (v) =>
        v.inventoryItem.tracked &&
        v.inventoryQuantity <= 0 &&
        v.inventoryPolicy === "DENY",
    )
  )
    findings.push(
      "Tracked zero-stock variants deny purchase; confirm buildability before changing policy",
    );
  return findings;
}

function validEvidence(evidence, hash, now) {
  const approvedAt = Date.parse(evidence?.approvedAt);
  return !!(
    evidence?.approvedBy?.trim() &&
    evidence?.notes?.trim() &&
    evidence.snapshotHash === hash &&
    Number.isFinite(approvedAt) &&
    approvedAt <= now.getTime()
  );
}

export function readiness(entry, product, now = new Date()) {
  if (!product) return ["Product missing from snapshot"];
  const hash = fingerprint(product);
  const blockers = APPROVALS.filter(
    (key) => !validEvidence(entry.approvals?.[key], hash, now),
  ).map((key) => `Unapproved or stale ${key}`);
  if (entry.wave === "consolidation")
    blockers.push(
      "Consolidation requires verified equivalent configurations and tested redirect; excluded from publish batches",
    );
  if (entry.disposition !== "ready")
    blockers.push(`Disposition is ${entry.disposition}, not ready`);
  if (!entry.owner || !/^\d{4}-\d{2}-\d{2}$/.test(entry.reviewDate ?? ""))
    blockers.push("Missing responsible owner or review date");
  return blockers;
}

export function localDate(value, timeZone = "America/New_York") {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(value));
}

export function nextBusinessDate(date, closedDates = []) {
  const cursor = new Date(`${date}T12:00:00Z`);
  if (!Number.isFinite(cursor.getTime()))
    throw new Error("Invalid business date");
  do {
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  } while (
    [0, 6].includes(cursor.getUTCDay()) ||
    closedDates.includes(cursor.toISOString().slice(0, 10))
  );
  return cursor.toISOString().slice(0, 10);
}

export function prepareBatch(register, snapshot, handles, now = new Date()) {
  const errors = validateRegister(register, snapshot);
  if (
    handles.length === 0 ||
    handles.length > 5 ||
    new Set(handles).size !== handles.length
  )
    errors.push("Select one to five unique products.");
  const age = now.getTime() - Date.parse(snapshot.capturedAt);
  if (!Number.isFinite(age) || age < 0 || age > 24 * 60 * 60 * 1000)
    errors.push(
      "Refresh the Shopify snapshot within 24 hours of batch preparation.",
    );
  const protectedHandles = new Set(
    register.protectedProducts.map((p) => p.handle),
  );
  const chosen = handles.map((handle) =>
    register.entries.find((e) => e.handle === handle),
  );
  for (const [index, entry] of chosen.entries()) {
    if (!entry || protectedHandles.has(handles[index])) {
      errors.push(`Out-of-scope or protected product: ${handles[index]}`);
      continue;
    }
    const product = snapshot.products.find((p) => p.id === entry.id);
    errors.push(
      ...readiness(entry, product, now).map((b) => `${entry.handle}: ${b}`),
    );
    if (product?.status === "ACTIVE")
      errors.push(`Already active: ${entry.handle}`);
  }
  if (new Set(chosen.filter(Boolean).map((e) => e.wave)).size > 1)
    errors.push("A batch must belong to one wave.");
  for (const batch of register.batches) {
    const earliest = nextBusinessDate(
      localDate(batch.publishedAt, register.timeZone),
      register.closedDates,
    );
    const review = batch.review;
    if (
      !review?.passed ||
      !review?.reviewedBy ||
      !review?.evidence ||
      !Number.isFinite(Date.parse(review?.reviewedAt)) ||
      localDate(review.reviewedAt, register.timeZone) < earliest ||
      Date.parse(review.reviewedAt) > now.getTime() ||
      localDate(now, register.timeZone) < earliest
    )
      errors.push(
        `Batch ${batch.id}: next-business-day review has not passed.`,
      );
    if (batch.handles?.some((h) => handles.includes(h)))
      errors.push(`Product already recorded in batch ${batch.id}.`);
  }
  if (errors.length) throw new Error(errors.join("\n"));
  return {
    preparedAt: now.toISOString(),
    publicationId: register.publicationId,
    status: "review-only; no Shopify writes performed",
    products: chosen.map((entry) => {
      const before = snapshot.products.find((p) => p.id === entry.id);
      return {
        id: entry.id,
        handle: entry.handle,
        snapshotHash: fingerprint(before),
        before,
        proposed: { status: "ACTIVE", publishOnlyTo: register.publicationId },
      };
    }),
  };
}

export async function refreshSnapshot(register, baseline, graphql) {
  const wanted = [...register.entries, ...register.protectedProducts];
  const products = [];
  for (let offset = 0; offset < wanted.length; offset += 5) {
    const chunk = wanted.slice(offset, offset + 5);
    const data = await graphql(SNAPSHOT_QUERY, {
      query: chunk.map((e) => `id:${e.id.split("/").at(-1)}`).join(" OR "),
    });
    if (
      data.products.pageInfo.hasNextPage ||
      data.products.nodes.length !== chunk.length
    )
      throw new Error("Product lookup incomplete; no snapshot saved.");
    for (const p of data.products.nodes) {
      while (p.variants.pageInfo.hasNextPage) {
        const result = await graphql(MORE_VARIANTS_QUERY, {
          query: `id:${p.id.split("/").at(-1)}`,
          after: p.variants.pageInfo.endCursor,
        });
        const extra = result.products.nodes[0]?.variants;
        if (
          !extra ||
          extra.pageInfo.endCursor === p.variants.pageInfo.endCursor
        )
          throw new Error(`Variant pagination failed: ${p.handle}`);
        p.variants.nodes.push(...extra.nodes);
        p.variants.pageInfo = extra.pageInfo;
      }
      products.push(p);
    }
  }
  const snapshot = {
    ...baseline,
    capturedAt: new Date().toISOString(),
    products,
  };
  const errors = validateRegister(register, snapshot);
  if (errors.length) throw new Error(errors.join("\n"));
  return snapshot;
}

const csvCell = (value) => `"${String(value ?? "").replaceAll('"', '""')}"`;
export function report(register, snapshot) {
  const errors = validateRegister(register, snapshot);
  if (errors.length) throw new Error(errors.join("\n"));
  const rows = register.entries.map((entry, index) => {
    const product = snapshot.products.find((p) => p.id === entry.id);
    const publication = product.resourcePublicationsV2.nodes.find(
      (p) => p.publication.id === register.publicationId,
    );
    return {
      order: index + 1,
      wave: entry.wave,
      title: product.title,
      id: product.id,
      handle: product.handle,
      status: product.status,
      storefrontPublished: publication?.isPublished ?? false,
      snapshotHash: fingerprint(product),
      currentPrices: product.variants.nodes
        .map((v) => `${v.id.split("/").at(-1)}=${v.price}`)
        .join("; "),
      approvedPricing: entry.approvals.pricing?.notes ?? "PENDING",
      fulfillmentConfirmation: entry.approvals.fulfillment?.notes ?? "PENDING",
      disposition: entry.disposition,
      owner: entry.owner,
      reviewDate: entry.reviewDate,
      blocker: entry.blocker,
      candidateDestination: entry.candidateDestination,
      approvedDestination: entry.approvedDestination,
      contentIssues: contentFindings(product).join("; "),
      readinessBlockers: readiness(entry, product).join("; "),
    };
  });
  const columns = Object.keys(rows[0]);
  return {
    rows,
    csv:
      [
        columns.map(csvCell).join(","),
        ...rows.map((row) => columns.map((key) => csvCell(row[key])).join(",")),
      ].join("\n") + "\n",
  };
}

async function main() {
  const args = process.argv.slice(2);
  const supported = /^(?:--refresh|--write|--snapshot=.+|--batch=.+|--help)$/;
  if (args.some((arg) => !supported.test(arg)))
    throw new Error(
      "Unsupported argument. This tool has no --apply or publish mode.",
    );
  if (args.includes("--help")) {
    console.log(
      "catalog-rollout.mjs [--snapshot=PATH] [--refresh] [--write] [--batch=handle,handle]\nRead-only audit; --write exports CSV. --refresh saves a new dated snapshot. --batch prepares a gated local proposal only.",
    );
    return;
  }
  const register = JSON.parse(
    await readFile(resolve(DIR, "register.json"), "utf8"),
  );
  const baseline = JSON.parse(
    await readFile(resolve(DIR, "baseline.json"), "utf8"),
  );
  const snapshotArg = args.find((a) => a.startsWith("--snapshot="))?.slice(11);
  let snapshot = snapshotArg
    ? JSON.parse(await readFile(resolve(ROOT, snapshotArg), "utf8"))
    : JSON.parse(
        await readFile(
          resolve(DIR, register.currentSnapshot ?? "baseline.json"),
          "utf8",
        ),
      );
  if (args.includes("--refresh")) {
    const token = process.env.SHOPIFY_ADMIN_API_TOKEN;
    if (!token)
      throw new Error(
        "SHOPIFY_ADMIN_API_TOKEN required for refresh. Use node --env-file=.env scripts/catalog-rollout.mjs --refresh --write.",
      );
    const graphql = async (query, variables) => {
      const response = await fetch(
        `https://${baseline.storeDomain}/admin/api/${baseline.apiVersion}/graphql.json`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Shopify-Access-Token": token,
          },
          body: JSON.stringify({ query, variables }),
          signal: AbortSignal.timeout(30000),
        },
      );
      const json = await response.json();
      if (!response.ok || json.errors || !json.data)
        throw new Error(
          `Shopify read failed (${response.status}): ${JSON.stringify(json.errors ?? [])}`,
        );
      return json.data;
    };
    snapshot = await refreshSnapshot(register, baseline, graphql);
    const path = resolve(
      DIR,
      `snapshot-${snapshot.capturedAt.replaceAll(":", "-")}.json`,
    );
    await writeFile(path, JSON.stringify(snapshot, null, 2) + "\n", {
      flag: "wx",
    });
    console.log(`Snapshot: ${path}`);
  }
  const result = report(register, snapshot);
  if (args.includes("--write")) {
    await writeFile(resolve(DIR, "register.csv"), result.csv);
    console.log(`Register: ${resolve(DIR, "register.csv")}`);
  }
  const batchArg = args.find((a) => a.startsWith("--batch="));
  if (batchArg) {
    const proposal = prepareBatch(
      register,
      snapshot,
      batchArg.slice(8).split(","),
    );
    const path = resolve(
      DIR,
      `batch-${proposal.preparedAt.replaceAll(":", "-")}.json`,
    );
    await writeFile(path, JSON.stringify(proposal, null, 2) + "\n", {
      flag: "wx",
    });
    console.log(`Review-only batch with rollback baseline: ${path}`);
  }
  console.log(
    JSON.stringify(
      {
        capturedAt: snapshot.capturedAt,
        targets: result.rows.length,
        protected: register.protectedProducts.length,
        ready: result.rows.filter((r) => !r.readinessBlockers).length,
        dispositions: result.rows.reduce(
          (counts, r) => ({
            ...counts,
            [r.disposition]: (counts[r.disposition] ?? 0) + 1,
          }),
          {},
        ),
      },
      null,
      2,
    ),
  );
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
)
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
