import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  APPROVALS,
  contentFindings,
  fingerprint,
  nextBusinessDate,
  prepareBatch,
  readiness,
  refreshSnapshot,
  report,
  validateRegister,
} from "../scripts/catalog-rollout.mjs";
import { correctedDraftContent } from "../scripts/catalog-rollout-content.mjs";

const read = (name) =>
  JSON.parse(
    readFileSync(
      new URL(`../docs/catalog-rollout-2026-11/${name}.json`, import.meta.url),
      "utf8",
    ),
  );
const register = read("register");
const baseline = read("baseline");
const postContent = read("post-content-2026-11-05");
const now = new Date(baseline.capturedAt);

function approvedFixture() {
  const r = structuredClone(register);
  // The fixture models the pre-release baseline, so it starts with no batches.
  r.batches = [];
  const s = structuredClone(baseline);
  const entry = r.entries[0];
  const product = s.products.find((p) => p.id === entry.id);
  entry.disposition = "ready";
  entry.approvals = Object.fromEntries(
    APPROVALS.map((key) => [
      key,
      {
        approvedBy: "Test owner",
        approvedAt: now.toISOString(),
        snapshotHash: fingerprint(product),
        notes: `Verified ${key}`,
      },
    ]),
  );
  return { r, s, entry, product };
}

test("all 60 PDF targets and four protected products reconcile without truncated connections", () => {
  assert.deepEqual(validateRegister(register, baseline), []);
  assert.equal(
    baseline.products.reduce((n, p) => n + p.variants.nodes.length, 0),
    668,
  );
  assert.equal(register.entries[2].handle, "lareauxs-furniture-wax");
  assert.equal(
    register.entries.filter((e) => e.wave === "consolidation").length,
    5,
  );
});

test("post-write snapshot preserves every commercial field and all four protected products", () => {
  assert.deepEqual(validateRegister(register, postContent), []);
  const publications = (p) =>
    p.resourcePublicationsV2.nodes
      .map((r) => [r.publication.id, r.isPublished])
      .sort();
  for (const before of baseline.products) {
    const after = postContent.products.find((p) => p.id === before.id);
    assert.equal(after.status, before.status, before.handle);
    assert.deepEqual(
      after.variants.nodes,
      before.variants.nodes,
      before.handle,
    );
    assert.deepEqual(publications(after), publications(before), before.handle);
    if (register.protectedProducts.some((p) => p.id === before.id))
      assert.equal(fingerprint(after), fingerprint(before), before.handle);
    const patch = correctedDraftContent(before);
    if (patch?.input.descriptionHtml)
      assert.equal(
        after.descriptionHtml,
        patch.input.descriptionHtml,
        before.handle,
      );
    if (patch?.input.title)
      assert.equal(after.title, patch.input.title, before.handle);
  }
});

test("owner approval is pending for every item; no historical price is treated as approval", () => {
  const { rows } = report(register, baseline);
  assert.equal(rows.length, 60);
  assert.ok(
    rows.every(
      (r) => r.disposition === "held" && r.approvedPricing === "PENDING",
    ),
  );
  assert.throws(
    () => prepareBatch(register, baseline, [register.entries[0].handle], now),
    /Unapproved or stale pricing/,
  );
});

test("rejects missing, duplicate, protected and incomplete source records", () => {
  const r = structuredClone(register);
  r.entries[1] = r.entries[0];
  assert.ok(validateRegister(r, baseline).length);
  const s = structuredClone(baseline);
  s.products[0].variants.pageInfo.hasNextPage = true;
  assert.match(validateRegister(register, s).join(" "), /Incomplete variants/);
  assert.throws(
    () =>
      prepareBatch(
        register,
        baseline,
        [register.protectedProducts[0].handle],
        now,
      ),
    /protected/,
  );
});

test("approval evidence is bound to the exact product and expires on price or content changes", () => {
  const { entry, product } = approvedFixture();
  assert.deepEqual(readiness(entry, product, now), []);
  product.variants.nodes[0].price = "1.00";
  assert.match(readiness(entry, product, now).join(" "), /stale pricing/);
  assert.throws(
    () => prepareBatch(register, baseline, Array(6).fill(entry.handle), now),
    /one to five/,
  );
});

test("only complete, current approvals produce a review-only proposal with rollback data", () => {
  const { r, s, entry } = approvedFixture();
  const proposal = prepareBatch(r, s, [entry.handle], now);
  assert.equal(proposal.products[0].before.status, "UNLISTED");
  assert.equal(proposal.products[0].proposed.status, "ACTIVE");
  assert.equal(
    proposal.products[0].proposed.publishOnlyTo,
    register.publicationId,
  );
  assert.match(proposal.status, /no Shopify writes/);
  assert.throws(
    () =>
      prepareBatch(
        r,
        s,
        [entry.handle],
        new Date(now.getTime() + 25 * 3600000),
      ),
    /within 24 hours/,
  );
});

