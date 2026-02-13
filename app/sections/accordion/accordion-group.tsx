import * as RadixAccordion from "@radix-ui/react-accordion";
import type {
  HydrogenComponentProps,
  HydrogenComponentSchema,
} from "@weaverse/hydrogen";
import { forwardRef } from "react";
import { useAccordionContext } from "./index";

interface AccordionGroupProps extends HydrogenComponentProps {
  allowMultiple: boolean;
  accordionBackgroundColor: string;
  accordionTextColor: string;
}

const AccordionGroup = forwardRef<HTMLDivElement, AccordionGroupProps>(
  (props, ref) => {
    let { children, accordionBackgroundColor, accordionTextColor, ...rest } =
      props;

    // Get layout from accordion context
    const { layout } = useAccordionContext();

    let style = {
      "--accordion-bg-color": accordionBackgroundColor,
      "--accordion-text-color": accordionTextColor,
    } as React.CSSProperties;

    // Distribute children for row layout
    const childArray = Array.isArray(children) ? children : [children];
    const leftColumn = childArray.filter((_, index) => index % 2 === 0);
    const rightColumn = childArray.filter((_, index) => index % 2 === 1);

    return (
      <div ref={ref} {...rest} style={style}>
        {layout === "row" ? (
          <div key="row-layout" className="grid w-full grid-cols-2 gap-4">
            <RadixAccordion.Root
              type="multiple"
              className="accordion--group flex w-full flex-col gap-4"
            >
              {leftColumn}
            </RadixAccordion.Root>
            <RadixAccordion.Root
              type="multiple"
              className="accordion--group flex w-full flex-col gap-4"
            >
              {rightColumn}
            </RadixAccordion.Root>
          </div>
        ) : (
          <RadixAccordion.Root
            key="column-layout"
            type="multiple"
            className="accordion--group flex w-full flex-col gap-4"
          >
            {children}
          </RadixAccordion.Root>
        )}
      </div>
    );
  },
);

export default AccordionGroup;

export const schema: HydrogenComponentSchema = {
  type: "accordion-group",
  title: "Accordion Group",
  inspector: [
    {
      group: "Accordion settings",
      inputs: [
        {
          type: "color",
          label: "Accordion background color",
          name: "accordionBackgroundColor",
          defaultValue: "#F3F3F3",
        },
        {
          type: "color",
          label: "Accordion text color",
          name: "accordionTextColor",
          defaultValue: "#524B46",
        },
      ],
    },
  ],
  childTypes: ["accordion--item", "subheading", "heading", "paragraph"],
  presets: {
    children: [
      {
        type: "accordion--item",
        title: "How long does shipping take?",
        content:
          "Most items ship within 2-14 business days depending on availability. Custom orders may take longer. We offer in-home delivery with assembly for select items.",
      },
      {
        type: "accordion--item",
        title: "What if my order arrives damaged?",
        content:
          "Please report any damage within 72 hours of delivery. Take photos of the damage and contact us at inquiry@moderncre8ve.com. We will arrange a replacement or repair at no cost to you.",
      },
      {
        type: "accordion--item",
        title: "Do you offer a warranty?",
        content:
          "Yes, all ModernCre8ve furniture comes with a 2-year warranty covering manufacturing defects. Our furniture is built to last for generations with proper care.",
      },
      {
        type: "accordion--item",
        title: "Can I customize my order?",
        content:
          "Absolutely! We offer customization on most pieces — choose your wood species, stain color, and dimensions. Changes can be made before production begins. Contact us to discuss your custom order.",
      },
      {
        type: "accordion--item",
        title: "Do your products require assembly?",
        content:
          "Most of our furniture arrives fully assembled or with minimal assembly required. For larger items like dining tables, we offer in-home delivery and setup. Care instructions are included with every piece.",
      },
    ],
  },
};
