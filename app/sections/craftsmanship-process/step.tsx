import { createSchema, type HydrogenComponentProps } from "@weaverse/hydrogen";
import { forwardRef } from "react";

interface CraftsmanshipStepProps extends HydrogenComponentProps {
  stepNumber: string;
  stepTitle: string;
  stepDescription: string;
  iconType: "wood" | "tools" | "finish" | "delivery";
  accentColor?: string;
  textColor?: string;
}

const CraftsmanshipStep = forwardRef<HTMLDivElement, CraftsmanshipStepProps>(
  (props, ref) => {
    const {
      stepNumber = "01",
      stepTitle = "Step Title",
      stepDescription = "Step description goes here.",
      iconType = "wood",
      accentColor = "#2CBF96",
      textColor = "#323640",
      ...rest
    } = props;

    const renderIcon = () => {
      const iconProps = {
        width: 32,
        height: 32,
        viewBox: "0 0 24 24",
        fill: "none",
        stroke: accentColor,
        strokeWidth: 1.5,
        strokeLinecap: "round" as const,
        strokeLinejoin: "round" as const,
      };

      switch (iconType) {
        case "wood":
          return (
            <svg xmlns="http://www.w3.org/2000/svg" {...iconProps}>
              <path d="M12 22v-7" />
              <path d="M17 8v.8A6 6 0 0 1 13.8 20H10.2A6 6 0 0 1 7 8.8V8a5 5 0 1 1 10 0Z" />
            </svg>
          );
        case "tools":
          return (
            <svg xmlns="http://www.w3.org/2000/svg" {...iconProps}>
              <path d="M18 11V6a2 2 0 0 0-2-2a2 2 0 0 0-2 2" />
              <path d="M14 10V4a2 2 0 0 0-2-2a2 2 0 0 0-2 2v2" />
              <path d="M10 10.5V6a2 2 0 0 0-2-2a2 2 0 0 0-2 2v8" />
              <path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 16" />
            </svg>
          );
        case "finish":
          return (
            <svg xmlns="http://www.w3.org/2000/svg" {...iconProps}>
              <path d="M2 12h6" />
              <path d="M22 12h-6" />
              <path d="M12 2v6" />
              <path d="M12 22v-6" />
              <circle cx="12" cy="12" r="4" />
            </svg>
          );
        case "delivery":
          return (
            <svg xmlns="http://www.w3.org/2000/svg" {...iconProps}>
              <path d="M3 9h6V5H3zM12 9h6V5h-6z" />
              <path d="M3 9v10a1 1 0 0 0 1 1h3" />
              <path d="M12 9v10a1 1 0 0 0 1 1h3" />
              <path d="M18 9v10a1 1 0 0 0 1 1h1a1 1 0 0 0 1-1V9" />
              <path d="M3 9l-1-4h20l-1 4" />
            </svg>
          );
        default:
          return null;
      }
    };

    return (
      <div
        ref={ref}
        {...rest}
        className="relative flex flex-col items-center px-6 py-8 text-center"
      >
        {/* Step number */}
        <span
          className="mb-3 font-sans text-sm font-semibold uppercase tracking-widest"
          style={{ color: accentColor }}
        >
          Step {stepNumber}
        </span>

        {/* Icon */}
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full border border-current/10">
          {renderIcon()}
        </div>

        {/* Title */}
        <h3
          className="mb-2 font-sans text-lg font-medium uppercase tracking-wide"
          style={{ color: textColor }}
        >
          {stepTitle}
        </h3>

        {/* Description */}
        <p
          className="font-serif text-sm leading-relaxed"
          style={{ color: `${textColor}bb` }}
        >
          {stepDescription}
        </p>
      </div>
    );
  },
);

export default CraftsmanshipStep;

export const schema = createSchema({
  type: "craftsmanship-step",
  title: "Process Step",
  limit: 6,
  settings: [
    {
      group: "Content",
      inputs: [
        {
          type: "text",
          name: "stepNumber",
          label: "Step number",
          defaultValue: "01",
          placeholder: "01",
        },
        {
          type: "text",
          name: "stepTitle",
          label: "Title",
          defaultValue: "Step Title",
        },
        {
          type: "textarea",
          name: "stepDescription",
          label: "Description",
          defaultValue: "Describe this step of the process.",
        },
        {
          type: "select",
          name: "iconType",
          label: "Icon",
          configs: {
            options: [
              { value: "wood", label: "Lumber (Tree)" },
              { value: "tools", label: "Craftsmanship (Hand)" },
              { value: "finish", label: "Finishing (Detail)" },
              { value: "delivery", label: "Delivery (Home)" },
            ],
          },
          defaultValue: "wood",
        },
      ],
    },
    {
      group: "Colors",
      inputs: [
        {
          type: "color",
          name: "accentColor",
          label: "Accent color",
          defaultValue: "#2CBF96",
        },
        {
          type: "color",
          name: "textColor",
          label: "Text color",
          defaultValue: "#323640",
        },
      ],
    },
  ],
  presets: {
    stepNumber: "01",
    stepTitle: "Lumber Selection",
    stepDescription:
      "We hand-select domestic hardwoods for grain character and structural integrity.",
    iconType: "wood",
    accentColor: "#2CBF96",
    textColor: "#323640",
  },
});
