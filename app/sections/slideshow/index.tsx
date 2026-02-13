import {
  createSchema,
  type HydrogenComponentProps,
  IMAGES_PLACEHOLDERS,
  useThemeSettings,
} from "@weaverse/hydrogen";
import type { VariantProps } from "class-variance-authority";
import { cva } from "class-variance-authority";
import { forwardRef } from "react";
import { Autoplay, EffectFade } from "swiper/modules";
import { Swiper, SwiperSlide } from "swiper/react";
import type { SlideshowArrowsProps } from "./arrows";
import { Arrows } from "./arrows";
import type { SlideshowDotsProps } from "./dots";
import { Dots } from "./dots";

const variants = cva("group [&_.swiper]:h-full", {
  variants: {
    height: {
      small: "h-[40vh] lg:h-[50vh]",
      medium: "h-[50vh] lg:h-[60vh]",
      large: "h-[70vh] lg:h-[80vh]",
      full: "",
    },
    enableTransparentHeader: {
      true: "",
      false: "",
    },
  },
  compoundVariants: [
    {
      height: "full",
      enableTransparentHeader: true,
      className: "h-screen-no-topbar",
    },
    {
      height: "full",
      enableTransparentHeader: false,
      className: "h-screen-dynamic",
    },
  ],
  defaultVariants: {
    height: "large",
  },
});

export interface SlideshowData
  extends VariantProps<typeof variants>,
    SlideshowArrowsProps,
    SlideshowDotsProps {
  effect?: "fade" | "slide";
  showArrows: boolean;
  showDots: boolean;
  dotsPosition: "top" | "bottom" | "left" | "right";
  dotsColor: "light" | "dark";
  loop: boolean;
  autoRotate: boolean;
  changeSlidesEvery: number;
}

const Slideshow = forwardRef<
  HTMLDivElement,
  SlideshowData & HydrogenComponentProps
>((props, ref) => {
  const {
    height,
    effect,
    showArrows,
    arrowsIcon,
    iconSize,
    showArrowsOnHover,
    arrowsColor,
    arrowsShape,
    showDots = true,
    dotsPosition,
    dotsColor,
    loop,
    autoRotate,
    changeSlidesEvery,
    children = [],
    ...rest
  } = props;
  const { enableTransparentHeader } = useThemeSettings();

  return (
    <section
      key={Object.values(props)
        .filter((v) => typeof v !== "object")
        .join("-")}
      ref={ref}
      {...rest}
      className={variants({ height, enableTransparentHeader })}
    >
      <Swiper
        effect={effect}
        fadeEffect={{
          crossFade: true,
        }}
        loop={effect === "slide" ? loop : false}
        autoplay={autoRotate ? { delay: changeSlidesEvery * 1000 } : false}
        modules={[
          effect === "fade" ? EffectFade : null,
          autoRotate ? Autoplay : null,
        ].filter(Boolean)}
      >
        {children.map((child, idx) => (
          <SwiperSlide key={idx}>{child}</SwiperSlide>
        ))}
        {showArrows && <Arrows {...props} />}
        {showDots && <Dots {...props} slidesCount={children.length} />}
      </Swiper>
    </section>
  );
});

export default Slideshow;

