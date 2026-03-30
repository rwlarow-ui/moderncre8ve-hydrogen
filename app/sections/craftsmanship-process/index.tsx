import { createSchema } from "@weaverse/hydrogen";
import { forwardRef } from "react";
import type { SectionProps } from "~/components/section";
import { layoutInputs, Section } from "~/components/section";

interface CraftsmanshipProcessProps extends SectionProps {
  heading: string;
  subheading: string;
  backgroundColor: string;
  textColor: string;
  accentColor: string;
}

const CraftsmanshipProcess = forwardRef<
  HTMLElement,
  CraftsmanshipProcessProps
>((props, ref) => {
  const {
    heading = "Built by Hand, Start to Finish",
    subheading = "Every piece follows a deliberate process — from selecting the lumber to the final hand-rubbed finish.",
    backgroundColor = "#F2EBD5",
    textColor = "#323640",
    accentColor = "#2CBF96",
    children,
    ...rest
  } = props;

  return (
    <Section ref={ref} {...rest} style={{ backgroundColor }}>
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="mb-12 text-center" style={{ color: textColor }}>
          <h2 className="mb-4 font-sans text-3xl font-normal uppercase tracking-wide lg:text-4xl">
            {heading}
          </h2>
          <p
            className="mx-auto max-w-2xl font-serif text-base leading-relaxed lg:text-lg"
            style={{ color: `${textColor}cc` }}
          >
            {subheading}
          </p>
        </div>
        <div className="grid grid-cols-1 gap-0 md:grid-cols-4">
          {children}
        </div>
      </div>
    </Section>
  );
});

export default CraftsmanshipProcess;

export const schema = createSchema({
  type: "craftsmanship-process",
  title: "Craftsmanship Process",
  childTypes: ["craftsmanship-step"],
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
          defaultValue: "Built by Hand, Start to Finish",
        },
        {
          type: "textarea",
          name: "subheading",
          label: "Subheading",
          defaultValue:
            "Every piece follows a deliberate process — from selecting the lumber to the final hand-rubbed finish.",
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
          defaultValue: "#F2EBD5",
        },
        {
          type: "color",
          name: "textColor",
          label: "Text",
          defaultValue: "#323640",
        },
        {
          type: "color",
          name: "accentColor",
          label: "Accent (step numbers)",
          defaultValue: "#2CBF96",
        },
      ],
    },
  ],
  presets: {
    heading: "Built by Hand, Start to Finish",
    subheading:
      "Every piece follows a deliberate process — from selecting the lumber to the final hand-rubbed finish.",
    backgroundColor: "#F2EBD5",
    textColor: "#323640",
    accentColor: "#2CBF96",
    children: [
      {
        type: "craftsmanship-step",
        stepNumber: "01",
        stepTitle: "Lumber Selection",
        stepDescription:
          "We hand-select domestic hardwoods — cherry, walnut, white oak, and maple — grading each board for grain character and structural integrity.",
        iconType: "wood",
      },
      {
        type: "craftsmanship-step",
        stepNumber: "02",
        stepTitle: "Joinery & Shaping",
        stepDescription:
          "Amish artisans in Ohio use time-honored joinery techniques — mortise-and-tenon, dovetails, and doweled construction — no shortcuts, no particle board.",
        iconType: "tools",
      },
      {
        type: "craftsmanship-step",
        stepNumber: "03",
        stepTitle: "Sanding & Finishing",
        stepDescription:
          "Each surface is sanded through multiple grits by hand, then finished with catalyzed lacquer or hand-rubbed oil for lasting protection.",
        iconType: "finish",
      },
      {
        type: "craftsmanship-step",
        stepNumber: "04",
        stepTitle: "White Glove Delivery",
        stepDescription:
          "Your piece is blanket-wrapped, shipped with care, and delivered directly into your home with full assembly — no boxes, no guesswork.",
        iconType: "delivery",
      },
    ],
  },
});
