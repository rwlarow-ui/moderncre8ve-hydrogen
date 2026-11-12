import { data, Form, redirect, useLoaderData } from "react-router";
import { OpsCard, OpsPageHeader } from "~/components/ops/ops-shell";
import { validateAuthorization } from "~/utils/ops-bridge.server";
import {
  assertOpsOrigin,
  hashSecret,
  randomSecret,
  requireOpsUser,
} from "~/utils/ops-identity.server";
import { opsStore, privateHeaders } from "~/utils/ops-store.server";
import type { Route } from "./+types/ops.bridge.authorize";

export const headers = () => privateHeaders;
export async function loader({ request, context }: Route.LoaderArgs) {
  const user = await requireOpsUser(request, context);
  const authorization = await validateAuthorization(
    context.env,
    new URL(request.url).searchParams,
  );
  const nonce = randomSecret();
  context.session.set("opsBridgeConsent", {
    ...authorization,
    nonce,
    email: user.email,
    expires: Date.now() + 300_000,
  });
  return data(
    {
      client: authorization.client.name,
      redirectUri: authorization.redirectUri,
      scopes: authorization.scopes,
      nonce,
      email: user.email,
    },
    {
      headers: {
        ...privateHeaders,
        "Set-Cookie": await context.session.commit(),
      },
    },
  );
}
export async function action({ request, context }: Route.ActionArgs) {
  const user = await requireOpsUser(request, context);
  assertOpsOrigin(request, context.env);
  const form = await request.formData();
  const pending = context.session.get("opsBridgeConsent");
  context.session.unset("opsBridgeConsent");
  if (
    !pending ||
    pending.nonce !== form.get("nonce") ||
    pending.email !== user.email ||
    pending.expires < Date.now()
  )
    throw new Response(
      "Authorization request expired. Reconnect from Claude.",
      { status: 400 },
    );
  const target = new URL(pending.redirectUri);
  target.searchParams.set("state", pending.state);
  target.searchParams.set("iss", new URL(request.url).origin);
  if (form.get("decision") !== "allow")
    target.searchParams.set("error", "access_denied");
  else {
    const code = randomSecret();
    await opsStore(context.env, "ops_bridge_codes", {
      method: "POST",
      body: {
        code_hash: await hashSecret(code),
        client_id: pending.client.id,
        user_email: user.email,
        redirect_uri: pending.redirectUri,
        challenge: pending.challenge,
        resource: pending.resource,
        scope: pending.scopes.join(" "),
        expires_at: new Date(Date.now() + 60_000).toISOString(),
      },
    });
    target.searchParams.set("code", code);
  }
  return redirect(target.toString(), {
    headers: {
      ...privateHeaders,
      "Set-Cookie": await context.session.commit(),
    },
  });
}
export default function AuthorizeBridge() {
  const info = useLoaderData<typeof loader>();
  return (
    <>
      <OpsPageHeader
        title="Connect Claude to Ops"
        description={`Signed in as ${info.email}`}
      />
      <OpsCard className="max-w-2xl space-y-5 p-6">
        <h2 className="font-sans text-2xl">{info.client}</h2>
        <p>
          This connector may read your permitted context and publish revisions
          when you ask Claude to do so. It cannot access Gmail, Calendar, orders
          or PO actions. Rob’s private sources remain private.
        </p>
        <p className="break-all text-body-subtle text-sm">
          Return address: {info.redirectUri}
        </p>
        <p className="text-sm">
          Requested permissions: {info.scopes.join(", ")}
        </p>
        <Form method="post" className="flex gap-4">
          <input type="hidden" name="nonce" value={info.nonce} />
          <button
            name="decision"
            value="allow"
            className="border border-body px-5 py-3 hover:bg-(--color-topbar-bg)"
          >
            Allow connection
          </button>
          <button name="decision" value="deny" className="px-5 py-3 underline">
            Cancel
          </button>
        </Form>
      </OpsCard>
    </>
  );
}
