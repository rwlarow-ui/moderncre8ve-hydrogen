import {
  Analytics,
  getAdjacentAndFirstAvailableVariants,
  getSelectedProductOptions,
  useOptimisticVariant,
} from "@shopify/hydrogen";
import type { MetaArgs } from "@shopify/remix-oxygen";
import { data } from "@shopify/remix-oxygen";
import { useEffect } from "react";
import {
  isRouteErrorResponse,
  useLoaderData,
  useRouteError,
} from "react-router";
import type {
  HeldProductPiecesQuery,
  ProductCardFragment,
  ProductQuery,
} from "storefront-api.generated";
import invariant from "tiny-invariant";
import {
  type HeldProductNotFound,
  HeldProductNotice,
  isHeldProductNotFound,
} from "~/components/product/held-product-notice";
import { GenericError } from "~/components/root/generic-error";
import { NotFound } from "~/components/root/not-found";
import { getHeldProduct, HELD_PRODUCTS } from "~/data/held-products";
import { PRODUCT_CARD_FRAGMENT } from "~/graphql/fragments";
import { PRODUCT_QUERY } from "~/graphql/queries";
import { adaptProductPage } from "~/page-builder/adapt-product-page";
import { loadPage } from "~/page-builder/page.server";
import { PageContent } from "~/page-builder/renderer";
import {
  COMBINED_LISTINGS_CONFIGS,
  isCombinedListing,
} from "~/utils/combined-listings";
import { getEnhancedSeoMeta } from "~/utils/enhanced-seo-meta";
import { createJudgeMeReview, getJudgeMeProductReviews } from "~/utils/judgeme";
import { getRecommendedProducts } from "~/utils/product";
import { productClass } from "~/utils/product-class";
import {
  redirectIfCombinedListing,
  redirectIfHandleIsLocalized,
} from "~/utils/redirect";
import { seoPayload } from "~/utils/seo.server";
import { verifyTurnstile } from "~/utils/turnstile.server";
import type { Route } from "./+types/($locale).products.$productHandle";

export function headers({
  loaderHeaders,
  errorHeaders,
}: Route.HeadersArgs): Record<string, string> {
  // Keep the loader's cache policy; a held-product 404 also carries noindex.
  const robots = errorHeaders?.get("X-Robots-Tag");
  const cacheControl = loaderHeaders.get("Cache-Control");
  return {
    ...(cacheControl ? { "Cache-Control": cacheControl } : {}),
    ...(robots ? { "X-Robots-Tag": robots } : {}),
  };
}

export async function loader({ params, request, context }: Route.LoaderArgs) {
  const { productHandle: handle } = params;

  invariant(handle, "Missing productHandle param, check route filename");

  const { storefront } = context;
  const selectedOptions = getSelectedProductOptions(request);
  const [{ shop, product }, pageData, productReviews] = await Promise.all([
    storefront.query<ProductQuery>(PRODUCT_QUERY, {
      variables: {
        handle,
        selectedOptions,
        country: storefront.i18n.country,
        language: storefront.i18n.language,
      },
    }),
    loadPage({ context, request }, { type: "PRODUCT", handle }),
    getJudgeMeProductReviews({ context, handle }),
    // Add other queries here, so that they are loaded in parallel
  ]);

  if (!product?.id) {
    const held = getHeldProduct(handle);
    if (held) {
      // A piece on hold in the catalog rollout: still a 404, but a friendly one.
      const notFound: HeldProductNotFound = {
        type: "product",
        held: { handle, ...held },
        livePieces: await getHeldProductPieces(
          storefront,
          held.collection.handle,
        ),
      };
      throw data(notFound, {
        status: 404,
        headers: { "X-Robots-Tag": "noindex" },
      });
    }
    throw new Response("product", { status: 404 });
  }
  redirectIfHandleIsLocalized(request, { handle, data: product });

  if (COMBINED_LISTINGS_CONFIGS.redirectToFirstVariant) {
    redirectIfCombinedListing(request, product);
  }

  // Use Hydrogen/Remix streaming for recommended products
  const recommended = getRecommendedProducts(storefront, product.id);

  return {
    shop,
    product,
    pageData: adaptProductPage(pageData, productClass(product), handle),
    productReviews,
    storeDomain: shop.primaryDomain.url,
    seo: seoPayload.product({
      product,
      url: request.url,
      reviews: {
        rating: productReviews.rating,
        reviewCount: productReviews.reviews.length,
      },
    }),
    recommended,
    selectedOptions,
  };
}

export async function action({ request, context: { env } }: Route.ActionArgs) {
  try {
    const formData = await request.formData();

    // Honeypot check
    if (formData.get("website")) {
      return data({ success: true }, { status: 200 });
    }

    // Turnstile verification
    const turnstileToken = formData.get("cf-turnstile-response") as string;
    const turnstileValid = await verifyTurnstile(
      turnstileToken,
      env.TURNSTILE_SECRET_KEY,
      request.headers.get("CF-Connecting-IP") || undefined,
    );
    if (!turnstileValid) {
      return data(
        { error: "Please complete the verification challenge and try again." },
        { status: 400 },
      );
    }

    invariant(
      env.JUDGEME_PRIVATE_API_TOKEN,
      "Missing `JUDGEME_PRIVATE_API_TOKEN`",
    );

    const response = await createJudgeMeReview({
      formData,
      apiToken: env.JUDGEME_PRIVATE_API_TOKEN,
      shopDomain: env.PUBLIC_STORE_DOMAIN,
    });
    return response;
  } catch (error) {
    return data({ error: "Failed to create review!" }, { status: 500 });
  }
}

