/**
 * Product metafield content for all active ModernCre8ve products.
 * Used by scripts/push-product-metafields.ts to populate empty Shopify metafields.
 *
 * Fields covered:
 * - descriptor.short_description (Multi-line text) — SEO-rich product summary
 * - custom.material (Rich text) — Materials & construction details
 * - custom.shipping_works (Rich text) — How shipping/delivery works
 * - custom.product_guarantee_text (Rich text) — Quality guarantee
 * - custom.usp1 (Single line text) — Unique selling point #1 (if missing)
 * - custom.center_section_heading (Single line text) — Mid-page content heading
 * - custom.center_section_content (Multi-line text) — Mid-page content body
 */

// ── Store-wide defaults (same for all furniture products) ──────────────

export const STORE_WIDE = {
  shipping_works: `<p>All furniture is handcrafted to order in Ohio. Please allow <strong>12–16 weeks</strong> for production and delivery.</p><p>We offer <strong>complimentary white glove in-home delivery</strong> on 95%+ of orders — your piece is delivered directly into your home, placed in your desired room, assembled if needed, and all packaging is removed.</p><p>You'll receive tracking updates at each stage: order confirmation, production start, finishing, and shipping. Custom orders may require additional lead time.</p>`,

  product_guarantee_text: `<p>Every ModernCre8ve piece is built to last generations. We stand behind our craftsmanship with a <strong>lifetime structural warranty</strong> covering joints, frames, and construction integrity.</p><p>If you're not completely satisfied, contact us within 30 days of delivery and we'll make it right. Our furniture is built by Amish artisans using time-tested joinery techniques — no particle board, no veneers, no shortcuts.</p>`,
};

// ── Per-product content ────────────────────────────────────────────────

export interface ProductMetafieldContent {
  shortDescription: string;
  material: string;
  usp1?: string; // only if currently null
  centerHeading: string;
  centerContent: string;
}

