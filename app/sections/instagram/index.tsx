import type { HydrogenComponentSchema } from "@weaverse/hydrogen";
import { forwardRef } from "react";
import { type SectionProps, Section } from "~/components/section";

const Instagram = forwardRef<HTMLElement, SectionProps>((props, ref) => {
  const { children, ...rest } = props;
  return (
    <Section ref={ref} {...rest}>
      {children}
    </Section>
  );
});

export default Instagram;

export const schema: HydrogenComponentSchema = {
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
