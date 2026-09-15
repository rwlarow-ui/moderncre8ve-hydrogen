import type { PageDefinition } from "../types";

export const defaultCollection: PageDefinition = {
  rootId: "collection-root",
  items: [
    {
      id: "collection-root",
      type: "main",
      children: [
        {
          id: "collection-filters",
        },
        {
          id: "collection-seo-content",
        },
        {
          id: "collection-faq-section",
        },
      ],
    },
    {
      id: "collection-filters",
      type: "collection-filters",
      data: {
        showBreadcrumb: true,
        showDescription: true,
        showBanner: true,
        bannerHeightDesktop: 350,
        bannerHeightMobile: 200,
        bannerBorderRadius: 0,
        enableSort: true,
        showProductsCount: true,
        enableFilter: true,
        filtersPosition: "sidebar",
        expandFilters: true,
        showFiltersCount: true,
        enableSwatches: true,
        displayAsButtonFor: "Size, More filters",
        productsPerRowDesktop: "2",
        productsPerRowMobile: "1",
        loadPrevText: "Load previous",
        loadMoreText: "Load more products",
      },
    },
    {
      id: "collection-seo-content",
      type: "collection-seo-block",
      data: {
        showHeading: true,
        heading: "About This Collection",
        headingSize: "h2",
      },
    },
    {
      id: "collection-faq-section",
      type: "collection-faq",
      data: {
        heading: "Frequently Asked Questions",
        headingSize: "h2",
        maxQuestions: 10,
      },
    },
  ],
};
