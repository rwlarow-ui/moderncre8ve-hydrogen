import { redirect } from "@shopify/remix-oxygen";
import type { Route } from "./+types/($locale).account.$";

// fallback wild card for all unauthenticated routes in account section
export async function loader({ context }: Route.LoaderArgs) {
  await context.customerAccount.handleAuthStatus();

  return redirect("/account");
}
