import { exchangeBridgeToken } from "~/utils/ops-bridge.server";
import type { Route } from "./+types/ops_.bridge.token";
export const action = ({ request, context }: Route.ActionArgs) =>
  exchangeBridgeToken(request, context.env);
