import type { Storefront } from "@shopify/hydrogen";
import {
  type CartMerchandiseNode,
  cartLineMerchandiseIds,
  REQUEST_ONLY_CART_MESSAGE,
  requestOnlyMerchandise,
} from "~/utils/product-class";

const REQUEST_ONLY_CART_QUERY = `#graphql
  query RequestOnlyCartCheck($ids: [ID!]!) {
    nodes(ids: $ids) {
      ... on ProductVariant {
        id
        product {
          handle
          tags
        }
      }
    }
  }
` as const;

/** Why a cart request was refused; `checkRequestOnlyLines` returns null when it may go ahead. */
export interface RequestOnlyCartRejection {
  status: number;
  message: string;
  blocked: { merchandiseId: string; handle: string | null }[];
}

/**
 * Server-side guard for request-only pieces (`request-only` product tag).
 * The product page hides Add to Cart for them, but a direct POST to a cart
 * route would still add them, so every route that adds lines or changes a
 * line's merchandise calls this first with the line inputs.
 *
 * One uncached Storefront API query looks up every merchandise ID's product
 * tags. If the lookup itself fails the request is refused (fail closed): the
 * cart mutation needs the same API, so this only blocks what would likely
 * fail anyway.
 */
export async function checkRequestOnlyLines(
  storefront: Storefront,
  lines: unknown,
): Promise<RequestOnlyCartRejection | null> {
  const ids = cartLineMerchandiseIds(lines);
  if (ids.length === 0) {
    return null;
  }
  let nodes: CartMerchandiseNode[];
  try {
    const result = await storefront.query(REQUEST_ONLY_CART_QUERY, {
      variables: { ids },
      cache: storefront.CacheNone(),
    });
    nodes = (result?.nodes ?? []) as CartMerchandiseNode[];
  } catch (error) {
    console.error("Request-only cart check failed", error);
    return {
      status: 503,
      message: "We couldn't add this to your cart. Please try again.",
      blocked: [],
    };
  }
  const blocked = requestOnlyMerchandise(ids, nodes);
  if (blocked.length > 0) {
    return {
      status: 422,
      message: REQUEST_ONLY_CART_MESSAGE,
      blocked,
    };
  }
  return null;
}

/** The cart action's error payload shape (`{ cart, userErrors, errors }`). */
export function requestOnlyCartErrorPayload(check: RequestOnlyCartRejection) {
  return {
    cart: null,
    userErrors: [
      {
        code: check.blocked.length ? "REQUEST_ONLY" : "INVALID",
        field: ["lines"],
        message: check.message,
      },
    ],
    errors: null,
  };
}
