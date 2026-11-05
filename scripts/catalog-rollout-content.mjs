/** Mechanical corrections only; prices, variants, publication and specifications are untouched. */
export function correctedDraftContent(product) {
  if (product.status !== "DRAFT") return null;
  const input = { id: product.id };
  let html = product.descriptionHtml;
  const reasons = [];
  if (
    product.handle === "the-modern-coffee-table-provo" &&
    /dining/i.test(product.title)
  ) {
    input.title = "The Provo: Walnut and Brass Coffee Table";
    reasons.push(
      "Match title to existing coffee-table description, type and dimensions",
    );
  }
  if (product.handle === "lareauxs-furniture-wax") {
    const clean = html.replace(
      /<p>All listed Prices include[\s\S]*?<\/p>/gi,
      "<p>Ships within 3–5 business days via standard ground.</p>",
    );
    if (clean !== html)
      reasons.push(
        "Remove malformed shipping URL and obsolete tax-included claim; use wax shipping policy",
      );
    html = clean;
  } else if (
    ![
      "the-seymour-modern-dining-chair",
      "mid-century-modern-floor-lamp-warwick",
    ].includes(product.handle)
  ) {
    const clean = html.replace(
      /\b(?:4\s*[-–]\s*6|6\s*[-–]\s*8|8\s*[-–]\s*10|8|10)\s*weeks?\b/gi,
      "12–16 weeks",
    );
    if (clean !== html)
      reasons.push(
        "Replace obsolete production duration with established 12–16-week furniture policy",
      );
    html = clean;
  }
  const withoutTax = html.replace(
    /(<a\b[^>]*>free shipping<\/a>)\s+and\s+<strong>tax<\/strong>/gi,
    "$1",
  );
  if (withoutTax !== html)
    reasons.push("Remove unsupported tax-included claim");
  html = withoutTax;
  for (const [from, to] of [
    ["/pages/custom-1", "/pages/custom-furniture-crafted-to-perfection"],
    ["/pages/assembly-care-1", "/pages/assembly-care"],
    ["/pages/shipping-declaration", "/pages/shipping-policy"],
    ["/about-us", "/pages/about-us"],
  ]) {
    const pattern = new RegExp(
      `(href=["'](?:https://moderncre8ve\\.com)?)${from}(["'])`,
      "g",
    );
    const clean = html.replace(pattern, `$1${to}$2`);
    if (clean !== html) reasons.push(`Repair ${from} link`);
    html = clean;
  }
  if (html !== product.descriptionHtml) input.descriptionHtml = html;
  return reasons.length ? { input, reasons } : null;
}
