import assert from "node:assert/strict";
import test from "node:test";
import {
  parseTradeApplication,
  submitTradeApplication,
  TRADE_TAG,
} from "../app/utils/trade-application.server.js";

const form = (o) => new Map(Object.entries(o));
const valid = {
  firstName: "Ada",
  lastName: "Lee",
  email: "Ada@Studio.com ",
  business: "Lee Interiors",
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

test("parse validates and normalises", () => {
  assert.equal(
    parseTradeApplication(form({ ...valid, email: "bad" })).error !== undefined,
    true,
  );
  assert.equal(
    parseTradeApplication(form({ ...valid, business: "" })).error !== undefined,
    true,
  );
  assert.equal(
    parseTradeApplication(form(valid)).values.email,
    "ada@studio.com",
  );
});

test("creates a tagged customer when none exists, using the ops token", async () => {
  const calls = [];
  const f = fakeFetch(
    [
      { customers: { nodes: [] } },
      { customerCreate: { customer: { id: "gid://1" }, userErrors: [] } },
    ],
    calls,
  );
  const { values } = parseTradeApplication(form(valid));
  const r = await submitTradeApplication(env, values, f);
  assert.equal(r.created, true);
  assert.deepEqual(calls[1].body.variables.input.tags, [TRADE_TAG]);
  assert.equal(calls[1].headers["X-Shopify-Access-Token"], "ops");
});

test("tags and appends note for an existing customer", async () => {
  const calls = [];
  const f = fakeFetch(
    [
      { customers: { nodes: [{ id: "gid://2", note: "old", tags: [] }] } },
      { customerUpdate: { customer: { id: "gid://2" }, userErrors: [] } },
      { tagsAdd: { node: { id: "gid://2" }, userErrors: [] } },
    ],
    calls,
  );
  const { values } = parseTradeApplication(form(valid));
  const r = await submitTradeApplication(env, values, f);
  assert.equal(r.created, false);
  assert.match(calls[1].body.variables.input.note, /^old\n\nTrade application/);
  assert.deepEqual(calls[2].body.variables.tags, [TRADE_TAG]);
});

test("refuses to run without the ops token (no fallback to full admin token)", async () => {
  await assert.rejects(
    submitTradeApplication(
      { SHOPIFY_ADMIN_API_TOKEN: "full", PUBLIC_STORE_DOMAIN: "x" },
      parseTradeApplication(form(valid)).values,
      async () => {
        throw new Error("should not fetch");
      },
    ),
    /not configured/,
  );
});
