import { redirect } from "react-router";
import { clearOpsAuthHeaders } from "~/utils/ops-auth.server";
import type { Route } from "./+types/ops_.logout";

export async function action({ context }: Route.ActionArgs) {
  return redirect("/ops/login", {
    headers: await clearOpsAuthHeaders(context),
  });
}
