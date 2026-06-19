/**
 * SEO Quick Wins — Shopify Admin API Update Script
 *
 * Run this via the browser console (Shopify Admin GraphQL)
 * or from a server-side route with Admin API access.
 *
 * Covers:
 * 1. Title tags & meta descriptions for June 2026 Search Console winners
 * 2. Mid-century dining tables collection expanded description
 * 3. Product SEO fields for Payne oval extendable dining table
 * 4. Alt text updates for product images
 */

// ============================================================
// 1. OPTIMIZED TITLE TAGS & META DESCRIPTIONS
// ============================================================
// Targets combine the June 4 Search Console email with the truth-layer
// weekly brief/actions CSV:
// - mid-century-modern-dining-tables: +80 May clicks; March CTR 0.2% vs
//   expected 1.0%; top query "mid century modern dining table".
// - japandi-scandi-mid-century-modern-furniture: +9 May clicks; March
//   position 10.0; top query "japandi mcm".
// - payne-oval-extendable-dining-table-for-6-8: +7 May clicks; March CTR
//   0.0% vs expected 1.0%; oval/extendable/table-for-6 query cluster.

export const collectionSeoUpdates = [
  {
    handle: "mid-century-modern-dining-tables",
    seo: {
      title: "Mid Century Modern Dining Tables: Walnut, Oak & Extendable",
      description:
        "Shop solid walnut and oak mid century modern dining tables, handcrafted to order in Ohio with extendable options, custom sizing, and white glove delivery.",
    },
  },
  {
    handle: "japandi-scandi-mid-century-modern-furniture",
    seo: {
      title: "Japandi MCM Furniture: Scandi & Mid Century Modern",
      description:
        "Shop Japandi MCM furniture blending Japanese minimalism, Scandi warmth, and mid-century lines. Solid walnut and oak pieces handmade to order in Ohio.",
    },
  },
];

export const productSeoUpdates = [
  {
    handle: "payne-oval-extendable-dining-table-for-6-8",
    seo: {
      title: "Payne Oval Extendable Dining Table for 6-8",
      description:
        "Shop the Payne oval extendable dining table for 6-8, handcrafted in solid walnut or oak with a butterfly leaf, custom finishes, and white glove delivery.",
    },
  },
];

// ============================================================
// 2. EXPANDED COLLECTION DESCRIPTION
// ============================================================
// For: /collections/mid-century-modern-dining-tables
// June 4 Search Console email: +80 May clicks, 181 total May clicks.
// Truth-layer: low CTR for "mid century modern dining table" and related
// walnut / extendable variants.

export const midCenturyDiningDescription = `<p>Our <strong>mid century modern dining tables</strong> are handcrafted to order by skilled Amish artisans in Ohio, using solid American walnut, white oak, cherry, and maple. Each table is built with traditional joinery and hand-finished surfaces, giving you a dining table with real weight, lasting structure, and wood grain that becomes more beautiful with daily use.</p>

<h3>Why Choose a Handcrafted Mid Century Modern Dining Table?</h3>
<p>Mid century modern dining tables are known for clean lines, tapered legs, softened corners, and organic silhouettes inspired by the 1940s through 1960s. Instead of veneer or particle board, ModernCre8ve tables are made one at a time from solid hardwood. The result is a substantial dining centerpiece built for everyday meals, long dinners, and years of family use.</p>

<h3>Walnut, Oak, Cherry, and Custom Finishes</h3>
<p><strong>Solid American walnut</strong> remains the signature mid-century choice because of its warm chocolate color and expressive grain. White oak creates a lighter Scandinavian look, while cherry brings warmth that deepens with age. Most designs can be customized by wood species, finish, length, width, and extension configuration so the table fits both your room and your way of hosting.</p>

<h3>Extendable Tables for 6, 8, 10, or More</h3>
<p>Many of our mid century modern dining tables include extension leaves or custom sizing options. Round, oval, and rectangular designs can be built for compact rooms, everyday seating for 6, or larger gatherings for 8 to 12 guests. If you need a specific dimension, our team can quote a made-to-order version rather than forcing your room around a stock size.</p>

<h3>How to Choose the Right Size</h3>
<p>Plan for about 24 inches of table width per person and roughly 36 inches of clearance around the table for chairs and movement. A 60-inch rectangular table generally seats 6, a 72-inch table seats 8, and extension tables give you flexibility for holidays and dinner parties without overwhelming the room every day.</p>

<h3>Delivery and Lead Time</h3>
<p>Because every table is made to order, furniture production typically takes <strong>12-16 weeks</strong>. Most furniture orders include white glove in-home delivery with placement and assembly, so your table arrives ready for the room instead of sitting in boxes at the door.</p>`;

// ============================================================
// 3. SHOPIFY ADMIN GRAPHQL MUTATIONS
// ============================================================

/**
 * Generate the GraphQL mutation to update a collection's SEO fields.
 * Requires the collection's Shopify GID (e.g., "gid://shopify/Collection/123456")
 */
export function buildCollectionSeoMutation(
  collectionGid: string,
  seoTitle: string,
  seoDescription: string,
) {
  return {
    query: `mutation collectionUpdate($input: CollectionInput!) {
      collectionUpdate(input: $input) {
        collection {
          id
          handle
          seo { title description }
        }
        userErrors { field message }
      }
    }`,
    variables: {
      input: {
        id: collectionGid,
        seo: {
          title: seoTitle,
          description: seoDescription,
        },
      },
    },
  };
}

/**
 * Generate the GraphQL mutation to update a product's SEO fields.
 * Requires the product's Shopify GID (e.g., "gid://shopify/Product/123456")
 */
export function buildProductSeoMutation(
  productGid: string,
  seoTitle: string,
  seoDescription: string,
) {
  return {
    query: `mutation productUpdate($input: ProductInput!) {
      productUpdate(input: $input) {
        product {
          id
          handle
          seo { title description }
        }
        userErrors { field message }
      }
    }`,
    variables: {
      input: {
        id: productGid,
        seo: {
          title: seoTitle,
          description: seoDescription,
        },
      },
    },
  };
}

/**
 * Generate mutation to update collection description (HTML body)
 */
export function buildCollectionDescriptionMutation(
  collectionGid: string,
  descriptionHtml: string,
) {
  return {
    query: `mutation collectionUpdate($input: CollectionInput!) {
      collectionUpdate(input: $input) {
        collection {
          id
          handle
          descriptionHtml
        }
        userErrors { field message }
      }
    }`,
    variables: {
      input: {
        id: collectionGid,
        descriptionHtml,
      },
    },
  };
}

/**
 * Generate mutation to update product image alt text
 */
export function buildProductImageAltMutation(
  productId: string,
  imageId: string,
  altText: string,
) {
  return {
    query: `mutation productImageUpdate($productId: ID!, $image: ImageInput!) {
      productImageUpdate(productId: $productId, image: $image) {
        image { id altText }
        userErrors { field message }
      }
    }`,
    variables: {
      productId,
      image: {
        id: imageId,
        altText,
      },
    },
  };
}
