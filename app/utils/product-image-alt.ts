/**
 * Generate SEO-friendly alt text for product images.
 * Falls back to product title + variant info when Shopify alt text is
 * missing or looks auto-generated (e.g. filenames like "IMG_1234.jpg").
 */
export function getProductImageAlt(
  image: { altText?: string | null },
  product?: { title?: string; vendor?: string },
  variant?: { title?: string } | null,
): string {
  // Check if alt text exists and isn't a filename pattern
  if (image?.altText) {
    // Detect filename patterns (IMG_*, DSC_*, Photo*, image*, screenshot*, etc.)
    const isFilename = /^(IMG|DSC|Photo|image|screenshot|packshot|IMG_|DSC_|photo_|Screenshot|DSCF|CIMG)/i.test(image.altText);

    // Detect file extensions in the text
    const hasExtension = /\.(jpg|jpeg|png|webp|gif|heic|raw|psd|tiff)$/i.test(image.altText);

    // If it's not a filename pattern and doesn't have an extension, use it
    if (!isFilename && !hasExtension) {
      return image.altText;
    }
  }

  // Build descriptive alt text from product data
  const parts: string[] = [];

  if (product?.title) {
    parts.push(product.title);
  }

  if (variant?.title && variant.title !== "Default Title") {
    parts.push(`in ${variant.title}`);
  }

  if (product?.vendor) {
    parts.push(`by ${product.vendor}`);
  }

  // Add brand name if not already in title or vendor
  if (!parts.join(" ").includes("ModernCre8ve")) {
    parts.push("from ModernCre8ve");
  }

  return parts.length > 0 ? parts.join(" ") : "Product image";
}
