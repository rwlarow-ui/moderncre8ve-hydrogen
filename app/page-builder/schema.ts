import type { ComponentSchema, ThemeSchema, ThemeSettings } from "./types";

/**
 * Declares a section's schema.
 *
 * This is an identity function: it exists so section modules keep a single,
 * greppable declaration site and so TypeScript infers the literal `type`.
 */
export function createSchema<const T extends ComponentSchema>(schema: T): T {
  return schema;
}

const defaultsCache = new WeakMap<object, ThemeSettings>();

/**
 * Collects the `defaultValue` of every input in a schema into a flat object.
 *
 * These are merged *underneath* a page item's saved `data`, so a field added to
 * a schema after a page was authored still arrives with its default rather than
 * `undefined`.
 */
export function generateDataFromSchema(
  schema: ComponentSchema | ThemeSchema | undefined,
): ThemeSettings {
  if (!schema) {
    return {};
  }
  const cached = defaultsCache.get(schema);
  if (cached) {
    return cached;
  }

  const data: ThemeSettings = {};
  for (const group of schema.settings ?? []) {
    for (const input of group.inputs ?? []) {
      const { name, defaultValue } = input;
      if (name && defaultValue !== null && defaultValue !== undefined) {
        data[name] = defaultValue;
      }
    }
  }

  defaultsCache.set(schema, data);
  return data;
}
