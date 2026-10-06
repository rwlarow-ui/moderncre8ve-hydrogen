import type { VariantProps } from "class-variance-authority";
import { cva } from "class-variance-authority";
import clsx from "clsx";
import { useEffect, useState } from "react";
import { useSwiper } from "swiper/react";

export interface SlideshowDotsProps extends VariantProps<typeof variants> {
  className?: string;
  slidesCount?: number;
}

const variants = cva(
  ["slideshow-dots", "absolute z-1 flex w-full items-center justify-center"],
  {
    variants: {
      dotsPosition: {
        // The insets sit 20px closer to the edge than the visible bar so the
        // 44px tall buttons centre the bar exactly where it used to render.
        top: "top-5! right-0! bottom-auto! left-0!",
        bottom: "top-auto! right-0! bottom-5! left-0!",
        left: "top-0! right-auto! bottom-0! left-5! flex-col",
        right: "top-0! right-5! bottom-0! left-auto! flex-col",
      },
      dotsColor: {
        light: "",
        dark: "",
      },
    },
    defaultVariants: {
      dotsPosition: "bottom",
      dotsColor: "light",
    },
  },
);

/**
 * The hit area. The indicator itself is only 4px tall, which is far below the
 * 24x24 minimum of WCAG 2.5.8 (and the 44x44 of 2.5.5) -- and on the homepage
 * these are the *only* slideshow control, since arrows are off. So the button
 * is a transparent 44px target wrapping the visible bar.
 */
const hitAreaVariants = cva([
  "dot group/dot flex cursor-pointer items-center justify-center",
  "h-11 w-12 border-0 bg-transparent p-0",
]);

const barVariants = cva(
  ["pointer-events-none block h-1 w-12", "transition-all duration-300"],
  {
    variants: {
      dotsColor: {
        light: "bg-black/30 group-hover/dot:bg-black/50",
        dark: "bg-white/50 group-hover/dot:bg-white/70",
      },
      isActive: {
        true: "",
        false: "",
      },
    },
    compoundVariants: [
      { dotsColor: "light", isActive: true, className: "bg-black!" },
      { dotsColor: "dark", isActive: true, className: "bg-white!" },
    ],
  },
);

export function Dots(props: SlideshowDotsProps) {
  const { className, dotsPosition, dotsColor, slidesCount = 0 } = props;
  const swiper = useSwiper();
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    if (!swiper) return;

    const handleSlideChange = () => {
      const currentIndex = swiper.realIndex || swiper.activeIndex;
      setActiveIndex(currentIndex);
    };

    // Listen for slide changes
    swiper.on("slideChange", handleSlideChange);

    // Set initial active index
    handleSlideChange();

    return () => {
      swiper.off("slideChange", handleSlideChange);
    };
  }, [swiper]);

  const handleDotClick = (index: number) => {
    if (swiper) {
      swiper.slideTo(index);
    }
  };

  if (slidesCount === 0) return null;

  return (
    <div
      className={clsx(variants({ dotsPosition, dotsColor }), className)}
      role="group"
      aria-label="Slideshow navigation"
    >
      {Array.from({ length: slidesCount }, (_, index) => (
        <button
          key={index}
          type="button"
          className={hitAreaVariants()}
          onClick={() => handleDotClick(index)}
          aria-label={`Go to slide ${index + 1} of ${slidesCount}`}
          // The fill is a progress bar (every bar up to the current slide is
          // filled), so the filled state cannot identify the current slide to
          // assistive tech. aria-current marks the actual one.
          aria-current={index === activeIndex ? "true" : undefined}
        >
          <span
            className={barVariants({
              dotsColor,
              isActive: index <= activeIndex,
            })}
          />
        </button>
      ))}
    </div>
  );
}
