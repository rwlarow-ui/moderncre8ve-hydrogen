#!/usr/bin/env node

/**
 * SEO batch payloads + publish helper for the March 2026 priority pages.
 *
 * Default mode is a dry run so the exact metadata/content payloads are easy to
 * review. Pass --apply to attempt live Shopify Admin API updates once a valid
 * SHOPIFY_ADMIN_API_TOKEN is available again.
 *
 * Official Shopify guidance for search listings uses global.title_tag and
 * global.description_tag metafields:
 * https://shopify.dev/docs/apps/build/marketing-analytics/optimize-storefront-seo
 */

import { readFileSync } from "node:fs";

const API_VERSION = "2025-10";
const SHOP = "moderncre8ve.myshopify.com";
const APPLY = process.argv.includes("--apply");

const UPDATES = {
  products: [
    {
      handle: "the-santa-monica-mid-century-modern-dining-table",
      titleTag: "Mid Century Modern Dining Table in Walnut or Oak",
      descriptionTag:
        "Shop a handcrafted mid century modern dining table in solid walnut or white oak. Seats 6-8. Made to order in Ohio with white glove delivery.",
      descriptionHtml: [
        "<p>The Santa Monica is our signature <strong>mid century modern dining table</strong>, built for homes that want timeless lines, honest materials, and everyday durability. Its tapered-leg profile keeps the silhouette light, while the solid hardwood top brings the warmth and depth that makes mid-century dining furniture so enduring.</p>",
        "<h3>Design Profile</h3>",
        '<p>This table is designed for shoppers looking for a dining table mid century modern in both feel and proportion: clean edges, balanced geometry, and a layout that works comfortably in dining rooms, open kitchens, and multipurpose spaces. For more silhouettes in the same family, browse our <a href="/collections/mid-century-modern-dining-tables">mid century modern dining tables collection</a>.</p>',
        "<h3>Materials and Craft</h3>",
        '<p>Each piece is handcrafted in Ohio from solid American walnut or white oak using traditional joinery and a hand-rubbed finish. The result is a surface that feels substantial, ages beautifully, and rewards regular care. To keep the wood looking its best, pair it with <a href="/products/lareauxs-furniture-wax">our furniture wax for solid hardwood pieces</a>.</p>',
        "<h3>Seating and Sizing</h3>",
        '<p>The standard proportions comfortably seat 6 to 8 people for daily meals, holiday dinners, and longer gatherings. If you need extra flexibility for guests, step up to <a href="/products/mid-century-modern-extendable-dining-table-santa-monica">the extendable Santa Monica version</a>, which adds seating without losing the same mid-century profile.</p>',
      ].join(""),
    },
    {
      handle: "scandinavian-danish-modern-dining-table",
      titleTag: "Scandinavian Dining Table for 8-10 | Danish Modern",
      descriptionTag:
        "A Scandinavian dining table with Danish modern lines, solid walnut or white oak, and seating for 8-10. Handcrafted in Ohio with white glove delivery.",
      descriptionHtml: [
        "<p>The Santa Monica Large brings Scandinavian calm and Danish modern proportion to a larger-format dining room. It is built for customers searching for a <strong>scandinavian dining table</strong> that feels refined enough for design-led spaces but durable enough for frequent entertaining.</p>",
        "<h3>Scandinavian and Danish Modern Positioning</h3>",
        '<p>The silhouette leans into the hallmarks people expect from Nordic dining furniture: restrained lines, visual lightness, and a focus on utility without clutter. If you want the same sensibility in a more flexible format, see our <a href="/products/scandinavian-dining-table-extendable-dining-table">extendable Scandinavian dining table</a>.</p>',
        "<h3>Material Options</h3>",
        '<p>Choose solid walnut for a warmer, richer expression or white oak for a lighter Scandinavian look. Both options are handcrafted in Ohio with traditional joinery and finished by hand for long-term durability. You can also compare it with the broader <a href="/collections/mid-century-modern-dining-tables">dining table collection</a> if you are weighing mid-century and Nordic-inspired shapes side by side.</p>',
        "<h3>Seating for 8 to 10</h3>",
        '<p>This table is proportioned for larger gatherings, comfortably seating 8 to 10 with generous elbow room. For buyers researching the best Scandinavian furniture brands before choosing a table, our guide to <a href="/blogs/mid-century-modern-scandi-japandi-design-blog/best-scandinavian-furniture-online">affordable Scandinavian furniture brands online</a> can help frame the market.</p>',
      ].join(""),
    },
    {
      handle: "mid-century-modern-walnut-nightstand",
      titleTag: "Walnut Nightstand Pair | Mid Century Modern Design",
      descriptionTag:
        "Shop a handcrafted walnut nightstand pair with mid-century modern lines, solid hardwood construction, and white glove delivery from ModernCre8ve.",
    },
    {
      handle: "scandinavian-dining-table-extendable-dining-table",
      titleTag: "Extendable Scandinavian Dining Table | Walnut or Oak",
      descriptionTag:
        "Shop an extendable Scandinavian dining table in solid walnut or white oak. Seats 6-10 with clean Nordic lines and white glove delivery.",
    },
  ],
  collections: [
    {
      handle: "mid-century-modern-dining-tables",
      titleTag: "Mid Century Modern Dining Tables | Handcrafted Walnut and Oak",
      descriptionTag:
        "Browse handcrafted mid century modern dining tables in solid walnut and white oak. Extendable and fixed designs, custom sizing, white glove delivery.",
      seoRichDescriptionHtml: [
        "<p>Our <strong>mid century modern dining tables</strong> are handcrafted to order in Ohio from solid American walnut and white oak. This collection is built for shoppers who want real hardwood construction, heirloom durability, and silhouettes that stay relevant long after trend cycles pass.</p>",
        '<p>For a signature fixed-top design, start with <a href="/products/the-santa-monica-mid-century-modern-dining-table">The Santa Monica</a>, a clean-lined table that anchors dining rooms with classic mid-century geometry. If your home needs added flexibility for holidays or hosting, our <a href="/products/scandinavian-dining-table-extendable-dining-table">extendable Scandinavian dining table</a> offers more seating while keeping the profile light and modern.</p>',
        '<p>Many customers cross-shop this collection with our <a href="/collections/scandinavian-design-furniture">Scandinavian furniture pieces</a> when they want a lighter Nordic expression, or add <a href="/products/lareauxs-furniture-wax">solid wood furniture wax</a> to protect the hand-finished surface for years to come. Every table includes made-to-order craftsmanship, custom sizing options, and white glove delivery.</p>',
      ].join(""),
    },
  ],
  articles: [
    {
      blogHandle: "mid-century-modern-scandi-japandi-design-blog",
      handle: "best-scandinavian-furniture-online",
      title: "Best Affordable Scandinavian Furniture Brands Online (2026)",
      titleTag: "Best Affordable Scandinavian Furniture Brands Online (2026)",
      descriptionTag:
        "Looking for affordable Scandinavian furniture brands online? Compare top retailers, what to buy, and where ModernCre8ve fits for handcrafted dining tables.",
      summaryHtml:
        "<p>Looking for affordable Scandinavian furniture brands online? This guide compares the best-known retailers, what each one does well, and where to shop if you want handcrafted Scandinavian-style dining tables.</p>",
      bodyHtml: [
        "<p>Finding the <strong>best affordable Scandinavian furniture brands online</strong> comes down to more than price alone. The right retailer depends on whether you want flat-pack value, imported Nordic brands, or handcrafted hardwood pieces that borrow Scandinavian proportions without compromising on build quality. This guide focuses on the best places to buy Scandinavian furniture online, with an emphasis on dining tables, quality, and long-term value.</p>",
        "<h2>What to look for in affordable Scandinavian furniture brands</h2>",
        "<p>The strongest Scandinavian furniture brands share a few traits: clean lines, restrained detailing, warm wood tones, and a functional approach to daily use. When comparing stores, pay attention to material honesty, joinery, delivery experience, and whether the product photography shows real construction details or only styled room shots.</p>",
        "<h2>1. IKEA</h2>",
        "<p>IKEA remains the default entry point for affordable Scandinavian furniture because it offers accessible pricing, broad selection, and dependable minimalist styling. It is a practical option for shoppers prioritizing budget and availability over heirloom construction.</p>",
        "<h2>2. Nordic Nest</h2>",
        "<p>Nordic Nest is a strong choice if you want access to established Scandinavian home brands, especially for decor, lighting, and accent furniture. The catalog leans more curated than mass-market, which helps if you are comparing several Scandinavian furniture stores online.</p>",
        "<h2>3. Finnish Design Shop</h2>",
        "<p>Finnish Design Shop stands out for design pedigree and brand depth. It is often better for shoppers who want iconic Nordic pieces or recognizable modern brands, even if the budget moves higher than the most affordable Scandinavian furniture retailers.</p>",
        "<h2>4. Scandinavian Designs</h2>",
        "<p>Scandinavian Designs is useful when you want a retailer focused specifically on the look and feel of Scandinavian interiors. Its assortment can help shoppers build a cohesive room rather than buying one-off pieces from multiple stores.</p>",
        "<h2>5. ModernCre8ve</h2>",
        '<p>ModernCre8ve earns a place on this list for shoppers who want the warmth of Scandinavian design in a made-to-order hardwood piece. Our <a href="/products/scandinavian-danish-modern-dining-table">Scandinavian dining table for 8 to 10</a> and <a href="/products/scandinavian-dining-table-extendable-dining-table">extendable Scandinavian dining table</a> are designed for buyers who care about proportion, solid wood construction, and long-term durability. If you want to compare more pieces with the same design language, browse our <a href="/collections/scandinavian-design-furniture">Scandinavian furniture collection</a>.</p>',
        "<h2>6. 2Modern</h2>",
        "<p>2Modern is a useful option when you want higher-end modern furniture that overlaps with Scandinavian taste. The assortment spans several categories, so it works best for shoppers who are still comparing styles across modern, Scandinavian, and Japandi interiors.</p>",
        "<h2>7. Huset</h2>",
        "<p>Huset is worth considering for smaller Scandinavian decor and lifestyle-driven home goods. It can be a strong companion source if you are buying a larger dining table elsewhere and want accessories that keep the room cohesive.</p>",
        "<h2>8. FROY</h2>",
        "<p>FROY serves shoppers looking for contemporary furniture with a Scandinavian-leaning visual language. Its mix of categories makes it useful for comparison shopping, especially if you are exploring living room and bedroom pieces alongside dining furniture.</p>",
        "<h2>9. JYSK</h2>",
        "<p>JYSK is another budget-friendly Scandinavian retailer to know, especially for shoppers who want straightforward forms and price-conscious basics. It sits closer to the value end of the market than the heirloom end.</p>",
        "<h2>How to choose the right store</h2>",
        '<p>If your priority is lowest cost, start with IKEA or JYSK. If you want access to recognizable Nordic brands, Nordic Nest and Finnish Design Shop are strong options. If you want handcrafted hardwood furniture with Scandinavian restraint, start with a dining-table-led comparison across ModernCre8ve and our broader <a href="/collections/mid-century-modern-dining-tables">mid century modern dining table collection</a> to see how Nordic and MCM silhouettes overlap.</p>',
      ].join(""),
    },
  ],
};

