import { hashSecret } from "~/utils/ops-identity.server";
import {
  opsStore,
  privateHeaders,
  readOpsText,
} from "~/utils/ops-store.server";
import type { Route } from "./+types/ops_.bridge.revoke";
export async function action({ request, context }: Route.ActionArgs) {
  const form = new URLSearchParams(await readOpsText(request));
  const token = String(form.get("token") || "");
  const client = String(form.get("client_id") || "");
  if (/^[a-f0-9-]{36}$/i.test(client) && /^[a-f0-9-]{72}$/i.test(token)) {
    const hash = await hashSecret(token);
    await opsStore(
      context.env,
      `ops_bridge_tokens?client_id=eq.${client}&or=(access_hash.eq.${hash},refresh_hash.eq.${hash})`,
      { method: "DELETE" },
    );
  }
  return new Response(null, { status: 200, headers: privateHeaders });
}
