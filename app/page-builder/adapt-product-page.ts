import { HOUSEWARES_LEAD_TIME, type ProductClass } from "~/utils/product-class";
import { type WoodCareContent, woodCareContent } from "~/utils/wood-care";
import type { LoadedPageItem, PageData } from "./types";

/**
 * Sections in the shared PRODUCT composition whose copy only holds for
 * Ohio-built furniture: one-year warranty and white glove delivery
 * (`product-guarantee`), "Handcrafted in Ohio / Made in the USA"
 * (`product-highlights`), solid-hardwood / zero-veneer materials and the
 * 12–16 week delivery accordion (`product-specs`), and the Amish build process
 * ending in white glove delivery (`product-process`).
 */
export const FURNITURE_ONLY_SECTIONS = [
  "product-guarantee",
  "product-highlights",
  "product-specs",
  "product-process",
] as const;

/**
 * Tailors the shared PRODUCT composition to what is true for this product.
 * Furniture renders unchanged. Housewares get their 3–5 day shipping line in
 * place of the furniture lead time; imported products get no lead-time line
 * (it is not known here). Both drop the furniture-only sections.
 */
export function adaptProductPage(
  pageData: PageData | null,
  cls: ProductClass,
  handle?: string,
): PageData | null {
  if (!pageData || cls === "furniture") {
    return pageData;
  }

  const drop = new Set<string>(FURNITURE_ONLY_SECTIONS);
  const items = pageData.items
    .filter((item) => !drop.has(item.id))
    .map((item) => {
      if (item.children?.some((child) => drop.has(child.id))) {
        item = {
          ...item,
          children: item.children.filter((child) => !drop.has(child.id)),
        };
      }
      if (item.type === "main-product") {
        item = {
          ...item,
          data: {
            ...item.data,
            ...(cls === "housewares"
              ? { showLeadTime: true, leadTimeText: HOUSEWARES_LEAD_TIME }
              : { showLeadTime: false }),
          },
        };
      }
      return item;
    });

  const content = cls === "housewares" ? woodCareContent(handle) : undefined;
  return content
    ? withWoodCareSections({ ...pageData, items }, content)
    : { ...pageData, items };
}

const ACCENT = "#2CBF96";
const TEXT = "#323640";

/**
 * Page items for a wood-care product's "How to Use" steps and FAQ, from
 * `app/utils/wood-care.ts`, in the same section types the furniture template
 * uses (craftsmanship-process, accordion).
 */
export function woodCareItems(content: WoodCareContent): {
  ids: string[];
  items: LoadedPageItem[];
} {
  const stepIds = content.howTo.steps.map((_, i) => `wood-care-step-${i + 1}`);
  const faqIds = content.faq.map((_, i) => `wood-care-faq-${i + 1}`);
  const items: LoadedPageItem[] = [
    {
      id: "wood-care-how-to",
      type: "craftsmanship-process",
      data: {
        heading: content.howTo.heading,
        subheading: content.howTo.subheading,
        backgroundColor: "#F2EBD5",
        textColor: TEXT,
        accentColor: ACCENT,
      },
      children: stepIds.map((id) => ({ id })),
    },
    ...content.howTo.steps.map((step, i) => ({
      id: stepIds[i],
      type: "craftsmanship-step",
      data: {
        stepNumber: String(i + 1).padStart(2, "0"),
        stepTitle: step.title,
        stepDescription: step.description,
        iconType: step.iconType,
        accentColor: ACCENT,
        textColor: TEXT,
      },
    })),
    {
      id: "wood-care-faq",
      type: "accordion",
      data: { accordionLayout: "column" },
      children: [{ id: "wood-care-faq-info" }, { id: "wood-care-faq-group" }],
    },
    {
      id: "wood-care-faq-info",
      type: "content-information",
      children: [{ id: "wood-care-faq-heading" }],
    },
    {
      id: "wood-care-faq-heading",
      type: "heading",
      data: { content: content.faqHeading, as: "h2", color: TEXT },
    },
    {
      id: "wood-care-faq-group",
      type: "accordion-group",
      data: {
        accordionBackgroundColor: "#FAFAF9",
        accordionTextColor: TEXT,
      },
      children: faqIds.map((id) => ({ id })),
    },
    ...content.faq.map((faq, i) => ({
      id: faqIds[i],
      type: "accordion--item",
      data: { title: faq.question, content: faq.answer },
    })),
  ];
  return { ids: ["wood-care-how-to", "wood-care-faq"], items };
}

/** Inserts the wood-care sections right after the main product block. */
function withWoodCareSections(
  pageData: PageData,
  content: WoodCareContent,
): PageData {
  const { ids, items: extra } = woodCareItems(content);
  const items = pageData.items.map((item) => {
    if (item.id !== pageData.rootId || !item.children) {
      return item;
    }
    const at = item.children.findIndex((c) => c.id === "product-main") + 1;
    const children = [...item.children];
    children.splice(at, 0, ...ids.map((id) => ({ id })));
    return { ...item, children };
  });
  return { ...pageData, items: [...items, ...extra] };
}
