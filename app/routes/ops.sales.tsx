import { useLoaderData } from "react-router";
import { OpsWorkspace } from "~/components/ops/workspace";
import { privateHeaders } from "~/utils/ops-store.server";
import { loadWorkspace, workspaceAction } from "~/utils/ops-workspace.server";
import type { Route } from "./+types/ops.sales";
export const headers = () => privateHeaders;
export const loader = ({ request, context }: Route.LoaderArgs) =>
  loadWorkspace(request, context, "sales");
export const action = ({ request, context }: Route.ActionArgs) =>
  workspaceAction(request, context, "sales");
export default function Workspace() {
  return <OpsWorkspace info={useLoaderData<typeof loader>()} />;
}
