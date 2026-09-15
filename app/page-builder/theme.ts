import { useRouteLoaderData } from "react-router";
import type { ThemeSettings } from "./types";

/**
 * Theme settings — colors, type scale, header/footer options — as resolved by
 * the root loader from `themeSchema`.
 *
 * Returns `{}` when root data is unavailable (an error boundary rendering
 * outside a successful root load), so callers should destructure with defaults.
 */
export function useThemeSettings<T = ThemeSettings>(): T {
  const data = useRouteLoaderData<{ themeSettings?: ThemeSettings }>("root");
  return (data?.themeSettings ?? {}) as T;
}
