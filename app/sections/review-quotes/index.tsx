import { forwardRef } from "react";
import type { SectionProps } from "~/components/section";
import { layoutInputs, Section } from "~/components/section";
import { createSchema } from "~/page-builder";

interface ReviewQuotesProps extends SectionProps {
  subheading: string;
  heading: string;
  backgroundColor: string;
  textColor: string;
  accentColor: string;
}

const ReviewQuotes = forwardRef<HTMLElement, ReviewQuotesProps>(
  (props, ref) => {
    const {
      subheading = "Customer Reviews",
      heading = "What Owners Say",
      backgroundColor = "#F0F0EF",
      textColor = "#323640",
      accentColor = "#2CBF96",
      children,
      ...rest
    } = props;

    return (
      <Section ref={ref} {...rest} style={{ backgroundColor }}>
        <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
          {(subheading || heading) && (
            <div className="mb-10 text-center">
              {subheading && (
                <p
                  className="mb-2 font-sans text-xs uppercase tracking-[0.2em]"
                  style={{ color: accentColor }}
                >
                  {subheading}
                </p>
              )}
              {heading && (
                <h2
                  className="font-normal font-sans text-2xl uppercase tracking-wide lg:text-3xl"
                  style={{ color: textColor }}
                >
                  {heading}
                </h2>
              )}
            </div>
          )}
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3 lg:gap-8">
            {children}
          </div>
        </div>
      </Section>
    );
  },
);

export default ReviewQuotes;

export const schema = createSchema({
  type: "review-quotes",
  title: "Review Quotes",
  childTypes: ["review-quote"],
  settings: [
    {
      group: "Layout",
      inputs: layoutInputs.filter(
        (inp) => inp.name !== "divider" && inp.name !== "gap",
      ),
    },
    {
      group: "Content",
      inputs: [
        {
          type: "text",
          name: "subheading",
          label: "Subheading",
          defaultValue: "Customer Reviews",
        },
        {
          type: "text",
          name: "heading",
          label: "Heading",
          defaultValue: "What Owners Say",
        },
      ],
    },
    {
      group: "Colors",
      inputs: [
        {
          type: "color",
          name: "backgroundColor",
          label: "Background",
          defaultValue: "#F0F0EF",
        },
        {
          type: "color",
          name: "textColor",
          label: "Text",
          defaultValue: "#323640",
        },
        {
          type: "color",
          name: "accentColor",
          label: "Accent",
          defaultValue: "#2CBF96",
        },
      ],
    },
  ],
  presets: {
    subheading: "Customer Reviews",
    heading: "What Owners Say",
    backgroundColor: "#F0F0EF",
    textColor: "#323640",
    accentColor: "#2CBF96",
    children: [
      {
        type: "review-quote",
        quote:
          "I looked at about five hundred bed frames and this checked all the boxes. Well worth the wait and exactly as pictured. I'm 100% delighted.",
        author: "Verified Etsy buyer",
        product: "Walnut Platform Bed",
        rating: 5,
      },
      {
        type: "review-quote",
        quote:
          "This table took some time to get to us, but it's gorgeous and just the right size. The craftsmanship is awesome, and it looks just like (or even better than) the images.",
        author: "Verified Etsy buyer",
        product: "Solid Wood Dining Table",
        rating: 5,
      },
      {
        type: "review-quote",
        quote: "Exquisite design, excellent craftsmanship, quality materials!",
        author: "Verified Etsy buyer",
        product: "",
        rating: 5,
      },
    ],
  },
});
