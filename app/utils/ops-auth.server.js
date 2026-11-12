import { redirect } from "react-router";
import {
  requireOpsUser,
  revokeIndividualSession,
  safeOpsRedirect,
} from "./ops-identity.server.js";

export const OPS_AUTH_SESSION_KEY = "opsAuthenticated";

export function isOpsAuthenticated(session) {
  return session.get(OPS_AUTH_SESSION_KEY) === true;
}

export async function requireOpsAccess(request, context) {
  if (context.session.get("opsSession"))
    return requireOpsUser(request, context);
  if (
    context.env?.OPS_INDIVIDUAL_LOGIN_ENABLED !== "true" &&
    isOpsAuthenticated(context.session)
  ) {
    return null;
  }

  const url = new URL(request.url);
  const redirectTo = safeOpsRedirect(`${url.pathname}${url.search}`);
  throw redirect(`/ops/login?redirectTo=${encodeURIComponent(redirectTo)}`);
}

export async function createOpsAuthHeaders(context) {
  context.session.set(OPS_AUTH_SESSION_KEY, true);
  return {
    "Set-Cookie": await context.session.commit(),
  };
}

export async function clearOpsAuthHeaders(context) {
  await revokeIndividualSession(context);
  context.session.unset(OPS_AUTH_SESSION_KEY);
  return {
    "Set-Cookie": await context.session.commit(),
  };
}
