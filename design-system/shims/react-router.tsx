/** Native navigation for component previews, which have no storefront router. */
import type { ComponentPropsWithRef } from "react";
import type { LinkProps } from "react-router";

export function useRouteLoaderData() {
  return undefined;
}

export function Link({
  to,
  viewTransition,
  preventScrollReset,
  replace,
  state,
  relative,
  reloadDocument,
  discover,
  prefetch,
  ...props
}: LinkProps & ComponentPropsWithRef<"a">) {
  const href =
    typeof to === "string"
      ? to
      : `${to.pathname ?? ""}${to.search ?? ""}${to.hash ?? ""}`;
  return <a {...props} href={href} />;
}
