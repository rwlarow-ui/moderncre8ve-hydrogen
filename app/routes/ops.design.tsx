import { FurnitureStudio } from "~/components/ops/furniture-studio";
import { OpsPageHeader } from "~/components/ops/ops-shell";
import { requireOpsAccess } from "~/utils/ops-auth.server";
import { privateHeaders } from "~/utils/ops-store.server";
import type { Route } from "./+types/ops.design";

export const headers = () => privateHeaders;

// The /ops layout gates the first load; this re-checks the session on
// client-side navigation into the tab.
export async function loader({ request, context }: Route.LoaderArgs) {
  await requireOpsAccess(request, context);
  return null;
}

export const meta = () => [
  { title: "Furniture Studio · ModernCre8ve Ops" },
  { name: "robots", content: "noindex, nofollow" },
];

export default function OpsDesign() {
  return (
    <>
      <OpsPageHeader
        eyebrow={
          <p className="text-body-subtle text-xs tracking-widest">
            DESIGN DEVELOPMENT
          </p>
        }
        title="Furniture Studio"
        description="Shape a prototype concept: proportions, materials, cost allowances and CAD study exports for your maker."
      />
      <FurnitureStudio />
    </>
  );
}
