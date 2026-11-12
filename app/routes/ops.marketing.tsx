import { useLoaderData } from "react-router";
import { OpsWorkspace } from "~/components/ops/workspace";
import calendar from "~/content/ops-december-calendar.md?raw";
import { privateHeaders } from "~/utils/ops-store.server";
import { loadWorkspace, workspaceAction } from "~/utils/ops-workspace.server";
import type { Route } from "./+types/ops.marketing";
export const headers = () => privateHeaders;
export async function loader({ request, context }: Route.LoaderArgs) {
  const info = await loadWorkspace(request, context, "marketing");
  return {
    ...info,
    sources: info.sources.map((source) => ({
      ...source,
      seedContent: source.id === "december-calendar" ? calendar : undefined,
    })),
  };
}
export const action = ({ request, context }: Route.ActionArgs) =>
  workspaceAction(request, context, "marketing");
export default function Workspace() {
  return <OpsWorkspace info={useLoaderData<typeof loader>()} />;
}
