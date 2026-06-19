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
    meta: "Mid-Century Modern Credenzas — Handcrafted Solid Wood Storage. Handcrafted mid-century modern credenzas and sideboards in walnut & oak. Clean lines, tapered legs. Made in Ohio.",
    rich: "Discover our collection of handcrafted mid-century modern credenzas and sideboards, built from solid American walnut by Amish artisans in Ohio. Each modern credenza features clean lines, tapered legs, and push-latch doors inspired by 1950s Scandinavian design. Whether you need a walnut sideboard for the dining room, a modern buffet cabinet for entertaining, or a sleek media credenza for the living room, every piece is made to order with custom sizing available. Our Astrid credenza is the centerpiece of the collection — a low-profile storage piece that works beautifully as a sideboard, buffet, or entryway console table. All pieces ship with white glove in-home delivery and assembly included.",
  },

  "mid-century-modern-dining-tables": {
    meta: "Shop solid walnut and oak mid century modern dining tables, handcrafted to order in Ohio with extendable options, custom sizing, and white glove delivery.",
    rich: `<p>Our <strong>mid century modern dining tables</strong> are handcrafted to order by skilled Amish artisans in Ohio, using solid American walnut, white oak, cherry, and maple. Each table is built with traditional joinery and hand-finished surfaces, giving you a dining table with real weight, lasting structure, and wood grain that becomes more beautiful with daily use.</p>

<h3>Why Choose a Handcrafted Mid Century Modern Dining Table?</h3>
<p>Mid century modern dining tables are known for clean lines, tapered legs, softened corners, and organic silhouettes inspired by the 1940s through 1960s. Instead of veneer or particle board, ModernCre8ve tables are made one at a time from solid hardwood. The result is a substantial dining centerpiece built for everyday meals, long dinners, and years of family use.</p>

<h3>Walnut, Oak, Cherry, and Custom Finishes</h3>
<p><strong>Solid American walnut</strong> remains the signature mid-century choice because of its warm chocolate color and expressive grain. White oak creates a lighter Scandinavian look, while cherry brings warmth that deepens with age. Most designs can be customized by wood species, finish, length, width, and extension configuration so the table fits both your room and your way of hosting.</p>

<h3>Extendable Tables for 6, 8, 10, or More</h3>
<p>Many of our mid century modern dining tables include extension leaves or custom sizing options. Round, oval, and rectangular designs can be built for compact rooms, everyday seating for 6, or larger gatherings for 8 to 12 guests. If you need a specific dimension, our team can quote a made-to-order version rather than forcing your room around a stock size.</p>

<h3>How to Choose the Right Size</h3>
<p>Plan for about 24 inches of table width per person and roughly 36 inches of clearance around the table for chairs and movement. A 60-inch rectangular table generally seats 6, a 72-inch table seats 8, and extension tables give you flexibility for holidays and dinner parties without overwhelming the room every day.</p>

<h3>Delivery and Lead Time</h3>
<p>Because every table is made to order, furniture production typically takes <strong>12-16 weeks</strong>. Most furniture orders include white glove in-home delivery with placement and assembly, so your table arrives ready for the room instead of sitting in boxes at the door.</p>`,
  },

  "mid-century-modern": {
    meta: "Mid-century modern furniture handcrafted in solid walnut & oak. Dining tables, credenzas, bed frames & more. 12–16 week lead time. Made in Ohio.",
    rich: "Explore our full collection of mid-century modern furniture, handcrafted from solid American walnut and white oak by Amish artisans in Ohio. From MCM dining tables and credenzas to bed frames and coffee tables, every piece features the clean lines, organic curves, and tapered legs that define mid-century modern style. Our furniture blends 1950s Scandinavian and American modernist design with heirloom-quality craftsmanship — built to last generations, not seasons.",
  },

  "scandinavian-design-furniture": {
    meta: "Scandinavian Design Furniture — Handcrafted Nordic-Inspired Pieces. Explore handcrafted Scandinavian furniture: dining tables, bed frames & storage. Minimalist Nordic design. Free delivery.",
    rich: "Shop our collection of Scandinavian design furniture, handcrafted from solid hardwoods by Amish artisans in Ohio. Inspired by the minimalist elegance of Danish, Swedish, and Norwegian design traditions, each piece emphasizes clean forms, natural materials, and functional beauty. Our Scandinavian dining tables, bed frames, and storage pieces offer the warmth of Nordic design with the durability of American craftsmanship. As one of the leading affordable Scandinavian furniture brands online, ModernCre8ve proves that exceptional design and solid wood construction don't require a luxury price tag.",
  },

  japandi: {
    meta: "Japandi furniture blending Japanese minimalism with Scandinavian warmth. Handcrafted in solid walnut & oak. Made to order in Ohio.",
    rich: "Discover our Japandi furniture collection — a harmonious blend of Japanese minimalism and Scandinavian warmth, handcrafted from solid American walnut and white oak. Each Japandi piece embodies wabi-sabi philosophy: celebrating natural wood grain, asymmetric beauty, and purposeful simplicity. From Japandi coffee tables and dining sets to bed frames and storage, our collection creates serene, intentional living spaces. Every piece is made to order by Amish artisans in Ohio with a 12–16 week lead time.",
  },

  "japandi-scandi-mid-century-modern-furniture": {
    meta: "Shop Japandi MCM furniture blending Japanese minimalism, Scandi warmth, and mid-century lines. Solid walnut and oak pieces handmade to order in Ohio.",
    rich: "Shop Japandi MCM furniture that blends Japanese minimalism, Scandinavian warmth, and mid-century modern lines. This collection is built for calm, intentional rooms: low-profile silhouettes, natural walnut and oak grain, soft edges, and functional storage without visual noise. Every piece is handcrafted to order by Amish artisans in Ohio using solid hardwoods, traditional joinery, and custom finish options. Choose dining tables, bed frames, credenzas, coffee tables, and storage pieces that pair Japandi restraint with MCM character. Furniture lead times are 12-16 weeks, and most furniture orders include white glove in-home delivery with placement and assembly.",
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
    meta: "Custom Expandable Dining Tables — Handcrafted & Extendable. Design your custom expandable dining table. Extends from 4 to 12 seats. Solid hardwood, Amish-crafted in Ohio.",
    rich: "Discover our custom extendable dining tables, handcrafted from solid American walnut and white oak by Amish artisans in Ohio. Each mid-century modern extendable dining table features a built-in butterfly leaf mechanism that expands seamlessly, adding 18–24 inches of dining space when you need it. From intimate 6-seat tables that extend to seat 10, to grand designs accommodating 14 guests, our custom expandable dining tables are built for real life — holiday gatherings, dinner parties, and everyday family meals.",
  },

  "custom-made-furniture": {
    meta: "Custom Made Furniture — Handcrafted to Your Specifications. Design your own custom furniture in solid hardwood. Choose wood species, finish & dimensions. Free delivery.",
    rich: "Commission custom handmade furniture built to your exact specifications by Amish artisans in Ohio. From custom dining tables and credenzas to bed frames and storage pieces, every ModernCre8ve piece is handcrafted from solid American hardwoods. Choose your wood species, dimensions, and finish for furniture that fits your space perfectly. Our unique handmade furniture combines old-world craftsmanship with mid-century modern, Scandinavian, and Japandi design sensibilities.",
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