async function main() {
  if (!APPLY) {
    console.log(JSON.stringify(UPDATES, null, 2));
    console.log(
      "\nDry run only. Re-run with --apply after restoring a valid SHOPIFY_ADMIN_API_TOKEN.",
    );
    return;
  }

  const env = readEnvFile(".env");
  const token = env.SHOPIFY_ADMIN_API_TOKEN;
  if (!token) {
    throw new Error("SHOPIFY_ADMIN_API_TOKEN is missing from .env");
  }

  await assertAdminAccess(token);

  for (const product of UPDATES.products) {
    const resource = await findProductByHandle(token, product.handle);
    await updateProduct(token, resource, product);
  }

  for (const collection of UPDATES.collections) {
    const resource = await findCollectionByHandle(token, collection.handle);
    await updateCollection(token, resource, collection);
  }

  for (const article of UPDATES.articles) {
    const resource = await findArticleByHandle(
      token,
      article.blogHandle,
      article.handle,
    );
    await updateArticle(token, resource, article);
  }

  console.log("SEO batch applied successfully.");
}

function readEnvFile(path) {
  return Object.fromEntries(
    readFileSync(path, "utf8")
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("#"))
      .map((line) => {
        const separator = line.indexOf("=");
        return [line.slice(0, separator), line.slice(separator + 1)];
      }),
  );
}