export const meta = ({ matches, location, error }: MetaArgs<typeof loader>) => {
  const canonical = `https://moderncre8ve.com${location.pathname.replace(/\/+$/, "") || "/"}`;
  const tags = getEnhancedSeoMeta(
    ...matches.map((match) => (match.data as any)?.seo).filter(Boolean),
    { canonicalUrl: canonical },
  );
  if (isRouteErrorResponse(error) && isHeldProductNotFound(error.data)) {
    return [
      ...tags.filter((tag) => tag.name !== "robots" && !("title" in tag)),
      { title: `${error.data.held.name} | ModernCre8ve` },
      { name: "robots", content: "noindex" },
    ];
  }
  return tags;
};

/**
 * Up to four purchasable pieces from a held product's collection, falling
 * back to best sellers. Held handles are skipped. Never throws: the notice
 * still renders without them.
 */
async function getHeldProductPieces(
  storefront: Route.LoaderArgs["context"]["storefront"],
  collectionHandle: string,
): Promise<ProductCardFragment[]> {
  try {
    const { collection, fallback } =
      await storefront.query<HeldProductPiecesQuery>(
        HELD_PRODUCT_PIECES_QUERY,
        {
          variables: {
            collectionHandle,
            country: storefront.i18n.country,
            language: storefront.i18n.language,
          },
        },
      );
    const isLive = (p: ProductCardFragment) =>
      !Object.hasOwn(HELD_PRODUCTS, p.handle) &&
      Boolean(p.selectedOrFirstAvailableVariant?.availableForSale);
    const fromCollection = (collection?.products.nodes ?? []).filter(isLive);
    const pieces = fromCollection.length
      ? fromCollection
      : fallback.nodes.filter(isLive);
    return pieces.slice(0, 4);
  } catch (error) {
    console.error("Held product pieces failed:", error);
    return [];
  }
}

export function ErrorBoundary() {
  const error = useRouteError();
  if (isRouteErrorResponse(error)) {
    if (isHeldProductNotFound(error.data)) {
      return <HeldProductNotice {...error.data} />;
    }
    if (error.status === 404) {
      return <NotFound type="product" />;
    }
    return (
      <GenericError error={{ message: `${error.status} ${error.data}` }} />
    );
  }
  return <GenericError error={error instanceof Error ? error : undefined} />;
}

export default function Product() {
  const { product, pageData } = useLoaderData<typeof loader>();
  const combinedListing = isCombinedListing(product);

  // Optimistically selects a variant with given available variant information
  const selectedVariant = useOptimisticVariant(
    product.selectedOrFirstAvailableVariant,
    getAdjacentAndFirstAvailableVariants(product),
  );

  // Sets the search param to the selected variant without navigation
  // when no search params are set or when variant options don't match
  useEffect(() => {
    if (!selectedVariant?.selectedOptions || combinedListing) {
      return;
    }

    const currentParams = new URLSearchParams(window.location.search);
    let needsUpdate = false;

    // If no search params exist, we need to add them
    if (window.location.search === "") {
      needsUpdate = true;
    } else {
      // Check if any of the selected variant options differ from current params
      for (const option of selectedVariant.selectedOptions) {
        const currentValue = currentParams.get(option.name);
        if (currentValue !== option.value) {
          needsUpdate = true;
          break;
        }
      }
    }

    if (needsUpdate) {
      // Preserve existing non-variant-related params
      const updatedParams = new URLSearchParams(currentParams);

      // Update or add variant option params
      for (const option of selectedVariant.selectedOptions) {
        updatedParams.set(option.name, option.value);
      }

      const newSearch = updatedParams.toString();
      if (newSearch !== window.location.search.slice(1)) {
        window.history.replaceState(
          {},
          "",
          `${location.pathname}?${newSearch}`,
        );
      }
    }
  }, [selectedVariant?.selectedOptions, combinedListing]);

  return (
    <>
      {/* SEO fallback H1 — visually hidden but ensures every product page
          has an H1 tag even if the page composition doesn't render one. */}
      <h1 className="sr-only">{product.title}</h1>
      <PageContent pageData={pageData} />
      {selectedVariant && (
        <Analytics.ProductView
          data={{
            products: [
              {
                id: product.id,
                title: product.title,
                price: selectedVariant?.price.amount || "0",
                vendor: product.vendor,
                variantId: selectedVariant?.id || "",
                variantTitle: selectedVariant?.title || "",
                quantity: 1,
              },
            ],
          }}
        />
      )}
    </>
  );
}

const HELD_PRODUCT_PIECES_QUERY = `#graphql
  query HeldProductPieces(
    $collectionHandle: String!
    $country: CountryCode
    $language: LanguageCode
  ) @inContext(country: $country, language: $language) {
    collection(handle: $collectionHandle) {
      products(first: 12, sortKey: BEST_SELLING) {
        nodes {
          ...ProductCard
        }
      }
    }
    fallback: products(first: 12, sortKey: BEST_SELLING) {
      nodes {
        ...ProductCard
      }
    }
  }
  ${PRODUCT_CARD_FRAGMENT}
` as const;
