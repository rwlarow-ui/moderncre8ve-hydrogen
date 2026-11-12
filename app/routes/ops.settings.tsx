import {
  data,
  Form,
  redirect,
  useActionData,
  useLoaderData,
} from "react-router";
import {
  OpsCard,
  OpsNotice,
  OpsPageHeader,
  OpsSectionHeading,
} from "~/components/ops/ops-shell";
import { clearOpsAuthHeaders } from "~/utils/ops-auth.server";
import { googleConfigured, requireOpsUser } from "~/utils/ops-identity.server";
import { opsStore, privateHeaders } from "~/utils/ops-store.server";
import type { Route } from "./+types/ops.settings";
export const headers = () => privateHeaders;
export async function loader({ request, context }: Route.LoaderArgs) {
  const user = await requireOpsUser(request, context);
  const grants = await opsStore(
    context.env,
    `ops_bridge_tokens?user_email=eq.${encodeURIComponent(user.email)}&select=client_id,scope,created_at,refresh_expires_at&order=created_at.desc`,
  );
  return {
    user,
    grants,
    individualOnly: context.env.OPS_INDIVIDUAL_LOGIN_ENABLED === "true",
    googleReady: googleConfigured(context.env),
  };
}
export async function action({ request, context }: Route.ActionArgs) {
  const user = await requireOpsUser(request, context);
  const form = await request.formData();
  if (form.get("intent") === "revoke-bridge") {
    const id = String(form.get("clientId") || "");
    if (!/^[a-f0-9-]{36}$/i.test(id))
      throw new Response("Invalid client", { status: 400 });
    await opsStore(
      context.env,
      `ops_bridge_tokens?user_email=eq.${encodeURIComponent(user.email)}&client_id=eq.${id}`,
      { method: "DELETE" },
    );
    await opsStore(
      context.env,
      `ops_bridge_codes?user_email=eq.${encodeURIComponent(user.email)}&client_id=eq.${id}`,
      { method: "DELETE" },
    );
    return data({ message: "The Claude connection was revoked." });
  }
  if (form.get("intent") === "disconnect-personal" && user.role === "owner") {
    await opsStore(
      context.env,
      `ops_connections?user_email=eq.${encodeURIComponent(user.email)}`,
      { method: "DELETE" },
    );
    return data({
      message:
        "Private Google data disconnected from the hub. You can also revoke the grant in your Google account.",
    });
  }
  if (form.get("intent") === "sign-out-everywhere") {
    await opsStore(
      context.env,
      `ops_sessions?user_email=eq.${encodeURIComponent(user.email)}`,
      { method: "DELETE" },
    );
    return redirect("/ops/login", {
      headers: await clearOpsAuthHeaders(context),
    });
  }
  throw new Response("Unknown action", { status: 400 });
}
export default function Settings() {
  const info = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  return (
    <>
      <OpsPageHeader
        title="Account & connections"
        description={`Signed in as ${info.user.email}`}
      />
      <div className="max-w-3xl space-y-6">
        {actionData ? <OpsNotice ok>{actionData.message}</OpsNotice> : null}
        <OpsCard>
          <OpsSectionHeading title="Individual access" />
          <div className="space-y-4 p-6">
            <p>
              {info.individualOnly
                ? "Individual sign-in is required throughout Ops."
                : "Individual sign-in protects the new workspace. The old team password still supports existing orders and POs until the cutover is enabled."}
            </p>
            <p>
              Your access includes order editing and PO approval/send controls.
              Rob’s personal sources are restricted to his account.
            </p>
            <Form method="post">
              <button
                name="intent"
                value="sign-out-everywhere"
                className="underline"
              >
                Sign out of all hub sessions
              </button>
            </Form>
          </div>
        </OpsCard>
        <OpsCard>
          <OpsSectionHeading title="Claude publisher" />
          <div className="space-y-4 p-6">
            <p>
              Add a custom connector in Claude using{" "}
              <code className="break-all">
                https://moderncre8ve.com/ops/bridge/mcp
              </code>
              , then authorize it with your individual hub account.
            </p>
            <p>
              After edits: ask Claude to read the current context revision and
              publish the full updated artifact. Direct canvas edits do not
              synchronize on their own.
            </p>
            {info.grants.length ? (
              info.grants.map((grant, i) => (
                <Form
                  key={i}
                  method="post"
                  className="flex flex-wrap justify-between gap-3 border-line border-t pt-4"
                >
                  <input
                    type="hidden"
                    name="clientId"
                    value={grant.client_id}
                  />
                  <span className="text-sm">
                    {grant.scope} · expires{" "}
                    {new Date(grant.refresh_expires_at).toLocaleDateString()}
                  </span>
                  <button
                    name="intent"
                    value="revoke-bridge"
                    className="underline"
                  >
                    Revoke
                  </button>
                </Form>
              ))
            ) : (
              <p className="text-body-subtle">
                No authorized Claude connections yet.
              </p>
            )}
          </div>
        </OpsCard>
        {info.user.role === "owner" ? (
          <OpsCard>
            <OpsSectionHeading title="Private Google connection" />
            <div className="space-y-4 p-6">
              <p>
                Only your individual account can request these panels. Your
                Google connection is separate from sign-in and requests
                read-only mail/calendar access.
              </p>
              <a href="/ops/auth/google?connect=personal" className="underline">
                Connect or reconnect Google
              </a>
              <Form method="post">
                <button
                  name="intent"
                  value="disconnect-personal"
                  className="underline"
                >
                  Disconnect private data
                </button>
              </Form>
            </div>
          </OpsCard>
        ) : null}
      </div>
    </>
  );
}
