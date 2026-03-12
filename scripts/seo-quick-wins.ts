/**
 * SEO Quick Wins — Shopify Admin API Update Script
 *
 * Run this via the browser console (Shopify Admin GraphQL)
 * or from a server-side route with Admin API access.
 *
 * Covers:
 * 1. Title tags & meta descriptions for striking distance keywords
 * 2. Mid-century dining tables collection expanded description (500+ words)
 * 3. Alt text updates for product images
 */

// ============================================================
// 1. OPTIMIZED TITLE TAGS & META DESCRIPTIONS
// ============================================================
// Target collections from Ahrefs striking distance analysis:
// - mid-century-modern-dining-tables → "mid century modern dining table" (5,300 vol, pos 6)
// - scandinavian-design-furniture → "scandinavian dining table" (1,500 vol)
// - mid-century-modern → "mid century modern table" (1,400 vol)

export const collectionSeoUpdates = [
  {
    handle: "mid-century-modern-dining-tables",
    seo: {
      title:
        "Mid Century Modern Dining Tables — Handcrafted Walnut & Oak | ModernCre8ve",
      description:
        "Shop handcrafted mid century modern dining tables in solid walnut and oak. Made to order by Amish artisans in Ohio. Extendable designs seat 6–10. Free white glove delivery.",
    },
  },
  {
    handle: "scandinavian-design-furniture",
    seo: {
      title:
        "Scandinavian Design Furniture — Minimalist Tables, Beds & More | ModernCre8ve",
      description:
        "Discover Scandinavian design furniture handcrafted from solid hardwoods. Clean lines, minimalist aesthetic, and timeless Nordic-inspired pieces. 12–16 week lead time. White glove delivery included.",
    },
  },
  {
    handle: "mid-century-modern",
    seo: {
      title:
        "Mid Century Modern Furniture — Tables, Beds, Credenzas | ModernCre8ve",
      description:
        "Browse our handcrafted mid century modern furniture collection. Solid walnut dining tables, beds, credenzas, and sideboards made by Ohio Amish artisans. Custom sizes available.",
    },
  },
];

// ============================================================
// 2. EXPANDED COLLECTION DESCRIPTION (500+ words)
// ============================================================
// For: /collections/mid-century-modern-dining-tables
// Currently the #1 traffic page (848/mo), ranking pos 6 for
// "mid century modern dining table" (5,300 vol, KD 2)

export const midCenturyDiningDescription = `<p>Our <strong>mid century modern dining tables</strong> are handcrafted to order by skilled Amish artisans in Ohio, using solid American walnut, white oak, and cherry. Each table is built with traditional joinery techniques — mortise and tenon, dovetail, and tongue-and-groove construction — ensuring a piece that lasts for generations.</p>

<h3>Why Choose a Handcrafted Mid Century Modern Dining Table?</h3>
<p>Mid century modern dining tables are defined by clean lines, tapered legs, and organic silhouettes inspired by the iconic designs of the 1940s through 1960s. Unlike mass-produced furniture, our tables are made one at a time from solid hardwood — no veneer, no particle board, no shortcuts. The result is a dining table with real weight, genuine character, and a surface that develops a beautiful patina over decades of family meals.</p>

<h3>Materials & Craftsmanship</h3>
<p><strong>Solid American Walnut</strong> is our signature wood, prized for its rich chocolate-brown tones and dramatic grain patterns. Every walnut board is hand-selected for color consistency and figure. We also offer tables in <strong>white oak</strong> for a lighter, Scandinavian-inspired look, and <strong>cherry</strong> for warmth that deepens with age.</p>
<p>Our tables feature precision-milled edges, hand-sanded surfaces (progressing from 80 to 220 grit), and a durable natural oil finish that highlights the wood's character while protecting against daily use. All hardware is solid brass or blackened steel — materials that complement the mid century aesthetic.</p>

<h3>Extendable & Custom Sizing</h3>
<p>Many of our mid century modern dining tables include built-in extension mechanisms. The <strong>Parsons Walnut Extension Dining Table</strong> expands from 72 to 96 inches, comfortably seating 6 to 10 guests. The <strong>Mar Vista Oval Dining Table</strong> seats 6 in a sculptural oval form that softens any dining room. Need a specific dimension? We build to your measurements — just reach out to discuss your custom project.</p>

<h3>Sizing Guide</h3>
<p>Choosing the right table size depends on your space and how you entertain. As a general rule, allow 24 inches of table width per person and 36 inches of clearance around the table for comfortable seating and movement. A 60-inch rectangular table seats 6, a 72-inch table seats 8, and our extension tables accommodate larger gatherings when you need them.</p>

<h3>Design Pairings</h3>
<p>Mid century modern dining tables pair beautifully with a range of chair styles — from <strong>Windsor chairs</strong> and Eames-inspired molded seats to upholstered dining chairs in linen or leather. For a cohesive look, explore our <a href="/collections/mid-century-modern">full mid century modern collection</a> including credenzas, sideboards, and beds crafted in the same solid walnut.</p>

<h3>Delivery & Lead Time</h3>
<p>Because every table is made to order, please allow <strong>12–16 weeks</strong> for production. Once your table is complete, we provide <strong>complimentary white glove in-home delivery</strong> throughout the continental United States — including placement in your dining room, full assembly, and removal of all packaging materials. It is our way of ensuring your new table arrives perfectly and starts its life in your home without any hassle.</p>

<h3>Care & Maintenance</h3>
<p>Solid wood furniture is low-maintenance but benefits from a little attention. Dust regularly with a soft cloth, use coasters and trivets to protect the surface, and avoid placing your table in direct sunlight for extended periods. We recommend applying our <a href="/collections/furniture-wax">ModernCre8ve Furniture Wax</a> every 6–12 months to nourish the wood and maintain its natural luster.</p>`;

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