export const schema = createSchema({
  title: "Slideshow",
  type: "slideshow",
  childTypes: ["slideshow-slide"],
  settings: [
    {
      group: "Slideshow",
      inputs: [
        {
          type: "select",
          name: "height",
          label: "Section height",
          configs: {
            options: [
              { value: "small", label: "Small" },
              { value: "medium", label: "Medium" },
              { value: "large", label: "Large" },
              { value: "full", label: "Fullscreen" },
            ],
          },
          defaultValue: "large",
        },
        {
          type: "toggle-group",
          label: "Slide effect",
          name: "effect",
          configs: {
            options: [
              { value: "fade", label: "Fade" },
              { value: "slide", label: "Slide" },
            ],
          },
          defaultValue: "fade",
        },
        {
          type: "switch",
          label: "Auto-rotate slides",
          name: "autoRotate",
          defaultValue: true,
        },
        {
          type: "range",
          label: "Change slides every",
          name: "changeSlidesEvery",
          configs: {
            min: 3,
            max: 9,
            step: 1,
            unit: "s",
          },
          defaultValue: 5,
          condition: (data: SlideshowData) => data.autoRotate,
          helpText: "Auto-rotate is disabled inside Weaverse Studio.",
        },
        {
          type: "switch",
          label: "Loop",
          name: "loop",
          defaultValue: true,
        },
      ],
    },
    {
      group: "Navigation & Controls",
      inputs: [
        {
          type: "heading",
          label: "Arrows",
        },
        {
          type: "switch",
          label: "Show arrows",
          name: "showArrows",
          defaultValue: false,
        },
        {
          type: "select",
          label: "Arrow icon",
          name: "arrowsIcon",
          configs: {
            options: [
              { value: "caret", label: "Caret" },
              { value: "arrow", label: "Arrow" },
            ],
          },
          defaultValue: "arrow",
          condition: (data: SlideshowData) => data.showArrows,
        },
        {
          type: "range",
          label: "Icon size",
          name: "iconSize",
          configs: {
            min: 16,
            max: 40,
            step: 2,
          },
          defaultValue: 20,
          condition: (data: SlideshowData) => data.showArrows,
        },
        {
          type: "switch",
          label: "Show arrows on hover",
          name: "showArrowsOnHover",
          defaultValue: true,
          condition: (data: SlideshowData) => data.showArrows,
        },
        {
          type: "select",
          label: "Arrows color",
          name: "arrowsColor",
          configs: {
            options: [
              { value: "primary", label: "Primary" },
              { value: "secondary", label: "Secondary" },
            ],
          },
          defaultValue: "primary",
          condition: (data: SlideshowData) => data.showArrows,
        },
        {
          type: "toggle-group",
          label: "Arrows shape",
          name: "arrowsShape",
          configs: {
            options: [
              { value: "rounded-sm", label: "Rounded", icon: "squircle" },
              { value: "circle", label: "Circle", icon: "circle" },
              { value: "square", label: "Square", icon: "square" },
            ],
          },
          defaultValue: "rounded-sm",
          condition: (data: SlideshowData) => data.showArrows,
        },

        {
          type: "heading",
          label: "Dots",
        },
        {
          type: "switch",
          label: "Show dots",
          name: "showDots",
          defaultValue: true,
        },
        {
          type: "select",
          label: "Dots position",
          name: "dotsPosition",
          configs: {
            options: [
              { value: "top", label: "Top" },
              { value: "bottom", label: "Bottom" },
              { value: "left", label: "Left" },
              { value: "right", label: "Right" },
            ],
          },
          defaultValue: "bottom",
          condition: (data: SlideshowData) => data.showDots,
        },
        {
          type: "select",
          label: "Dots color",
          name: "dotsColor",
          configs: {
            options: [
              { value: "light", label: "Light" },
              { value: "dark", label: "Dark" },
            ],
          },
          defaultValue: "light",
          condition: (data: SlideshowData) => data.showDots,
        },
      ],
    },
  ],
  presets: {
    autoRotate: true,
    changeSlidesEvery: 6,
    effect: "fade",
    loop: true,
    showDots: true,
    height: "large",
    children: [
      {
        type: "slideshow-slide",
        verticalPadding: "large",
        backgroundImage: IMAGES_PLACEHOLDERS.banner_1,
        backgroundFit: "cover",
        enableOverlay: true,
        overlayOpacity: 50,
        headingContent: "Handcrafted Modern Furniture",
        color: "#fff",
        size: "scale",
        subheadingContent: "Made by Amish Artisans in Ohio",
        subheadingColor: "#fff",
        paragraphContent:
          "Solid hardwood furniture designed for modern living — built one piece at a time in Ohio.",
        paragraphColor: "#fff",
        paragraphWidth: "full",
        buttonContent: "Shop Collections",
        to: "/collections",
        variant: "custom",
        backgroundColor: "#00000000",
        textColor: "#fff",
        borderColor: "#fff",
        backgroundColorHover: "#fff",
        textColorHover: "#000",
        borderColorHover: "#fff",
      },
      {
        type: "slideshow-slide",
        verticalPadding: "large",
        backgroundImage: IMAGES_PLACEHOLDERS.banner_2,
        backgroundFit: "cover",
        enableOverlay: true,
        overlayOpacity: 50,
        headingContent: "Mid-Century Modern Dining",
        color: "#fff",
        size: "scale",
        subheadingContent: "Solid Hardwood. Built to Last.",
        subheadingColor: "#fff",
        paragraphContent:
          "Gather around a table built to last for generations — handcrafted from domestic hardwoods.",
        paragraphColor: "#fff",
        paragraphWidth: "full",
        buttonContent: "Explore Dining",
        to: "/collections/dining",
        variant: "custom",
        backgroundColor: "#00000000",
        textColor: "#fff",
        borderColor: "#fff",
        backgroundColorHover: "#fff",
        textColorHover: "#000",
        borderColorHover: "#fff",
      },
      {
        type: "slideshow-slide",
        verticalPadding: "large",
        backgroundImage: IMAGES_PLACEHOLDERS.banner_1,
        backgroundFit: "cover",
        enableOverlay: true,
        overlayOpacity: 50,
        headingContent: "Scandinavian & Japandi Design",
        color: "#fff",
        size: "scale",
        subheadingContent: "Where Simplicity Meets Craftsmanship",
        subheadingColor: "#fff",
        paragraphContent:
          "Clean lines, natural materials, and timeless design — furniture that brings calm to every room.",
        paragraphColor: "#fff",
        paragraphWidth: "full",
        buttonContent: "View Collection",
        to: "/collections/scandinavian-design-furniture",
        variant: "custom",
        backgroundColor: "#00000000",
        textColor: "#fff",
        borderColor: "#fff",
        backgroundColorHover: "#fff",
        textColorHover: "#000",
        borderColorHover: "#fff",
      },
    ],
  },
});
