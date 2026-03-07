/**
 * Rich SEO descriptions for key collection pages.
 *
 * These serve as fallbacks when the Shopify collection description
 * is empty or too thin. The `meta` field is used for the <meta
 * description> tag (max ~155 chars). The `rich` field provides
 * longer copy available for JSON-LD or on-page content.
 *
 * Keyword targeting is based on Ahrefs data from March 2026.
 */
export interface CollectionSeoDescription {
  /** Short meta description (≤155 chars) */
  meta: string;
  /** Longer rich description for JSON-LD / on-page use */
  rich: string;
}

export const collectionSeoDescriptions: Record<
  string,
  CollectionSeoDescription
> = {
  "mid-century-modern-credenza": {
    meta: "Handcrafted mid-century modern credenzas & sideboards in solid walnut. Custom sizes, 12–16 week lead time. Free white glove delivery. Made in Ohio.",
    rich: "Discover our collection of handcrafted mid-century modern credenzas and sideboards, built from solid American walnut by Amish artisans in Ohio. Each modern credenza features clean lines, tapered legs, and push-latch doors inspired by 1950s Scandinavian design. Whether you need a walnut sideboard for the dining room, a modern buffet cabinet for entertaining, or a sleek media credenza for the living room, every piece is made to order with custom sizing available. Our Astrid credenza is the centerpiece of the collection — a low-profile storage piece that works beautifully as a sideboard, buffet, or entryway console table. All pieces ship with white glove in-home delivery and assembly included.",
  },

  "mid-century-modern-dining-tables": {
    meta: "Handcrafted mid-century modern dining tables in solid walnut & white oak. Extendable options available. 12–16 week lead time. Made in Ohio.",
    rich: "Shop our collection of handcrafted mid-century modern dining tables, built from solid American walnut and white oak by Amish artisans in Ohio. Each MCM dining table features the clean lines, tapered legs, and organic forms that define mid-century design. Choose from round, oval, and rectangular silhouettes with extendable leaf options for flexible seating. Our mid-century modern extendable dining tables are among our most popular pieces, combining timeless style with everyday functionality. Every table is made to order with custom dimensions available — from intimate 4-seat designs to grand 12-seat gathering tables. Includes white glove in-home delivery and assembly.",
  },

  "mid-century-modern": {
    meta: "Mid-century modern furniture handcrafted in solid walnut & oak. Dining tables, credenzas, bed frames & more. 12–16 week lead time. Made in Ohio.",
    rich: "Explore our full collection of mid-century modern furniture, handcrafted from solid American walnut and white oak by Amish artisans in Ohio. From MCM dining tables and credenzas to bed frames and coffee tables, every piece features the clean lines, organic curves, and tapered legs that define mid-century modern style. Our furniture blends 1950s Scandinavian and American modernist design with heirloom-quality craftsmanship — built to last generations, not seasons.",
  },

  "scandinavian-design-furniture": {
    meta: "Scandinavian furniture handcrafted in solid hardwoods. Minimalist dining tables, bed frames & storage. Affordable Scandi design made in Ohio.",
    rich: "Shop our collection of Scandinavian design furniture, handcrafted from solid hardwoods by Amish artisans in Ohio. Inspired by the minimalist elegance of Danish, Swedish, and Norwegian design traditions, each piece emphasizes clean forms, natural materials, and functional beauty. Our Scandinavian dining tables, bed frames, and storage pieces offer the warmth of Nordic design with the durability of American craftsmanship. As one of the leading affordable Scandinavian furniture brands online, ModernCre8ve proves that exceptional design and solid wood construction don't require a luxury price tag.",
  },

  japandi: {
    meta: "Japandi furniture blending Japanese minimalism with Scandinavian warmth. Handcrafted in solid walnut & oak. Made to order in Ohio.",
    rich: "Discover our Japandi furniture collection — a harmonious blend of Japanese minimalism and Scandinavian warmth, handcrafted from solid American walnut and white oak. Each Japandi piece embodies wabi-sabi philosophy: celebrating natural wood grain, asymmetric beauty, and purposeful simplicity. From Japandi coffee tables and dining sets to bed frames and storage, our collection creates serene, intentional living spaces. Every piece is made to order by Amish artisans in Ohio with a 12–16 week lead time.",
  },

  "handmade-modern-bed-frames": {
    meta: "Handcrafted modern bed frames in solid walnut & oak. Mid-century, Scandinavian & minimalist styles. Platform & traditional. Made in Ohio.",
    rich: "Shop our collection of handcrafted modern bed frames, built from solid American walnut and white oak by Amish artisans in Ohio. Choose from mid-century modern bed frames with tapered legs, Scandinavian bed frames with clean Nordic lines, and minimalist platform beds with low-profile silhouettes. Each bed frame is made to order with custom sizing available in Twin through California King. Our modern bed frames feature solid wood construction — no particle board, no veneers — for a bedroom centerpiece that lasts generations.",
  },

  "mid-century-modern-coffee-tables": {
    meta: "Handcrafted mid-century modern coffee tables in solid walnut & oak. Round, oval & rectangular designs. Custom sizes. Made in Ohio.",
    rich: "Explore our collection of handcrafted mid-century modern coffee tables, built from solid American walnut and white oak by Amish artisans in Ohio. Each MCM coffee table features the organic shapes, tapered legs, and warm wood tones that define mid-century design. Choose from round walnut coffee tables, oval designs, and rectangular silhouettes — all made to order with custom dimensions available. Our coffee tables pair beautifully with our mid-century modern credenzas and dining tables for a cohesive living space.",
  },

  "modern-dining-chairs": {
    meta: "Solid wood dining chairs in mid-century modern & Scandinavian styles. Handcrafted in walnut & oak. Custom upholstery options. Made in Ohio.",
    rich: "Shop our collection of solid wood dining chairs, handcrafted from American walnut and white oak by Amish artisans in Ohio. Our modern dining chairs feature mid-century modern and Scandinavian-inspired designs with ergonomic sculpted seats, supportive backrests, and hand-finished joinery built to withstand daily use. Available with custom upholstery options including leather and performance fabric. Each chair is made to order and ships with white glove delivery.",
  },

  "custom-made-expandable-dining-tables": {
    meta: "Custom extendable dining tables handcrafted in solid walnut & oak. Mid-century modern design with built-in leaf extensions. Made in Ohio.",
    rich: "Discover our custom extendable dining tables, handcrafted from solid American walnut and white oak by Amish artisans in Ohio. Each mid-century modern extendable dining table features a built-in butterfly leaf mechanism that expands seamlessly, adding 18–24 inches of dining space when you need it. From intimate 6-seat tables that extend to seat 10, to grand designs accommodating 14 guests, our custom expandable dining tables are built for real life — holiday gatherings, dinner parties, and everyday family meals.",
  },

  "custom-made-furniture": {
    meta: "Custom handmade furniture crafted to your specifications. Solid walnut & oak. Dining tables, credenzas, bed frames & more. Made in Ohio.",
    rich: "Commission custom handmade furniture built to your exact specifications by Amish artisans in Ohio. From custom dining tables and credenzas to bed frames and storage pieces, every ModernCre8ve piece is handcrafted from solid American hardwoods. Choose your wood species, dimensions, and finish for furniture that fits your space perfectly. Our unique handmade furniture combines old-world craftsmanship with mid-century modern, Scandinavian, and Japandi design sensibilities.",
  },

  "all-products": {
    meta: "Shop all ModernCre8ve furniture: handcrafted mid-century modern dining tables, credenzas, bed frames, coffee tables & more. Made in Ohio.",
    rich: "Browse the full ModernCre8ve catalog of handcrafted modern furniture. Every piece is made to order from solid American walnut and white oak by Amish artisans in Cleveland, Ohio. From mid-century modern dining tables and credenzas to Scandinavian bed frames and Japandi coffee tables, our collection blends timeless design with heirloom-quality craftsmanship.",
  },
};
