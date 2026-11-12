import { registerBridgeClient } from "~/utils/ops-bridge.server";
import {
  checkThrottle,
  getClientKey,
  recordFailure,
} from "~/utils/ops-login-throttle.server";
import type { Route } from "./+types/ops_.bridge.register";
export async function action({ request, context }: Route.ActionArgs) {
  const key = `bridge-register:${getClientKey(request)}`;
  const limit = await checkThrottle(context.cache, key);
  if (limit.locked)
    return Response.json(
      { error: "rate_limited" },
      {
        status: 429,
        headers: {
          "Retry-After": String(limit.retryAfterSeconds),
          "Cache-Control": "no-store",
        },
      },
    );
  await recordFailure(context.cache, key);
  return registerBridgeClient(request, context.env);
}
