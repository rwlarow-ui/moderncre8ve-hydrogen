import type { RefObject } from "react";
import type { SectionProps } from "~/components/section";
import { layoutInputs, Section } from "~/components/section";
import { createSchema } from "~/page-builder";

interface QualityGuaranteeProps extends SectionProps {
  heading: string;
  backgroundColor: string;
  textColor: string;
  accentColor: string;
  borderColor: string;
}

const QualityGuarantee = ({
  ref,
  ...props
}: QualityGuaranteeProps & { ref?: RefObject<HTMLElement | null> }) => {
  const {
    heading = "Our Promise to You",
    backgroundColor = "#ffffff",
    textColor = "#323640",
    accentColor = "#2CBF96",
    borderColor = "#DBD7D1",
    children,
    ...rest
  } = props;

  return (
    <Section ref={ref} {...rest} style={{ backgroundColor }}>
      <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
        {heading && (
          <h2
            className="mb-8 text-center font-normal font-sans text-2xl uppercase tracking-wide lg:text-3xl"
            style={{ color: textColor }}
          >
            {heading}
          </h2>
        )}
        <div
          className="grid grid-cols-1 gap-0 divide-y md:grid-cols-3 md:gap-0 md:divide-x md:divide-y-0"
          style={{ borderColor }}
        >
          {children}
        </div>
      </div>
    </Section>
  );
};

export default QualityGuarantee;

export const schema = createSchema({
  type: "quality-guarantee",
  title: "Quality Guarantee",
  childTypes: ["guarantee-item"],
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
          defaultValue: "Our Promise to You",
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
          defaultValue: "#ffffff",
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
          label: "Accent",
          defaultValue: "#2CBF96",
        },
        {
          type: "color",
          name: "borderColor",
          label: "Divider",
          defaultValue: "#DBD7D1",
        },
      ],
    },
  ],
  presets: {
    heading: "Our Promise to You",
    backgroundColor: "#ffffff",
    textColor: "#323640",
    accentColor: "#2CBF96",
    children: [
      {
        type: "guarantee-item",
        iconType: "shield",
        title: "1-Year Warranty",
        description:
          "Every piece is covered for one year from delivery against defects in materials and workmanship. If one turns up, we’ll repair or replace it.",
      },
      {
        type: "guarantee-item",
        iconType: "check",
        title: "Inspect on Delivery",
        description:
          "Check your piece when it arrives and note any damage with the delivery team. Spot something after they leave? Email us photos within 72 hours and we’ll coordinate a repair or replacement.",
      },
      {
        type: "guarantee-item",
        iconType: "heart",
        title: "Handcrafted with Integrity",
        description:
          "Solid American hardwoods, traditional joinery, zero particle board. Built to become an heirloom.",
      },
    ],
  },
});
