import type { PageDefinition } from "../types";

/**
 * `/pages/request-personal-data` (`/pages/my-personal-data` 301s here, see
 * `app/utils/page-indexing.ts`).
 *
 * Both Shopify pages were created by a GDPR app for the old Liquid theme. Their
 * admin bodies depend on that app's script (the request form's Submit button
 * calls an undefined `sendDataRequest()`, and the data page is one sentence),
 * so on Hydrogen they rendered a form that did nothing and a near-empty page.
 * This composition gives a working route instead: sign in to the account, or
 * email the privacy contact named in the Privacy Policy.
 */
const PRIVACY_EMAIL = "support@moderncre8ve.com";
const link = (href: string, text: string) =>
  `<a href="${href}" class="underline underline-offset-4">${text}</a>`;

const SECTIONS = [
  {
    id: "what",
    heading: "What we hold",
    body: "To make and deliver your order we keep the details you give us at checkout or in your account: your name, email address, phone number, delivery and billing addresses, and your order history. The Privacy Policy sets out everything we collect and why.",
  },
  {
    id: "account",
    heading: "View or update it yourself",
    body: `${link("/account", "Sign in to your account")} to see your orders and change your name, email address or saved addresses at any time.`,
  },
  {
    id: "request",
    heading: "Request a copy, a correction or deletion",
    body: `Email ${link(
      `mailto:${PRIVACY_EMAIL}?subject=Personal%20data%20request`,
      PRIVACY_EMAIL,
    )} from the address you ordered with and tell us what you would like: a copy of your data, a correction, or deletion. We may ask you to confirm your identity before we act on a request. Some records, such as order and payment details, may have to be kept to meet legal and tax obligations.`,
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
        content: "See, correct or delete what we hold about you",
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
        ...SECTIONS.flatMap((s) => [
          { id: `personal-data-${s.id}-heading` },
          { id: `personal-data-${s.id}-body` },
        ]),
        { id: "personal-data-policy" },
      ],
      data: { gap: 20 },
    },
    ...SECTIONS.flatMap((s) => [
      {
        id: `personal-data-${s.id}-heading`,
        type: "heading",
        data: { content: s.heading, as: "h2", alignment: "left" },
      },
      {
        id: `personal-data-${s.id}-body`,
        type: "paragraph",
        data: { content: s.body, alignment: "left", width: "full" },
      },
    ]),
    {
      id: "personal-data-policy",
      type: "paragraph",
      data: {
        content: `Your rights, including those of California residents, and how long we take to respond are set out in our ${link(
          "/policies/privacy-policy",
          "Privacy Policy",
        )}. All of our policies are on the ${link("/pages/legal", "Legal & Policies")} page.`,
        alignment: "left",
        width: "full",
      },
    },
  ],
};
