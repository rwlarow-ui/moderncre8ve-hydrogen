import { createSchema } from "@weaverse/hydrogen";
import { forwardRef, useState } from "react";
import { useLoaderData } from "react-router";
import type { SectionProps } from "~/components/section";
import { Section } from "~/components/section";
import { collectionFaqs } from "~/utils/collection-faqs";

interface CollectionFaqProps extends SectionProps {
  heading: string;
  headingSize: "h2" | "h3" | "h4";
  maxQuestions: number;
}

const CollectionFaq = forwardRef<HTMLElement, CollectionFaqProps>(
  (props, ref) => {
    const { heading = "Frequently Asked Questions", headingSize = "h2", maxQuestions = 10, ...rest } = props;
    const loaderData = useLoaderData<any>();
    const collection = loaderData?.collection;
    const handle = collection?.handle ?? "";
    const faqs = collectionFaqs[handle];

    if (!faqs?.length) return null;

    const displayFaqs = faqs.slice(0, maxQuestions);
    const HeadingTag = headingSize;

    return (
      <Section ref={ref} {...rest}>
        <div className="mx-auto w-full max-w-4xl px-4 py-8 md:py-12">
          <HeadingTag className="mb-8 text-center font-sans text-2xl font-semibold tracking-tight md:text-3xl">
            {heading}
          </HeadingTag>
          <div className="divide-y divide-gray-200">
            {displayFaqs.map((faq, index) => (
              <FaqItem
                key={`${handle}-faq-${index}`}
                question={faq.question}
                answer={faq.answer}
                defaultOpen={index === 0}
              />
            ))}
          </div>
        </div>
      </Section>
    );
  },
);

function FaqItem({
  question,
  answer,
  defaultOpen = false,
}: {
  question: string;
  answer: string;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="py-4">
      <button
        type="button"
        className="flex w-full items-center justify-between text-left"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
      >
        <span className="pr-4 font-sans text-base font-medium text-gray-900 md:text-lg">
          {question}
        </span>
        <span
          className="flex-shrink-0 text-gray-400 transition-transform duration-200"
          style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)" }}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </span>
      </button>
      {open && (
        <div className="mt-3 pr-8 font-serif text-sm leading-relaxed text-gray-600 md:text-base">
          {answer}
        </div>
      )}
    </div>
  );
}

export default CollectionFaq;

export const schema = createSchema({
  type: "collection-faq",
  title: "Collection FAQ",
  limit: 1,
  enabledOn: {
    pages: ["COLLECTION"],
  },
  settings: [
    {
      group: "Content",
      inputs: [
        {
          type: "text",
          name: "heading",
          label: "Heading",
          defaultValue: "Frequently Asked Questions",
          placeholder: "FAQ section heading",
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
        },
        {
          type: "range",
          name: "maxQuestions",
          label: "Max questions",
          defaultValue: 10,
          configs: {
            min: 1,
            max: 20,
            step: 1,
          },
        },
      ],
    },
  ],
});
