/**
 * Collection FAQ data for FAQPage schema markup.
 * Each collection handle maps to an array of Q&A pairs
 * that get injected as JSON-LD on the collection page.
 */
export interface FAQ {
  question: string;
  answer: string;
}

export const collectionFaqs: Record<string, FAQ[]> = {
  "mid-century-modern-dining-tables": [
    {
      question: "What makes a dining table mid-century modern?",
      answer:
        "Mid-century modern dining tables are defined by clean lines, organic curves, tapered legs, and natural wood materials like walnut and oak. The style originated in the 1940s–1960s and emphasizes function alongside form, with minimal ornamentation and timeless silhouettes.",
    },
    {
      question: "What wood is best for a mid-century modern dining table?",
      answer:
        "Walnut is the most iconic wood for mid-century modern dining tables, prized for its rich chocolate tones and dramatic grain. White oak and teak are also popular choices. At ModernCre8ve, our tables are handcrafted from solid American walnut by Amish artisans in Ohio.",
    },
    {
      question: "How long does it take to receive a custom dining table?",
      answer:
        "Our handcrafted dining tables have a lead time of 12–16 weeks because each piece is made to order by skilled Amish craftspeople. This ensures exceptional quality and allows for customization of dimensions, wood species, and finish.",
    },
    {
      question: "Do mid-century modern dining tables come with extensions?",
      answer:
        "Many of our mid-century modern dining tables offer extension leaves, allowing you to expand the table for larger gatherings. For example, our Parsons and Mar Vista tables include built-in extension mechanisms that seat 6–10 guests comfortably.",
    },
    {
      question: "What size dining table do I need?",
      answer:
        "Allow 24 inches of table width per person. A 60-inch rectangular table seats 6, while a 72-inch table seats 8. For round or oval tables, a 48-inch diameter seats 4 and a 60-inch diameter seats 6. Our team can help you choose the right size for your space.",
    },
  ],

  "mid-century-modern": [
    {
      question: "What is mid-century modern furniture?",
      answer:
        "Mid-century modern furniture is a design movement from the mid-20th century (1940s–1960s) characterized by clean lines, gentle curves, organic shapes, and a focus on functionality. Designers like Charles Eames, Hans Wegner, and Eero Saarinen defined the style with pieces that remain iconic today.",
    },
    {
      question: "Is mid-century modern furniture still in style?",
      answer:
        "Yes — mid-century modern design has remained popular for decades because of its timeless aesthetic and functional simplicity. The clean lines and natural materials work seamlessly in contemporary, minimalist, and Scandinavian interiors, making it one of the most enduring furniture styles.",
    },
    {
      question: "What materials are used in mid-century modern furniture?",
      answer:
        "Traditional mid-century modern furniture features natural hardwoods like walnut, teak, and oak, often paired with materials such as leather, brass, and woven textiles. ModernCre8ve pieces are crafted from solid American walnut and other premium hardwoods by Amish artisans.",
    },
    {
      question: "How do I mix mid-century modern furniture with other styles?",
      answer:
        "Mid-century modern pieces pair beautifully with Scandinavian, Japandi, and contemporary styles because they share an appreciation for simplicity and natural materials. Start with a statement piece like a walnut credenza or dining table, and layer in complementary textures like linen, wool, and ceramics.",
    },
    {
      question: "Are ModernCre8ve furniture pieces handmade?",
      answer:
        "Yes, every ModernCre8ve piece is handcrafted to order by skilled Amish artisans in Ohio. Each item is made from solid hardwoods with traditional joinery techniques, ensuring heirloom-quality construction that lasts generations.",
    },
  ],

  "scandinavian-design-furniture": [
    {
      question: "What defines Scandinavian design furniture?",
      answer:
        "Scandinavian design furniture emphasizes simplicity, minimalism, and functionality inspired by the Nordic lifestyle. It features clean lines, light-toned woods, neutral colors, and a focus on craftsmanship. The style promotes hygge — a sense of warmth and coziness in the home.",
    },
    {
      question:
        "What is the difference between Scandinavian and mid-century modern furniture?",
      answer:
        "While both styles share clean lines and natural materials, Scandinavian design tends toward lighter woods (like birch and ash), softer curves, and a more minimalist aesthetic. Mid-century modern often uses warmer, darker woods like walnut and features bolder organic shapes. Many of our pieces blend both influences.",
    },
    {
      question: "What wood is used in Scandinavian furniture?",
      answer:
        "Traditional Scandinavian furniture favors light-toned woods like birch, pine, ash, and beech. Modern Scandinavian-inspired pieces also incorporate white oak and maple. At ModernCre8ve, we craft Scandinavian-style pieces in both light oak and rich walnut for a contemporary interpretation.",
    },
    {
      question: "Is Scandinavian furniture durable?",
      answer:
        "High-quality Scandinavian furniture is extremely durable. Our pieces are built with solid hardwood construction and traditional joinery — no particle board or veneers. With proper care, handcrafted Scandinavian furniture can last for generations, making it a worthwhile investment.",
    },
    {
      question: "How do I care for Scandinavian wood furniture?",
      answer:
        "Dust regularly with a soft cloth, use coasters to prevent water rings, and avoid placing furniture in direct sunlight. For deeper cleaning, use a damp cloth with mild soap. We recommend treating wood surfaces with natural furniture wax every 6–12 months to maintain the finish.",
    },
  ],

  "all-products": [
    {
      question: "Where is ModernCre8ve furniture made?",
      answer:
        "All ModernCre8ve furniture is handcrafted in Ohio by skilled Amish artisans. Each piece is made to order using solid American hardwoods and traditional woodworking techniques, ensuring exceptional quality and attention to detail.",
    },
    {
      question: "How long does delivery take for ModernCre8ve furniture?",
      answer:
        "Our furniture has a lead time of 12–16 weeks because every piece is handcrafted to order. Once complete, we provide white glove in-home delivery with assembly for 95%+ of orders. Smaller items like our furniture wax ship within 3–5 business days.",
    },
    {
      question: "Do you offer custom furniture options?",
      answer:
        "Yes, we welcome custom orders. We can adjust dimensions, wood species, and finish options on most of our designs. Contact us via email at info@moderncre8ve.com or call (216) 502-0755 to discuss your custom project.",
    },
    {
      question: "What is white glove delivery?",
      answer:
        "White glove delivery means our team delivers your furniture directly into your home, places it in your desired room, assembles it if needed, and removes all packaging materials. This premium service is included with 95%+ of our furniture orders at no extra charge.",
    },
    {
      question: "What styles of furniture does ModernCre8ve offer?",
      answer:
        "ModernCre8ve specializes in three complementary design aesthetics: mid-century modern, Scandinavian, and Japandi. Our collection includes dining tables, beds, credenzas, sideboards, chairs, and home accessories — all handcrafted from solid hardwoods.",
    },
  ],

  "custom-made-furniture": [
    {
      question: "How does the custom furniture process work?",
      answer:
        "Start by contacting us with your vision — dimensions, wood preference, and design inspiration. We will provide a quote and timeline. Once approved, our Amish craftspeople begin building your piece. The process takes 12–16 weeks, and we keep you updated throughout production.",
    },
    {
      question: "What types of wood can I choose for custom furniture?",
      answer:
        "We primarily work with solid American walnut, white oak, cherry, and maple. Each wood species has a distinct grain pattern and color, from walnut's rich chocolate tones to maple's creamy white. Our team can help you select the best wood for your design and space.",
    },
    {
      question: "Is custom furniture more expensive than standard pieces?",
      answer:
        "Custom furniture pricing varies based on dimensions, wood species, and design complexity. Many of our standard designs can be customized at a modest upcharge. Contact us for a personalized quote — we work with a range of budgets while maintaining our commitment to solid hardwood construction.",
    },
    {
      question: "Can I modify an existing ModernCre8ve design?",
      answer:
        "Absolutely. Most of our designs can be modified — whether you need a different table length, alternative wood species, or adjusted proportions. Since every piece is made to order, customization is built into our process from the start.",
    },
    {
      question: "Do you ship custom furniture nationwide?",
      answer:
        "Yes, we deliver custom furniture throughout the continental United States. All furniture orders include white glove in-home delivery with placement and assembly, ensuring your piece arrives safely and is set up exactly where you want it.",
    },
  ],

  "mid-century-modern-credenza": [
    {
      question: "What is a credenza used for?",
      answer:
        "A credenza is a versatile storage piece typically placed in living rooms, dining rooms, or home offices. It offers closed cabinet storage, drawers, and sometimes open shelving for displaying decorative objects. Modern credenzas also serve as media consoles, bar carts, or entryway consoles depending on size and configuration.",
    },
    {
      question:
        "What is the difference between a credenza, sideboard, and buffet?",
      answer:
        "A credenza typically sits lower and longer with sliding or hinged doors and minimal legs. A sideboard is similar but often taller with more storage. A buffet tends to be taller still and is specifically designed for dining room use. In modern design, the terms are often used interchangeably. Our Astrid piece works beautifully as all three.",
    },
    {
      question: "What size credenza do I need?",
      answer:
        "Measure your wall space and leave at least 4–6 inches on each side for visual breathing room. Standard credenzas range from 48 to 72 inches wide. For a media console, ensure the credenza is wider than your TV. Our mid-century modern credenzas are handcrafted to order, so custom dimensions are available.",
    },
    {
      question: "What wood is best for a mid-century modern credenza?",
      answer:
        "Walnut is the quintessential mid-century credenza wood, prized for its warmth and dramatic grain. White oak and teak are also period-appropriate choices. Our credenzas are crafted from solid American walnut by Amish artisans — no veneers or particle board — ensuring they look stunning and last for generations.",
    },
    {
      question: "How do I style a mid-century modern credenza?",
      answer:
        "Keep it minimal and intentional. Place a statement lamp or sculptural object on one end, a small stack of design books in the middle, and a plant or vase on the opposite side. For wall decor above, try a large abstract print or a round mirror. The goal is to let the credenza's craftsmanship be the focal point.",
    },
  ],

  japandi: [
    {
      question: "What is Japandi style?",
      answer:
        "Japandi is a design aesthetic that merges Japanese minimalism with Scandinavian warmth. It combines the wabi-sabi appreciation for imperfection and natural materials from Japanese design with the hygge-driven coziness and clean lines of Scandinavian interiors. The result is a calm, uncluttered space that feels both refined and inviting.",
    },
    {
      question: "How is Japandi different from minimalism?",
      answer:
        "While both value simplicity, Japandi focuses on warmth and natural texture rather than stark emptiness. Japandi interiors use rich wood tones, handcrafted ceramics, linen textiles, and earthy colors — creating spaces that feel intentional and lived-in rather than cold and sparse.",
    },
    {
      question: "What colors are used in Japandi design?",
      answer:
        "Japandi palettes center on warm neutrals: cream, sand, taupe, and soft gray. These are accented with rich wood tones like walnut and oak, muted greens from plants, and occasional touches of black or charcoal for contrast. The overall effect is calming, grounded, and natural.",
    },
    {
      question: "What furniture works in a Japandi interior?",
      answer:
        "Japandi furniture features clean, low profiles with natural wood construction. Think walnut dining tables with gentle organic curves, simple bed frames with minimal headboards, and unadorned credenzas. Our pieces are handcrafted from solid hardwoods by Amish artisans, making them perfect for Japandi-inspired spaces.",
    },
    {
      question: "Is Japandi a long-lasting design trend?",
      answer:
        "Japandi has proven to be more than a trend — it reflects a growing cultural preference for intentional living, sustainable materials, and timeless design. Both Japanese and Scandinavian design philosophies have endured for centuries, so their fusion is built on deep aesthetic foundations that outlast passing fads.",
    },
  ],

  "handmade-modern-bed-frames": [
    {
      question: "What size bed frames does ModernCre8ve offer?",
      answer:
        "Our handmade bed frames are available in Queen, King, and California King sizes. Since every piece is made to order, we can also accommodate custom dimensions. Contact us to discuss your specific requirements.",
    },
    {
      question: "Do your bed frames require a box spring?",
      answer:
        "No, our bed frames are designed with a solid slat support system that eliminates the need for a box spring. Simply place your mattress directly on the frame. This also gives the bed a lower, more modern profile that complements mid-century and Scandinavian aesthetics.",
    },
    {
      question: "How long does it take to receive a handmade bed frame?",
      answer:
        "Our bed frames are handcrafted to order with a lead time of 12–16 weeks. Once complete, we provide white glove in-home delivery including placement and assembly in your bedroom at no additional charge.",
    },
    {
      question: "What styles of bed frames do you offer?",
      answer:
        "We offer bed frames across three design aesthetics: mid-century modern (like the Bosco with its walnut headboard and tapered legs), Scandinavian-inspired (like the Upton with its minimal profile and Danish lines), and boho (like the Van Aiken with its woven headboard detail). Each is crafted from solid hardwood.",
    },
    {
      question: "Are handmade bed frames worth the investment?",
      answer:
        "Solid hardwood bed frames built with traditional joinery will outlast mass-produced alternatives by decades. Our customers report that the quality of sleep improves with a sturdy, non-creaking frame, and the natural materials create a calming bedroom atmosphere. These are heirloom pieces designed to last 50+ years.",
    },
  ],

  "mid-century-modern-coffee-tables": [
    {
      question: "What makes a coffee table mid-century modern?",
      answer:
        "Mid-century modern coffee tables feature clean geometric or organic shapes, tapered or splayed legs, and natural wood construction with minimal ornamentation. The style favors low profiles, warm wood tones like walnut, and functional design that balances beauty with everyday use.",
    },
    {
      question: "What is the right coffee table height?",
      answer:
        "A standard coffee table should be 16–18 inches tall, roughly the same height as your sofa seat cushions. This creates a comfortable reach for drinks and décor. Our mid-century modern coffee tables are designed at 16 inches for that classic low-slung MCM aesthetic.",
    },
    {
      question: "How do I choose the right coffee table size for my space?",
      answer:
        "Your coffee table should be about two-thirds the length of your sofa, with 16–18 inches of clearance on all sides for walkways. For sectionals, a round or oval table works well. Measure your space first — our team can help you select the right dimensions.",
    },
    {
      question: "Can I use a round coffee table with a sectional?",
      answer:
        "Yes, round and oval coffee tables pair beautifully with sectional sofas. The curved shape softens the angular lines of a sectional and is accessible from all seating positions. Our round walnut coffee tables are popular choices for open-concept living rooms.",
    },
    {
      question: "How do I care for a walnut coffee table?",
      answer:
        "Use coasters to prevent water rings, wipe spills immediately, and dust regularly with a soft cloth. Avoid placing your table in direct sunlight, which can fade the wood. Apply our ModernCre8ve furniture wax every 6–12 months to nourish the wood and maintain its rich finish.",
    },
  ],

  "modern-dining-chairs": [
    {
      question: "What makes a dining chair comfortable for long meals?",
      answer:
        "A comfortable dining chair has a seat height of 17–19 inches, a slight recline in the backrest (around 5 degrees), adequate seat depth (15–18 inches), and firm cushioning that supports without bottoming out. Our dining chairs are ergonomically designed for extended dinner parties and daily use.",
    },
    {
      question: "How many dining chairs do I need?",
      answer:
        "Plan for one chair per 24 inches of table perimeter. A 60-inch rectangular table comfortably seats 6, while a 72-inch table seats 8. For round tables, a 48-inch diameter seats 4 and a 54-inch diameter seats 6. Consider purchasing one or two extras for guests.",
    },
    {
      question: "Can I mix different dining chair styles at one table?",
      answer:
        "Yes, mixing chair styles is a popular design approach. A common strategy is to use matching side chairs with contrasting head chairs, or to pair two complementary styles in alternating positions. The key is maintaining a consistent material or color thread — like all walnut wood — so the mix feels intentional.",
    },
    {
      question: "What is the lead time for handmade dining chairs?",
      answer:
        "Our handcrafted dining chairs have a lead time of 12–16 weeks per set. Since they are built alongside your table, ordering a complete dining set ensures perfectly matched wood tones and proportions. White glove delivery is included.",
    },
    {
      question: "Are solid wood dining chairs durable enough for daily use?",
      answer:
        "Solid hardwood dining chairs built with mortise-and-tenon joinery are among the most durable seating options available. Unlike mass-produced chairs with dowel or glue-only joints, our traditional joinery creates mechanical bonds that strengthen over time. These chairs are built to handle decades of daily meals and gatherings.",
    },
  ],

  "custom-made-expandable-dining-tables": [
    {
      question: "How do extendable dining tables work?",
      answer:
        "Our extendable tables use precision-engineered leaf mechanisms. You pull the two halves of the tabletop apart to reveal the stored leaf, then lift it into position. The mechanism is smooth and can be operated by one person. The leaf stores invisibly within the table when not in use.",
    },
    {
      question: "How much extra seating does an extension leaf add?",
      answer:
        "Each extension leaf typically adds 18–20 inches to the table length, providing room for 2 additional guests. Our tables expand from seating 6 to seating 8–10, depending on the model. The Payne oval table, for example, extends from 63 to 83 inches.",
    },
    {
      question: "Does the extension mechanism affect the table's appearance?",
      answer:
        "Not at all. When closed, our extension tables look identical to fixed-top tables — the seam is virtually invisible thanks to precision milling. The wood grain on the leaf is selected to match the main tabletop for a seamless appearance when extended.",
    },
    {
      question: "What shapes are available for extendable tables?",
      answer:
        "We offer extendable dining tables in rectangular, oval, and round shapes. The Parsons and Santa Monica models are rectangular, the Payne and Mar Vista are oval, and the Corcovado is round. Each can be customized in walnut, oak, or cherry.",
    },
    {
      question: "Can I get a custom size for an extendable dining table?",
      answer:
        "Yes, we can adjust the base dimensions and extension length to fit your specific space. Our Amish craftspeople will build the extension mechanism to your exact specifications. Contact us with your measurements and we will provide a custom quote.",
    },
  ],

  // ─── Content gap collections (ready for Shopify collection creation) ───

  "oval-dining-tables": [
    {
      question: "Why choose an oval dining table over rectangular?",
      answer:
        "Oval dining tables offer several advantages: they eliminate sharp corners (safer for kids and small spaces), create a more intimate conversational atmosphere since everyone faces the center, and fit more flexibly in narrow or open-plan rooms. The curved edges also give a sculptural, mid-century modern feel that a rectangle cannot match.",
    },
    {
      question: "How many people can sit at an oval dining table?",
      answer:
        "A 60-inch oval table comfortably seats 6, while a 72-inch oval seats 8. Oval tables can actually seat more people than rectangular tables of the same length because guests can scoot closer together along the curves. Our Mar Vista oval table seats 6 in its standard form.",
    },
    {
      question: "What is the best wood for an oval dining table?",
      answer:
        "Walnut is our top recommendation for oval dining tables — the flowing grain patterns complement the organic curved shape beautifully. White oak is another excellent choice with its lighter tone and prominent ray fleck. Both woods are extremely durable for daily use.",
    },
    {
      question: "Do you make oval extendable dining tables?",
      answer:
        "Yes, several of our oval dining tables include built-in extension mechanisms. The Payne oval table extends from 63 to 83 inches with a butterfly leaf that stores within the table. This lets you go from comfortable daily dining to hosting large gatherings with a simple pull.",
    },
    {
      question: "How do I choose the right size oval dining table?",
      answer:
        "Measure your dining area and allow at least 36 inches of clearance on all sides for chairs and movement. For the table itself, plan 24 inches of table edge per person. A 54-inch oval works for 4–6, and a 72-inch oval seats 8 comfortably. We build to custom dimensions if your space demands it.",
    },
  ],

  "minimalist-bed-frames": [
    {
      question: "What is a minimalist bed frame?",
      answer:
        "A minimalist bed frame strips bedroom furniture down to its essentials — a clean-lined platform, solid wood construction, and a low profile that creates a grounded, calming aesthetic. No ornamental carvings, no bulky footboards, no unnecessary hardware. The beauty is in the wood grain and precise proportions.",
    },
    {
      question: "Do minimalist bed frames need a box spring?",
      answer:
        "No. Minimalist platform bed frames include a built-in slat support system that replaces the box spring entirely. This keeps the overall height low and eliminates the dated, bulky look of a box spring. Simply place your mattress directly on the slats for proper support and airflow.",
    },
    {
      question: "Are minimalist bed frames sturdy enough?",
      answer:
        "Solid hardwood minimalist bed frames are among the sturdiest you can buy. Our frames use mortise-and-tenon joinery and thick hardwood slats rated for mattress weights well above standard. The minimalist design does not mean minimal construction — every joint is engineered for decades of daily use.",
    },
    {
      question: "What sizes do minimalist bed frames come in?",
      answer:
        "Our minimalist bed frames are available in Twin, Full, Queen, King, and California King. Since each frame is handcrafted to order, we can also accommodate non-standard dimensions or extra-long requirements. Contact us for custom sizing.",
    },
    {
      question: "How do I style a minimalist bed frame?",
      answer:
        "Let the frame breathe. Use crisp white or neutral linen bedding to complement the wood grain. Add one or two textured throw pillows, a simple nightstand on each side, and a single piece of art above the headboard. The goal is an uncluttered, restful retreat that highlights the craftsmanship of the frame itself.",
    },
  ],

  "scandinavian-bed-frames": [
    {
      question: "What defines a Scandinavian bed frame?",
      answer:
        "Scandinavian bed frames are characterized by warm wood tones, gently rounded edges, tapered or splayed legs, and an overall sense of lightness. Inspired by Danish and Swedish design traditions, they create a cozy (hygge) bedroom atmosphere through natural materials and clean proportions rather than heavy ornamentation.",
    },
    {
      question:
        "What is the difference between Scandinavian and mid-century modern bed frames?",
      answer:
        "While both share clean lines, Scandinavian bed frames tend toward softer curves, lighter wood tones, and a more understated presence. Mid-century modern frames often feature bolder lines, darker walnut wood, and more pronounced design elements like angled headboards. Our Upton bed bridges both styles with its Danish-inspired silhouette in choice of walnut or oak.",
    },
    {
      question: "What wood works best for a Scandinavian bed frame?",
      answer:
        "White oak and ash are the most traditional choices for Scandinavian bed frames, offering the light, warm tones associated with Nordic design. However, walnut has become increasingly popular for a richer, contemporary Scandinavian look. All three woods are extremely durable and develop beautiful patina over time.",
    },
    {
      question: "Are Scandinavian bed frames good for small bedrooms?",
      answer:
        "Yes — Scandinavian design is particularly well-suited to smaller spaces. The clean lines and lower profiles create a sense of openness, while the warm wood adds warmth without visual heaviness. A Scandinavian bed frame with tapered legs allows light to flow underneath, making the room feel larger.",
    },
    {
      question: "How long does a handcrafted Scandinavian bed frame last?",
      answer:
        "A solid hardwood Scandinavian bed frame built with traditional joinery will last 50 years or more with proper care. Unlike mass-produced frames with dowel joints and particleboard, our frames use mortise-and-tenon construction that actually tightens with use. These are pieces you can hand down to the next generation.",
    },
  ],
};
