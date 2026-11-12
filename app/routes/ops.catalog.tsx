import { useLoaderData } from "react-router";
import {
  OpsCard,
  OpsNotice,
  OpsSectionHeading,
} from "~/components/ops/ops-shell";
import { OpsWorkspace } from "~/components/ops/workspace";
import { loadRolloutStatus } from "~/utils/ops-live.server";
import { privateHeaders } from "~/utils/ops-store.server";
import { loadWorkspace, workspaceAction } from "~/utils/ops-workspace.server";
import type { Route } from "./+types/ops.catalog";
export const headers = () => privateHeaders;
export async function loader({ request, context }: Route.LoaderArgs) {
  const info = await loadWorkspace(request, context, "catalog");
  const rollout = await loadRolloutStatus(context.env).catch((): null => null);
  return { info, rollout };
}
export const action = ({ request, context }: Route.ActionArgs) =>
  workspaceAction(request, context, "catalog");
export default function Workspace() {
  const { info, rollout } = useLoaderData<typeof loader>();
  return (
    <OpsWorkspace info={info}>
      <OpsCard>
        <OpsSectionHeading
          title="Rollout scope · current Shopify status"
          description="The 64-product rollout, not the whole catalog. Register disposition is a deployed repository record; Shopify status is read at refresh."
        />
        {rollout ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr>
                  <th className="p-4">Product</th>
                  <th className="p-4">Shopify</th>
                  <th className="p-4">Register</th>
                  <th className="p-4">Blocker / discrepancy</th>
                </tr>
              </thead>
              <tbody>
                {rollout.rows.map((row) => (
                  <tr key={row.id} className="border-line border-t">
                    <td className="min-w-48 p-4">{row.title}</td>
                    <td className="p-4">{row.status}</td>
                    <td className="p-4">{row.disposition}</td>
                    <td className="min-w-64 p-4">
                      {row.discrepancy
                        ? "Active in Shopify; register still says held. Reconcile release evidence. "
                        : ""}
                      {row.blocker}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="p-4 text-body-subtle text-xs">
              Checked {rollout.checkedAt}
            </p>
          </div>
        ) : (
          <div className="p-6">
            <OpsNotice ok={false}>
              Live catalog status is unavailable. The source summaries below
              retain their dates.
            </OpsNotice>
          </div>
        )}
      </OpsCard>
    </OpsWorkspace>
  );
}
