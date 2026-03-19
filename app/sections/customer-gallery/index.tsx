import { createSchema } from "@weaverse/hydrogen";
import { forwardRef } from "react";
import type { SectionProps } from "~/components/section";
import { layoutInputs, Section } from "~/components/section";

interface CustomerGalleryProps extends SectionProps {
  heading: string;
  subheading: string;
  backgroundColor: string;
  textColor: string;
  ctaText: string;
  ctaUrl: string;
  instagramHandle: string;
}

const CustomerGallery = forwardRef<HTMLElement, CustomerGalleryProps>(
  (props, ref) => {
    const {
      heading = "In Your Home",
      subheading = "See how our customers style their ModernCre8ve pieces. Tag @moderncre8ve to be featured.",
      backgroundColor = "#ffffff",
      textColor = "#323640",
      ctaText = "Share Your Space on Instagram",
      ctaUrl = "https://www.instagram.com/moderncre8ve",
      instagramHandle = "@moderncre8ve",
      children,
      ...rest
    } = props;

    return (
      <Section ref={ref} {...rest} style={{ backgroundColor }}>
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-10 text-center" style={{ color: textColor }}>
            <h2 className="mb-3 font-sans text-3xl font-normal uppercase tracking-wide lg:text-4xl">
              {heading}
            </h2>
            <p
              className="mx-auto max-w-xl font-serif text-base leading-relaxed"
              style={{ color: `${textColor}bb` }}
            >
              {subheading}
            </p>
          </div>

          {/* Photo grid — children are gallery items */}
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
            {children}
          </div>

          {/* CTA */}
          {ctaText && (
            <div className="mt-10 text-center">
              <a
                href={ctaUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 border border-current px-6 py-3 font-sans text-sm uppercase tracking-widest transition-colors hover:bg-[#323640] hover:text-white"
                style={{ color: textColor }}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
                  <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                  <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
                </svg>
                {ctaText}
              </a>
            </div>
          )}
        </div>
      </Section>
    );
  },
);

export default CustomerGallery;

export const schema = createSchema({
  type: "customer-gallery",
  title: "Customer Gallery",
  childTypes: ["customer-gallery-item"],
  settings: [
    {
      group: "Layout",
      inputs: layoutInputs.filter(
        (inp) => inp.name !== "divider" && inp.name !== "borderRadius",
      ),
    },
    {
      group: "Content",
      inputs: [
        {
          type: "text",
          name: "heading",
          label: "Heading",
          defaultValue: "In Your Home",
        },
        {
          type: "textarea",
          name: "subheading",
          label: "Subheading",
          defaultValue:
            "See how our customers style their ModernCre8ve pieces. Tag @moderncre8ve to be featured.",
        },
        {
          type: "text",
          name: "ctaText",
          label: "CTA text",
          defaultValue: "Share Your Space on Instagram",
        },
        {
          type: "text",
          name: "ctaUrl",
          label: "CTA link",
          defaultValue: "https://www.instagram.com/moderncre8ve",
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
          defaultValue: "#ffffff",
        },
        {
          type: "color",
          name: "textColor",
          label: "Text",
          defaultValue: "#323640",
        },
      ],
    },
  ],
  presets: {
    heading: "In Your Home",
    subheading:
      "See how our customers style their ModernCre8ve pieces. Tag @moderncre8ve to be featured.",
    backgroundColor: "#ffffff",
    textColor: "#323640",
    ctaText: "Share Your Space on Instagram",
    ctaUrl: "https://www.instagram.com/moderncre8ve",
    children: [
      {
        type: "customer-gallery-item",
        caption: "Mid-Century Walnut Credenza",
        customerName: "Sarah M., Chicago",
      },
      {
        type: "customer-gallery-item",
        caption: "Japandi Dining Table",
        customerName: "Michael T., Austin",
      },
      {
        type: "customer-gallery-item",
        caption: "Scandinavian Bookshelf",
        customerName: "Emily R., Portland",
      },
      {
        type: "customer-gallery-item",
        caption: "Modern Console Table",
        customerName: "David L., Denver",
      },
    ],
  },
});