async function assertAdminAccess(token) {
  const data = await adminRequest(
    token,
    `query {
      currentAppInstallation {
        accessScopes {
          handle
        }
      }
    }`,
  );
  const scopes =
    data.currentAppInstallation?.accessScopes?.map((scope) => scope.handle) ||
    [];
  const requiredScopes = ["write_products", "write_content"];
  const missingScopes = requiredScopes.filter((scope) => !scopes.includes(scope));
  if (missingScopes.length > 0) {
    throw new Error(
      `Missing required Shopify scopes: ${missingScopes.join(", ")}`,
    );
  }
}

async function findProductByHandle(token, handle) {
  const data = await adminRequest(
    token,
    `query FindProduct($query: String!) {
      products(first: 1, query: $query) {
        nodes {
          id
          handle
          metafields(first: 10, namespace: "global") {
            nodes {
              id
              namespace
              key
              value
            }
          }
        }
      }
    }`,
    { query: `handle:${handle}` },
  );

  const product = data.products.nodes[0];
  if (!product) {
    throw new Error(`Product not found for handle "${handle}"`);
  }
  return product;
}

async function findCollectionByHandle(token, handle) {
  const data = await adminRequest(
    token,
    `query FindCollection($query: String!) {
      collections(first: 1, query: $query) {
        nodes {
          id
          handle
          metafields(first: 15, namespace: "global") {
            nodes {
              id
              namespace
              key
              value
            }
          }
          customRichDescription: metafield(namespace: "custom", key: "seo_rich_description") {
            id
            key
            value
            namespace
          }
        }
      }
    }`,
    { query: `handle:${handle}` },
  );

  const collection = data.collections.nodes[0];
  if (!collection) {
    throw new Error(`Collection not found for handle "${handle}"`);
  }
  return collection;
}

