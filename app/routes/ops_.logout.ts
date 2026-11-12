import { redirect } from "react-router";
import { clearOpsAuthHeaders } from "~/utils/ops-auth.server";
import { assertOpsOrigin } from "~/utils/ops-identity.server";
import type { Route } from "./+types/ops_.logout";

export async function action({ request, context }: Route.ActionArgs) {
  assertOpsOrigin(request, context.env);
  return redirect("/ops/login", {
    headers: await clearOpsAuthHeaders(context),
  });
}
