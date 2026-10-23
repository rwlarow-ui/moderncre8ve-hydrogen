import type { LoaderFunctionArgs } from "@shopify/remix-oxygen";
import { buildLlmsTxt, LLMS_QUERY, llmsResponse } from "~/utils/llms.server";

export async function loader({ request, context }: LoaderFunctionArgs) {
  const { origin } = new URL(request.url);
  const { collections } = await context.storefront.query(LLMS_QUERY);
  return llmsResponse(buildLlmsTxt(origin, collections.nodes));
}
