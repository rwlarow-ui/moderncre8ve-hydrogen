import { CacheCustom } from "@shopify/hydrogen";
import type { AppLoadContext } from "react-router";
import { constructURL } from "./misc";

/**
 * Judge.me review data changes rarely, so serve it from cache aggressively and
 * revalidate in the background. Matches the strategy the previous cached
 * fetcher used.
 */
const JUDGEME_CACHE_STRATEGY = {
  maxAge: 10,
  sMaxAge: 10,
  staleWhileRevalidate: 82_800,
  staleIfError: 82_800,
};

/** A cached JSON `fetch`, returning the parsed body or `null`. */
function cachedJsonFetcher(withCache: AppLoadContext["withCache"]) {
  return async <T>(url: string): Promise<T | null> => {
    const { data } = await withCache.fetch<T>(
      url,
      {},
      {
        cacheKey: ["judgeme", url],
        cacheStrategy: CacheCustom(JUDGEME_CACHE_STRATEGY),
        shouldCacheResponse: (body) => body !== null && body !== undefined,
        displayName: "Judge.me API",
      },
    );
    return data;
  };
}

type JudgemeProductData = {
  product: {
    id: string;
    handle: string;
  };
};

type JudgeMeReviewType = {
  id: string;
  title: string;
  created_at: string;
  body: string;
  rating: number;
  reviewer: {
    id: number;
    email: string;
    name: string;
    phone: string;
  };
  pictures: {
    urls: {
      original: string;
      small: string;
      compact: string;
      huge: string;
    };
  }[];
};

export type JudgemeReviewsData = {
  rating: number;
  reviewNumber: number;
  reviews: JudgeMeReviewType[];
};

const JUDGEME_PRODUCT_API = "https://judge.me/api/v1/products/-1";
const JUDGEME_REVIEWS_API = "https://judge.me/api/v1/reviews";

export async function getJudgeMeProductReviews({
  context,
  handle,
}: {
  context: AppLoadContext;
  handle: string;
}) {
  try {
    const { withCache, env } = context;
    const { JUDGEME_PRIVATE_API_TOKEN, PUBLIC_STORE_DOMAIN } = env;
    if (JUDGEME_PRIVATE_API_TOKEN) {
      const fetchCached = cachedJsonFetcher(withCache);
      const { product } =
        (await fetchCached<JudgemeProductData>(
          constructURL(JUDGEME_PRODUCT_API, {
            handle,
            shop_domain: PUBLIC_STORE_DOMAIN,
            api_token: JUDGEME_PRIVATE_API_TOKEN,
          }),
        )) ?? {};
      if (product?.id) {
        const { reviews } =
          (await fetchCached<JudgemeReviewsData>(
            constructURL(JUDGEME_REVIEWS_API, {
              api_token: JUDGEME_PRIVATE_API_TOKEN,
              shop_domain: PUBLIC_STORE_DOMAIN,
              product_id: product?.id,
            }),
          )) ?? {};
        const reviewNumber = reviews.length || 1;
        const rating = reviews.reduce((a, c) => a + c.rating, 0) / reviewNumber;
        return { rating, reviewNumber, reviews };
      }
    }
  } catch (error) {
    // biome-ignore lint/suspicious/noConsole: <explanation> --- IGNORE ---
    console.log("Error fetching Judgeme product reviews", error.message);
  }
  return { rating: 0, reviewNumber: 0, reviews: [] };
}

export async function createJudgeMeReview({
  formData,
  shopDomain,
  apiToken,
}: {
  shopDomain: string;
  apiToken: string;
  formData: FormData;
}) {
  return await fetch(
    constructURL(JUDGEME_REVIEWS_API, {
      api_token: apiToken,
      shop_domain: shopDomain,
    }),
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        shop_domain: shopDomain,
        platform: "shopify",
        ...formDataToObject(formData),
      }),
    },
  );
}

const ALLOWED_REVIEW_FIELDS = new Set([
  "id",
  "name",
  "email",
  "rating",
  "title",
  "body",
  "product_id",
  "reviewer_name_format",
]);

function formDataToObject(formData: FormData) {
  const data: Record<string, string> = {};
  for (const [key, value] of formData.entries()) {
    if (ALLOWED_REVIEW_FIELDS.has(key) && typeof value === "string") {
      data[key] = value;
    }
  }
  return data;
}
