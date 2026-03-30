import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import {
  data,
  Form,
  redirect,
  useActionData,
  useNavigation,
  useSearchParams,
} from "react-router";
import { createOpsAuthHeaders, isOpsAuthenticated } from "~/utils/ops-auth.server";

export async function loader({ request, context }: LoaderFunctionArgs) {
  if (isOpsAuthenticated(context.session)) {
    const url = new URL(request.url);
    const redirectTo = url.searchParams.get("redirectTo") || "/ops";
    throw redirect(redirectTo);
  }

  return null;
}

export async function action({ request, context }: ActionFunctionArgs) {
  const formData = await request.formData();
  const password = String(formData.get("password") || "");
  const redirectTo = String(formData.get("redirectTo") || "/ops");
  const configuredPassword = context.env.OPS_DASHBOARD_PASSWORD;

  if (!configuredPassword) {
    return data(
      { error: "OPS_DASHBOARD_PASSWORD is not configured in the environment." },
      { status: 500 },
    );
  }

  if (password !== configuredPassword) {
    return data({ error: "Incorrect dashboard password." }, { status: 401 });
  }

  return redirect(redirectTo, {
    headers: await createOpsAuthHeaders(context),
  });
}

export default function OpsLoginRoute() {
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const [searchParams] = useSearchParams();
  const isSubmitting = navigation.state !== "idle";
  const redirectTo = searchParams.get("redirectTo") || "/ops";

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#f5edd7_0%,#efe6d4_40%,#e7decc_100%)] px-4 py-10 text-[#323640] md:px-8">
      <div className="mx-auto grid max-w-5xl gap-10 rounded-[32px] border border-[#d4cbba] bg-white shadow-[0_30px_90px_rgba(50,54,64,0.14)] lg:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-8 bg-[linear-gradient(160deg,#323640_0%,#435765_100%)] px-8 py-10 text-white md:px-10">
          <div className="space-y-3">
            <p className="font-sans text-xs uppercase tracking-[0.28em] text-white/70">
              ModernCre8ve Internal Ops
            </p>
            <h1 className="font-sans text-4xl tracking-tight">
              Orders, customers, and lightweight workflow notes in one place.
            </h1>
            <p className="max-w-lg text-white/80">
              This dashboard reads live Shopify Admin order data and keeps tags plus internal notes aligned with the MCP tools.
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <FeatureCard
              label="Live orders"
              value="Current"
              body="Tracks active operational work within the 140-day handcrafted lead-time window."
            />
            <FeatureCard
              label="Private notes"
              value="Metafields"
              body="Stores internal notes in app-owned metafields so native Shopify notes stay untouched."
            />
            <FeatureCard
              label="Shared data"
              value="MCP-ready"
              body="The dashboard and local MCP tools use the same Admin API service layer."
            />
            <FeatureCard
              label="Fast triage"
              value="Tags"
              body="Update order and customer tags without leaving the dashboard."
            />
          </div>
        </div>

        <div className="flex items-center px-8 py-10 md:px-10">
          <div className="w-full space-y-6">
            <div className="space-y-2">
              <p className="font-sans text-xs uppercase tracking-[0.24em] text-[#5f636b]">
                Staff Access
              </p>
              <h2 className="font-sans text-3xl tracking-tight">Sign in to Ops</h2>
              <p className="text-[#6d7077]">
                Use the shared internal dashboard password configured in `OPS_DASHBOARD_PASSWORD`.
              </p>
            </div>

            <Form method="post" className="space-y-4">
              <input type="hidden" name="redirectTo" value={redirectTo} />
              <label className="space-y-2">
                <span className="font-sans text-xs uppercase tracking-[0.18em] text-[#5f636b]">
                  Dashboard password
                </span>
                <input
                  data-test="ops-password"
                  type="password"
                  name="password"
                  autoFocus
                  required
                  className="w-full rounded-2xl border border-[#d9cfbd] bg-[#fcfaf5] px-4 py-3 focus:border-[#323640] focus:outline-hidden"
                />
              </label>
              {actionData?.error ? (
                <div className="rounded-2xl border border-[#f0c7c9] bg-[#fff2f2] px-4 py-3 text-[#9b2f35] text-sm">
                  {actionData.error}
                </div>
              ) : null}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full rounded-2xl bg-[#323640] px-5 py-4 font-sans text-xs uppercase tracking-[0.22em] text-white transition-colors hover:bg-[#2CBF96] hover:text-[#16372d] disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isSubmitting ? "Signing in..." : "Enter dashboard"}
              </button>
            </Form>
          </div>
        </div>
      </div>
    </div>
  );
}

function FeatureCard({
  label,
  value,
  body,
}: {
  label: string;
  value: string;
  body: string;
}) {
  return (
    <div className="rounded-[24px] border border-white/10 bg-white/7 p-5">
      <p className="font-sans text-[11px] uppercase tracking-[0.22em] text-white/65">
        {label}
      </p>
      <p className="mt-2 font-sans text-2xl tracking-tight">{value}</p>
      <p className="mt-3 text-sm text-white/75">{body}</p>
    </div>
  );
}
