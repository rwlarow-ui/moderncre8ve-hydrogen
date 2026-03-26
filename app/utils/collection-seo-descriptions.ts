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
    meta: "Handcrafted mid-century modern credenza in solid walnut. Sideboards with soft-close doors, tapered legs & brass hardware. Made to order in Ohio.",
    rich: "Discover our collection of handcrafted mid-century modern credenzas and sideboards, built from solid American walnut by Amish artisans in Ohio. Each modern credenza features clean lines, tapered legs, and push-latch doors inspired by 1950s Scandinavian design. Whether you need a walnut sideboard for the dining room, a modern buffet cabinet for entertaining, or a sleek media credenza for the living room, every piece is made to order with custom sizing available. Our Astrid credenza is the centerpiece of the collection — a low-profile storage piece that works beautifully as a sideboard, buffet, or entryway console table. All pieces ship with white glove in-home delivery and assembly included.",
  },

  "mid-century-modern-dining-tables": {
    meta: "Handcrafted MCM dining tables in solid walnut & oak. Round, oval & extendable designs seating 4–12. Made to order in Ohio. Free white glove delivery.",
    rich: "Shop our collection of handcrafted mid-century modern dining tables, built from solid American walnut and white oak by Amish artisans in Ohio. Each MCM dining table features the clean lines, tapered legs, and organic forms that define mid-century design. Choose from round, oval, and rectangular silhouettes with extendable leaf options for flexible seating. Our mid-century modern extendable dining tables are among our most popular pieces, combining timeless style with everyday functionality. Every table is made to order with custom dimensions available — from intimate 4-seat designs to grand 12-seat gathering tables. Includes white glove in-home delivery and assembly.",
  },

  "mid-century-modern": {
    meta: "Handcrafted mid-century modern furniture in solid walnut & oak. Dining tables, bed frames, credenzas & coffee tables. Made to order in Ohio.",
    rich: "Explore our full collection of mid-century modern furniture, handcrafted from solid American walnut and white oak by Amish artisans in Ohio. From MCM dining tables and credenzas to bed frames and coffee tables, every piece features the clean lines, organic curves, and tapered legs that define mid-century modern style. Our furniture blends 1950s Scandinavian and American modernist design with heirloom-quality craftsmanship — built to last generations, not seasons.",
  },

  "scandinavian-design-furniture": {
    meta: "Handcrafted Scandinavian furniture in solid walnut & oak. Dining tables, bed frames & storage. Nordic minimalism, American craft. Free delivery.",
    rich: "Shop our collection of Scandinavian design furniture, handcrafted from solid hardwoods by Amish artisans in Ohio. Inspired by the minimalist elegance of Danish, Swedish, and Norwegian design traditions, each piece emphasizes clean forms, natural materials, and functional beauty. Our Scandinavian dining tables, bed frames, and storage pieces offer the warmth of Nordic design with the durability of American craftsmanship. As one of the leading affordable Scandinavian furniture brands online, ModernCre8ve proves that exceptional design and solid wood construction don't require a luxury price tag.",
  },

  japandi: {
    meta: "Shop Japandi furniture — Japanese minimalism meets Scandinavian warmth. Handcrafted in solid walnut & oak. Made to order in Ohio. Free delivery.",
    rich: "Discover our Japandi furniture collection — a harmonious blend of Japanese minimalism and Scandinavian warmth, handcrafted from solid American walnut and white oak. Each Japandi piece embodies wabi-sabi philosophy: celebrating natural wood grain, asymmetric beauty, and purposeful simplicity. From Japandi coffee tables and dining sets to bed frames and storage, our collection creates serene, intentional living spaces. Every piece is made to order by Amish artisans in Ohio with a 12–16 week lead time.",
  },

  "handmade-modern-bed-frames": {
    meta: "Handmade modern bed frames in solid walnut & oak. Mid-century, Scandinavian & Japandi styles. Platform & traditional. Twin–Cal King. Ohio.",
    rich: "Shop our collection of handcrafted modern bed frames, built from solid American walnut and white oak by Amish artisans in Ohio. Choose from mid-century modern bed frames with tapered legs, Scandinavian bed frames with clean Nordic lines, and minimalist platform beds with low-profile silhouettes. Each bed frame is made to order with custom sizing available in Twin through California King. Our modern bed frames feature solid wood construction — no particle board, no veneers — for a bedroom centerpiece that lasts generations.",
  },

  "mid-century-modern-coffee-tables": {
    meta: "Handcrafted mid-century modern coffee tables in solid walnut & oak. Japandi & Scandinavian styles. Custom sizes available. Made in Ohio.",
    rich: "Explore our collection of handcrafted mid-century modern coffee tables, built from solid American walnut and white oak by Amish artisans in Ohio. Each MCM coffee table features the organic shapes, tapered legs, and warm wood tones that define mid-century design. Choose from round walnut coffee tables, oval designs, and rectangular silhouettes — all made to order with custom dimensions available. Our coffee tables pair beautifully with our mid-century modern credenzas and dining tables for a cohesive living space.",
  },

  "modern-dining-chairs": {
    meta: "Solid wood dining chairs in mid-century modern & Scandinavian styles. Handcrafted in walnut & oak. Custom upholstery options. Made in Ohio.",
    rich: "Shop our collection of solid wood dining chairs, handcrafted from American walnut and white oak by Amish artisans in Ohio. Our modern dining chairs feature mid-century modern and Scandinavian-inspired designs with ergonomic sculpted seats, supportive backrests, and hand-finished joinery built to withstand daily use. Available with custom upholstery options including leather and performance fabric. Each chair is made to order and ships with white glove delivery.",
  },

  "custom-made-expandable-dining-tables": {
    meta: "Design your custom expandable dining table in solid walnut or oak. Butterfly leaf extends from 4 to 12 seats. Amish-crafted to order in Ohio.",
    rich: "Discover our custom extendable dining tables, handcrafted from solid American walnut and white oak by Amish artisans in Ohio. Each mid-century modern extendable dining table features a built-in butterfly leaf mechanism that expands seamlessly, adding 18–24 inches of dining space when you need it. From intimate 6-seat tables that extend to seat 10, to grand designs accommodating 14 guests, our custom expandable dining tables are built for real life — holiday gatherings, dinner parties, and everyday family meals.",
  },

  "custom-made-furniture": {
    meta: "Custom dining tables, credenzas & bed frames in solid walnut & oak. Choose dimensions, wood & finish. 12–16 week lead time. Handcrafted in Ohio.",
    rich: "Commission personalized furniture built to your exact specifications by Amish artisans in Ohio. From custom dining tables and credenzas to bed frames, nightstands, and coffee tables — every piece is handcrafted from solid American walnut or white oak. Choose your wood species, dimensions, and finish for custom furniture that fits your space perfectly. Design consultations included. 12–16 week lead time with white glove in-home delivery.",
  },

  "all-products": {
    meta: "Shop all ModernCre8ve furniture: handcrafted mid-century modern dining tables, credenzas, bed frames, coffee tables & more. Made in Ohio.",
    rich: "Browse the full ModernCre8ve catalog of handcrafted modern furniture. Every piece is made to order from solid American walnut and white oak by Amish artisans in Cleveland, Ohio. From mid-century modern dining tables and credenzas to Scandinavian bed frames and Japandi coffee tables, our collection blends timeless design with heirloom-quality craftsmanship.",
  },

  // ─── Content gap collections (ready for when Shopify collections are created) ───

  "oval-dining-tables": {
    meta: "Handcrafted oval dining tables in solid walnut & white oak. Sculptural mid-century modern designs that seat 6–10. Made to order in Ohio.",
    rich: "Shop our collection of handcrafted oval dining tables, built from solid American walnut and white oak by Amish artisans in Ohio. An oval dining table combines the generous seating capacity of a rectangular table with the intimate, conversational flow of a round design — no sharp corners and no awkward head-of-table hierarchy. Our Mar Vista oval dining table is the signature piece of this collection, featuring a sculptural solid walnut top with soft, sweeping edges and tapered mid-century modern legs. Each oval table is made to order with custom dimensions available, from compact 60-inch designs for everyday dining to grand 96-inch surfaces for holiday gatherings. All tables include complimentary white glove in-home delivery and assembly.",
  },

  "minimalist-bed-frames": {
    meta: "Minimalist bed frames handcrafted in solid walnut & oak. Clean-line platform designs, no box spring needed. Twin–Cal King. Made in Ohio.",
    rich: "Discover our collection of minimalist bed frames, handcrafted from solid American walnut and white oak by Amish artisans in Ohio. Our minimalist platform bed frames embody the less-is-more philosophy — clean horizontal lines, low-profile silhouettes, and zero unnecessary ornamentation. Each bed frame features sturdy solid wood slats that eliminate the need for a box spring, keeping the overall profile sleek and grounded. Available in Twin through California King sizes, with optional integrated headboards and floating nightstand attachments. Whether your bedroom leans mid-century modern, Scandinavian, or Japandi, a minimalist bed frame from ModernCre8ve anchors the room with quiet confidence.",
  },

  "scandinavian-bed-frames": {
    meta: "Scandinavian bed frames in solid walnut & white oak. Nordic-inspired minimalist designs with warm wood tones. Twin–Cal King. Made in Ohio.",
    rich: "Shop our collection of Scandinavian bed frames, handcrafted from solid American walnut and white oak by Amish artisans in Ohio. Inspired by the warm minimalism of Danish and Swedish furniture design, each Scandinavian bed frame features clean lines, rounded edges, and natural wood grain that brings Nordic hygge to your bedroom. Our Upton bed frame leads the collection with its gently curved headboard and splayed tapered legs — a nod to classic Scandinavian craftsmanship. All bed frames are available in Twin through California King and ship with complimentary white glove in-home delivery and assembly.",
  },
};
