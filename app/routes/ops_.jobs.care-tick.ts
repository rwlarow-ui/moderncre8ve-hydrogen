import { jobSecretMatches, runCareTick } from "~/utils/ops-care.server";
import { privateHeaders } from "~/utils/ops-store.server";
import type { Route } from "./+types/ops_.jobs.care-tick";

/**
 * The scheduled due worker for logistics emails (ADR-0010). Called hourly by
 * .github/workflows/care-tick.yml with `Authorization: Bearer OPS_JOB_SECRET`.
 * It reads no request body: it can only process emails the hub has already
 * queued for its own eligible orders, and it returns counts, never customer
 * data. Without the secret configured it refuses every call.
 */
export async function action({ request, context }: Route.ActionArgs) {
  if (
    !(await jobSecretMatches(context.env, request.headers.get("Authorization")))
  ) {
    return new Response("Unauthorized", {
      status: 401,
      headers: privateHeaders,
    });
  }
  const result = await runCareTick(context.env);
  return Response.json(
    {
      ok: result.errors.length === 0,
      sent: result.sent,
      held: result.held,
      suppressed: result.suppressed,
      failed: result.failed,
      uncertain: result.uncertain,
      reconciled: result.reconciled,
      intake: result.intake,
      planned: result.planned,
      waiting: result.waiting,
      problems: result.errors.length,
    },
    { headers: privateHeaders },
  );
}

export function loader() {
  return new Response("Method Not Allowed", {
    status: 405,
    headers: { ...privateHeaders, Allow: "POST" },
  });
}
