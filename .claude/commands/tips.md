---
description: Cheat sheet of Shopify MCP and Admin API operations available in this session
---

# Shopify MCP & Admin API — What You Can Ask For

Connected store: **moderncre8ve.myshopify.com**. Below are the operations available without writing any code — just ask in plain English and I'll route to the right tool.

## Built-in MCP Tools (preferred when available)

### Store / shop
- **Shop info** — name, plan, currency, timezone, country *(`get-shop-info`)*
- **Switch shop** — change which store I'm connected to *(`switch-shop`)*

### Products
- **Search products** — by title, tag, vendor, status *(`search_products`)*
- **Get product** — full detail incl. variants, images, options *(`get-product`)*
- **Create product** — title, descriptionHtml, variants, images *(`create-product`)*
- **Update product** — edit any field on an existing product *(`update-product`)*
- **Bulk status change** — ACTIVE / DRAFT / ARCHIVED across many products *(`bulk-update-product-status`)*

### Collections
- **Search collections** *(`search_collections`)*
- **Get collection** — products, rules, SEO *(`get-collection`)*
- **Create / update collection** *(`create-collection`, `update-collection`)*
- **Add products to a collection** *(`add-to-collection`)*

### Inventory
- **Check levels** at a specific location *(`get-inventory-levels`)*
- **Set quantity** at a location *(`set-inventory`)*

### Orders & customers
- **List orders** — recent, filterable by query string *(`list-orders`)*
- **Get order** — full detail (line items, shipping, transactions) *(`get-order`)*
- **List customers** — recent or filterable *(`list-customers`)*

### Marketing
- **Create discount code** — percentage-based *(`create-discount`)*

### Analytics
- **Run ShopifyQL** — sales, orders, product performance over a date range *(`run-analytics-query`)*

### Docs / schema helpers
- **Search Shopify docs** *(`search_docs_chunks`)*
- **Get GraphQL schema** *(`graphql_schema`)*
- **Validate GraphQL code** *(`validate_graphql_codeblocks`)*

## Arbitrary Admin GraphQL (for everything else)

If no built-in tool covers it, I can run any Admin API operation:

- **Reads** — `graphql_query` (metafields, metaobjects, pages, blogs, redirects, markets, translations, gift cards, draft orders, fulfillment orders, locations, publications, files/CDN, themes, webhooks, scripts, …)
- **Writes** — `graphql_mutation` (mutate any of the above)

The token in `.env` (`SHOPIFY_ADMIN_API_TOKEN`) has full admin write scopes.

## Example asks

| You say | I'll do |
|---|---|
| "Show me orders from the last 14 days" | `list-orders` with a date query |
| "Bulk-archive all draft products" | `search_products status:draft` → `bulk-update-product-status` |
| "Create a 15% off code for VIPs" | `create-discount` |
| "What's our top-selling product this month?" | `run-analytics-query` |
| "Add a 'lead-time' metafield to every product" | `graphql_mutation` with `metafieldDefinitionCreate` + bulk set |
| "List all redirects in the store" | `graphql_query` on `urlRedirects` |
| "Show me the SEO description for the about page" | `graphql_query` on `pages` |
| "Pull all gift card balances" | `graphql_query` on `giftCards` |
| "Move 'Modern Sofas' product to the top of its collection" | `graphql_mutation` on `collectionReorderProducts` |

## Beyond Shopify (also wired up in this repo)

- **Weaverse Studio** — page builder; theme settings live in `app/weaverse/schema.server.ts`
- **Ahrefs MCP** — SEO data
- **Figma MCP** — design files
- **Google Drive MCP** — read/write Drive docs
- **SEO Truth Layer** — `seo-truth-layer/` weekly pipeline (GA4 + Search Console + Ahrefs merged)

Just ask — I'll pick the right tool.
