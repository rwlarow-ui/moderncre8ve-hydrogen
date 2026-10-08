/**
 * Stand-in for `~/page-builder` inside the design-system bundle.
 *
 * The storefront reads theme settings from the root loader; here there is no
 * router, so `useThemeSettings()` returns the same object the root loader
 * would — `getThemeSettings()` resolves every `defaultValue` in
 * `theme-schema.server.ts`, the single source of truth.
 */
import { getThemeSettings } from "../../app/page-builder/theme.server";
import type { ThemeSettings } from "../../app/page-builder/types";

const settings = getThemeSettings();

export function useThemeSettings<T = ThemeSettings>(): T {
  return settings as T;
}
