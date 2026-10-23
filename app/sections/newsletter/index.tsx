import type { RefObject } from "react";
import type { SectionProps } from "~/components/section";
import { Section, sectionSettings } from "~/components/section";
import { createSchema } from "~/page-builder";

type NewsLetterProps = SectionProps;

const NewsLetter = ({
  ref,
  ...props
}: NewsLetterProps & { ref?: RefObject<HTMLElement | null> }) => {
  const { children, ...rest } = props;
  return (
    <Section ref={ref} {...rest}>
      {children}
    </Section>
  );
};

export default NewsLetter;

export const schema = createSchema({
  type: "newsletter",
  title: "Newsletter",
  settings: sectionSettings,
  childTypes: ["subheading", "heading", "paragraph", "newsletter-form"],
  presets: {
    gap: 20,
    children: [
      {
        type: "heading",
        content: "Join the ModernCre8ve Family",
      },
      {
        type: "paragraph",
        content:
          "Be the first to know about new designs, exclusive offers, and behind-the-scenes looks at our workshop.",
      },
      { type: "newsletter-form" },
    ],
  },
});
