import type { PageDefinition } from "../types";

/**
 * Template for `/products/:productHandle`.
 *
 * NOTE: these child ids are referenced by a parent but have no item of their
 * own, so they render nothing — as they did before this composition moved into
 * the repo, where they were nested objects the renderer never registered:
 *   - highlight-1-text
 *   - highlight-2-text
 *   - highlight-3-text
 *   - highlight-4-text
 *   - specs-heading
 *   - specs-subheading
 * Their authored content is in the pull request that introduced this file.
 *
 * Likewise `reviews-index` has type "judgeme-review-index" while the component
 * registers "judgeme-review--index" (two dashes), so it renders nothing. Both
 * quirks predate this file and are preserved rather than silently fixed.
 */
export const defaultProduct: PageDefinition = {
  rootId: "product-root",
  items: [
    {
      id: "product-root",
      type: "main",
      children: [
        {
          id: "product-main",
        },
        {
          id: "product-guarantee",
        },
        {
          id: "product-highlights",
        },
        {
          id: "product-specs",
        },
        {
          id: "product-process",
        },
        {
          id: "product-reviews",
        },
        {
          id: "product-gallery",
        },
        {
          id: "product-related",
        },
      ],
    },
    {
      id: "product-main",
      type: "main-product",
      data: {
        mediaLayout: "grid",
        gridSize: "2x2",
        imageAspectRatio: "adapt",
        showThumbnails: true,
        showDots: true,
        enableZoom: true,
        showBadgesOnProductMedia: true,
        addToCartText: "Add to Cart",
        addBundleToCartText: "Add Bundle to Cart",
        soldOutText: "Sold Out",
        showVendor: false,
        showSalePrice: true,
        showShortDescription: true,
        showShippingPolicy: true,
        showRefundPolicy: true,
        showLeadTime: true,
        leadTimeText:
          "Handcrafted to order. Please allow 12–16 weeks for production and delivery. Custom orders may require additional time.",
      },
    },
    {
      id: "product-guarantee",
      type: "quality-guarantee",
      data: {
        heading: "Our Promise to You",
        backgroundColor: "#ffffff",
        textColor: "#323640",
        accentColor: "#2CBF96",
        borderColor: "#DBD7D1",
      },
      children: [
        {
          id: "guarantee-1",
        },
        {
          id: "guarantee-2",
        },
        {
          id: "guarantee-3",
        },
        {
          id: "guarantee-4",
        },
      ],
    },
    {
      id: "guarantee-1",
      type: "guarantee-item",
      data: {
        iconType: "shield",
        title: "Lifetime Structural Warranty",
        description:
          "Every joint, every frame — guaranteed for life against defects in materials and workmanship. See our full warranty policy for details.",
        accentColor: "#2CBF96",
        textColor: "#323640",
      },
    },
    {
      id: "guarantee-2",
      type: "guarantee-item",
      data: {
        iconType: "refresh",
        title: "30-Day Satisfaction Guarantee",
        description:
          "Live with your piece for a full 30 days. If it doesn’t feel right, we offer exchanges, custom adjustments, or a full refund — your choice.",
        accentColor: "#2CBF96",
        textColor: "#323640",
      },
    },
    {
      id: "guarantee-3",
      type: "guarantee-item",
      data: {
        iconType: "heart",
        title: "Built to Last Generations",
        description:
          "100% solid American hardwood with traditional joinery — mortise-and-tenon, dovetail, and doweled construction. Built to become an heirloom.",
        accentColor: "#2CBF96",
        textColor: "#323640",
      },
    },
    {
      id: "guarantee-4",
      type: "guarantee-item",
      data: {
        iconType: "home",
        title: "White Glove Delivery Included",
        description:
          "Every furniture order ships blanket-wrapped and is delivered directly into your home with full assembly — no boxes, no guesswork.",
        accentColor: "#2CBF96",
        textColor: "#323640",
      },
    },
    {
      id: "product-highlights",
      type: "highlights",
      data: {
        backgroundColor: "#FFFFFF",
      },
      children: [
        {
          id: "highlight-1",
        },
        {
          id: "highlight-2",
        },
        {
          id: "highlight-3",
        },
        {
          id: "highlight-4",
        },
      ],
    },
    {
      id: "highlight-1",
      type: "highlights-badge",
      data: {
        iconType: "circle",
        badgeTextColor: "#29231E",
        headingContent: "Handcrafted in Ohio",
      },
      children: [
        {
          id: "highlight-1-text",
        },
      ],
    },
    {
      id: "highlight-2",
      type: "highlights-badge",
      data: {
        iconType: "square",
        badgeTextColor: "#29231E",
        headingContent: "Solid Hardwood",
      },
      children: [
        {
          id: "highlight-2-text",
        },
      ],
    },
    {
      id: "highlight-3",
      type: "highlights-badge",
      data: {
        iconType: "triangle",
        badgeTextColor: "#29231E",
        headingContent: "Made in the USA",
      },
      children: [
        {
          id: "highlight-3-text",
        },
      ],
    },
    {
      id: "highlight-4",
      type: "highlights-badge",
      data: {
        iconType: "circle",
        badgeTextColor: "#29231E",
        headingContent: "Custom Orders Welcome",
      },
      children: [
        {
          id: "highlight-4-text",
        },
      ],
    },
    {
      id: "product-specs",
      type: "accordion",
      data: {
        accordionLayout: "column",
      },
      children: [
        {
          id: "specs-content-info",
        },
        {
          id: "specs-accordion-group",
        },
      ],
    },
    {
      id: "specs-content-info",
      type: "content-information",
      children: [
        {
          id: "specs-heading",
        },
        {
          id: "specs-subheading",
        },
      ],
    },
    {
      id: "specs-accordion-group",
      type: "accordion-group",
      data: {
        accordionBackgroundColor: "#FAFAF9",
        accordionTextColor: "#323640",
      },
      children: [
        {
          id: "specs-item-1",
        },
        {
          id: "specs-item-2",
        },
        {
          id: "specs-item-3",
        },
        {
          id: "specs-item-4",
        },
      ],
    },
    {
      id: "specs-item-1",
      type: "accordion--item",
      data: {
        title: "Dimensions & Weight",
        content:
          "Dimensions and weight vary by configuration. Select your preferred size above, or contact us for custom sizing. All dimensions are listed in the product description.",
      },
    },
    {
      id: "specs-item-2",
      type: "accordion--item",
      data: {
        title: "Materials & Construction",
        content:
          "Solid domestic hardwood (cherry, walnut, white oak, or maple depending on selection). Traditional joinery throughout — mortise-and-tenon, dovetail, and doweled construction. Finished with catalyzed lacquer or hand-rubbed oil for lasting protection. Zero particle board, zero MDF, zero veneer.",
      },
    },
    {
      id: "specs-item-3",
      type: "accordion--item",
      data: {
        title: "Care & Maintenance",
        content:
          "Dust regularly with a soft, dry cloth. Clean spills promptly with a damp cloth and dry immediately. Avoid placing in direct sunlight for extended periods. For oil-finished pieces, reapply finishing oil every 6–12 months. See our full Assembly & Care guide for detailed instructions.",
      },
    },
    {
      id: "specs-item-4",
      type: "accordion--item",
      data: {
        title: "Delivery & Lead Time",
        content:
          "All furniture is handcrafted to order. Please allow 12–16 weeks for production. Custom orders may require additional time. Your piece ships blanket-wrapped via white glove delivery with in-home assembly included at no extra charge. Wax products ship within 3–5 business days via standard ground.",
      },
    },
    {
      id: "product-process",
      type: "craftsmanship-process",
      data: {
        heading: "Built by Hand, Start to Finish",
        subheading:
          "Every piece follows a deliberate process — from selecting the lumber to the final hand-rubbed finish.",
        backgroundColor: "#F2EBD5",
        textColor: "#323640",
        accentColor: "#2CBF96",
      },
      children: [
        {
          id: "process-step-1",
        },
        {
          id: "process-step-2",
        },
        {
          id: "process-step-3",
        },
        {
          id: "process-step-4",
        },
      ],
    },
    {
      id: "process-step-1",
      type: "craftsmanship-step",
      data: {
        stepNumber: "01",
        stepTitle: "Lumber Selection",
        stepDescription:
          "We hand-select domestic hardwoods — cherry, walnut, white oak, and maple — grading each board for grain character and structural integrity.",
        iconType: "wood",
        accentColor: "#2CBF96",
        textColor: "#323640",
      },
    },
    {
      id: "process-step-2",
      type: "craftsmanship-step",
      data: {
        stepNumber: "02",
        stepTitle: "Joinery & Shaping",
        stepDescription:
          "Amish artisans in Ohio use time-honored joinery techniques — mortise-and-tenon, dovetails, and doweled construction — no shortcuts, no particle board.",
        iconType: "tools",
        accentColor: "#2CBF96",
        textColor: "#323640",
      },
    },
    {
      id: "process-step-3",
      type: "craftsmanship-step",
      data: {
        stepNumber: "03",
        stepTitle: "Sanding & Finishing",
        stepDescription:
          "Each surface is sanded through multiple grits by hand, then finished with catalyzed lacquer or hand-rubbed oil for lasting protection.",
        iconType: "finish",
        accentColor: "#2CBF96",
        textColor: "#323640",
      },
    },
    {
      id: "process-step-4",
      type: "craftsmanship-step",
      data: {
        stepNumber: "04",
        stepTitle: "White Glove Delivery",
        stepDescription:
          "Your piece is blanket-wrapped, shipped with care, and delivered directly into your home with full assembly — no boxes, no guesswork.",
        iconType: "delivery",
        accentColor: "#2CBF96",
        textColor: "#323640",
      },
    },
    {
      id: "product-reviews",
      type: "judgeme-reviews",
      data: {},
      children: [
        {
          id: "reviews-heading",
        },
        {
          id: "reviews-index",
        },
      ],
    },
    {
      id: "reviews-heading",
      type: "heading",
      data: {
        content: "What Our Customers Say",
        as: "h2",
        size: "scale",
        minSize: 24,
        maxSize: 36,
        alignment: "center",
        color: "#323640",
      },
    },
    {
      id: "reviews-index",
      type: "judgeme-review-index",
    },
    {
      id: "product-gallery",
      type: "customer-gallery",
      data: {
        heading: "In Your Home",
        subheading:
          "See how our customers style their ModernCre8ve pieces. Tag @moderncre8ve to be featured.",
        backgroundColor: "#ffffff",
        textColor: "#323640",
        ctaText: "Share Your Space on Instagram",
        ctaUrl: "https://www.instagram.com/moderncre8ve",
      },
      children: [
        {
          id: "gallery-1",
        },
        {
          id: "gallery-2",
        },
        {
          id: "gallery-3",
        },
        {
          id: "gallery-4",
        },
      ],
    },
    {
      id: "gallery-1",
      type: "customer-gallery-item",
      data: {
        caption: "Mid-Century Walnut Credenza",
        customerName: "Sarah M., Chicago",
      },
    },
    {
      id: "gallery-2",
      type: "customer-gallery-item",
      data: {
        caption: "Japandi Dining Table",
        customerName: "Michael T., Austin",
      },
    },
    {
      id: "gallery-3",
      type: "customer-gallery-item",
      data: {
        caption: "Scandinavian Bookshelf",
        customerName: "Emily R., Portland",
      },
    },
    {
      id: "gallery-4",
      type: "customer-gallery-item",
      data: {
        caption: "Modern Console Table",
        customerName: "David L., Denver",
      },
    },
    {
      id: "product-related",
      type: "related-products",
      data: {
        gap: 32,
        content: "Complete Your Space",
      },
    },
  ],
};
