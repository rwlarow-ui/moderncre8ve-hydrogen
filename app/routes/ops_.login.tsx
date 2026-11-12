import { useCallback, useEffect, useState } from "react";
import {
  data,
  Form,
  redirect,
  useActionData,
  useLoaderData,
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
  assertOpsOrigin,
  currentOpsUser,
  googleConfigured,
} from "~/utils/ops-identity.server";
import {
  checkThrottle,
  clearFailures,
  getClientKey,
  recordFailure,
  safeEqual,
} from "~/utils/ops-login-throttle.server";
import { privateHeaders } from "~/utils/ops-store.server";
import { safeOpsRedirect } from "~/utils/ops-url";
import { verifyTurnstile } from "~/utils/turnstile.server";
import type { Route } from "./+types/ops_.login";

export const headers = () => privateHeaders;

export const meta = () => [{ name: "robots", content: "noindex, nofollow" }];

export async function loader({ request, context }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const user = await currentOpsUser(context);
  const individual = url.searchParams.get("individual") === "1";
  const legacyAllowed =
    context.env.OPS_INDIVIDUAL_LOGIN_ENABLED !== "true" && !individual;
  if (user || (legacyAllowed && isOpsAuthenticated(context.session))) {
    throw redirect(
      safeOpsRedirect(
        url.searchParams.get("redirectTo") || (user ? "/ops/daily" : "/ops"),
      ),
    );
  }
  return data(
    {
      googleConfigured: googleConfigured(context.env),
      legacyAllowed,
      googleError: url.searchParams.get("error") === "google",
    },
    { headers: privateHeaders },
  );
}

export async function action({ request, context }: Route.ActionArgs) {
  assertOpsOrigin(request, context.env);
  if (context.env.OPS_INDIVIDUAL_LOGIN_ENABLED === "true")
    return data(
      { error: "Use your individual Google account to sign in." },
      { status: 403 },
    );
  const formData = await request.formData();
  const password = String(formData.get("password") || "");
  const redirectTo = safeOpsRedirect(
    String(formData.get("redirectTo") || "/ops"),
  );
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
  const setup = useLoaderData<typeof loader>();
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
  const redirectTo = safeOpsRedirect(
    searchParams.get("redirectTo") || "/ops/daily",
  );

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
              Your team workspace for orders, production and the work ahead.
              Individual accounts protect private information.
            </p>
          </div>

          {setup.googleConfigured ? (
            <a
              href={`/ops/auth/google?redirectTo=${encodeURIComponent(redirectTo)}`}
              className="block border border-body px-5 py-4 text-center font-sans hover:bg-(--color-topbar-bg)"
            >
              Continue with Google
            </a>
          ) : (
            <OpsNotice ok={false}>
              Individual sign-in is awaiting provider setup. Google login and
              the private database must be connected before the new sections can
              open.
            </OpsNotice>
          )}
          <p className="text-body-subtle text-sm">
            For Rob and Haven’s approved ModernCre8ve Google accounts.
          </p>
          {setup.googleError ? (
            <OpsNotice ok={false}>
              Google sign-in could not be completed. Choose the approved account
              and try again. For a private connection, grant both requested
              read-only permissions.
            </OpsNotice>
          ) : null}
          {setup.legacyAllowed ? (
            <details className="border-line border-t pt-5">
              <summary className="cursor-pointer text-sm">
                Existing order tools · team password
              </summary>
              <p className="my-4 text-body-subtle text-sm">
                Temporary access to orders and POs. The new sections require an
                individual login.
              </p>
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
            </details>
          ) : null}
        </div>

        <p className="text-body-subtle text-sm">
          For the ModernCre8ve team only.
        </p>
      </div>
    </div>
  );
}
