/**
 * Plain-text documentation for AI shopping agents (llmstxt.org convention).
 * Facts here mirror CLAUDE.md "Store Knowledge" — update both together.
 */

export type LlmsProduct = {
  title: string;
  handle: string;
  productType?: string | null;
  priceRange: { minVariantPrice: { amount: string; currencyCode: string } };
};

export type LlmsCollection = { title: string; handle: string };

const SUMMARY = `ModernCre8ve is a Cleveland, Ohio furniture studio. We design modern furniture (mid-century modern, Scandinavian, Japandi) and have it handcrafted to order in solid American hardwood by Ohio Amish craftsmen.`;

function facts(origin: string) {
  return `## Key facts

- Materials: solid American hardwoods (walnut, white oak, cherry, hard maple).
- Lead time: all furniture is made to order, 12-16 weeks. Furniture wax ships in 3-5 business days.
- Delivery: white glove in-home delivery with assembly on 95%+ of orders.
- Origin: handcrafted in Ohio, USA.
- Returns, shipping and care: ${origin}/pages/faq
- Contact and showroom: ${origin}/pages/trade
- Sitemap: ${origin}/sitemap.xml`;
}

export function buildLlmsTxt(origin: string, collections: LlmsCollection[]) {
  return `# ModernCre8ve

> ${SUMMARY}

${facts(origin)}

## Collections

${collections.map((c) => `- [${c.title}](${origin}/collections/${c.handle})`).join("\n")}

## Full catalog

- [Products with prices](${origin}/llms-full.txt)
`;
}

export function buildLlmsFullTxt(
  origin: string,
  collections: LlmsCollection[],
  products: LlmsProduct[],
) {
  const price = (p: LlmsProduct) => {
    const { amount, currencyCode } = p.priceRange.minVariantPrice;
    return `from ${Number.parseFloat(amount).toLocaleString("en-US", {
      style: "currency",
      currency: currencyCode,
      maximumFractionDigits: 0,
    })}`;
  };
  return `${buildLlmsTxt(origin, collections).split("## Full catalog")[0]}## Products

${products
  .map(
    (p) =>
      `- [${p.title}](${origin}/products/${p.handle})${
        p.productType ? ` (${p.productType})` : ""
      }: ${price(p)}`,
  )
  .join("\n")}
`;
}

export const LLMS_QUERY = `#graphql
  query LlmsCatalog($country: CountryCode, $language: LanguageCode)
  @inContext(country: $country, language: $language) {
    collections(first: 50) {
      nodes {
        title
        handle
      }
    }
    products(first: 100) {
      nodes {
        title
        handle
        productType
        priceRange {
          minVariantPrice {
            amount
            currencyCode
          }
        }
      }
    }
  }
` as const;

export function llmsResponse(body: string) {
  return new Response(body, {
    status: 200,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": `max-age=${60 * 60 * 24}`,
    },
  });
}