test("five consolidation candidates never enter a publication batch", () => {
  const r = structuredClone(register);
  const entry = r.entries.find((e) => e.wave === "consolidation");
  const product = baseline.products.find((p) => p.id === entry.id);
  entry.disposition = "ready";
  entry.approvals = Object.fromEntries(
    APPROVALS.map((key) => [
      key,
      {
        approvedBy: "Test owner",
        approvedAt: now.toISOString(),
        snapshotHash: fingerprint(product),
        notes: "Checked",
      },
    ]),
  );
  assert.throws(
    () => prepareBatch(r, baseline, [entry.handle], now),
    /Consolidation requires/,
  );
});

test("next-business-day review skips weekends and configured closure dates", () => {
  assert.equal(nextBusinessDate("2026-11-06"), "2026-11-09");
  assert.equal(nextBusinessDate("2026-11-06", ["2026-11-09"]), "2026-11-10");
  const { r, s, entry } = approvedFixture();
  r.batches.push({
    id: "first",
    publishedAt: now.toISOString(),
    handles: [r.entries[1].handle],
    review: null,
  });
  assert.throws(
    () => prepareBatch(r, s, [entry.handle], now),
    /next-business-day/,
  );
  r.batches[0].review = {
    passed: true,
    reviewedBy: "Test operator",
    reviewedAt: now.toISOString(),
    evidence: "Same-day check",
  };
  assert.throws(
    () => prepareBatch(r, s, [entry.handle], now),
    /next-business-day/,
  );
});

test("content audit identifies observed launch blockers without asserting that all other copy is approved", () => {
  const provo = baseline.products.find(
    (p) => p.handle === "the-modern-coffee-table-provo",
  );
  assert.match(contentFindings(provo).join(" "), /Provo title/);
  assert.match(contentFindings(provo).join(" "), /Obsolete production/);
  const seymour = baseline.products.find(
    (p) => p.handle === "the-seymour-modern-dining-chair",
  );
  assert.match(contentFindings(seymour).join(" "), /origin claims/);
});

test("mechanical draft corrections are idempotent and cannot touch price, variants or publication", () => {
  for (const product of baseline.products) {
    const patch = correctedDraftContent(product);
    if (!patch) continue;
    assert.equal(product.status, "DRAFT");
    assert.ok(
      Object.keys(patch.input).every((k) =>
        ["id", "title", "descriptionHtml"].includes(k),
      ),
    );
    assert.equal(correctedDraftContent({ ...product, ...patch.input }), null);
  }
  for (const product of baseline.products.filter((p) => p.status !== "DRAFT"))
    assert.equal(correctedDraftContent(product), null);
  const wax = baseline.products.find(
    (p) => p.handle === "lareauxs-furniture-wax",
  );
  const correction = correctedDraftContent(wax);
  assert.match(correction.input.descriptionHtml, /3–5 business days/);
  assert.doesNotMatch(correction.input.descriptionHtml, /http:\/\/ALL%20/);
});

test("snapshot refresh paginates beyond 50 variants and rejects incomplete products", async () => {
  let pages = 0;
  const fixture = structuredClone(baseline);
  const target = fixture.products[0];
  const extra = structuredClone(target.variants.nodes[0]);
  extra.id += "-extra";
  const graphql = async (query, variables) => {
    if (query.includes("MoreVariants")) {
      pages++;
      return {
        products: {
          nodes: [
            {
              id: target.id,
              variants: {
                nodes: [extra],
                pageInfo: { hasNextPage: false, endCursor: "done" },
              },
            },
          ],
        },
      };
    }
    const ids = variables.query
      .split(" OR ")
      .map((v) => `gid://shopify/Product/${v.slice(3)}`);
    const products = fixture.products
      .filter((p) => ids.includes(p.id))
      .map((p) => structuredClone(p));
    const first = products.find((p) => p.id === target.id);
    if (first)
      first.variants.pageInfo = { hasNextPage: true, endCursor: "more" };
    return { products: { nodes: products, pageInfo: { hasNextPage: false } } };
  };
  const refreshed = await refreshSnapshot(register, baseline, graphql);
  assert.equal(pages, 1);
  assert.equal(
    refreshed.products.find((p) => p.id === target.id).variants.nodes.length,
    target.variants.nodes.length + 1,
  );
  await assert.rejects(
    () =>
      refreshSnapshot(register, baseline, async () => ({
        products: { nodes: [], pageInfo: { hasNextPage: false } },
      })),
    /incomplete/,
  );
});
