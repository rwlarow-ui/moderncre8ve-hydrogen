import { useCallback, useEffect, useState } from "react";
import {
  data,
  Form,
  redirect,
  useActionData,
  useNavigation,
  useRouteLoaderData,
  useSearchParams,
} from "react-router";
import { Button } from "~/components/button";
import { OpsField, OpsNotice, opsInputClass } from "~/components/ops/ops-shell";
import { TurnstileWidget } from "~/components/turnstile-widget";
import type { RootLoader } from "~/root";
import {
  createOpsAuthHeaders,
  isOpsAuthenticated,
} from "~/utils/ops-auth.server";
import {
  checkThrottle,
  clearFailures,
  getClientKey,
  recordFailure,
  safeEqual,
} from "~/utils/ops-login-throttle.server";
import { verifyTurnstile } from "~/utils/turnstile.server";
import type { Route } from "./+types/ops_.login";

export const headers = () => ({ "X-Robots-Tag": "noindex, nofollow" });

export const meta = () => [{ name: "robots", content: "noindex, nofollow" }];

export async function loader({ request, context }: Route.LoaderArgs) {
  if (isOpsAuthenticated(context.session)) {
    const url = new URL(request.url);
    const redirectTo = url.searchParams.get("redirectTo") || "/ops";
    throw redirect(redirectTo);
  }

  return null;
}

export async function action({ request, context }: Route.ActionArgs) {
  const formData = await request.formData();
  const password = String(formData.get("password") || "");
  const redirectTo = String(formData.get("redirectTo") || "/ops");
  const configuredPassword = context.env.OPS_DASHBOARD_PASSWORD;

  if (!configuredPassword) {
    return data(
      {
        error:
          "Sign-in is unavailable: OPS_DASHBOARD_PASSWORD is not set in the Oxygen environment.",
      },
      { status: 500 },
    );
  }

  const clientKey = getClientKey(request);
  const throttle = await checkThrottle(context.cache, clientKey);
  if (throttle.locked) {
    return data(
      {
        error: `Too many failed attempts. Try again in ${formatWait(throttle.retryAfterSeconds)}.`,
      },
      {
        status: 429,
        headers: { "Retry-After": String(throttle.retryAfterSeconds) },
      },
    );
  }

  const turnstileValid = await verifyTurnstile(
    String(formData.get("cf-turnstile-response") || "") || null,
    context.env.TURNSTILE_SECRET_KEY,
    request.headers.get("CF-Connecting-IP") || undefined,
  );
  if (!turnstileValid) {
    return data(
      { error: "Please complete the verification challenge and try again." },
      { status: 400 },
    );
  }

  if (!(await safeEqual(password, configuredPassword))) {
    const { lockSeconds } = await recordFailure(context.cache, clientKey);
    return data(
      {
        error: lockSeconds
          ? `That password didn't match. Locked for ${formatWait(lockSeconds)}.`
          : "That password didn't match. Check it and try again.",
      },
      { status: 401 },
    );
  }

  await clearFailures(context.cache, clientKey);

  return redirect(redirectTo, {
    headers: await createOpsAuthHeaders(context),
  });
}

function formatWait(seconds: number) {
  return seconds >= 60
    ? `${Math.ceil(seconds / 60)} minute${seconds > 60 ? "s" : ""}`
    : `${seconds} seconds`;
}

export default function OpsLoginRoute() {
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const [searchParams] = useSearchParams();
  const isSubmitting = navigation.state !== "idle";
  const rootData = useRouteLoaderData<RootLoader>("root");
  const turnstileSiteKey = rootData?.turnstileSiteKey || "";
  const [turnstileToken, setTurnstileToken] = useState("");
  // Stable identities: TurnstileWidget re-creates itself when its callbacks
  // change, so an inline closure would re-challenge after every verification.
  const handleExpire = useCallback(() => setTurnstileToken(""), []);
  // Turnstile tokens are single-use: the server redeems one on every
  // submission, so each response needs a fresh challenge.
  const [widgetKey, setWidgetKey] = useState(0);
  useEffect(() => {
    if (actionData) {
      setTurnstileToken("");
      setWidgetKey((key) => key + 1);
    }
  }, [actionData]);
  const redirectTo = searchParams.get("redirectTo") || "/ops";

  return (
    <div className="grid min-h-screen bg-background text-body lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
      <div className="relative hidden overflow-hidden bg-(--color-topbar-bg) lg:block">
        <img
          src="/images/heroes/hero-oval-dining-table.jpg"
          alt="Handcrafted oval dining table in a sunlit dining room"
          width={1600}
          height={1067}
          className="absolute inset-0 size-full object-cover"
        />
      </div>

      <div className="flex flex-col px-6 py-10 sm:px-12 lg:px-16 xl:px-24">
        <img
          src="/logo.png"
          alt="ModernCre8ve"
          width={500}
          height={599}
          className="h-16 w-auto self-start"
        />

        <div className="my-auto w-full max-w-sm space-y-8 py-12">
          <div className="space-y-3">
            <h1 className="h4">Sign in to Ops</h1>
            <p className="text-body-subtle">
              Track open orders against their lead time and keep private notes
              and tags in step with Shopify.
            </p>
          </div>

          <Form method="post" className="space-y-5">
            <input type="hidden" name="redirectTo" value={redirectTo} />
            <input
              type="hidden"
              name="cf-turnstile-response"
              value={turnstileToken}
            />
            <OpsField label="Team password">
              <input
                data-test="ops-password"
                type="password"
                name="password"
                autoComplete="current-password"
                // biome-ignore lint/a11y/noAutofocus: sole interactive field on a dedicated login page; focusing it does not disorient assistive tech
                autoFocus
                required
                aria-invalid={actionData?.error ? true : undefined}
                className={opsInputClass}
              />
            </OpsField>
            {turnstileSiteKey ? (
              <TurnstileWidget
                key={widgetKey}
                siteKey={turnstileSiteKey}
                onVerify={setTurnstileToken}
                onExpire={handleExpire}
                appearance="interaction-only"
              />
            ) : null}
            {actionData?.error ? (
              <OpsNotice ok={false}>{actionData.error}</OpsNotice>
            ) : null}
            <Button
              type="submit"
              animate={false}
              loading={isSubmitting}
              disabled={isSubmitting}
              className="w-full"
            >
              Sign in
            </Button>
          </Form>
        </div>

        <p className="text-body-subtle text-sm">
          For the ModernCre8ve team only.
        </p>
      </div>
    </div>
  );
}
