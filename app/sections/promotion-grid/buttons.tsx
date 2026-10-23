import type { RefObject } from "react";
import { createSchema, type SectionComponentProps } from "~/page-builder";

interface ButtonItemsProps extends SectionComponentProps {
  gap: number;
}

const PromotionItemButtons = ({
  ref,
  ...props
}: ButtonItemsProps & { ref?: RefObject<HTMLDivElement | null> }) => {
  const { gap, children, ...rest } = props;
  return (
    <div ref={ref} {...rest} className="mt-3 flex" style={{ gap: `${gap}px` }}>
      {children}
    </div>
  );
};

export default PromotionItemButtons;

export const schema = createSchema({
  type: "promotion-item--buttons",
  title: "Buttons",
  settings: [
    {
      group: "Buttons",
      inputs: [
        {
          type: "range",
          name: "gap",
          label: "Gap",
          defaultValue: 12,
          configs: {
            min: 10,
            max: 30,
            step: 1,
            unit: "px",
          },
        },
      ],
    },
  ],
  childTypes: ["button"],
});
