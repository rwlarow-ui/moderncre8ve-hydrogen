/**
 * Product dimensions from the `custom.width_in` / `depth_in` / `height_in`
 * product metafields (decimal, inches). Emitted as schema.org
 * QuantitativeValue (unitCode INH) on the product JSON-LD. A product emits a
 * dimension only when its metafield holds a positive number.
 *
 * Keep the identifiers in sync with `dimensions:` in PRODUCT_QUERY
 * (app/graphql/queries.ts — codegen needs a static string).
 */

export const PRODUCT_DIMENSION_KEYS = [
  "width_in",
  "depth_in",
  "height_in",
] as const;

type DimensionKey = (typeof PRODUCT_DIMENSION_KEYS)[number];

interface DimensionMetafield {
  key?: string | null;
  value?: string | null;
}

export interface ProductDimension {
  property: "width" | "depth" | "height";
  label: string;
  inches: number;
}

const DEFINITIONS: Record<
  DimensionKey,
  { property: ProductDimension["property"]; label: string }
> = {
  width_in: { property: "width", label: "Width" },
  depth_in: { property: "depth", label: "Depth" },
  height_in: { property: "height", label: "Height" },
};

export function parseProductDimensions(
  metafields:
    | readonly (DimensionMetafield | null | undefined)[]
    | null
    | undefined,
): ProductDimension[] {
  const dimensions: ProductDimension[] = [];
  for (const key of PRODUCT_DIMENSION_KEYS) {
    const raw = metafields?.find((m) => m?.key === key)?.value;
    const inches = raw ? Number.parseFloat(raw) : Number.NaN;
    if (Number.isFinite(inches) && inches > 0) {
      dimensions.push({ ...DEFINITIONS[key], inches });
    }
  }
  return dimensions;
}

export function productDimensionsJsonLd(dimensions: ProductDimension[]) {
  return Object.fromEntries(
    dimensions.map((d) => [
      d.property,
      { "@type": "QuantitativeValue", value: d.inches, unitCode: "INH" },
    ]),
  );
}
