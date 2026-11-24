import type { PageDefinition } from "../types";

/**
 * `/pages/my-personal-data` and `/pages/request-personal-data` — what personal
 * data we hold and how to see, correct or delete it.
 *
 * Both Shopify pages were authored by a Liquid-era GDPR app: their bodies are
 * markup for that app's script (a loader that never resolves, and a form whose
 * submit handler is undefined), which never loads on Hydrogen. Requests go to
 * the store's main inbox instead (the Privacy Policy still names support@).
 */
const PRIVACY_EMAIL = "info@moderncre8ve.com";
const REQUEST_MAILTO = `mailto:${PRIVACY_EMAIL}?subject=${encodeURIComponent("Personal data request")}`;
const link = (href: string, text: string) =>
  `<a href="${href}" class="underline underline-offset-4">${text}</a>`;

const SECTIONS = [
  {
    id: "what",
    title: "What we hold",
    body: "When you place an order or contact us, we keep what we need to build and deliver your piece: your name, email address and phone number, your shipping and billing addresses, your order history, and any notes about your order or delivery. Payments are processed by Shopify; we never see or store your full card number.",
  },
  {
    id: "why",
    title: "Why we hold it",
    body: "Every piece is handcrafted to order and most are delivered in your home, so we use your details to confirm your order, keep you updated while it is built, schedule delivery and assembly, and support you with care and warranty questions afterwards. If you subscribed to our newsletter, we also use your email address to send it.",
  },
  {
    id: "see",
    title: "See your data",
    body: `If you have an account, ${link("/account", "sign in")} to see your orders, saved addresses and profile details at any time, and to update your name, phone number and addresses yourself.`,
  },
  {
    id: "request",
    title: "Request a copy, a correction or deletion",
    body: `Email ${link(REQUEST_MAILTO, PRIVACY_EMAIL)} from the address you used with us and tell us what you would like: a copy of the personal data we hold about you, a correction, or deletion. We will confirm your identity before acting on the request. We may need to keep some records, such as order and tax records, for as long as the law requires.`,
  },
];

export const personalData: PageDefinition = {
  rootId: "personal-data-root",
  items: [
    {
      id: "personal-data-root",
      type: "main",
      children: [{ id: "personal-data-hero" }, { id: "personal-data-section" }],
    },
    {
      id: "personal-data-hero",
      type: "hero-image",
      children: [
        { id: "personal-data-hero-sub" },
        { id: "personal-data-hero-heading" },
      ],
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
      id: "personal-data-hero-sub",
      type: "subheading",
      data: {
        content: "What we keep, why, and how to access it",
        color: "#ffffff",
      },
    },
    {
      id: "personal-data-hero-heading",
      type: "heading",
      data: {
        content: "Your Personal Data",
        as: "h1",
        color: "#ffffff",
        size: "default",
      },
    },
    {
      id: "personal-data-section",
      type: "accordion",
      children: [{ id: "personal-data-info" }],
      data: { accordionLayout: "row" },
    },
    {
      id: "personal-data-info",
      type: "content-information",
      children: [
        { id: "personal-data-intro" },
        ...SECTIONS.flatMap((s) => [
          { id: `personal-data-${s.id}-heading` },
          { id: `personal-data-${s.id}-body` },
        ]),
        { id: "personal-data-more" },
      ],
      data: { gap: 20 },
    },
    {
      id: "personal-data-intro",
      type: "paragraph",
      data: {
        content:
          "We only collect the personal data we need to make and deliver your furniture, and you can ask to see, correct or delete it at any time.",
        alignment: "left",
        width: "full",
      },
    },
    ...SECTIONS.flatMap((s) => [
      {
        id: `personal-data-${s.id}-heading`,
        type: "heading",
        data: { content: s.title, as: "h2", alignment: "left" },
      },
      {
        id: `personal-data-${s.id}-body`,
        type: "paragraph",
        data: { content: s.body, alignment: "left", width: "full" },
      },
    ]),
    {
      id: "personal-data-more",
      type: "paragraph",
      data: {
        content: `The full details, including your rights under privacy laws such as the CCPA, are in our ${link("/policies/privacy-policy", "Privacy Policy")}. For anything else, ${link("/pages/contact-us", "contact us")}.`,
        alignment: "left",
        width: "full",
      },
    },
  ],
};
