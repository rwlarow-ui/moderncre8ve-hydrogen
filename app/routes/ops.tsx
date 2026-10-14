import type { LoaderFunctionArgs } from "react-router";
import { Outlet } from "react-router";
import { OpsShell } from "~/components/ops/ops-shell";
import { requireOpsAccess } from "~/utils/ops-auth.server";

export const headers = () => ({ "X-Robots-Tag": "noindex, nofollow" });

export const meta = () => [{ name: "robots", content: "noindex, nofollow" }];

export async function loader({ request, context }: LoaderFunctionArgs) {
  await requireOpsAccess(request, context);
  return null;
}

export default function OpsLayout() {
  return (
    <OpsShell>
      <Outlet />
    </OpsShell>
  );
}
