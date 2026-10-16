import assert from "node:assert/strict";
import test from "node:test";
import { PDFDocument } from "pdf-lib";
import { validateLogistics } from "../app/utils/logistics.js";
import {
  buildPoDocument,
  buildPoNumber,
  wrapText,
} from "../app/utils/po-document.js";
import {
  buildPoEmail,
  bytesToBase64,
  escapeHtml,
  readEmailConfig,
} from "../app/utils/po-email.js";
import { renderPoPdf } from "../app/utils/po-pdf.server.js";
import { sendProductionPo } from "../app/utils/po-send.server.js";

const logistics = validateLogistics({
  dwelling: "apartment_condo",
  address1: "12 Maple St",
  address2: "Apt 4",
  city: "Lancaster",
  state: "PA",
  zip: "17601",
  phone: "7175550100",
  stairs: "one_flight",
  elevator: "freight",
  doorwayWidthIn: "32",
  hallwayWidthIn: "36",
  stairwellWidthIn: "34",
  notes: "Gate code 1234",
}).value;

function makePo(overrides = {}) {
  return {
    orderId: "gid://shopify/Order/1009",
    orderName: "#1009",
    state: "approved",
    revision: 1,
    lineSpecs: [
      {
        lineItemId: "l1",
        product: "Walnut Table",
        quantity: 2,
        size: '72"',
        species: "Walnut",
        leaf: "No Leaf",
        finish: "Natural",
        otherOptions: "Color: Brown",
        notes: "Rush",
      },
    ],
    snapshot: {
      status: "complete",
      logistics,
      order: { customerName: "Pat Smith", customerEmail: "pat@example.com" },
    },
    ...overrides,
  };
}

const env = {
  RESEND_API_KEY: "re_test",
  PO_FROM_EMAIL: "ModernCre8ve Orders <orders@moderncre8ve.com>",
  PO_PARTNER_EMAIL: "partner@example.com",
  PO_CC_EMAIL: "shop@example.com",
};

test("PO number strips the # and carries the revision", () => {
  assert.equal(buildPoNumber("#1009", 1), "PO-1009-R1");
  assert.equal(buildPoNumber("#1009", 3), "PO-1009-R3");
  assert.equal(buildPoNumber("", 0), "PO-ORDER-R1");
});

test("document marks unapproved POs as drafts and includes delivery rows", () => {
  assert.equal(buildPoDocument({ po: makePo() }).draft, false);
  assert.equal(buildPoDocument({ po: makePo({ state: "sent" }) }).draft, false);
  assert.equal(
    buildPoDocument({ po: makePo({ state: "ready_for_review" }) }).draft,
    true,
  );
  const doc = buildPoDocument({ po: makePo() });
  const labels = Object.fromEntries(doc.delivery);
  assert.equal(labels["Deliver to"], "12 Maple St, Apt 4, Lancaster PA 17601");
  assert.equal(labels.Stairs, "One flight");
  assert.equal(labels["Stairwell width"], "34 in");
  assert.equal(labels.Contact, "Pat Smith");
  // The customer's email is not part of the partner's document.
  assert.ok(!JSON.stringify(doc).includes("pat@example.com"));
});

test("an approved PO keeps its approval date; previews use today", () => {
  const approved = buildPoDocument({
    po: makePo({ approvedAt: "2026-10-01T15:00:00.000Z" }),
  });
  assert.equal(approved.issuedAt, "2026-10-01");
  const preview = buildPoDocument({
    po: makePo({
      state: "ready_for_review",
      approvedAt: "2026-10-01T15:00:00.000Z",
    }),
    issuedAt: new Date("2026-10-16T12:00:00Z"),
  });
  assert.equal(preview.issuedAt, "2026-10-16");
});

test("document has no delivery block without complete logistics", () => {
  const doc = buildPoDocument({
    po: makePo({ snapshot: { status: "later", logistics: null } }),
  });
  assert.equal(doc.delivery, null);
});

test("wrapText wraps on width and splits oversized words", () => {
  const measure = (value) => value.length;
  assert.deepEqual(wrapText("aaa bbb ccc", 7, measure), ["aaa bbb", "ccc"]);
  assert.deepEqual(wrapText("abcdefghij", 4, measure), ["abcd", "efgh", "ij"]);
  assert.deepEqual(wrapText("one\ntwo", 20, measure), ["one", "two"]);
});

test("renders a valid PDF, including non-WinAnsi text", async () => {
  const doc = buildPoDocument({
    po: makePo({
      lineSpecs: [{ ...makePo().lineSpecs[0], notes: "Zażółć gęślą jaźń" }],
    }),
  });
  const bytes = await renderPoPdf(doc);
  assert.equal(Buffer.from(bytes.slice(0, 5)).toString(), "%PDF-");
  const loaded = await PDFDocument.load(bytes);
  assert.equal(loaded.getPageCount(), 1);
  assert.match(loaded.getTitle(), /PO-1009-R1/);
});

test("a long PO paginates", async () => {
  const many = Array.from({ length: 40 }, (_, i) => ({
    ...makePo().lineSpecs[0],
    lineItemId: `l${i}`,
    product: `Piece number ${i + 1}`,
  }));
  const bytes = await renderPoPdf(
    buildPoDocument({ po: makePo({ lineSpecs: many }) }),
  );
  assert.ok((await PDFDocument.load(bytes)).getPageCount() > 1);
});

