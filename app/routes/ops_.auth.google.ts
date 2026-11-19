import { redirect } from "react-router";
import { CARE_SENDER_EMAIL } from "~/utils/ops-care";
import { GMAIL_READ_SCOPE, GMAIL_SEND_SCOPE } from "~/utils/ops-care.server";
import {
  googleConfigured,
  opsOrigin,
  pkceChallenge,
  randomSecret,
  requireOpsUser,
  safeOpsRedirect,
} from "~/utils/ops-identity.server";
import { privateHeaders } from "~/utils/ops-store.server";
import type { Route } from "./+types/ops_.auth.google";

export async function loader({ request, context }: Route.LoaderArgs) {
  if (!googleConfigured(context.env))
    throw new Response(
      "Individual sign-in needs provider setup. See the Ops setup guide.",
      { status: 503, headers: privateHeaders },
    );
  const url = new URL(request.url);
  const connect = url.searchParams.get("connect");
  // "care_sender": Haven grants send + read on her own mailbox so the hub can
  // send logistics emails as care@ (ADR-0010). Separate from "personal",
  // which stays read-only.
  const careSender = connect === "care_sender";
  const personal = connect === "personal" || careSender;
  const user = personal
    ? await requireOpsUser(request, context, { owner: true })
    : null;
  if (careSender && user?.email !== CARE_SENDER_EMAIL)
    throw new Response("Only Haven's mailbox can be the care@ sender.", {
      status: 403,
      headers: privateHeaders,
    });
  if (personal && !context.env.OPS_CONNECTION_ENCRYPTION_KEY)
    throw new Response("Private connections need an encryption key.", {
      status: 503,
    });
  const state = randomSecret();
  const verifier = randomSecret();
  const nonce = randomSecret();
  context.session.set("opsGoogleState", {
    state,
    verifier,
    nonce,
    personal,
    careSender,
    email: user?.email,
    returnTo: careSender
      ? "/ops/communications/automation"
      : personal
        ? "/ops/daily"
        : safeOpsRedirect(url.searchParams.get("redirectTo")),
    expires: Date.now() + 10 * 60 * 1000,
  });
  const auth = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  auth.search = new URLSearchParams({
    client_id: context.env.OPS_GOOGLE_CLIENT_ID!,
    redirect_uri: `${opsOrigin(context.env)}/ops/auth/callback`,
    response_type: "code",
    state,
    nonce,
    code_challenge: await pkceChallenge(verifier),
    code_challenge_method: "S256",
    prompt: personal ? "consent" : "select_account",
    scope: careSender
      ? `openid email profile ${GMAIL_SEND_SCOPE} ${GMAIL_READ_SCOPE}`
      : personal
        ? "openid email profile https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/calendar.events.readonly"
        : "openid email profile",
    ...(personal ? { access_type: "offline" } : {}),
  }).toString();
  return redirect(auth.toString(), {
    headers: {
      ...privateHeaders,
      "Set-Cookie": await context.session.commit(),
    },
  });
}
