import { useMatches } from "react-router";

/**
 * Finish wording shared by the default product template. Most furniture is
 * finished with one or the other; every dining table gets both.
 */
const EITHER_FINISH = "catalyzed lacquer or hand-rubbed oil";
const DINING_TABLE_FINISH = "catalyzed lacquer and Rev Oil";
const DINING_TABLE_PRODUCT_TYPE = "dining tables";

export function applyProductFinishCopy(
  text: string,
  productType?: string | null,
): string {
  if (
    !text ||
    productType?.trim().toLowerCase() !== DINING_TABLE_PRODUCT_TYPE
  ) {
    return text;
  }
  return text.split(EITHER_FINISH).join(DINING_TABLE_FINISH);
}

/**
 * Returns `text` with the finish wording adjusted for the product on the
 * current route. Outside a product page the text is returned unchanged.
 */
export function useProductFinishCopy(text: string): string {
  const matches = useMatches();
  let productType: string | undefined;
  for (const match of matches) {
    const data = match.data as
      | { product?: { productType?: string } }
      | undefined;
    if (data?.product?.productType) {
      productType = data.product.productType;
      break;
    }
  }
  return applyProductFinishCopy(text, productType);
}
