import { redirect } from "react-router";

export const OPS_AUTH_SESSION_KEY = "opsAuthenticated";

export function isOpsAuthenticated(session) {
  return session.get(OPS_AUTH_SESSION_KEY) === true;
}

export async function requireOpsAccess(request, context) {
  if (isOpsAuthenticated(context.session)) {
    return true;
  }

  const url = new URL(request.url);
  const redirectTo = `${url.pathname}${url.search}`;
  throw redirect(`/ops/login?redirectTo=${encodeURIComponent(redirectTo)}`);
}

export async function createOpsAuthHeaders(context) {
  context.session.set(OPS_AUTH_SESSION_KEY, true);
  return {
    "Set-Cookie": await context.session.commit(),
  };
}

export async function clearOpsAuthHeaders(context) {
  context.session.unset(OPS_AUTH_SESSION_KEY);
  return {
    "Set-Cookie": await context.session.commit(),
  };
}

