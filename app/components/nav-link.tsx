import type { Ref } from "react";
import {
  NavLink as RemixNavLink,
  type NavLinkProps as RemixNavLinkProps,
  useRouteLoaderData,
} from "react-router";
import { useThemeSettings } from "~/page-builder";
import type { RootLoader } from "~/root";

export const NavLink = ({
  ref,
  ...props
}: RemixNavLinkProps & { ref?: Ref<HTMLAnchorElement> }) => {
  const { to, className, ...rest } = props;
  const rootData = useRouteLoaderData<RootLoader>("root");
  const { enableViewTransition } = useThemeSettings();
  const selectedLocale = rootData?.selectedLocale;

  let toWithLocale = to;
  if (
    typeof toWithLocale === "string" &&
    selectedLocale?.pathPrefix &&
    !toWithLocale.toLowerCase().startsWith(selectedLocale.pathPrefix)
  ) {
    toWithLocale = `${selectedLocale.pathPrefix}${to}`;
  }

  return (
    <RemixNavLink
      ref={ref}
      viewTransition={enableViewTransition}
      to={toWithLocale}
      className={className}
      {...rest}
    />
  );
};
