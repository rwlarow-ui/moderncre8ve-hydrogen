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
      question:
        "How do I mix mid-century modern furniture with other styles?",
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
};
