import { safeOpsRedirect } from "./ops-url.js";

export { safeOpsRedirect } from "./ops-url.js";

import { createRemoteJWKSet, jwtVerify } from "jose";
import { redirect } from "react-router";
import { hasOpsStore, opsStore } from "./ops-store.server.js";

export const OPS_USERS = {
  "rob@moderncre8ve.com": { name: "Rob", role: "owner" },
  "havenmb@moderncre8ve.com": { name: "Haven", role: "operator" },
};
const googleKeys = createRemoteJWKSet(
  new URL("https://www.googleapis.com/oauth2/v3/certs"),
);
export const randomSecret = () => crypto.randomUUID() + crypto.randomUUID();
export async function hashSecret(value) {
  const bytes = new Uint8Array(
    await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)),
  );
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}
export async function pkceChallenge(value) {
  const bytes = new Uint8Array(
    await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)),
  );
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}
export function opsOrigin(env) {
  const origin = new URL(env.OPS_APP_URL || "https://moderncre8ve.com");
  if (
    origin.protocol !== "https:" &&
    !["localhost", "127.0.0.1"].includes(origin.hostname)
  ) {
    throw new Error("OPS_APP_URL must use HTTPS.");
  }
  return origin.origin;
}
export function assertOpsOrigin(request, env) {
  if (request.headers.get("Origin") !== opsOrigin(env)) {
    throw new Response("Forbidden", { status: 403 });
  }
}
export function googleConfigured(env) {
  return Boolean(
    env.OPS_GOOGLE_CLIENT_ID &&
      env.OPS_GOOGLE_CLIENT_SECRET &&
      hasOpsStore(env),
  );
}
export function allowedIdentity(email) {
  const normalized = String(email || "").toLowerCase();
  return Object.hasOwn(OPS_USERS, normalized)
    ? { email: normalized, ...OPS_USERS[normalized] }
    : null;
}
export async function currentOpsUser(context) {
  const token = context.session.get("opsSession");
  if (!token || !hasOpsStore(context.env)) return null;
  const rows = await opsStore(
    context.env,
    `ops_sessions?token_hash=eq.${await hashSecret(token)}&expires_at=gt.${encodeURIComponent(new Date().toISOString())}&select=user_email&limit=1`,
  );
  return allowedIdentity(rows[0]?.user_email);
}
export async function requireOpsUser(request, context, { owner = false } = {}) {
  if (!["GET", "HEAD"].includes(request.method))
    assertOpsOrigin(request, context.env);
  const user = await currentOpsUser(context);
  if (!user) {
    const url = new URL(request.url);
    throw redirect(
      `/ops/login?individual=1&redirectTo=${encodeURIComponent(safeOpsRedirect(url.pathname + url.search))}`,
    );
  }
  if (owner && user.role !== "owner")
    throw new Response("Forbidden", { status: 403 });
  return user;
}
export async function createIndividualSession(context, email) {
  const user = allowedIdentity(email);
  if (!user)
    throw new Response("This account is not allowed to access Ops.", {
      status: 403,
    });
  const old = context.session.get("opsSession");
  if (old)
    await opsStore(
      context.env,
      `ops_sessions?token_hash=eq.${await hashSecret(old)}`,
      { method: "DELETE" },
    );
  const token = randomSecret();
  await opsStore(context.env, "ops_sessions", {
    method: "POST",
    body: {
      token_hash: await hashSecret(token),
      user_email: user.email,
      expires_at: new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString(),
    },
  });
  context.session.unset("opsAuthenticated");
  context.session.set("opsSession", token);
  return user;
}
export async function revokeIndividualSession(context) {
  const token = context.session.get("opsSession");
  if (token && hasOpsStore(context.env)) {
    await opsStore(
      context.env,
      `ops_sessions?token_hash=eq.${await hashSecret(token)}`,
      { method: "DELETE" },
    );
  }
  context.session.unset("opsSession");
  context.session.unset("opsGoogleState");
  context.session.unset("opsBridgeConsent");
}
export async function verifyGoogleIdentity(
  idToken,
  env,
  nonce,
  keySet = googleKeys,
) {
  const { payload } = await jwtVerify(idToken, keySet, {
    algorithms: ["RS256"],
    issuer: ["https://accounts.google.com", "accounts.google.com"],
    audience: env.OPS_GOOGLE_CLIENT_ID,
    requiredClaims: ["sub", "exp", "iat", "email", "email_verified", "nonce"],
    maxTokenAge: "10 minutes",
  });
  if (
    !nonce ||
    payload.nonce !== nonce ||
    payload.email_verified !== true ||
    !payload.sub ||
    (Array.isArray(payload.aud) &&
      payload.aud.length > 1 &&
      payload.azp !== env.OPS_GOOGLE_CLIENT_ID) ||
    (payload.azp && payload.azp !== env.OPS_GOOGLE_CLIENT_ID)
  ) {
    throw new Error("Google identity could not be verified.");
  }
  const user = allowedIdentity(payload.email);
  if (!user)
    throw new Response("This Google account is not allowed to access Ops.", {
      status: 403,
    });
  return user;
}