async function findArticleByHandle(token, blogHandle, handle) {
  const data = await adminRequest(
    token,
    `query FindArticle($query: String!) {
      articles(first: 10, query: $query) {
        nodes {
          id
          handle
          blog {
            handle
          }
          metafields(first: 10, namespace: "global") {
            nodes {
              id
              namespace
              key
              value
            }
          }
        }
      }
    }`,
    { query: `handle:${handle}` },
  );

  const article = data.articles.nodes.find(
    (node) => node.handle === handle && node.blog?.handle === blogHandle,
  );
  if (!article) {
    throw new Error(
      `Article not found for ${blogHandle}/${handle}. Update the lookup query if Shopify search syntax differs.`,
    );
  }
  return article;
}

async function updateProduct(token, resource, update) {
  const metafields = buildSeoMetafields(resource.metafields.nodes, update);
  const input = {
    id: resource.id,
    metafields,
  };

  if (update.descriptionHtml) {
    input.descriptionHtml = update.descriptionHtml;
  }

  await adminRequest(
    token,
    `mutation UpdateProduct($input: ProductInput!) {
      productUpdate(input: $input) {
        product {
          id
          handle
        }
        userErrors {
          field
          message
        }
      }
    }`,
    { input },
    "productUpdate",
  );
}

async function updateCollection(token, resource, update) {
  const metafields = [
    ...buildSeoMetafields(resource.metafields.nodes, update),
    buildCustomMultilineMetafield(resource.customRichDescription, {
      namespace: "custom",
      key: "seo_rich_description",
      value: update.seoRichDescriptionHtml,
    }),
  ];

  await adminRequest(
    token,
    `mutation UpdateCollection($input: CollectionInput!) {
      collectionUpdate(input: $input) {
        collection {
          id
          handle
        }
        userErrors {
          field
          message
        }
      }
    }`,
    {
      input: {
        id: resource.id,
        metafields,
      },
    },
    "collectionUpdate",
  );
}

async function updateArticle(token, resource, update) {
  await adminRequest(
    token,
    `mutation UpdateArticle($id: ID!, $article: ArticleUpdateInput!) {
      articleUpdate(id: $id, article: $article) {
        article {
          id
          handle
          title
        }
        userErrors {
          field
          message
        }
      }
    }`,
    {
      id: resource.id,
      article: {
        title: update.title,
        summary: update.summaryHtml,
        body: update.bodyHtml,
        metafields: buildSeoMetafields(resource.metafields.nodes, update),
      },
    },
    "articleUpdate",
  );
}

function buildSeoMetafields(existingMetafields, update) {
  return [
    buildSingleLineMetafield(findMetafield(existingMetafields, "title_tag"), {
      namespace: "global",
      key: "title_tag",
      value: update.titleTag,
    }),
    buildSingleLineMetafield(
      findMetafield(existingMetafields, "description_tag"),
      {
        namespace: "global",
        key: "description_tag",
        value: update.descriptionTag,
      },
    ),
  ];
}

function findMetafield(existingMetafields, key) {
  return existingMetafields.find((metafield) => metafield.key === key) || null;
}

function buildSingleLineMetafield(existingMetafield, next) {
  if (existingMetafield?.id) {
    return {
      id: existingMetafield.id,
      value: next.value,
    };
  }

  return {
    namespace: next.namespace,
    key: next.key,
    type: "single_line_text_field",
    value: next.value,
  };
}

function buildCustomMultilineMetafield(existingMetafield, next) {
  if (existingMetafield?.id) {
    return {
      id: existingMetafield.id,
      value: next.value,
    };
  }

  return {
    namespace: next.namespace,
    key: next.key,
    type: "multi_line_text_field",
    value: next.value,
  };
}

async function adminRequest(token, query, variables = {}, mutationKey = null) {
  const response = await fetch(
    `https://${SHOP}/admin/api/${API_VERSION}/graphql.json`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": token,
      },
      body: JSON.stringify({ query, variables }),
    },
  );

  const payload = await response.json();
  if (!response.ok || payload.errors) {
    throw new Error(
      `Shopify Admin API request failed: ${JSON.stringify(payload.errors || payload)}`,
    );
  }

  if (mutationKey) {
    const userErrors = payload.data?.[mutationKey]?.userErrors || [];
    if (userErrors.length > 0) {
      throw new Error(
        `${mutationKey} returned userErrors: ${JSON.stringify(userErrors)}`,
      );
    }
  }

  return payload.data;
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
