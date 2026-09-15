/**
 * Catch-all for URLs no other route matches.
 *
 * Always a 404 — Hydrogen's `storefrontRedirect` then gets a chance to serve
 * any URL redirect configured in the Shopify admin.
 */
export async function loader() {
  throw new Response(null, { status: 404 });
}
