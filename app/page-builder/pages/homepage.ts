import type { PageDefinition } from "../types";

export const homepage: PageDefinition = {
  rootId: "home-root",
  items: [
    {
      id: "home-root",
      type: "main",
      children: [
        {
          id: "home-slideshow",
        },
        {
          id: "home-highlights",
        },
        {
          id: "home-featured",
        },
        {
          id: "home-reviews",
        },
        {
          id: "home-collections",
        },
        {
          id: "home-iwt-about",
        },
        {
          id: "home-video",
        },
        {
          id: "home-newsletter",
        },
      ],
    },
    {
      id: "home-slideshow",
      type: "slideshow",
      children: [
        {
          id: "home-slide-1",
        },
        {
          id: "home-slide-2",
        },
        {
          id: "home-slide-3",
        },
      ],
      data: {
        height: "full",
        effect: "fade",
        autoRotate: true,
        changeSlidesEvery: 6,
        loop: true,
        showArrows: false,
        showDots: true,
      },
    },
    {
      id: "home-slide-1",
      type: "slideshow-slide",
      data: {
        headingTagName: "h1",
        headingContent: "Handcrafted Mid-Century Modern Furniture",
        subheadingContent: "Furniture for People Who Notice",
        paragraphContent:
          "Every piece is designed in Cleveland and built by hand from American hardwood — because good taste deserves real craftsmanship.",
        buttonContent: "Explore the Collection",
        to: "/collections",
        enableOverlay: true,
        overlayOpacity: 40,
        backgroundImage: "/images/heroes/hero-credenza-lifestyle.jpg",
        variant: "custom",
        backgroundColor: "#00000000",
        textColor: "#fff",
        borderColor: "#fff",
        backgroundColorHover: "#fff",
        textColorHover: "#000",
        borderColorHover: "#fff",
      },
    },
    {
      id: "home-slide-2",
      type: "slideshow-slide",
      data: {
        headingTagName: "h2",
        headingContent: "Solid Wood Dining Tables — Built for Generations",
        subheadingContent:
          "Mid-Century. Solid Walnut. Built for the Long Haul.",
        paragraphContent:
          "Designed to anchor your home for decades — not just pass through it.",
        buttonContent: "Shop Dining Tables",
        to: "/collections/mid-century-modern-dining-tables",
        enableOverlay: true,
        overlayOpacity: 40,
        backgroundImage: "/images/heroes/hero-oval-dining-table.jpg",
        variant: "custom",
        backgroundColor: "#00000000",
        textColor: "#fff",
        borderColor: "#fff",
        backgroundColorHover: "#fff",
        textColorHover: "#000",
        borderColorHover: "#fff",
      },
    },
    {
      id: "home-slide-3",
      type: "slideshow-slide",
      data: {
        headingTagName: "h2",
        headingContent: "Scandinavian & Japandi Design Furniture",
        subheadingContent: "For Spaces That Breathe",
        paragraphContent:
          "Minimal lines and warm hardwoods — furniture that makes a room feel finished, not filled.",
        buttonContent: "View Scandinavian Collection",
        to: "/collections/scandinavian-design-furniture",
        enableOverlay: true,
        overlayOpacity: 40,
        backgroundImage: "/images/heroes/hero-japandi-sideboard.jpg",
        variant: "custom",
        backgroundColor: "#00000000",
        textColor: "#fff",
        borderColor: "#fff",
        backgroundColorHover: "#fff",
        textColorHover: "#000",
        borderColorHover: "#fff",
      },
    },
    {
      id: "home-highlights",
      type: "highlights",
      children: [
        {
          id: "home-badge-1",
        },
        {
          id: "home-badge-2",
        },
        {
          id: "home-badge-3",
        },
      ],
      data: {
        alignment: "center",
        backgroundColor: "#FFFFFF",
      },
    },
    {
      id: "home-badge-1",
      type: "highlights-badge",
      data: {
        iconType: "circle",
        badgeTextColor: "#29231E",
        headingContent: "Designed, Not Decorated",
        content:
          "Every detail is intentional — from the grain direction to the joint. Each piece of mid-century modern furniture is drawn in our Cleveland studio and refined until it’s right.",
        color: "#29231E",
      },
    },
    {
      id: "home-badge-2",
      type: "highlights-badge",
      data: {
        iconType: "square",
        badgeTextColor: "#29231E",
        headingContent: "Real Hardwood, No Shortcuts",
        content:
          "Solid walnut, white oak, maple, and cherry — sourced from American mills. No particle board. No veneer. No MDF. Just real solid wood furniture built to last.",
        color: "#29231E",
      },
    },
    {
      id: "home-badge-3",
      type: "highlights-badge",
      data: {
        iconType: "triangle",
        badgeTextColor: "#29231E",
        headingContent: "Built to Your Specs",
        content:
          "60% of our orders are custom. Dimensions, wood species, finish — handcrafted to order with 12–16 week lead times because quality can’t be rushed.",
        color: "#29231E",
      },
    },
    {
      id: "home-featured",
      type: "featured-products",
      children: [
        {
          id: "home-featured-content",
        },
        {
          id: "home-featured-items",
        },
      ],
    },
    {
      id: "home-featured-content",
      type: "featured-content-products",
      data: {
        displayMode: "vertical",
        contentPosition: "center center",
        headingContent: "Designs Worth the Wait",
        paragraphContent:
          "The pieces our customers keep coming back for — and that never go out of style.",
        buttonContent: "SHOP ALL",
        to: "/collections/best-sellers",
      },
    },
    {
      id: "home-featured-items",
      type: "featured-products-items",
      data: {
        collection: {
          handle: "best-sellers",
        },
        layout: "carousel",
        slidesPerView: 4,
        productsToShow: 8,
      },
    },
    {
      id: "home-reviews",
      type: "review-quotes",
      children: [
        {
          id: "home-review-1",
        },
        {
          id: "home-review-2",
        },
        {
          id: "home-review-3",
        },
      ],
      data: {
        subheading: "Customer Reviews",
        heading: "Worth the Wait, In Their Words",
        backgroundColor: "#F0F0EF",
      },
    },
    {
      id: "home-review-1",
      type: "review-quote",
      data: {
        quote:
          "I looked at about five hundred bed frames and this checked all the boxes. Well worth the wait and exactly as pictured. I'm 100% delighted.",
        author: "Verified Etsy buyer",
        product: "Solid wood bed frame",
        rating: 5,
      },
    },
    {
      id: "home-review-2",
      type: "review-quote",
      data: {
        quote:
          "This table took some time to get to us, but it's gorgeous and just the right size. The craftsmanship is awesome, and it looks just like (or even better than) the images.",
        author: "Verified Etsy buyer",
        product: "Solid wood dining table",
        rating: 5,
      },
    },
    {
      id: "home-review-3",
      type: "review-quote",
      data: {
        quote: "Exquisite design, excellent craftsmanship, quality materials!",
        author: "Verified Etsy buyer",
        product: "",
        rating: 5,
      },
    },
    {
      id: "home-collections",
      type: "feature-collection",
      children: [
        {
          id: "home-collections-content",
        },
        {
          id: "home-collections-items",
        },
      ],
    },
    {
      id: "home-collections-content",
      type: "collection-content-dynamic",
      data: {
        displayMode: "vertical",
        contentPosition: "center center",
        headingContent: "Find Your Style",
        paragraphContent:
          "Mid-century. Scandinavian. Japandi. Explore the collections that define modern living.",
        buttonContent: "VIEW ALL",
        to: "/collections",
      },
    },
    {
      id: "home-collections-items",
      type: "collection-list-dynamic-items",
      data: {
        collections: [
          {
            id: "97332420",
          },
          {
            id: "95565188",
          },
          {
            id: "262749847654",
          },
          {
            id: "94999492",
          },
          {
            id: "449574109483",
          },
          {
            id: "459433967915",
          },
        ],
        layout: "grid",
        gap: 20,
      },
    },
    {
      id: "home-iwt-about",
      type: "image-with-text",
      children: [
        {
          id: "home-iwt-about-images",
        },
        {
          id: "home-iwt-about-content",
        },
      ],
      data: {
        verticalPadding: "none",
        backgroundColor: "#F0F0EF",
        backgroundFor: "content",
      },
    },
    {
      id: "home-iwt-about-images",
      type: "image-with-text--images",
      children: [
        {
          id: "home-iwt-about-image",
        },
      ],
      data: {
        imageAspectRatio: "3/4",
      },
    },
    {
      id: "home-iwt-about-image",
      type: "image-with-text--image",
      data: {
        image: "/images/heroes/dsc_1417-edit.jpg",
        objectFit: "cover",
        borderRadius: 0,
      },
    },
    {
      id: "home-iwt-about-content",
      type: "image-with-text--content",
      children: [
        {
          id: "home-iwt-about-sub",
        },
        {
          id: "home-iwt-about-heading",
        },
        {
          id: "home-iwt-about-paragraph",
        },
        {
          id: "home-iwt-about-button",
        },
      ],
      data: {
        gap: "5",
        contentPosition: "center center",
      },
    },
    {
      id: "home-iwt-about-sub",
      type: "subheading",
      data: {
        content: "The Studio",
      },
    },
    {
      id: "home-iwt-about-heading",
      type: "heading",
      data: {
        content: "Design-Obsessed Since 2013",
        as: "h2",
      },
    },
    {
      id: "home-iwt-about-paragraph",
      type: "paragraph",
      data: {
        content:
          "ModernCre8ve started with a simple belief: great design shouldn’t require a compromise on quality. We design every piece in our Cleveland studio and build with Amish craftsmen who’ve been perfecting their technique for generations. The result is furniture that looks as intentional as it feels.",
      },
    },
    {
      id: "home-iwt-about-button",
      type: "button",
      data: {
        text: "Learn More",
        to: "/pages/about-us",
        variant: "primary",
      },
    },
    {
      id: "home-video",
      type: "video-embed",
      children: [
        {
          id: "home-video-content",
        },
        {
          id: "home-video-item",
        },
      ],
    },
    {
      id: "home-video-content",
      type: "video-embed-content",
      data: {
        displayMode: "vertical",
        contentPosition: "center center",
        headingContent: "From Sketch to Sawdust",
        paragraphContent:
          "See how a design becomes a piece of furniture — from our Cleveland studio to the workshop floor.",
      },
    },
    {
      id: "home-video-item",
      type: "video-embed--item",
      data: {
        size: "large",
        borderRadius: 0,
      },
    },
    {
      id: "home-newsletter",
      type: "newsletter",
      children: [
        {
          id: "home-newsletter-heading",
        },
        {
          id: "home-newsletter-paragraph",
        },
        {
          id: "home-newsletter-form",
        },
      ],
    },
    {
      id: "home-newsletter-heading",
      type: "heading",
      data: {
        content: "Design Notes",
        as: "h2",
      },
    },
    {
      id: "home-newsletter-paragraph",
      type: "paragraph",
      data: {
        content:
          "New designs, material deep-dives, and studio updates — no spam, just substance.",
      },
    },
    {
      id: "home-newsletter-form",
      type: "newsletter-form",
      data: {
        width: 400,
        placeholder: "Enter your email",
        buttonText: "Subscribe",
      },
    },
  ],
};
