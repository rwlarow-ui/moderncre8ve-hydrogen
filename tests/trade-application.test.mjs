import assert from "node:assert/strict";
import test from "node:test";
import {
  notifyTradeApplication,
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

const mailEnv = {
  ...env,
  RESEND_API_KEY: "re_x",
  PO_FROM_EMAIL: "Shop <shop@x.com>",
  TRADE_NOTIFY_EMAIL: "owner@x.com",
};

test("notifies the owner with a plain-text alert, replyable to the applicant", async () => {
  const calls = [];
  const f = async (url, init) => {
    calls.push({ url, init });
    return { ok: true };
  };
  const { values } = parseTradeApplication(
    form({ ...valid, business: "Lee\nBcc: evil@x.com" }),
  );
  const r = await notifyTradeApplication(
    mailEnv,
    values,
    { created: true, customerId: "gid://shopify/Customer/42" },
    f,
  );
  assert.equal(r.sent, true);
  const body = JSON.parse(calls[0].init.body);
  assert.deepEqual(body.to, ["owner@x.com"]);
  assert.equal(body.reply_to, "ada@studio.com");
  assert.doesNotMatch(body.subject, /[\r\n]/);
  assert.match(body.text, /admin\/customers\/42/);
});

test("skips the alert when mail isn't configured", async () => {
  const r = await notifyTradeApplication(
    env,
    parseTradeApplication(form(valid)).values,
    { created: true, customerId: "gid://1" },
    async () => {
      throw new Error("should not fetch");
    },
  );
  assert.equal(r.sent, false);
});