export const PRODUCTS: Record<string, ProductMetafieldContent> = {
  "bossa-nova-modern-dining-table-small-handmade-ohio": {
    shortDescription:
      "A bold, sculptural dining table crafted from 100% solid American walnut. The Bossa Nova features a double beveled edge tabletop with curved corners, tapered angled legs, and optional extension leaves for flexible seating from 6 to 10 guests.",
    material:
      '<p><strong>Primary Wood:</strong> 100% Solid American Black Walnut</p><p><strong>Construction:</strong> Traditional mortise-and-tenon joinery by Amish craftsmen</p><p><strong>Finish:</strong> Hand-rubbed natural oil finish that enhances grain and protects against daily use</p><p><strong>Tabletop:</strong> Double beveled edge with curved corners, 1" thick solid walnut</p><p><strong>Legs:</strong> Tapered and angled 1" thick solid hardwood</p>',
    usp1: "White glove in-home delivery & assembly included",
    centerHeading: "Designed for Gathering",
    centerContent:
      "The Bossa Nova draws its name from the smooth, rhythmic Brazilian music genre — and like its namesake, this table brings people together effortlessly. The curved corners and beveled edges create a welcoming surface that feels as good as it looks. Each table is handcrafted to your specifications by Amish artisans in Ohio, using 100% solid American walnut with traditional joinery that will last for generations.",
  },

  "mid-century-modern-extendable-dining-table-santa-monica": {
    shortDescription:
      "A mid-century modern extendable dining table with a distinctive semi-elliptical curved top in solid hardwood. Features a single 20-inch butterfly leaf that extends the table from 70 to 90 inches, comfortably seating 6 to 10 guests.",
    material:
      '<p><strong>Primary Wood:</strong> Solid American Hardwood (Walnut or White Oak options)</p><p><strong>Construction:</strong> Amish-built with traditional joinery</p><p><strong>Tabletop:</strong> 1" thick solid hardwood with curved semi-elliptical shape</p><p><strong>Extension:</strong> One 20" butterfly leaf (70" to 90" total length)</p><p><strong>Width:</strong> 34"</p><p><strong>Finish:</strong> Hand-rubbed natural oil finish</p>',
    usp1: "White glove in-home delivery & assembly included",
    centerHeading: "Grows with Your Table",
    centerContent:
      "The Santa Monica Extension Table adapts to your life — intimate dinners for four or holiday gatherings for ten. The integrated butterfly leaf stores flush inside the table and deploys in seconds, with no separate pieces to store. The distinctive semi-elliptical shape gives you the conversational intimacy of a round table with the seating capacity of a rectangle.",
  },

  "the-santa-monica-mid-century-modern-dining-table": {
    shortDescription:
      "The original Santa Monica — a handcrafted mid-century modern dining table in solid walnut or white oak. Clean lines, tapered legs, and a beautifully proportioned top that seats 6 to 8 comfortably. Made to order in Ohio by Amish artisans.",
    material:
      '<p><strong>Primary Wood:</strong> Solid American Black Walnut or White Oak</p><p><strong>Construction:</strong> Traditional Amish joinery — mortise and tenon throughout</p><p><strong>Finish:</strong> Hand-rubbed natural oil finish</p><p><strong>Legs:</strong> Tapered mid-century modern profile in matching solid hardwood</p>',
    usp1: "White glove in-home delivery & assembly included",
    centerHeading: "The One That Started It All",
    centerContent:
      "The Santa Monica is our signature design and the table that launched ModernCre8ve. Inspired by the clean geometry of mid-century Californian design, every line serves a purpose. The gently tapered legs create visual lightness while the solid hardwood top delivers the warmth and presence that only real wood can provide. Each table is made to order — choose your wood species, dimensions, and finish.",
  },

  "lareauxs-furniture-wax": {
    shortDescription:
      "A premium furniture wax handcrafted for maintaining and protecting solid wood furniture. Lareaux's Furniture Wax nourishes, protects, and enhances the natural grain of walnut, oak, cherry, and other hardwoods. Ships in 3–5 business days.",
    material:
      '<p><strong>Ingredients:</strong> Natural beeswax blend with conditioning oils</p><p><strong>Use:</strong> Apply thin coat with soft cloth, buff to desired sheen</p><p><strong>Coverage:</strong> One tin covers approximately 50–75 sq ft of surface area</p><p><strong>Safe for:</strong> All solid wood furniture, cutting boards, and wooden kitchen items</p>',
    centerHeading: "Care for Your Investment",
    centerContent:
      "Your handcrafted furniture deserves handcrafted care. Lareaux's Furniture Wax is specifically formulated for the natural oil finishes we use on ModernCre8ve pieces. A light application every 3–6 months keeps your wood nourished, protected from moisture rings, and looking its absolute best for decades to come.",
  },

  "scandinavian-danish-modern-dining-table": {
    shortDescription:
      "The Santa Monica Large — a Scandinavian-inspired dining table in solid hardwood. The generous proportions and clean Nordic lines seat 8 to 10 guests with ease. Handcrafted to order in Ohio with your choice of walnut or white oak.",
    material:
      '<p><strong>Primary Wood:</strong> Solid American Walnut or White Oak</p><p><strong>Construction:</strong> Amish-built using traditional joinery techniques</p><p><strong>Design:</strong> Scandinavian/Danish modern inspired proportions</p><p><strong>Finish:</strong> Hand-rubbed natural oil finish that deepens over time</p><p><strong>Seating:</strong> Comfortably seats 8–10 guests</p>',
    usp1: "White glove in-home delivery & assembly included",
    centerHeading: "Scandinavian Soul, American Craft",
    centerContent:
      "Inspired by the great Danish designers who believed furniture should be both beautiful and democratic, the Santa Monica Large brings Nordic proportions to American hardwood. The extended surface provides generous elbow room for large gatherings while the tapered legs and refined profile keep the visual weight light and airy.",
  },

  "round-walnut-dining-table": {
    shortDescription:
      "A modern round dining table in solid American walnut featuring a distinctive double beveled top. The circular form creates intimate, egalitarian seating for 4 to 6 guests. Handcrafted by Amish artisans in Ohio.",
    material:
      '<p><strong>Primary Wood:</strong> 100% Solid American Black Walnut</p><p><strong>Construction:</strong> Traditional Amish joinery</p><p><strong>Tabletop:</strong> Double beveled edge profile, solid walnut</p><p><strong>Shape:</strong> True circular form</p><p><strong>Finish:</strong> Hand-rubbed natural oil finish</p>',
    usp1: "White glove in-home delivery & assembly included",
    centerHeading: "The Egalitarian Table",
    centerContent:
      "There is no head of a round table — everyone is equal, everyone faces the center, and conversation flows naturally in every direction. Our round walnut dining table pairs this timeless social principle with the warmth and character of solid American walnut and a sculptural double beveled edge that catches the light beautifully.",
  },

  "santa-monica-cherry": {
    shortDescription:
      "The Santa Monica in American cherry — a mid-century modern dining table that deepens in color with age, developing a rich amber patina over time. Handcrafted by Amish artisans with traditional joinery.",
    material:
      '<p><strong>Primary Wood:</strong> Solid American Cherry</p><p><strong>Construction:</strong> Traditional Amish mortise-and-tenon joinery</p><p><strong>Finish:</strong> Hand-rubbed natural oil finish</p><p><strong>Patina:</strong> Cherry naturally darkens to a rich amber over time with light exposure</p><p><strong>Legs:</strong> Tapered mid-century modern profile</p>',
    usp1: "White glove in-home delivery & assembly included",
    centerHeading: "A Living Finish",
    centerContent:
      "American cherry is prized for its unique ability to develop character over time. Starting as a warm blonde-pink, cherry deepens to a rich, luminous amber that grows more beautiful with every year. The Santa Monica in cherry is not just a dining table — it is a piece that tells the story of your family's life around it.",
  },

  "santa-monica-mixed": {
    shortDescription:
      "The Santa Monica in mixed hardwoods — a mid-century modern dining table combining walnut and white oak for a striking two-tone effect. Handcrafted by Amish artisans in Ohio with traditional joinery.",
    material:
      '<p><strong>Primary Woods:</strong> Solid American Black Walnut & White Oak combination</p><p><strong>Construction:</strong> Traditional Amish mortise-and-tenon joinery</p><p><strong>Design:</strong> Two-tone hardwood combination for visual contrast</p><p><strong>Finish:</strong> Hand-rubbed natural oil finish on both species</p>',
    usp1: "White glove in-home delivery & assembly included",
    centerHeading: "Two Woods, One Vision",
    centerContent:
      "The Santa Monica Mixed pairs the deep chocolate tones of American black walnut with the warm honey grain of white oak. The result is a table with natural visual contrast that becomes a genuine centerpiece. Each wood species brings its own character while the consistent mid-century lines unify the design.",
  },

  "modern-hardwood-dining-chair": {
    shortDescription:
      "A modern solid hardwood dining chair available in walnut, white oak, or cherry. Choose between arm and side chair configurations. Handcrafted by Amish artisans with traditional joinery for exceptional comfort and durability.",
    material:
      '<p><strong>Wood Options:</strong> Solid American Walnut, White Oak, or Cherry</p><p><strong>Construction:</strong> Traditional Amish mortise-and-tenon joinery throughout</p><p><strong>Seat:</strong> Contoured solid wood seat for comfort without upholstery</p><p><strong>Configurations:</strong> Arm chair and side chair available</p><p><strong>Finish:</strong> Hand-rubbed natural oil finish</p>',
    usp1: "White glove in-home delivery included",
    centerHeading: "Built for Daily Life",
    centerContent:
      "A dining chair gets more use than almost any other piece of furniture in your home — pulled out, sat in, leaned back on, bumped, scraped, and loved. Our modern hardwood dining chair is built to take it all with Amish mortise-and-tenon joinery that will not loosen over decades of daily use. The contoured solid wood seat provides natural comfort that only improves as the wood warms to your body.",
  },

  "mar-vista-oval-dining-table": {
    shortDescription:
      "The Mar Vista — a sculptural oval dining table in solid American walnut. Soft sweeping edges and tapered mid-century modern legs create an organic, conversational form that seats 6 to 10 guests. Handcrafted to order in Ohio.",
    material:
      '<p><strong>Primary Wood:</strong> 100% Solid American Black Walnut</p><p><strong>Construction:</strong> Traditional Amish joinery</p><p><strong>Shape:</strong> Sculptural oval with soft sweeping edges</p><p><strong>Legs:</strong> Tapered mid-century modern profile</p><p><strong>Finish:</strong> Hand-rubbed natural oil finish</p><p><strong>Sizes:</strong> Custom dimensions available, from 60" to 96"</p>',
    usp1: "White glove in-home delivery & assembly included",
    centerHeading: "Where Form Meets Conversation",
    centerContent:
      "Named after the artistic Los Angeles neighborhood, the Mar Vista embodies the organic modernism of mid-century California. The oval form eliminates sharp corners and hierarchical seating — there is no head of this table, just a continuous, flowing surface that draws everyone into the conversation. Each Mar Vista is handcrafted to your exact dimensions by Amish artisans using 100% solid American walnut.",
  },

  "the-vista-scandinavian-extendable-dining-table": {
    shortDescription:
      "The Vista — a Scandinavian-inspired extendable dining table combining the organic warmth of an oval top with the practicality of a butterfly leaf extension. Solid walnut or white oak, handcrafted in Ohio.",
    material:
      '<p><strong>Primary Wood:</strong> Solid American Walnut or White Oak</p><p><strong>Construction:</strong> Amish-built with traditional joinery</p><p><strong>Extension:</strong> Integrated butterfly leaf system</p><p><strong>Shape:</strong> Oval/elliptical with soft edges</p><p><strong>Finish:</strong> Hand-rubbed natural oil finish</p>',
    usp1: "White glove in-home delivery & assembly included",
    centerHeading: "Everyday Elegance, Expandable",
    centerContent:
      "The Vista brings Scandinavian simplicity to the expandable dining table. The integrated butterfly leaf stores invisibly inside the table and extends in seconds — no hunting in the closet for extra leaves before a dinner party. The elliptical shape and warm hardwood create an inviting atmosphere whether you are dining as a family of four or hosting ten.",
  },

  "mid-century-modern-credenza-handcrafted-ohio": {
    shortDescription:
      "A mid-century modern credenza and sideboard in solid American walnut. Features soft-close doors with leather and brass hardware, adjustable center shelves, and cutouts for electronics and wiring. Handcrafted by Amish artisans in Ohio.",
    material:
      '<p><strong>Primary Wood:</strong> 100% Solid American Black Walnut</p><p><strong>Construction:</strong> Traditional Amish joinery</p><p><strong>Hardware:</strong> Leather pulls with solid brass fittings</p><p><strong>Hinges:</strong> European soft-close door hardware</p><p><strong>Interior:</strong> One adjustable center shelf in each end compartment</p><p><strong>Back Panel:</strong> Cutouts for electronics, wiring, and cable management</p>',
    centerHeading: "Storage Meets Sculpture",
    centerContent:
      "Our mid-century modern credenza is equal parts functional storage and sculptural art. The solid walnut cabinet sits on tapered legs that give it visual lightness, while leather-and-brass door pulls add a warm, tactile detail. Inside, adjustable shelves and wire management cutouts mean it works beautifully as a media console, dining sideboard, or entryway statement piece.",
  },
};
