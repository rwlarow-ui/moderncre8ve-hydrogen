import { createSchema, type HydrogenComponentProps } from "@weaverse/hydrogen";
import { forwardRef, useEffect, useState } from "react";
import Heading, {
  type HeadingProps,
  headingInputs,
} from "~/components/heading";

export interface HighlightsBadgeProps
  extends HydrogenComponentProps,
    Omit<HeadingProps, "content"> {
  iconType?: string;
  customIcon?: string;
  badgeTextColor?: string;
  // Heading props
  headingContent?: string;
  headingTagName?: "h1" | "h2" | "h3" | "h4" | "h5" | "h6";
}

let HighlightsBadge = forwardRef<HTMLDivElement, HighlightsBadgeProps>(
  (props, ref) => {
    let {
      children,
      iconType = "circle",
      customIcon = "",
      badgeTextColor = "#29231E",
      // Heading props
      headingContent,
      headingTagName,
      color,
      size,
      mobileSize,
      desktopSize,
      weight,
      letterSpacing,
      alignment,
      minSize,
      maxSize,
      animate,
      ...rest
    } = props;
    const [imageError, setImageError] = useState(false);
    useEffect(() => {
      setImageError(false);
    }, [customIcon]);
    const isInlineSVG = (content: string) => {
      return content.trim().startsWith("<svg");
    };
    const renderIcon = (type: string) => {
      switch (type) {
        case "circle":
          // Hand / Craftsmanship icon
          return (
            <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="40"
                height="40"
                viewBox="0 0 24 24"
                fill="none"
                stroke={badgeTextColor}
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M18 11V6a2 2 0 0 0-2-2a2 2 0 0 0-2 2" />
                <path d="M14 10V4a2 2 0 0 0-2-2a2 2 0 0 0-2 2v2" />
                <path d="M10 10.5V6a2 2 0 0 0-2-2a2 2 0 0 0-2 2v8" />
                <path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 16" />
              </svg>
            </div>
          );
        case "square":
          // Tree / Solid wood icon
          return (
            <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="40"
                height="40"
                viewBox="0 0 24 24"
                fill="none"
                stroke={badgeTextColor}
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 22v-7" />
                <path d="M17 8v.8A6 6 0 0 1 13.8 20H10.2A6 6 0 0 1 7 8.8V8a5 5 0 1 1 10 0Z" />
              </svg>
            </div>
          );
        case "triangle":
          // Ruler + Pencil / Custom design icon
          return (
            <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="40"
                height="40"
                viewBox="0 0 24 24"
                fill="none"
                stroke={badgeTextColor}
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="m15 5 4 4" />
                <path d="M13 7 8.7 2.7a1 1 0 0 0-1.4 0l-4 4a1 1 0 0 0 0 1.4L8 13" />
                <path d="m8 6 2-2" />
                <path d="m2 22 5.5-1.5L21.17 6.83a2.82 2.82 0 0 0-4-4L3.5 16.5Z" />
                <path d="m18 16 2-2" />
                <path d="m17 11 4.3 4.3c.94.94.94 2.46 0 3.4l-2.6 2.6c-.94.94-2.46.94-3.4 0L11 17" />
              </svg>
            </div>
          );
        case "custom":
          if (!customIcon) {
            return (
              <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center border-2 border-gray-300 border-dashed text-gray-400 text-xs">
                No Icon
              </div>
            );
          }
          if (imageError && !isInlineSVG(customIcon)) {
            return (
              <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center border-2 border-red-300 border-dashed text-red-400 text-xs">
                Error
              </div>
            );
          }
          if (isInlineSVG(customIcon)) {
            const modifiedSVG = customIcon.replace(
              /fill="[^"]*"/g,
              `fill="${badgeTextColor}"`,
            );

            return (
              <div
                className="flex h-12 w-12 flex-shrink-0 items-center justify-center"
                dangerouslySetInnerHTML={{ __html: modifiedSVG }}
              />
            );
          }
          return (
            <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center">
              <img
                src={customIcon}
                alt="Custom Icon"
                className="max-h-full max-w-full object-contain"
                style={{
                  filter: customIcon.toLowerCase().endsWith(".svg")
                    ? `brightness(0) saturate(100%) invert(${badgeTextColor === "#29231E" ? "10%" : "90%"})`
                    : "none",
                }}
                onError={() => setImageError(true)}
                onLoad={() => setImageError(false)}
              />
            </div>
          );
        default:
          return null;
      }
    };
    return (
      <div
        ref={ref}
        {...rest}
        className={
          "flex h-full flex-col items-center justify-center gap-0 px-4 py-8 md:gap-5 md:px-8 md:py-16"
        }
      >
        {/* Icon container với vị trí cố định */}
        <div className="flex w-full flex-shrink-0 items-center justify-center">
          {renderIcon(iconType)}
        </div>

        {/* Text container với vị trí cố định */}
        <div className="flex w-full flex-1 items-start justify-center text-center">
          {headingContent && (
            <Heading
              content={headingContent}
              as={headingTagName}
              color={color}
              size={size}
              mobileSize={mobileSize}
              desktopSize={desktopSize}
              weight={weight}
              letterSpacing={letterSpacing}
              alignment={alignment}
              minSize={minSize}
              maxSize={maxSize}
              animate={animate}
            />
          )}
        </div>
      </div>
    );
  },
);

export default HighlightsBadge;

export let schema = createSchema({
  type: "highlights-badge",
  title: "Highlights Badge",
  limit: 3,
  settings: [
    {
      group: "Icon",
      inputs: [
        {
          type: "select",
          name: "iconType",
          label: "Icon Type",
          configs: {
            options: [
              { value: "circle", label: "Craftsmanship (Hand)" },
              { value: "square", label: "Hardwood (Tree)" },
              { value: "triangle", label: "Custom Design (Ruler)" },
              { value: "custom", label: "Custom Image" },
            ],
          },
          defaultValue: "circle",
        },
        {
          type: "textarea",
          name: "customIcon",
          label: "Custom Icon",
          placeholder:
            "Paste SVG code or enter image URL (e.g., https://example.com/icon.svg)",
          helpText: "Supports SVG code, image URLs (JPG, PNG, SVG files)",
          condition: "iconType.eq.custom",
        },
        {
          type: "color",
          name: "badgeTextColor",
          label: "Icon & Text Color",
          defaultValue: "#29231E",
          helpText: "For SVG icons, this will be used as the icon color",
        },
      ],
    },
    {
      group: "Heading",
      inputs: [
        {
          type: "text",
          name: "headingContent",
          label: "Heading content",
          defaultValue:
            "Every detail is intentional — from the grain direction to the joint.",
          placeholder: "Enter heading text",
        },
        ...headingInputs.map((input) => {
          if (input.name === "as") {
            return {
              ...input,
              name: "headingTagName",
            };
          }
          return input;
        }),
      ],
    },
  ],
  presets: {
    iconType: "circle",
    badgeTextColor: "#29231E",
    headingContent: "Designed, Not Decorated",
    headingTagName: "h3",
    color: "#29231E",
  },
});