test("email config reports missing and invalid values", () => {
  assert.equal(readEmailConfig(env).ok, true);
  const empty = readEmailConfig({});
  assert.deepEqual(empty.missing, [
    "RESEND_API_KEY",
    "PO_FROM_EMAIL",
    "PO_PARTNER_EMAIL",
  ]);
  const bad = readEmailConfig({
    ...env,
    PO_PARTNER_EMAIL: "nope",
    PO_CC_EMAIL: "x",
  });
  assert.deepEqual(bad.invalid, ["PO_PARTNER_EMAIL", "PO_CC_EMAIL"]);
  assert.equal(readEmailConfig({ ...env, PO_CC_EMAIL: "" }).cc, null);
});

test("email payload targets only the configured recipients", () => {
  const config = readEmailConfig(env);
  const document = buildPoDocument({ po: makePo() });
  const payload = buildPoEmail({
    document,
    pdfBytes: new Uint8Array([1, 2, 3]),
    config,
  });
  assert.deepEqual(payload.to, ["partner@example.com"]);
  assert.deepEqual(payload.cc, ["shop@example.com"]);
  assert.equal(payload.attachments[0].filename, "PO-1009-R1.pdf");
  assert.equal(payload.attachments[0].content, "AQID");
  assert.match(payload.subject, /PO-1009-R1/);
  // Address and phone live in the PDF only.
  assert.ok(!payload.text.includes("Maple"));
  assert.ok(!payload.text.includes("7175550100"));
  assert.match(
    buildPoEmail({ document, pdfBytes: new Uint8Array(), config, resend: true })
      .subject,
    /^Resent:/,
  );
});

test("html escaping and large base64", () => {
  assert.equal(
    escapeHtml('<a href="x">&'),
    "&lt;a href=&quot;x&quot;&gt;&amp;",
  );
  const big = new Uint8Array(200_000).fill(65);
  assert.equal(Buffer.from(bytesToBase64(big), "base64").length, 200_000);
});

function makeDeps(overrides = {}) {
  const calls = { fetch: [], marked: [] };
  return {
    calls,
    deps: {
      getPo: async () => makePo(),
      markSent: async (...args) => {
        calls.marked.push(args);
      },
      render: async () => new Uint8Array([1, 2, 3]),
      newKey: () => "fresh-key",
      fetchImpl: async (url, init) => {
        calls.fetch.push({ url, init });
        return { ok: true, status: 200, json: async () => ({ id: "msg_1" }) };
      },
      ...overrides,
    },
  };
}

test("sends an approved PO once, with an idempotency key, then marks it sent", async () => {
  const { deps, calls } = makeDeps();
  const result = await sendProductionPo(env, "1", { deps });
  assert.equal(result.messageId, "msg_1");
  assert.equal(calls.fetch.length, 1);
  const { url, init } = calls.fetch[0];
  assert.equal(url, "https://api.resend.com/emails");
  assert.equal(init.headers.Authorization, "Bearer re_test");
  assert.equal(init.headers["Idempotency-Key"], "po-1-r1");
  assert.deepEqual(JSON.parse(init.body).to, ["partner@example.com"]);
  assert.deepEqual(calls.marked[0], [
    env,
    "1",
    { messageId: "msg_1", resend: false },
  ]);
});

test("refuses to send anything that isn't approved, before any network call", async () => {
  for (const state of [
    "draft",
    "awaiting_logistics",
    "ready_for_review",
    "cancelled",
    "sent",
  ]) {
    const { deps, calls } = makeDeps({ getPo: async () => makePo({ state }) });
    await assert.rejects(
      () => sendProductionPo(env, "1", { deps }),
      /approved/,
    );
    assert.equal(calls.fetch.length, 0);
  }
});

test("refuses to send without email config", async () => {
  const { deps, calls } = makeDeps();
  await assert.rejects(
    () => sendProductionPo({ ...env, PO_PARTNER_EMAIL: "" }, "1", { deps }),
    /PO_PARTNER_EMAIL/,
  );
  assert.equal(calls.fetch.length, 0);
});

test("a provider failure leaves the PO unsent", async () => {
  const { deps, calls } = makeDeps({
    fetchImpl: async () => ({
      ok: false,
      status: 422,
      json: async () => ({ message: "domain not verified" }),
    }),
  });
  await assert.rejects(
    () => sendProductionPo(env, "1", { deps }),
    /domain not verified/,
  );
  assert.equal(calls.marked.length, 0);
});

test("if recording fails after the email went out, the error says so", async () => {
  const { deps } = makeDeps({
    markSent: async () => {
      throw new Error("shopify down");
    },
  });
  await assert.rejects(
    () => sendProductionPo(env, "1", { deps }),
    /email WAS sent \(message msg_1\).*shopify down/s,
  );
});

test("re-send needs a sent PO and uses a fresh idempotency key", async () => {
  const { deps, calls } = makeDeps({
    getPo: async () => makePo({ state: "sent" }),
  });
  await sendProductionPo(env, "1", { resend: true, deps });
  assert.equal(calls.fetch[0].init.headers["Idempotency-Key"], "fresh-key");
  assert.match(JSON.parse(calls.fetch[0].init.body).subject, /^Resent:/);
  assert.equal(calls.marked[0][2].resend, true);

  const approved = makeDeps();
  await assert.rejects(
    () => sendProductionPo(env, "1", { resend: true, deps: approved.deps }),
    /already been sent/,
  );
});
