import { createSchema, type HydrogenComponentProps } from "@weaverse/hydrogen";
import type { VariantProps } from "class-variance-authority";
import { cva } from "class-variance-authority";
import { forwardRef } from "react";
import type { SectionProps } from "~/components/section";
import { layoutInputs, Section } from "~/components/section";

export interface HighlightsProps extends VariantProps<typeof variants> {
  backgroundColor?: string;
}

let variants = cva("w-full", {
  variants: {
    alignment: {
      left: "text-left",
      center: "text-center",
      right: "text-right",
    },
  },
  defaultVariants: {
    alignment: "center",
  },
});

let Highlights = forwardRef<HTMLElement, HighlightsProps & SectionProps>(
  (props, ref) => {
    let { children, backgroundColor = "#FFFFFF", alignment, ...rest } = props;

    return (
      <Section
        ref={ref}
        {...rest}
        className={variants({ alignment })}
        style={{ backgroundColor }}
      >
        <div
          style={{
            backgroundColor,
            borderRadius: "0px 40px 40px 40px",
            paddingTop: "5rem",
            paddingBottom: "5rem",
          }}
        >
          <div className="mx-auto grid max-w-7xl grid-cols-1 items-center justify-center gap-4 border border-[#A79D95] md:grid-cols-3">
            {children}
          </div>
        </div>
      </Section>
    );
  },
);

export default Highlights;

export let schema = createSchema({
  type: "highlights",
  title: "Highlights",
  settings: [
    {
      group: "Layout",
      inputs: layoutInputs.filter(
        (inp) => inp.name !== "divider" && inp.name !== "borderRadius",
      ),
    },
    {
      group: "Colors",
      inputs: [
        {
          type: "color",
          name: "backgroundColor",
          label: "Background Color",
          defaultValue: "#FFFFFF",
        },
      ],
    },
  ],
  childTypes: ["highlights-badge", "subheading", "paragraph"],
  presets: {
    alignment: "center",
    backgroundColor: "#FFFFFF",
    children: [
      {
        type: "highlights-badge",
        iconType: "circle",
        badgeTextColor: "#29231E",
        headingContent: "Handcrafted in Ohio",
        showBorder: true,
        children: [
          {
            type: "paragraph",
            content:
              "Every piece built by skilled Amish artisans using time-honored techniques.",
            color: "#29231E",
          },
        ],
      },
      {
        type: "highlights-badge",
        iconType: "square",
        badgeTextColor: "#29231E",
        headingContent: "Solid Hardwood",
        showBorder: true,
        children: [
          {
            type: "paragraph",
            content: "Domestic-sourced lumber, built to last for generations.",
            color: "#29231E",
          },
        ],
      },
      {
        type: "highlights-badge",
        iconType: "triangle",
        badgeTextColor: "#29231E",
        headingContent: "Custom Orders",
        showBorder: false,
        children: [
          {
            type: "paragraph",
            content:
              "Personalize any piece to fit your space — choose your wood, finish, and dimensions.",
            color: "#29231E",
          },
        ],
      },
    ],
  },
});
