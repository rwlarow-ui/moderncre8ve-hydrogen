import type { PageDefinition, PageItem } from "../types";

/**
 * "Our Story" — the maker narrative behind the pieces (issue #36).
 *
 * TODO: the photos below are the closest craftsmanship shots in the repo. The
 * brief asks for real workshop shots (the 3,600 sq ft floor, the widebelt
 * sander, raw lumber, works in progress). Swap the `image` paths in the story,
 * workshop and process sections once those files are added to
 * `public/images/`.
 */

interface SplitOptions {
  id: string;
  background: string;
  imageFirst: boolean;
  image: string;
  aspect: string;
  eyebrow: string;
  heading: string;
  paragraphs: string[];
  /** Extra content nodes appended after the paragraphs (e.g. a button). */
  extra?: PageItem[];
}

/** An image-with-text band expanded into the flat item list the builder uses. */
function split(o: SplitOptions): PageItem[] {
  const images = `${o.id}-images`;
  const content = `${o.id}-content`;
  const paragraphItems: PageItem[] = o.paragraphs.map((text, i) => ({
    id: `${o.id}-p${i + 1}`,
    type: "paragraph",
    data: { content: text },
  }));
  const extra = o.extra ?? [];
  const ordered = [{ id: images }, { id: content }];
  if (!o.imageFirst) ordered.reverse();
  return [
    {
      id: o.id,
      type: "image-with-text",
      children: ordered,
      data: {
        verticalPadding: "none",
        backgroundColor: o.background,
        backgroundFor: "content",
      },
    },
    {
      id: images,
      type: "image-with-text--images",
      children: [{ id: `${o.id}-image` }],
      data: { imageAspectRatio: o.aspect },
    },
    {
      id: `${o.id}-image`,
      type: "image-with-text--image",
      data: { image: o.image, objectFit: "cover", borderRadius: 0 },
    },
    {
      id: content,
      type: "image-with-text--content",
      children: [
        { id: `${o.id}-sub` },
        { id: `${o.id}-heading` },
        ...paragraphItems.map((p) => ({ id: p.id })),
        ...extra.map((e) => ({ id: e.id })),
      ],
      data: { gap: "5", contentPosition: "center center" },
    },
    {
      id: `${o.id}-sub`,
      type: "subheading",
      data: { content: o.eyebrow },
    },
    {
      id: `${o.id}-heading`,
      type: "heading",
      data: { content: o.heading, as: "h2" },
    },
    ...paragraphItems,
    ...extra,
  ];
}

const SECTIONS = [
  "about-story",
  "about-workshop",
  "about-process",
  "about-giving",
];

export const aboutUs: PageDefinition = {
  rootId: "about-root",
  items: [
    {
      id: "about-root",
      type: "main",
      children: [{ id: "about-hero" }, ...SECTIONS.map((id) => ({ id }))],
    },
    {
      id: "about-hero",
      type: "hero-image",
      children: [{ id: "about-hero-sub" }, { id: "about-hero-heading" }],
      data: {
        height: "large",
        contentPosition: "center center",
        backgroundFit: "cover",
        enableOverlay: true,
        overlayOpacity: 40,
        backgroundImage: "/images/heroes/img_1426_1.jpg",
      },
    },
    {
      id: "about-hero-sub",
      type: "subheading",
      data: { content: "Our Story", color: "#ffffff" },
    },
    {
      id: "about-hero-heading",
      type: "heading",
      data: {
        content: "Handcrafted in Cleveland Since 2013",
        as: "h1",
        color: "#ffffff",
        size: "default",
      },
    },

    // 1. The story
    ...split({
      id: "about-story",
      background: "#F0F0EF",
      imageFirst: true,
      image: "/images/heroes/dsc_1417-edit.jpg",
      aspect: "3/4",
      eyebrow: "Where It Started",
      heading: "Great Design, Honest Materials, Real Craftsmanship",
      paragraphs: [
        "ModernCre8ve was founded in Cleveland, Ohio in 2013 by Robert and Parrish, with a simple belief: great design, honest materials and real craftsmanship belong together.",
        "We sell direct. There are no showrooms, no veneers and no overseas mass production in between, so the quality goes up and the price comes down compared with what you'd pay at retail for the same solid hardwood.",
      ],
    }),

    // 2. The workshop
    ...split({
      id: "about-workshop",
      background: "#FFFFFF",
      imageFirst: false,
      image: "/images/heroes/img_2158.jpg",
      aspect: "3/4",
      eyebrow: "The Workshop",
      heading: "3,600 Square Feet of Wood, Steel and Finish",
      paragraphs: [
        "Every piece is made in our 3,600 sq ft facility, with a $15,000 widebelt sander, and on-site welding and finishing, so the whole build stays under one roof and under our eye.",
        "We partner with Amish craftsmen, and source hardwood directly from local mills in Amish country. Steel comes from Cleveland-area fabricators.",
      ],
    }),

    // 3. The process
    ...split({
      id: "about-process",
      background: "#F0F0EF",
      imageFirst: true,
      image: "/images/heroes/img_1524.jpg",
      aspect: "3/4",
      eyebrow: "The Process",
      heading: "Made to Order, One Piece at a Time",
      paragraphs: [
        "Nothing sits on a shelf waiting for you. Each piece is built to order, one at a time, with custom dimensions and options available.",
        "You'll receive build photos during production, and we stay in hands-on contact with you from first inquiry to white glove delivery.",
      ],
      extra: [
        {
          id: "about-process-button",
          type: "button",
          data: {
            text: "Start a Custom Order",
            to: "/pages/custom-orders",
            variant: "primary",
          },
        },
      ],
    }),

    // 4. Giving back
    ...split({
      id: "about-giving",
      background: "#FFFFFF",
      imageFirst: false,
      image:
        "/images/heroes/20241114_202310_img_2586_4af8f63f-4ad5-4678-af69-b36481707fe1.jpg",
      aspect: "1/1",
      eyebrow: "Giving Back",
      heading: "Making a Difference, However Small",
      paragraphs: [
        "We sponsor children through Save the Children, because a small business can still make a real difference.",
        "“If you think you are too small to make a difference, try sleeping with a mosquito.” — Dalai Lama",
      ],
    }),
  ],
};
