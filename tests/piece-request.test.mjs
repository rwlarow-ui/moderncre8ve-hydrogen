import assert from "node:assert/strict";
import test from "node:test";
import {
  buildPieceRequestNote,
  notifyPieceRequest,
  PIECE_REQUEST_TAG,
  parsePieceRequest,
  submitPieceRequest,
} from "../app/utils/piece-request.server.js";
import { isRequestOnly } from "../app/utils/product-class.ts";

const form = (o) => new Map(Object.entries(o));
const valid = {
  firstName: "Ada",
  lastName: "Lee",
  email: " Ada@Example.com",
  zip: "44113",
  productHandle: "scandinavian-solid-hardwood-bed-frame",
  productTitle: "Warwick Solid Wood Bed Frame",
  variantTitle: "Queen / 2  Drawers / Walnut",
  variantPrice: "$5,800",
};
const env = {
  OPS_ADMIN_API_TOKEN: "ops",
  PUBLIC_STORE_DOMAIN: "x.myshopify.com",
};

function fakeFetch(responses, calls) {
  return async (url, init) => {
    const body = JSON.parse(init.body);
    calls.push({ url, headers: init.headers, body });
    return { ok: true, json: async () => ({ data: responses.shift() }) };
  };
}

test("only products tagged request-only show the request form", () => {
  assert.equal(isRequestOnly({ tags: ["Bed", "request-only"] }), true);
  assert.equal(isRequestOnly({ tags: [" Request-Only "] }), true);
  assert.equal(isRequestOnly({ tags: ["Bed", "custom"] }), false);
  assert.equal(isRequestOnly({ tags: null }), false);
});

test("parse requires a name, a valid email and the product", () => {
  assert.ok(parsePieceRequest(form({ ...valid, email: "bad" })).error);
  assert.ok(parsePieceRequest(form({ ...valid, lastName: "" })).error);
  assert.ok(parsePieceRequest(form({ ...valid, productHandle: "" })).error);
  assert.equal(parsePieceRequest(form(valid)).values.email, "ada@example.com");
});

test("the note carries the product, configuration, price and ZIP", () => {
  const { values } = parsePieceRequest(form(valid));
  const note = buildPieceRequestNote(values, new Date("2026-11-09T12:00:00Z"));
  assert.match(note, /^Piece request — 2026-11-09/);
  assert.match(note, /Configuration: Queen \/ 2 {2}Drawers \/ Walnut/);
  assert.match(note, /Listed price: \$5,800/);
  assert.match(note, /Delivery ZIP: 44113/);
});

test("creates a customer tagged piece-request with the ops token", async () => {
  const calls = [];
  const f = fakeFetch(
    [
      { customers: { nodes: [] } },
      { customerCreate: { customer: { id: "gid://1" }, userErrors: [] } },
    ],
    calls,
  );
  const { values } = parsePieceRequest(form(valid));
  const r = await submitPieceRequest(env, values, f);
  assert.equal(r.created, true);
  assert.deepEqual(calls[1].body.variables.input.tags, [PIECE_REQUEST_TAG]);
  assert.match(calls[1].body.variables.input.note, /^Piece request/);
  assert.equal(calls[1].headers["X-Shopify-Access-Token"], "ops");
});

test("emails the owner, replyable to the customer, without header injection", async () => {
  const calls = [];
  const f = async (url, init) => {
    calls.push({ url, init });
    return { ok: true };
  };
  const { values } = parsePieceRequest(
    form({ ...valid, productTitle: "Warwick\nBcc: evil@x.com" }),
  );
  const r = await notifyPieceRequest(
    {
      ...env,
      RESEND_API_KEY: "re_x",
      PO_FROM_EMAIL: "Shop <shop@x.com>",
      PIECE_REQUEST_NOTIFY_EMAIL: "owner@x.com",
    },
    values,
    { created: false, customerId: "gid://shopify/Customer/7" },
    f,
  );
  assert.equal(r.sent, true);
  const body = JSON.parse(calls[0].init.body);
  assert.deepEqual(body.to, ["owner@x.com"]);
  assert.equal(body.reply_to, "ada@example.com");
  assert.doesNotMatch(body.subject, /[\r\n]/);
  assert.match(body.text, /admin\/customers\/7/);
});

test("skips the email when mail isn't configured", async () => {
  const r = await notifyPieceRequest(
    env,
    parsePieceRequest(form(valid)).values,
    { created: true, customerId: "gid://1" },
    async () => {
      throw new Error("should not fetch");
    },
  );
  assert.equal(r.sent, false);
});
