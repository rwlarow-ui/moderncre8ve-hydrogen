import type { LoaderFunctionArgs } from "@shopify/remix-oxygen";
import {
  buildLlmsFullTxt,
  LLMS_QUERY,
  llmsResponse,
} from "~/utils/llms.server";

export async function loader({ request, context }: LoaderFunctionArgs) {
  const { origin } = new URL(request.url);
  const { collections, products } = await context.storefront.query(LLMS_QUERY);
  return llmsResponse(
    buildLlmsFullTxt(origin, collections.nodes, products.nodes),
  );
}
