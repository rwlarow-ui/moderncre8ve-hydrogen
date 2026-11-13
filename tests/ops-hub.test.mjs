import assert from "node:assert/strict";
import test from "node:test";
import { generateKeyPair, SignJWT } from "jose";
import { requireOpsAccess } from "../app/utils/ops-auth.server.js";
import {
  validateAuthorization,
  validRedirect,
} from "../app/utils/ops-bridge.server.js";
import { validatePublication } from "../app/utils/ops-context.server.js";
import {
  allowedIdentity,
  assertOpsOrigin,
  hashSecret,
  pkceChallenge,
  safeOpsRedirect,
  verifyGoogleIdentity,
} from "../app/utils/ops-identity.server.js";
import { loadPersonalDay } from "../app/utils/ops-personal.server.js";
import { visibleSources } from "../app/utils/ops-sources.server.js";
import { readOpsJson } from "../app/utils/ops-store.server.js";

const rob = allowedIdentity("rob@moderncre8ve.com");
const haven = allowedIdentity("havenmb@moderncre8ve.com");
test("individual identity is restricted to the two exact approved accounts", () => {
  assert.equal(allowedIdentity("HAVENMB@MODERNCRE8VE.COM").role, rob.role);
  for (const value of [
    "__proto__",
    "constructor",
    "other@moderncre8ve.com",
    "rob@moderncre8ve.com.evil",
    null,
  ])
    assert.equal(allowedIdentity(value), null);
});
test("return paths cannot escape Ops, including URL normalization", () => {
  for (const value of [
    "//evil.test",
    "https://evil.test",
    "/ops/../../outside",
    "/ops\\evil",
    "/ops/login",
    "/ops/../%2e%2e/outside",
    "\n/ops",
  ])
    assert.equal(safeOpsRedirect(value), "/ops/daily");
  assert.equal(
    safeOpsRedirect("/ops/catalog?filter=held"),
    "/ops/catalog?filter=held",
  );
});
test("legacy password sessions cannot open Ops after the cutover", async () => {
  const context = {
    env: { OPS_INDIVIDUAL_LOGIN_ENABLED: "true" },
    session: { get: (key) => (key === "opsAuthenticated" ? true : undefined) },
  };
  await assert.rejects(
    () =>
      requireOpsAccess(new Request("https://moderncre8ve.com/ops"), context),
    (r) => r.status === 302,
  );
  context.env.OPS_INDIVIDUAL_LOGIN_ENABLED = "false";
  assert.equal(
    await requireOpsAccess(
      new Request("https://moderncre8ve.com/ops"),
      context,
    ),
    null,
  );
});
test("both owners see the same sources and Google connections stay account scoped", async (t) => {
  assert.equal(visibleSources(rob).length, 12);
  assert.deepEqual(visibleSources(haven), visibleSources(rob));
  assert.equal(visibleSources(haven, "daily").length, 4);
  t.mock.method(globalThis, "fetch", (input) => {
    assert.equal(
      new URL(input).searchParams.get("user_email"),
      `eq.${haven.email}`,
    );
    return Promise.resolve(Response.json([]));
  });
  assert.deepEqual(
    await loadPersonalDay(
      {
        OPS_SUPABASE_URL: "https://database.example.test",
        OPS_SUPABASE_SECRET_KEY: "test",
      },
      haven,
    ),
    { connected: false },
  );
});
test("publishing enforces source ownership, revisions, content size and timestamps", () => {
  const valid = {
    sourceId: "catalog-todos",
    expectedRevision: 0,
    content: "New catalog context",
    sourceUpdatedAt: "2026-11-12T12:00:00Z",
  };
  assert.equal(validatePublication(valid, haven).sourceId, "catalog-todos");
  assert.equal(
    validatePublication({ ...valid, sourceId: "daybook" }, haven).sourceId,
    "daybook",
  );
  for (const change of [
    { expectedRevision: -1 },
    { expectedRevision: 0.5 },
    { content: "" },
    { content: "x".repeat(100001) },
    { sourceUpdatedAt: "invalid" },
    { sourceUpdatedAt: "2100-01-01" },
    { status: "sent" },
  ])
    assert.throws(() => validatePublication({ ...valid, ...change }, rob));
});
test("browser writes require the configured origin and RPC bodies are bounded", async () => {
  assert.throws(
    () =>
      assertOpsOrigin(
        new Request("https://moderncre8ve.com/ops", {
          headers: { Origin: "https://evil.test" },
        }),
        {},
      ),
    (r) => r.status === 403,
  );
  await assert.rejects(
    () =>
      readOpsJson(
        new Request("https://example.test", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ data: "x".repeat(200) }),
        }),
        100,
      ),
    (r) => r.status === 413,
  );
});
test("OAuth redirect registration rejects executable URLs and HTTPS downgrade", () => {
  assert.equal(validRedirect("https://claude.ai/api/mcp/auth_callback"), true);
  assert.equal(validRedirect("http://127.0.0.1:54321/callback"), true);
  for (const uri of [
    "javascript:alert(1)",
    "http://evil.test",
    "https://user:password@evil.test",
    "https://claude.ai/#fragment",
    "not-a-url",
  ])
    assert.equal(validRedirect(uri), false);
});
test("PKCE uses the RFC 7636 S256 challenge", async () => {
  assert.equal(
    await pkceChallenge("dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk"),
    "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM",
  );
  assert.equal((await hashSecret("test")).length, 64);
});
test("Google identities require a valid signature, issuer, audience, nonce, expiry and verified email", async () => {
  const { publicKey, privateKey } = await generateKeyPair("RS256");
  const claims = {
    sub: "google-rob",
    email: rob.email,
    email_verified: true,
    nonce: "nonce",
  };
  const issue = (extra = {}, options = {}) =>
    new SignJWT({ ...claims, ...extra })
      .setProtectedHeader({ alg: "RS256" })
      .setIssuedAt()
      .setExpirationTime(options.exp || "5m")
      .setIssuer(options.issuer || "https://accounts.google.com")
      .setAudience(options.audience || "client-id")
      .sign(privateKey);
  const env = { OPS_GOOGLE_CLIENT_ID: "client-id" };
  assert.equal(
    (await verifyGoogleIdentity(await issue(), env, "nonce", publicKey)).role,
    "owner",
  );
  for (const [extra, options, nonce] of [
    [{ email_verified: false }, {}, "nonce"],
    [{ email: "outsider@example.com" }, {}, "nonce"],
    [{}, {}, "wrong"],
    [{}, { exp: "-1s" }, "nonce"],
    [{}, { issuer: "https://evil.test" }, "nonce"],
    [{}, { audience: "other-client" }, "nonce"],
  ]) {
    await assert.rejects(() =>
      issue(extra, options).then((token) =>
        verifyGoogleIdentity(token, env, nonce, publicKey),
      ),
    );
  }
});
