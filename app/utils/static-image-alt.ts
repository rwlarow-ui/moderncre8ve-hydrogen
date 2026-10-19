/**
 * Alt text for the static photos in `public/images/`, which page
 * compositions reference by path (e.g. `image: "/images/heroes/img_1524.jpg"`).
 * Sections that accept a plain path call `staticImageAlt()` so every
 * use of a photo gets the same description.
 *
 * Unknown paths return "" — the image is then treated as decorative,
 * which is better than a meaningless "Placeholder" or the file path.
 * When adding a photo to `public/images/`, add its description here.
 */
const STATIC_IMAGE_ALT: Record<string, string> = {
  "/images/heroes/dsc_1417-edit.jpg":
    "Handcrafted walnut writing desk with a raised back shelf",
  "/images/heroes/dsc_1417-edit_1.jpg":
    "Handcrafted walnut writing desk beside a vase of blossom branches",
  "/images/heroes/img_1426.jpg": "Slatted oak sideboard with leather pull tabs",
  "/images/heroes/img_1426_1.jpg":
    "Slatted oak sideboard in a calm Japandi living room",
  "/images/heroes/img_1426_2.jpg":
    "Close-up of a slatted oak sideboard with leather pull tabs",
  "/images/heroes/img_1524.jpg":
    "Walnut dining table set with white molded chairs in a bright dining room",
  "/images/heroes/img_2158.jpg":
    "Square walnut dining table in a minimalist room",
  "/images/heroes/the-vista.jpg": "The Vista spindle-back walnut dining chair",
  "/images/heroes/20241114_202310_img_2586_4af8f63f-4ad5-4678-af69-b36481707fe1.jpg":
    "Light oak dining table with wishbone chairs on a woven rug",
  "/images/heroes/hero-oval-dining-table.jpg":
    "Walnut oval dining table with white chairs in a bright room",
  "/images/heroes/hero-credenza-lifestyle.jpg":
    "Dark walnut mid-century credenza in a bright entryway",
  "/images/heroes/hero-japandi-sideboard.jpg":
    "Slatted oak Japandi sideboard in a calm, neutral living room",
};

export function staticImageAlt(src?: string | null): string {
  if (!src) return "";
  const path = src.split(/[?#]/)[0];
  return STATIC_IMAGE_ALT[path] ?? "";
}
