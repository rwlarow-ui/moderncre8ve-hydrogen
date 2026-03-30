import type { LoaderFunctionArgs } from "react-router";
import { Outlet, useLoaderData } from "react-router";
import { OpsShell } from "~/components/ops/ops-shell";
import { requireOpsAccess } from "~/utils/ops-auth.server";

export async function loader({ request, context }: LoaderFunctionArgs) {
  await requireOpsAccess(request, context);

  return {
    storeDomain: context.env.PUBLIC_STORE_DOMAIN,
  };
}

export default function OpsLayout() {
  const { storeDomain } = useLoaderData<typeof loader>();

  return (
    <OpsShell
      title="Internal Order Dashboard"
      subtitle={`Live Shopify Admin data for ${storeDomain}, with tags and internal ops notes shared across the dashboard and MCP tools.`}
    >
      <Outlet />
    </OpsShell>
  );
}

