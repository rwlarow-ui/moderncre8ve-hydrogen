import { redirect } from "react-router";
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
  const fail = async () =>
    redirect("/ops/login?error=google", {
      headers: {
        ...privateHeaders,
        "Set-Cookie": await context.session.commit(),
      },
    });
  if (
    !googleConfigured(context.env) ||
    !pending ||
    pending.expires < Date.now() ||
    pending.state !== url.searchParams.get("state") ||
    !url.searchParams.get("code")
  )
    return fail();
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
    if (!response.ok) return fail();
    const tokens = (await response.json()) as {
      id_token: string;
      refresh_token?: string;
      scope?: string;
    };
    const user = await verifyGoogleIdentity(
      tokens.id_token,
      context.env,
      pending.nonce,
    );
    if (pending.personal) {
      const current = await currentOpsUser(context);
      if (
        !current ||
        current.role !== "owner" ||
        current.email !== user.email ||
        pending.email !== user.email
      )
        return fail();
      await savePersonalConnection(context.env, user, tokens);
    } else {
      await createIndividualSession(context, user.email);
    }
    return redirect(pending.returnTo, {
      headers: {
        ...privateHeaders,
        "Set-Cookie": await context.session.commit(),
      },
    });
  } catch {
    return fail();
  }
}
