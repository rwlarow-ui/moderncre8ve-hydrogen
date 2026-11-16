import type { PageDefinition } from "../types";

/**
 * `/pages/legal` — a hub linking every policy page. The Shopify page behind
 * this handle has no body, so without a composition it rendered only its title.
 */
const POLICIES = [
  {
    id: "privacy",
    title: "Privacy Policy",
    href: "/policies/privacy-policy",
    summary:
      "What personal information we collect when you browse, order or contact us, how we use it, and the choices you have.",
  },
  {
    id: "terms",
    title: "Terms of Service",
    href: "/policies/terms-of-service",
    summary: "The terms that apply when you use this site and place an order.",
  },
  {
    id: "refund",
    title: "Refund Policy",
    href: "/policies/refund-policy",
    summary:
      "Why made-to-order pieces cannot be cancelled or returned, and how a damaged piece is repaired, replaced or refunded.",
  },
  {
    id: "ordering",
    title: "Order Policies & Guidelines",
    href: "/pages/ordering-policies",
    summary:
      "Payment, lead times, cancellations, warranty and what to do if a piece arrives damaged.",
  },
  {
    id: "shipping",
    title: "Shipping Policy & Customer Responsibilities",
    href: "/pages/shipping-policy-and-customer-responsibilities",
    summary:
      "Delivery methods, inspecting your piece on arrival, scheduling and storage.",
  },
  {
    id: "personal-data",
    title: "Your Personal Data",
    href: "/pages/request-personal-data",
    summary:
      "Request a copy of the personal data we hold about you, or ask us to correct or delete it.",
  },
];

export const legal: PageDefinition = {
  rootId: "legal-root",
  items: [
    {
      id: "legal-root",
      type: "main",
      children: [{ id: "legal-hero" }, { id: "legal-section" }],
    },
    {
      id: "legal-hero",
      type: "hero-image",
      children: [{ id: "legal-hero-sub" }, { id: "legal-hero-heading" }],
      data: {
        height: "small",
        contentPosition: "center center",
        backgroundFit: "cover",
        enableOverlay: true,
        overlayOpacity: 40,
        backgroundImage: "/images/heroes/img_1426_2.jpg",
      },
    },
    {
      id: "legal-hero-sub",
      type: "subheading",
      data: {
        content: "The policies that cover your visit and your order",
        color: "#ffffff",
      },
    },
    {
      id: "legal-hero-heading",
      type: "heading",
      data: {
        content: "Legal & Policies",
        as: "h1",
        color: "#ffffff",
        size: "default",
      },
    },
    {
      id: "legal-section",
      type: "accordion",
      children: [{ id: "legal-info" }],
      data: { accordionLayout: "row" },
    },
    {
      id: "legal-info",
      type: "content-information",
      children: [
        { id: "legal-intro" },
        ...POLICIES.flatMap((p) => [
          { id: `legal-${p.id}-heading` },
          { id: `legal-${p.id}-body` },
        ]),
        { id: "legal-contact" },
      ],
      data: { gap: 20 },
    },
    {
      id: "legal-intro",
      type: "paragraph",
      data: {
        content:
          "Every ModernCre8ve piece is handcrafted to order, so we want the terms behind your purchase to be as clear as the craftsmanship. Each policy below opens in full.",
        alignment: "left",
        width: "full",
      },
    },
    ...POLICIES.flatMap((p) => [
      {
        id: `legal-${p.id}-heading`,
        type: "heading",
        data: { content: p.title, as: "h2", alignment: "left" },
      },
      {
        id: `legal-${p.id}-body`,
        type: "paragraph",
        data: {
          content: `${p.summary} <a href="${p.href}" class="underline underline-offset-4">Read the ${p.title}</a>`,
          alignment: "left",
          width: "full",
        },
      },
    ]),
    {
      id: "legal-contact",
      type: "paragraph",
      data: {
        content:
          'Questions about any of these policies? <a href="/pages/contact-us" class="underline underline-offset-4">Contact us</a> and we will help.',
        alignment: "left",
        width: "full",
      },
    },
  ],
};
