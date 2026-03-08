import { createSchema } from "@weaverse/hydrogen";
import { forwardRef } from "react";
import { useLoaderData } from "react-router";
import type { SectionProps } from "~/components/section";
import { Section } from "~/components/section";
import { collectionSeoDescriptions } from "~/utils/collection-seo-descriptions";

interface CollectionSeoBlockProps extends SectionProps {
  showHeading: boolean;
  heading: string;
  headingSize: "h2" | "h3" | "h4";
}

/**
 * Renders the rich SEO description for a collection.
 *
 * Falls back to the collection's `descriptionHtml` from Shopify
 * if no entry exists in the local descriptions map.
 * Also checks for a `custom.seo_rich_description` metafield override.
 */
const CollectionSeoBlock = forwardRef<HTMLElement, CollectionSeoBlockProps>(
  (props, ref) => {
    const {
      showHeading = true,
      heading = "About This Collection",
      headingSize = "h2",
      ...rest
    } = props;
    const loaderData = useLoaderData<any>();
    const collection = loaderData?.collection;
    const handle = collection?.handle ?? "";

    // Priority: metafield > local map > Shopify descriptionHtml
    const metafieldDesc = collection?.seoMetafields?.find(
      (mf: any) => mf?.key === "seo_rich_description",
    )?.value;

    const localDesc = collectionSeoDescriptions[handle]?.rich;
    const shopifyDesc = collection?.descriptionHtml;

    const content = metafieldDesc || localDesc || shopifyDesc;

    if (!content) return null;

    const HeadingTag = headingSize;

    return (
      <Section ref={ref} {...rest}>
        <div className="mx-auto w-full max-w-4xl px-4 py-8 md:py-12">
          {showHeading && (
            <HeadingTag className="mb-6 font-sans font-semibold text-xl tracking-tight md:text-2xl">
              {heading}
            </HeadingTag>
          )}
          {metafieldDesc || localDesc ? (
            <p className="font-serif text-gray-600 text-sm leading-relaxed md:text-base">
              {metafieldDesc || localDesc}
            </p>
          ) : (
            <div
              className="collection-seo-prose font-serif text-gray-600 text-sm leading-relaxed md:text-base [&_p]:mb-4 [&_strong]:font-semibold [&_strong]:text-gray-800"
              dangerouslySetInnerHTML={{ __html: shopifyDesc }}
            />
          )}
        </div>
      </Section>
    );
  },
);

export default CollectionSeoBlock;

export const schema = createSchema({
  type: "collection-seo-block",
  title: "Collection SEO Content",
  limit: 1,
  enabledOn: {
    pages: ["COLLECTION"],
  },
  settings: [
    {
      group: "Content",
      inputs: [
        {
          type: "switch",
          name: "showHeading",
          label: "Show heading",
          defaultValue: true,
        },
        {
          type: "text",
          name: "heading",
          label: "Heading text",
          defaultValue: "About This Collection",
          placeholder: "Section heading",
          condition: "showHeading.eq.true",
        },
        {
          type: "select",
          name: "headingSize",
          label: "Heading tag",
          defaultValue: "h2",
          configs: {
            options: [
              { value: "h2", label: "H2" },
              { value: "h3", label: "H3" },
              { value: "h4", label: "H4" },
            ],
          },
          condition: "showHeading.eq.true",
        },
      ],
    },
  ],
});
