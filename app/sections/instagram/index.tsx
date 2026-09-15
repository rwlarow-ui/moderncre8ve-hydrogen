import { forwardRef } from "react";
import { Section, type SectionProps } from "~/components/section";
import type { ComponentSchema } from "~/page-builder";

const Instagram = forwardRef<HTMLElement, SectionProps>((props, ref) => {
  const { children, ...rest } = props;
  return (
    <Section ref={ref} {...rest}>
      {children}
    </Section>
  );
});

export default Instagram;

export const schema: ComponentSchema = {
  type: "instagram",
  title: "Instagram",
  childTypes: ["instagram--content", "instagram--slider"],
  settings: [
    {
      group: "Instagram",
      inputs: [
        {
          type: "text",
          name: "instagramToken",
          label: "Instagram API token",
          placeholder: "@instagram",
        },
      ],
    },
  ],
};
