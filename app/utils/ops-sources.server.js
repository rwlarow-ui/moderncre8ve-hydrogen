/** Initial context is dated, not a claim of current artifact contents. */
export const OPS_SECTIONS = [
  "daily",
  "catalog",
  "marketing",
  "sales",
  "tech",
  "brand",
];
const source = (
  id,
  section,
  title,
  artifactId,
  date,
  summary,
  visibility = "team",
  status = "current",
) => ({
  id,
  section,
  title,
  url: `https://claude.ai/artifact/${artifactId}`,
  date,
  summary,
  visibility,
  status,
  freshnessDays:
    section === "daily"
      ? 1
      : section === "catalog"
        ? 3
        : section === "brand"
          ? 90
          : section === "tech"
            ? 30
            : 7,
});
export const OPS_SOURCES = [
  source(
    "catalog-todos",
    "catalog",
    "Catalog to-dos",
    "R2RV5rj8Q4KRNrkFg49sKx",
    "2026-11-12",
    "Verify release records for beds and Cure All; test the Warwick request; decide Bel-Aire desk reachability; reconcile shipping language; review first releases; verify the November 16 held-URL decision.",
  ),
  source(
    "catalog-cleanup",
    "catalog",
    "Product Catalog Cleanup",
    "3UNmgxHKarZTDrAYfnzQC4",
    "2026-11-09",
    "October audit: Santa Monica dining-table price grid, product descriptions, lead times, messaging, redirects, handles and collection metadata.",
  ),
  source(
    "december-calendar",
    "marketing",
    "December content calendar",
    "1rU9CFNVgRGUHG4Kk5anD5",
    "2026-11-12",
    "Draft Instagram and Facebook content for Tuesdays, Thursdays and Sundays, plus two text-only emails. Awaiting real-home photos, a wax last-order date and a decision about promoting limited wax stock.",
    "team",
    "draft",
  ),
  source(
    "seo-visibility",
    "marketing",
    "SEO & AI visibility",
    "Uw37XcUaVNPaSGdfHq9xzn",
    "2026-11-12",
    "November 10–21 plan. Verify held-page behavior, the empty Coffee Tables collection, FSC claims and the old Houzz address. November 16 decision needs current verification.",
  ),
  source(
    "trade-pipeline",
    "sales",
    "Trade pipeline",
    "39UMR8H4bcLXpAH6jx6nQV",
    "2026-11-04",
    "Dated pipeline: verify the custom extension-table quote reply and unsent design/construction outreach. Trade discount, chair claims and Barkman restaurant-run capacity require decisions.",
  ),
  source(
    "daily-dashboard",
    "daily",
    "Rob’s Daily Dashboard",
    "D3vDk8zszVCWuNQBG1JdUY",
    "2026-11-12",
    "Paid unshipped orders, weekly sales and team/Barkman threads. Production stages have no authoritative source yet.",
    "owner",
  ),
  source(
    "daybook",
    "daily",
    "Rob’s Daybook",
    "UwSzDKxSjcMDSN94bFnvgd",
    "2026-11-12",
    "Next seven days of Google Calendar and unread Primary Gmail. Private to Rob.",
    "owner",
  ),
  source(
    "brief-2026-11-12",
    "daily",
    "Morning brief · November 12",
    "TEY2GfRPemjqboobKQPCN6",
    "2026-11-12",
    "Dated brief: Barkman payment for orders 1834/1835, missing GA4 sessions and Xin Yean shipment timing. Verify current status before acting.",
    "owner",
    "historical",
  ),
  source(
    "brief-2026-11-01",
    "daily",
    "Sunday brief · November 1",
    "Lf52xTqNQo6kK4aUJ18Xwe",
    "2026-11-01",
    "Dated brief: custom dining-booth callback; dealer paperwork and Capri quote recorded as resolved at that time.",
    "owner",
    "historical",
  ),
  source(
    "debt-register",
    "tech",
    "Debt Register",
    "UN6CYadovkS4S62GUNNxpg",
    "2026-10-06",
    "Historical artifact register. Reconcile against the current repository’s technical debt register and issues before treating an item as open.",
  ),
  source(
    "replacing-weaverse",
    "tech",
    "Replacing Weaverse",
    "81nCX7mGoHtk1ZBCR7Zqaq",
    "2026-08-25",
    "Historical platform research. This storefront already uses the in-repository page builder.",
    "team",
    "historical",
  ),
  source(
    "design-system",
    "brand",
    "ModernCre8ve design system",
    "H49MeNrFxcLRqt9whArVdo",
    "2026-10-09",
    "Brand colors, Jost headings, Spectral body text and shared components. Current repository theme values take precedence.",
  ),
];
export function visibleSources(user, section) {
  return OPS_SOURCES.filter(
    (item) =>
      (!section || item.section === section) &&
      (item.visibility === "team" || user.role === "owner"),
  );
}
export function requireSource(id, user) {
  const source = visibleSources(user).find((item) => item.id === id);
  if (!source) throw new Response("Source not found", { status: 404 });
  return source;
}
