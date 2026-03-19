import type { ActionFunctionArgs } from "react-router";
import { redirect } from "react-router";
import { clearOpsAuthHeaders } from "~/utils/ops-auth.server";

export async function action({ context }: ActionFunctionArgs) {
  return redirect("/ops/login", {
    headers: await clearOpsAuthHeaders(context),
  });
}

