import { createSchema, type HydrogenComponentProps } from "@weaverse/hydrogen";
import { forwardRef } from "react";

interface GuaranteeItemProps extends HydrogenComponentProps {
  iconType: "shield" | "refresh" | "heart" | "check";
  title: string;
  description: string;
  accentColor?: string;
  textColor?: string;
}

const GuaranteeItem = forwardRef<HTMLDivElement, GuaranteeItemProps>(
  (props, ref) => {
    const {
      iconType = "shield",
      title = "Guarantee",
      description = "Description of this guarantee.",
      accentColor = "#2CBF96",
      textColor = "#323640",
      ...rest
    } = props;

    const renderIcon = () => {
      const iconProps = {
        width: 36,
        height: 36,
        viewBox: "0 0 24 24",
        fill: "none",
        stroke: accentColor,
        strokeWidth: 1.5,
        strokeLinecap: "round" as const,
        strokeLinejoin: "round" as const,
      };

      switch (iconType) {
        case "shield":
          return (
            <svg xmlns="http://www.w3.org/2000/svg" {...iconProps}>
              <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
              <path d="m9 12 2 2 4-4" />
            </svg>
          );
        case "refresh":
          return (
            <svg xmlns="http://www.w3.org/2000/svg" {...iconProps}>
              <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
              <path d="M21 3v5h-5" />
              <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
              <path d="M8 16H3v5" />
            </svg>
          );
        case "heart":
          return (
            <svg xmlns="http://www.w3.org/2000/svg" {...iconProps}>
              <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
            </svg>
          );
        case "check":
          return (
            <svg xmlns="http://www.w3.org/2000/svg" {...iconProps}>
              <circle cx="12" cy="12" r="10" />
              <path d="m9 12 2 2 4-4" />
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
        className="flex flex-col items-center px-6 py-8 text-center"
      >
        {/* Icon */}
        <div className="mb-4">{renderIcon()}</div>

        {/* Title */}
        <h3
          className="mb-2 font-sans text-base font-semibold uppercase tracking-wide"
          style={{ color: textColor }}
        >
          {title}
        </h3>

        {/* Description */}
        <p
          className="max-w-xs font-serif text-sm leading-relaxed"
          style={{ color: `${textColor}bb` }}
        >
          {description}
        </p>
      </div>
    );
  },
);

export default GuaranteeItem;

export const schema = createSchema({
  type: "guarantee-item",
  title: "Guarantee Item",
  limit: 4,
  settings: [
    {
      group: "Content",
      inputs: [
        {
          type: "select",
          name: "iconType",
          label: "Icon",
          configs: {
            options: [
              { value: "shield", label: "Shield (Warranty)" },
              { value: "refresh", label: "Refresh (Returns)" },
              { value: "heart", label: "Heart (Integrity)" },
              { value: "check", label: "Checkmark (Quality)" },
            ],
          },
          defaultValue: "shield",
        },
        {
          type: "text",
          name: "title",
          label: "Title",
          defaultValue: "Guarantee",
        },
        {
          type: "textarea",
          name: "description",
          label: "Description",
          defaultValue: "Description of this guarantee.",
        },
      ],
    },
    {
      group: "Colors",
      inputs: [
        {
          type: "color",
          name: "accentColor",
          label: "Icon color",
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
    iconType: "shield",
    title: "Lifetime Structural Warranty",
    description:
      "Every joint, every frame — guaranteed for life against defects in materials and workmanship.",
    accentColor: "#2CBF96",
    textColor: "#323640",
  },
});
