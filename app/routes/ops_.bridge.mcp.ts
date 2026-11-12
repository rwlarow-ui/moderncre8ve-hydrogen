import { bridgeIdentity, handleBridge } from "~/utils/ops-bridge.server";
import { privateHeaders } from "~/utils/ops-store.server";
import type { Route } from "./+types/ops_.bridge.mcp";
export const action = ({ request, context }: Route.ActionArgs) =>
  handleBridge(request, context.env);
export async function loader({ request, context }: Route.LoaderArgs) {
  await bridgeIdentity(request, context.env);
  return new Response("Use POST for this stateless MCP endpoint.", {
    status: 405,
    headers: { ...privateHeaders, Allow: "POST" },
  });
}
