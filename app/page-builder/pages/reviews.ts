import type { PageDefinition } from "../types";

export const reviews: PageDefinition = {
  rootId: "reviews-root",
  items: [
    {
      id: "reviews-root",
      type: "main",
      children: [
        {
          id: "reviews-hero",
        },
        {
          id: "reviews-testimonials",
        },
        {
          id: "reviews-highlights",
        },
      ],
    },
    {
      id: "reviews-hero",
      type: "hero-image",
      children: [
        {
          id: "reviews-hero-sub",
        },
        {
          id: "reviews-hero-heading",
        },
      ],
      data: {
        height: "large",
        contentPosition: "center center",
        backgroundFit: "cover",
        enableOverlay: true,
        overlayOpacity: 40,
        backgroundImage:
          "/images/heroes/20241114_202310_img_2586_4af8f63f-4ad5-4678-af69-b36481707fe1.jpg",
      },
    },
    {
      id: "reviews-hero-sub",
      type: "subheading",
      data: {
        content: "What Our Customers Say About Their Handcrafted Furniture",
        color: "#ffffff",
      },
    },
    {
      id: "reviews-hero-heading",
      type: "heading",
      data: {
        content: "Customer Reviews",
        as: "h1",
        color: "#ffffff",
        size: "default",
      },
    },
    {
      id: "reviews-testimonials",
      type: "testimonial",
      children: [
        {
          id: "reviews-test-1",
        },
        {
          id: "reviews-test-2",
        },
        {
          id: "reviews-test-3",
        },
      ],
    },
    {
      id: "reviews-test-1",
      type: "testimonial--item",
      children: [
        {
          id: "reviews-test-1-content",
        },
        {
          id: "reviews-test-1-hotspot",
        },
      ],
    },
    {
      id: "reviews-test-1-content",
      type: "testimonial--content",
      data: {
        content: "Well Worth the Wait",
        description:
          "I looked at about five hundred bed frames and this checked all the boxes. Well worth the wait and exactly as pictured. I'm 100% delighted.",
        ratting: 5,
        author: "Verified Etsy buyer",
      },
    },
    {
      id: "reviews-test-1-hotspot",
      type: "testimonial--hotspots-item",
      data: {
        image: "/images/heroes/img_1426.jpg",
        aspectRatio: "1/1",
      },
    },
    {
      id: "reviews-test-2",
      type: "testimonial--item",
      children: [
        {
          id: "reviews-test-2-content",
        },
        {
          id: "reviews-test-2-hotspot",
        },
      ],
    },
    {
      id: "reviews-test-2-content",
      type: "testimonial--content",
      data: {
        content: "Better Than the Photos",
        description:
          "This table took some time to get to us, but it's gorgeous and just the right size. The craftsmanship is awesome, and it looks just like (or even better than) the images.",
        ratting: 5,
        author: "Verified Etsy buyer",
      },
    },
    {
      id: "reviews-test-2-hotspot",
      type: "testimonial--hotspots-item",
      data: {
        image: "/images/heroes/img_1524.jpg",
        aspectRatio: "1/1",
      },
    },
    {
      id: "reviews-test-3",
      type: "testimonial--item",
      children: [
        {
          id: "reviews-test-3-content",
        },
        {
          id: "reviews-test-3-hotspot",
        },
      ],
    },
    {
      id: "reviews-test-3-content",
      type: "testimonial--content",
      data: {
        content: "Exquisite Design",
        description:
          "Exquisite design, excellent craftsmanship, quality materials!",
        ratting: 5,
        author: "Verified Etsy buyer",
      },
    },
    {
      id: "reviews-test-3-hotspot",
      type: "testimonial--hotspots-item",
      data: {
        image: "/images/heroes/dsc_1417-edit.jpg",
        aspectRatio: "1/1",
      },
    },
    {
      id: "reviews-highlights",
      type: "highlights",
      children: [
        {
          id: "reviews-badge-1",
        },
        {
          id: "reviews-badge-2",
        },
        {
          id: "reviews-badge-3",
        },
      ],
      data: {
        alignment: "center",
        backgroundColor: "#FFFFFF",
      },
    },
    {
      id: "reviews-badge-1",
      type: "highlights-badge",
      data: {
        iconType: "circle",
        badgeTextColor: "#29231E",
        headingContent: "Amish Craftsmanship",
        color: "#29231E",
      },
    },
    {
      id: "reviews-badge-2",
      type: "highlights-badge",
      data: {
        iconType: "square",
        badgeTextColor: "#29231E",
        headingContent: "Solid Hardwood",
        color: "#29231E",
      },
    },
    {
      id: "reviews-badge-3",
      type: "highlights-badge",
      data: {
        iconType: "triangle",
        badgeTextColor: "#29231E",
        headingContent: "Made in the USA",
        color: "#29231E",
      },
    },
  ],
};
