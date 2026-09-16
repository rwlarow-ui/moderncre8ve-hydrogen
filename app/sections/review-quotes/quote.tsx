import { Quotes, Star } from "@phosphor-icons/react";
import { forwardRef } from "react";
import { createSchema, type SectionComponentProps } from "~/page-builder";

interface ReviewQuoteProps extends SectionComponentProps {
  quote: string;
  author: string;
  product: string;
  rating: number;
  accentColor?: string;
  textColor?: string;
}

const ReviewQuote = forwardRef<HTMLDivElement, ReviewQuoteProps>(
  (props, ref) => {
    const {
      quote = "",
      author = "Verified buyer",
      product = "",
      rating = 5,
      accentColor = "#2CBF96",
      textColor = "#323640",
      ...rest
    } = props;

    // `rating` comes from a 1–5 range input; clamp so a stray value can't
    // render hundreds of stars (or a negative-length array).
    const starCount = Math.max(0, Math.min(5, Math.round(rating)));

    return (
      <figure
        ref={ref}
        {...rest}
        className="flex h-full flex-col gap-4 bg-white px-6 py-8 sm:px-8"
      >
        {starCount > 0 && (
          <div
            className="flex gap-0.5"
            aria-label={`${starCount} out of 5 stars`}
          >
            {Array.from({ length: starCount }, (_, index) => (
              <Star
                key={index}
                size={18}
                weight="fill"
                fill={accentColor}
                aria-hidden="true"
              />
            ))}
          </div>
        )}

        <Quotes
          size={28}
          className="rotate-180"
          style={{ color: `${textColor}55` }}
          aria-hidden="true"
        />

        <blockquote
          className="flex-1 font-serif text-base leading-relaxed"
          style={{ color: textColor }}
        >
          {quote}
        </blockquote>

        <figcaption
          className="font-sans text-sm uppercase tracking-wide"
          style={{ color: `${textColor}bb` }}
        >
          {author}
          {product && (
            <span className="mt-1 block normal-case tracking-normal opacity-80">
              {product}
            </span>
          )}
        </figcaption>
      </figure>
    );
  },
);

export default ReviewQuote;

export const schema = createSchema({
  type: "review-quote",
  title: "Review Quote",
  limit: 6,
  settings: [
    {
      group: "Content",
      inputs: [
        {
          type: "textarea",
          name: "quote",
          label: "Quote",
          defaultValue:
            "Exquisite design, excellent craftsmanship, quality materials!",
          helpText: "Use the customer's own words — don't paraphrase.",
        },
        {
          type: "text",
          name: "author",
          label: "Attribution",
          defaultValue: "Verified Etsy buyer",
          placeholder: "First name, or 'Verified Etsy buyer'",
        },
        {
          type: "text",
          name: "product",
          label: "Product purchased",
          defaultValue: "",
          placeholder: "Walnut Platform Bed",
        },
        {
          type: "range",
          name: "rating",
          label: "Star rating",
          defaultValue: 5,
          configs: {
            min: 1,
            max: 5,
            step: 1,
          },
        },
      ],
    },
    {
      group: "Colors",
      inputs: [
        {
          type: "color",
          name: "accentColor",
          label: "Star color",
          defaultValue: "#2CBF96",
        },
        {
          type: "color",
          name: "textColor",
          label: "Text color",
          defaultValue: "#323640",
        },
      ],
    },
  ],
  presets: {
    quote: "Exquisite design, excellent craftsmanship, quality materials!",
    author: "Verified Etsy buyer",
    product: "",
    rating: 5,
    accentColor: "#2CBF96",
    textColor: "#323640",
  },
});
