import { loadCarePdf } from "~/utils/ops-care.server";
import { requireOpsUser } from "~/utils/ops-identity.server";
import type { Route } from "./+types/ops_.care.pdf.$version";

/**
 * Opens an uploaded blank logistics PDF version so it can be checked before
 * approval. Outside the /ops layout because it returns a file.
 */
export async function loader({ request, context, params }: Route.LoaderArgs) {
  const user = await requireOpsUser(request, context, { owner: true });
  const version = Number(params.version);
  if (!Number.isInteger(version) || version < 1) {
    throw new Response("Not found.", { status: 404 });
  }
  const bytes = await loadCarePdf(context.env, user, version);
  if (!bytes) {
    throw new Response("Not found.", { status: 404 });
  }
  return new Response(bytes, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="logistics-form-v${version}.pdf"`,
      "Cache-Control": "private, no-store",
      "X-Robots-Tag": "noindex",
    },
  });
}
