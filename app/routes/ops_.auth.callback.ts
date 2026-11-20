import { redirect } from "react-router";
import { saveCareSender } from "~/utils/ops-care.server";
import { withGoogleError } from "~/utils/ops-google-errors";
import {
  createIndividualSession,
  currentOpsUser,
  googleConfigured,
  opsOrigin,
  verifyGoogleIdentity,
} from "~/utils/ops-identity.server";
import { savePersonalConnection } from "~/utils/ops-personal.server";
import { privateHeaders } from "~/utils/ops-store.server";
import type { Route } from "./+types/ops_.auth.callback";

export async function loader({ request, context }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const pending = context.session.get("opsGoogleState");
  context.session.unset("opsGoogleState");
  // A private connection (daybook or care@ sender) goes back to the page it
  // started from with the reason; a sign-in goes back to the login page.
  // Only the code goes in the URL, never Google's tokens or error text.
  const fail = async (code: string, detail?: unknown) => {
    console.error(
      `[ops google callback] ${code}`,
      detail instanceof Error ? detail.message : (detail ?? ""),
    );
    const target = pending?.personal
      ? withGoogleError(pending.returnTo, code)
      : `/ops/login?error=google&reason=${encodeURIComponent(code)}`;
    return redirect(target, {
      headers: {
        ...privateHeaders,
        "Set-Cookie": await context.session.commit(),
      },
    });
  };
  if (!googleConfigured(context.env)) return fail("token_exchange");
  if (!pending || pending.expires < Date.now()) return fail("expired");
  if (pending.state !== url.searchParams.get("state")) return fail("expired");
  if (url.searchParams.get("error"))
    return fail("cancelled", url.searchParams.get("error"));
  if (!url.searchParams.get("code")) return fail("cancelled");

  let tokens: { id_token: string; refresh_token?: string; scope?: string };
  try {
    const response = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code: url.searchParams.get("code")!,
        client_id: context.env.OPS_GOOGLE_CLIENT_ID!,
        client_secret: context.env.OPS_GOOGLE_CLIENT_SECRET!,
        redirect_uri: `${opsOrigin(context.env)}/ops/auth/callback`,
        code_verifier: pending.verifier,
      }),
    });
    if (!response.ok) {
      // Google's error code (e.g. invalid_client, invalid_grant) is logged only.
      const body = (await response.json().catch(() => ({}))) as {
        error?: string;
      };
      return fail("token_exchange", `${response.status} ${body.error ?? ""}`);
    }
    tokens = (await response.json()) as typeof tokens;
  } catch (error) {
    return fail("token_exchange", error);
  }

  let user: Awaited<ReturnType<typeof verifyGoogleIdentity>>;
  try {
    user = await verifyGoogleIdentity(
      tokens.id_token,
      context.env,
      pending.nonce,
    );
  } catch (error) {
    return error instanceof Response
      ? fail("not_allowed")
      : fail("identity", error);
  }

  try {
    if (pending.personal) {
      const current = await currentOpsUser(context);
      if (!current || current.role !== "owner") return fail("signed_out");
      if (current.email !== user.email || pending.email !== user.email)
        return fail("wrong_account");
      if (pending.careSender) {
        await saveCareSender(context.env, user, tokens);
      } else {
        await savePersonalConnection(context.env, user, tokens);
      }
    } else {
      await createIndividualSession(context, user.email);
    }
  } catch (error) {
    const code =
      error && typeof error === "object" && "googleConnectCode" in error
        ? String(error.googleConnectCode)
        : "save_failed";
    return fail(code, error);
  }
  return redirect(pending.returnTo, {
    headers: {
      ...privateHeaders,
      "Set-Cookie": await context.session.commit(),
    },
  });
}
