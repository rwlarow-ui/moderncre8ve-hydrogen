import {
  Analytics,
  getAdjacentAndFirstAvailableVariants,
  useOptimisticVariant,
} from "@shopify/hydrogen";
import type {
  ActionFunctionArgs,
  LoaderFunctionArgs,
  MetaArgs,
} from "@shopify/remix-oxygen";
import { data } from "@shopify/remix-oxygen";
import { getSelectedProductOptions } from "@weaverse/hydrogen";
import { useEffect } from "react";
import { useLoaderData } from "react-router";
import type { ProductQuery } from "storefront-api.generated";
import invariant from "tiny-invariant";
import { PRODUCT_QUERY } from "~/graphql/queries";
import { routeHeaders } from "~/utils/cache";
import {
  COMBINED_LISTINGS_CONFIGS,
  isCombinedListing,
} from "~/utils/combined-listings";
import { getEnhancedSeoMeta } from "~/utils/enhanced-seo-meta";
import { createJudgeMeReview, getJudgeMeProductReviews } from "~/utils/judgeme";
import { getRecommendedProducts } from "~/utils/product";
import { verifyTurnstile } from "~/utils/turnstile.server";
import {
  redirectIfCombinedListing,
  redirectIfHandleIsLocalized,
} from "~/utils/redirect";
import { seoPayload } from "~/utils/seo.server";
import { loadPageWithFallback } from "~/utils/weaverse-fallback.server";
import { WeaverseContent } from "~/weaverse";

export const headers = routeHeaders;

export async function loader({ params, request, context }: LoaderFunctionArgs) {
  const { productHandle: handle } = params;

  invariant(handle, "Missing productHandle param, check route filename");

  const { storefront, weaverse } = context;
  const selectedOptions = getSelectedProductOptions(request);
  const [{ shop, product }, weaverseData, productReviews] = await Promise.all([
    storefront.query<ProductQuery>(PRODUCT_QUERY, {
      variables: {
        handle,
        selectedOptions,
        country: storefront.i18n.country,
        language: storefront.i18n.language,
      },
    }),
    loadPageWithFallback(weaverse, { type: "PRODUCT", handle }),
    getJudgeMeProductReviews({ context, handle }),
    // Add other queries here, so that they are loaded in parallel
  ]);

  if (!product?.id) {
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
    weaverseData,
    productReviews,
    storeDomain: shop.primaryDomain.url,
    seo: seoPayload.product({ product, url: request.url }),
    recommended,
    selectedOptions,
  };
}

export async function action({
  request,
  context: { env },
}: ActionFunctionArgs) {
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

export const meta = ({ matches, location }: MetaArgs<typeof loader>) => {
  const canonical = `https://moderncre8ve.com${location.pathname.replace(/\/+$/, "") || "/"}`;
  return getEnhancedSeoMeta(
    ...matches.map((match) => (match.data as any)?.seo).filter(Boolean),
    { canonicalUrl: canonical },
  );
};

export default function Product() {
  const { product } = useLoaderData<typeof loader>();
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
          has an H1 tag even if the Weaverse section doesn't render one. */}
      <h1 className="sr-only">{product.title}</h1>
      <WeaverseContent />
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
