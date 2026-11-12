import { bridgeMetadata } from "~/utils/ops-bridge.server";
import { privateHeaders } from "~/utils/ops-store.server";
import type { Route } from "./+types/[.]well-known.oauth-authorization-server";
export const loader = ({ context }: Route.LoaderArgs) =>
  Response.json(bridgeMetadata(context.env), { headers: privateHeaders });
