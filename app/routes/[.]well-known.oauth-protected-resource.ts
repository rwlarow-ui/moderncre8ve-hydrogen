import { BRIDGE_SCOPES, bridgeResource } from "~/utils/ops-bridge.server";
import { opsOrigin } from "~/utils/ops-identity.server";
import { privateHeaders } from "~/utils/ops-store.server";
import type { Route } from "./+types/[.]well-known.oauth-protected-resource";
export const loader = ({ context }: Route.LoaderArgs) =>
  Response.json(
    {
      resource: bridgeResource(context.env),
      authorization_servers: [opsOrigin(context.env)],
      scopes_supported: BRIDGE_SCOPES,
      bearer_methods_supported: ["header"],
    },
    { headers: privateHeaders },
  );
