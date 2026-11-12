import { useLoaderData } from "react-router";
import { OpsCard, OpsSectionHeading } from "~/components/ops/ops-shell";
import { OpsWorkspace } from "~/components/ops/workspace";
import { getThemeSettings } from "~/page-builder/theme.server";
import { privateHeaders } from "~/utils/ops-store.server";
import { loadWorkspace, workspaceAction } from "~/utils/ops-workspace.server";
import type { Route } from "./+types/ops.brand";
export const headers = () => privateHeaders;
export async function loader({ request, context }: Route.LoaderArgs) {
  const info = await loadWorkspace(request, context, "brand");
  const theme = getThemeSettings();
  return {
    info,
    colors: [
      "colorBackground",
      "colorText",
      "colorTextSubtle",
      "colorTextInverse",
      "colorLine",
    ].map((key) => ({ key, value: String(theme[key] || "") })),
  };
}
export const action = ({ request, context }: Route.ActionArgs) =>
  workspaceAction(request, context, "brand");
export default function Workspace() {
  const { info, colors } = useLoaderData<typeof loader>();
  return (
    <OpsWorkspace info={info}>
      <OpsCard>
        <OpsSectionHeading
          title="Current storefront tokens"
          description="Read from the same theme settings as the live storefront."
        />
        <div className="flex flex-wrap gap-6 p-6">
          {colors.map((color) => (
            <div key={color.key}>
              <div
                className="mb-2 h-16 w-24 border border-line"
                style={{ backgroundColor: color.value }}
              />
              <p className="text-sm">{color.key}</p>
              <code className="text-xs">{color.value}</code>
            </div>
          ))}
        </div>
        <div className="border-line border-t p-6">
          <h2 className="font-sans text-2xl">Jost · headings</h2>
          <p className="mt-3 font-serif">
            Spectral · body text. Handcrafted modern furniture, made with care.
          </p>
          <div className="mt-5 flex flex-wrap gap-4">
            <button
              type="button"
              className="border border-body px-5 py-3 hover:bg-(--color-topbar-bg)"
            >
              Button specimen
            </button>
            <span className="self-center border border-line px-3 py-1 text-sm">
              Status specimen
            </span>
          </div>
        </div>
      </OpsCard>
    </OpsWorkspace>
  );
}
