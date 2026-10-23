import type { RefObject } from "react";
import { layoutInputs, Section, type SectionProps } from "~/components/section";
import type { ComponentSchema } from "~/page-builder";

type BeforeAndAfterProps = SectionProps;

const BeforeAndAfter = ({
  ref,
  ...props
}: BeforeAndAfterProps & { ref?: RefObject<HTMLElement | null> }) => {
  let { children, ...rest } = props;
  return (
    <Section ref={ref} {...rest}>
      {children}
    </Section>
  );
};

export default BeforeAndAfter;

export let schema: ComponentSchema = {
  type: "before-and-after",
  title: "Before & after",
  // toolbar: ['general-settings', ['duplicate', 'delete']],
  settings: [
    {
      group: "Layout",
      inputs: layoutInputs.filter(
        ({ name }) => name !== "divider" && name !== "borderRadius",
      ),
    },
  ],
  childTypes: [
    "heading",
    "subheading",
    "paragraph",
    "button",
    "before-after-slider",
  ],
  presets: {
    children: [
      {
        type: "heading",
        content: "Before & After",
      },
      {
        type: "before-after-slider",
      },
    ],
  },
};
