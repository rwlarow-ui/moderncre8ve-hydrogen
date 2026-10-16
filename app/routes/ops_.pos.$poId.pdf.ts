import type { LoaderFunctionArgs } from "react-router";
import { requireOpsAccess } from "~/utils/ops-auth.server";
import { buildPoDocument } from "~/utils/po-document";
import { renderPoPdf } from "~/utils/po-pdf.server";
import { getProductionPo } from "~/utils/production-po.server";

/**
 * Preview of the exact PDF the partner receives. Outside the /ops layout
 * (`ops_`) because it returns a file, so it checks ops access itself. POs
 * that aren't approved yet are stamped DRAFT by the document builder.
 */
export async function loader({ request, context, params }: LoaderFunctionArgs) {
  await requireOpsAccess(request, context);
  if (!params.poId) throw new Response("PO not found.", { status: 404 });

  let po: Awaited<ReturnType<typeof getProductionPo>>;
  try {
    po = await getProductionPo(context.env, params.poId);
  } catch {
    throw new Response("PO not found.", { status: 404 });
  }

  const document = buildPoDocument({ po });
  const bytes = await renderPoPdf(document);
  return new Response(bytes, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${document.number}${document.draft ? "-DRAFT" : ""}.pdf"`,
      // Contains the customer's address and phone.
      "Cache-Control": "private, no-store",
      "X-Robots-Tag": "noindex",
    },
  });
}
