import type { RefObject } from "react";
import type { SectionProps } from "~/components/section";
import { layoutInputs, Section } from "~/components/section";
import { createSchema } from "~/page-builder";

type PromotionGridProps = SectionProps;

const PromotionGrid = ({
  ref,
  ...props
}: PromotionGridProps & { ref?: RefObject<HTMLElement | null> }) => {
  const { children, ...rest } = props;
  return (
    <Section ref={ref} {...rest}>
      {children}
    </Section>
  );
};

export default PromotionGrid;

export const schema = createSchema({
  type: "promotion-grid",
  title: "Promotion grid",
  settings: [{ group: "Layout", inputs: layoutInputs }],
  childTypes: ["grid-items", "promotion-grid-content"],
  presets: {
    children: [
      { type: "promotion-grid-content" },
      {
        type: "grid-items",
      },
    ],
  },
});
