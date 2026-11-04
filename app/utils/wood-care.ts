/**
 * Product-page content for wood-care products (productClass "housewares").
 *
 * Every claim here restates the product's own Shopify description (owner
 * copy, Admin → Products → Lareaux's Furniture Wax) or its `custom.shipping_works`
 * metafield. Add nothing that isn't stated there. The same FAQ list renders
 * on the page and in the FAQPage JSON-LD, so the two can't drift.
 *
 * Keyed by product handle: a wood-care product without an entry just gets the
 * shared template, minus the furniture-only sections.
 */

export interface WoodCareStep {
  title: string;
  description: string;
  iconType: "wood" | "tools" | "finish" | "delivery";
}

export interface WoodCareFaq {
  question: string;
  answer: string;
}

export interface WoodCareContent {
  /** Without the "| ModernCre8ve" suffix: the title template adds it. */
  seoTitle: string;
  /** At most 155 characters. */
  seoDescription: string;
  /** Business days from order to shipment (shown copy says "3–5 business days"). */
  handlingDays: { min: number; max: number };
  howTo: { heading: string; subheading: string; steps: WoodCareStep[] };
  faqHeading: string;
  faq: WoodCareFaq[];
}

export const WOOD_CARE_CONTENT: Record<string, WoodCareContent> = {
  "lareauxs-furniture-wax": {
    seoTitle: "Lareaux's Furniture Wax for Solid Wood, 8 oz",
    seoDescription:
      "Beeswax, carnauba and orange oil paste wax that cleans, conditions and protects wood furniture. 8 oz tin. Ships in 3–5 business days.",
    handlingDays: { min: 3, max: 5 },
    howTo: {
      heading: "How to Use",
      subheading:
        "Apply about once a month. At that rate, one 8 oz tin lasts about a year per piece.",
      steps: [
        {
          title: "Apply",
          description:
            "Apply liberally, working in the direction of the grain.",
          iconType: "finish",
        },
        {
          title: "Wait",
          description: "Let the wax sit for 10 minutes.",
          iconType: "wood",
        },
        {
          title: "Buff",
          description:
            "Buff back the excess with a clean cloth, again in the direction of the grain.",
          iconType: "tools",
        },
      ],
    },
    faqHeading: "Furniture Wax FAQ",
    faq: [
      {
        question: "What is Lareaux's Furniture Wax?",
        answer:
          "A paste wax that cleans, conditions and protects wood furniture and adds luster and shine. It's made with beeswax, carnauba wax and orange oil, and was developed in-house at ModernCre8ve.",
      },
      {
        question: "What can I use it on?",
        answer:
          "Finished and unfinished wood: raw and reclaimed wood, antiques, milk paint, and mid-century or modern furniture.",
      },
      {
        question: "What does it protect against?",
        answer:
          "It increases moisture resistance and helps protect wood against moisture, spills and cracking.",
      },
      {
        question: "How often should I apply it?",
        answer:
          "About once a month. At that rate, an 8 oz tin lasts about a year for one piece, such as a bed or a dining table.",
      },
      {
        question: "How fast does it ship?",
        answer:
          "It isn't made to order: it ships within 3–5 business days by standard ground, separately from any furniture in your order. You'll get a tracking number by email when it ships.",
      },
    ],
  },
};

export function woodCareContent(
  handle: string | null | undefined,
): WoodCareContent | undefined {
  return handle ? WOOD_CARE_CONTENT[handle] : undefined;
}
