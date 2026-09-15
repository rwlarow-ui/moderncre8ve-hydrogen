import { generateDataFromSchema } from "./schema";
import { themeSchema } from "./theme-schema.server";
import type { ThemeSettings } from "./types";

/**
 * The storefront's theme settings.
 *
 * `themeSchema` is the single source of truth: every setting's `defaultValue`
 * is the value the storefront renders with. The root loader hands the result to
 * the client, where `useThemeSettings()` reads it.
 */
export function getThemeSettings(): ThemeSettings {
  return generateDataFromSchema(themeSchema);
}
