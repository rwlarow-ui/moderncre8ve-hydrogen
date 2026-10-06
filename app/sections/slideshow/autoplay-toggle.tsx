import { PauseIcon, PlayIcon } from "@phosphor-icons/react";
import clsx from "clsx";
import { useEffect, useState } from "react";
import { useSwiper } from "swiper/react";

export interface AutoplayToggleProps {
  className?: string;
  /** Start in the paused state (e.g. the visitor prefers reduced motion). */
  initiallyPaused?: boolean;
}

/**
 * Pause/play control for an auto-rotating slideshow.
 *
 * WCAG 2.2.2 (Pause, Stop, Hide): any motion that starts automatically and
 * runs for more than five seconds needs a way to stop it. The dots let you
 * jump between slides but cannot stop the rotation.
 */
export function AutoplayToggle(props: AutoplayToggleProps) {
  const { className, initiallyPaused = false } = props;
  const swiper = useSwiper();
  const [paused, setPaused] = useState(initiallyPaused);

  // Keep Swiper in step with the reduced-motion preference, including when it
  // changes after mount.
  useEffect(() => {
    setPaused(initiallyPaused);
  }, [initiallyPaused]);

  useEffect(() => {
    if (!swiper?.autoplay) return;
    if (paused) {
      swiper.autoplay.stop();
    } else {
      swiper.autoplay.start();
    }
  }, [swiper, paused]);

  if (!swiper?.autoplay) return null;

  return (
    <button
      type="button"
      // 44x44 minimum target (WCAG 2.5.5)
      className={clsx(
        "slideshow-autoplay-toggle",
        "absolute right-5 bottom-5 z-2 flex h-11 w-11 items-center justify-center",
        "bg-black/30 text-white transition-colors hover:bg-black/55",
        className,
      )}
      aria-label={paused ? "Play slideshow" : "Pause slideshow"}
      aria-pressed={paused}
      onClick={() => setPaused((p) => !p)}
    >
      {paused ? (
        <PlayIcon size={18} weight="fill" />
      ) : (
        <PauseIcon size={18} weight="fill" />
      )}
    </button>
  );
}
