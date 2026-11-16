import assert from "node:assert/strict";
import test from "node:test";
import {
  CONTACT_TAG,
  notifyContactMessage,
  parseContactMessage,
  submitContactMessage,
} from "../app/utils/contact-message.server.js";

const form = (o) => new Map(Object.entries(o));
const valid = {
  firstName: "Ada",
  lastName: "Lee",
  email: "Ada@Studio.com ",
  topic: "Existing order",
  message: "Where is my dining table?",
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
  assert.ok(parseContactMessage(form({ ...valid, email: "bad" })).error);
  assert.ok(parseContactMessage(form({ ...valid, lastName: "" })).error);
  assert.ok(parseContactMessage(form({ ...valid, message: "hi" })).error);
  const { values } = parseContactMessage(form(valid));
  assert.equal(values.email, "ada@studio.com");
  assert.equal(values.topic, "Existing order");
});

test("an unknown topic falls back to the default", () => {
  const { values } = parseContactMessage(
    form({ ...valid, topic: "Made up\nBcc: evil@x.com" }),
  );
  assert.equal(values.topic, "General question");
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
  const { values } = parseContactMessage(form(valid));
  const r = await submitContactMessage(env, values, f);
  assert.equal(r.created, true);
  assert.deepEqual(calls[1].body.variables.input.tags, [CONTACT_TAG]);
  assert.match(calls[1].body.variables.input.note, /Where is my dining table/);
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
  const { values } = parseContactMessage(form(valid));
  const r = await submitContactMessage(env, values, f);
  assert.equal(r.created, false);
  assert.match(calls[1].body.variables.input.note, /^old\n\nContact form/);
  assert.deepEqual(calls[2].body.variables.tags, [CONTACT_TAG]);
});

test("notifies the owner, replyable to the sender; skips when mail isn't configured", async () => {
  const calls = [];
  const f = async (url, init) => {
    calls.push({ url, init });
    return { ok: true };
  };
  const { values } = parseContactMessage(form(valid));
  const result = { created: true, customerId: "gid://shopify/Customer/42" };
  const r = await notifyContactMessage(
    {
      ...env,
      RESEND_API_KEY: "re_x",
      PO_FROM_EMAIL: "Shop <shop@x.com>",
      CONTACT_NOTIFY_EMAIL: "owner@x.com",
    },
    values,
    result,
    f,
  );
  assert.equal(r.sent, true);
  const body = JSON.parse(calls[0].init.body);
  assert.deepEqual(body.to, ["owner@x.com"]);
  assert.equal(body.reply_to, "ada@studio.com");
  assert.doesNotMatch(body.subject, /[\r\n]/);
  assert.match(body.text, /admin\/customers\/42/);

  const skipped = await notifyContactMessage(env, values, result, async () => {
    throw new Error("should not fetch");
  });
  assert.equal(skipped.sent, false);
});
