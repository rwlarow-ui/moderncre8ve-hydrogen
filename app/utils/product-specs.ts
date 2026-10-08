/**
 * Product specifications from Shopify's standard category metafields.
 *
 * Shopify's product taxonomy exposes category attributes ("Furniture/Fixture
 * material", "Extension mechanism", "Bedding size" ...) as metafields in the
 * reserved `shopify` namespace. Each value is a reference to a `shopify--*`
 * metaobject whose `label` field is the human-readable value.
 *
 * These are the same attributes Google Shopping, Shop app search and AI
 * shopping agents read, so we:
 *   1. query them on the product page (PRODUCT_QUERY → `specs`),
 *   2. render them as a "Specifications" accordion on the PDP, and
 *   3. emit them as schema.org Product properties (material, color, size,
 *      additionalProperty) in the product JSON-LD.
 *
 * To add a spec: add an entry below AND the matching identifier to `specs:` in
 * PRODUCT_QUERY (app/graphql/queries.ts — codegen needs a static string).
 * `tests/product-specs.test.mjs` fails if the two lists drift.
 * Values are assigned in Shopify by `scripts/sync-product-attributes.mjs`.
 */

export type ProductSpecKey =
  | "furniture-fixture-material"
  | "tabletop-material"
  | "top-material"
  | "frame-material"
  | "leg-material"
  | "tabletop-color"
  | "top-color"
  | "frame-color"
  | "leg-color"
  | "lumber-wood-type"
  | "wood-finish"
  | "color-pattern"
  | "extension-mechanism"
  | "table-base-type"
  | "bedding-size"
  | "compatible-mattress-size"
  | "bed-frame-features"
  | "headboard-style"
  | "furniture-fixture-features"
  | "seat-type"
  | "backrest-type"
  | "back-type"
  | "door-type"
  | "door-material";

type SpecDefinition = {
  key: ProductSpecKey;
  label: string;
  /** schema.org Product property this spec maps to, if any. */
  schemaProperty?: "material" | "color" | "size";
};

/** Display order on the PDP. */
export const PRODUCT_SPEC_DEFINITIONS: SpecDefinition[] = [
  {
    key: "furniture-fixture-material",
    label: "Material",
    schemaProperty: "material",
  },
  { key: "tabletop-material", label: "Tabletop", schemaProperty: "material" },
  { key: "top-material", label: "Top", schemaProperty: "material" },
  { key: "frame-material", label: "Frame", schemaProperty: "material" },
  { key: "leg-material", label: "Legs", schemaProperty: "material" },
  {
    key: "lumber-wood-type",
    label: "Wood species",
    schemaProperty: "material",
  },
  { key: "wood-finish", label: "Finish" },
  { key: "color-pattern", label: "Color", schemaProperty: "color" },
  { key: "tabletop-color", label: "Tabletop color", schemaProperty: "color" },
  { key: "top-color", label: "Top color", schemaProperty: "color" },
  { key: "frame-color", label: "Frame color", schemaProperty: "color" },
  { key: "leg-color", label: "Leg color", schemaProperty: "color" },
  { key: "extension-mechanism", label: "Extension" },
  { key: "table-base-type", label: "Base style" },
  { key: "bedding-size", label: "Bed sizes", schemaProperty: "size" },
  { key: "compatible-mattress-size", label: "Mattress size" },
  { key: "headboard-style", label: "Headboard" },
  { key: "bed-frame-features", label: "Bed features" },
  { key: "furniture-fixture-features", label: "Features" },
  { key: "seat-type", label: "Seat" },
  { key: "backrest-type", label: "Backrest" },
  { key: "back-type", label: "Back" },
  { key: "door-type", label: "Door type" },
  { key: "door-material", label: "Door material" },
];

export type ProductSpec = {
  key: ProductSpecKey;
  label: string;
  values: string[];
};

type MetaobjectRef = {
  handle?: string | null;
  label?: { value?: string | null } | null;
};

type SpecMetafield = null | {
  key: string;
  namespace?: string | null;
  references?: null | { nodes: Array<MetaobjectRef | Record<string, never>> };
};

/**
 * Normalise the `specs` metafields returned by PRODUCT_QUERY into an ordered,
 * de-duplicated list. Unset metafields come back as `null` and are dropped.
 */
export function parseProductSpecs(
  metafields: ReadonlyArray<SpecMetafield> | null | undefined,
): ProductSpec[] {
  if (!metafields?.length) return [];
  const byKey = new Map<string, string[]>();
  for (const mf of metafields) {
    if (!mf?.key) continue;
    const values = (mf.references?.nodes ?? [])
      .map((node) => (node as MetaobjectRef)?.label?.value?.trim())
      .filter((v): v is string => Boolean(v));
    if (values.length) {
      byKey.set(mf.key, Array.from(new Set(values)));
    }
  }
  return PRODUCT_SPEC_DEFINITIONS.filter((def) => byKey.has(def.key)).map(
    (def) => ({
      key: def.key,
      label: def.label,
      values: byKey.get(def.key) as string[],
    }),
  );
}

/**
 * schema.org fields for the Product node. `material`/`color`/`size` are the
 * properties Google's merchant listing rich results read directly; everything
 * else goes into `additionalProperty` as PropertyValue pairs.
 */
export function productSpecsJsonLd(specs: ProductSpec[]) {
  if (!specs.length) return {};
  const pick = (prop: "material" | "color" | "size") => {
    const values = specs
      .filter(
        (s) =>
          PRODUCT_SPEC_DEFINITIONS.find((d) => d.key === s.key)
            ?.schemaProperty === prop,
      )
      .flatMap((s) => s.values);
    const unique = Array.from(new Set(values));
    return unique.length ? unique.join(", ") : undefined;
  };
  const material = pick("material");
  const color = pick("color");
  const size = pick("size");
  return {
    ...(material && { material }),
    ...(color && { color }),
    ...(size && { size }),
    additionalProperty: specs.map((s) => ({
      "@type": "PropertyValue" as const,
      name: s.label,
      value: s.values.join(", "),
    })),
  };
}
