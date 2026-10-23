import { type AppLoadContext, redirect } from "react-router";
import type { Route } from "./+types/($locale).account_.logout";

export async function doLogout(context: AppLoadContext) {
  return context.customerAccount.logout();
}

export async function loader({ params }: Route.LoaderArgs) {
  const locale = params.locale;
  return redirect(locale ? `/${locale}` : "/");
}

export async function action({ context }: Route.ActionArgs) {
  return doLogout(context);
}
