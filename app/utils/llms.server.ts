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
- Lead time: ModernCre8ve furniture is made to order and takes 12-16 weeks.
- Wood care: Lareaux's Furniture Wax is not made to order; it ships in 3-5 business days.
- Delivery: white glove in-home delivery with assembly on 95%+ of furniture orders.
- Origin: ModernCre8ve furniture is handcrafted in Ohio, USA. Some seating and stools are imported; each product page states its origin.
- Returns, shipping and care: ${origin}/pages/faq
- Sitemap: ${origin}/sitemap.xml

## Contact

- Phone: (216) 502-0755
- Email: info@moderncre8ve.com
- Address: 1400 E 36th Street, Suite 2802A, Cleveland, OH 44114
- Hours: Monday-Friday, 9am-5pm Eastern
- Trade and showroom: ${origin}/pages/trade`;
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
