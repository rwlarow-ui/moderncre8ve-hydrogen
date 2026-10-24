import { PlayIcon } from "@phosphor-icons/react";
import type { VariantProps } from "class-variance-authority";
import { cva } from "class-variance-authority";
import type { RefObject } from "react";
import { useState } from "react";
import {
  createSchema,
  type PageVideo,
  type SectionComponentProps,
} from "~/page-builder";
import { cn } from "~/utils/cn";

const variants = cva("mx-auto aspect-video w-full", {
  variants: {
    size: {
      small: "md:w-1/2",
      medium: "md:w-3/4",
      large: "",
    },
    borderRadius: {
      0: "",
      2: "rounded-xs",
      4: "rounded-sm",
      6: "rounded-md",
      8: "rounded-lg",
      10: "rounded-[10px]",
      12: "rounded-xl",
      14: "rounded-[14px]",
      16: "rounded-2xl",
      18: "rounded-[18px]",
      20: "rounded-[20px]",
      22: "rounded-[22px]",
      24: "rounded-3xl",
      26: "rounded-[26px]",
      28: "rounded-[28px]",
      30: "rounded-[30px]",
      32: "rounded-[32px]",
      34: "rounded-[34px]",
      36: "rounded-[36px]",
      38: "rounded-[38px]",
      40: "rounded-[40px]",
    },
  },
  defaultVariants: {
    size: "medium",
    borderRadius: 0,
  },
});

interface VideoItemProps
  extends VariantProps<typeof variants>,
    SectionComponentProps {
  video: PageVideo;
  videoUrl: string;
}

const YOUTUBE_ID =
  /(?:youtube(?:-nocookie)?\.com\/(?:embed\/|watch\?v=|shorts\/)|youtu\.be\/)([\w-]{11})/;

/**
 * The player URL to load after the click. An embed URL keeps its own host
 * (youtube-nocookie.com stays privacy-enhanced) and parameters (start, list,
 * loop, controls…); watch / shorts / youtu.be links become embed URLs that
 * carry their parameters over (`t` becomes `start`). Autoplay is added so
 * the click that revealed the player also starts it.
 */
function playerUrl(src: string, youtubeId: string) {
  try {
    const url = new URL(src);
    const nocookie = url.hostname.endsWith("youtube-nocookie.com");
    const player = url.pathname.startsWith("/embed/")
      ? url
      : new URL(
          `https://www.${nocookie ? "youtube-nocookie" : "youtube"}.com/embed/${youtubeId}`,
        );
    if (player !== url) {
      for (const [key, value] of url.searchParams) {
        if (key === "v" || key === "si") {
          continue;
        }
        if (key === "t") {
          const seconds = Number.parseInt(value, 10);
          if (seconds > 0) {
            player.searchParams.set("start", String(seconds));
          }
          continue;
        }
        player.searchParams.set(key, value);
      }
    }
    player.searchParams.set("autoplay", "1");
    return player.toString();
  } catch {
    return `https://www.youtube.com/embed/${youtubeId}?autoplay=1`;
  }
}

/**
 * YouTube embeds are shown as a lightweight thumbnail + play button and only
 * load the player (~1 MB of script) when clicked. Other providers fall back
 * to a lazily loaded iframe.
 */
const VideoEmbedItem = ({
  ref,
  ...props
}: VideoItemProps & { ref?: RefObject<HTMLDivElement | null> }) => {
  const { video, videoUrl, size, borderRadius, ...rest } = props;
  const src = video?.url || videoUrl;
  const youtubeId = src?.match(YOUTUBE_ID)?.[1];
  const [playing, setPlaying] = useState(false);
  const className = variants({ size, borderRadius });

  if (!src) {
    return null;
  }

  if (youtubeId && !playing) {
    return (
      <div
        ref={ref}
        {...rest}
        className={cn(className, "relative overflow-hidden bg-black")}
      >
        <img
          src={`https://i.ytimg.com/vi/${youtubeId}/hqdefault.jpg`}
          alt=""
          loading="lazy"
          decoding="async"
          className="absolute inset-0 h-full w-full object-cover"
        />
        <button
          type="button"
          onClick={() => setPlaying(true)}
          aria-label="Play video"
          className="group absolute inset-0 flex items-center justify-center"
        >
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-black/70 transition-colors group-hover:bg-black/85">
            <PlayIcon className="h-7 w-7 text-white" weight="fill" />
          </span>
        </button>
      </div>
    );
  }

  return (
    <div ref={ref} {...rest} className={className}>
      <iframe
        className="h-full w-full"
        src={youtubeId ? playerUrl(src, youtubeId) : src}
        loading="lazy"
        allowFullScreen
        title="Video player"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        sandbox="allow-presentation allow-same-origin allow-scripts"
      />
    </div>
  );
};

export default VideoEmbedItem;

export const schema = createSchema({
  type: "video-embed--item",
  title: "Video",
  settings: [
    {
      group: "Video",
      inputs: [
        {
          type: "video",
          name: "video",
          label: "Video",
          helpText:
            "If no video is selected, the component will fallback to use the Embed URL below.",
        },
        {
          type: "text",
          name: "videoUrl",
          label: "Embed URL",
          defaultValue: "https://www.youtube.com/embed/Su-x4Mo5xmU",
          placeholder: "https://www.youtube.com/embed/Su-x4Mo5xmU",
          helpText:
            'How to get YouTube <a target="_blank" href="https://support.google.com/youtube/answer/171780?hl=en#:~:text=On%20a%20computer%2C%20go%20to,appears%2C%20copy%20the%20HTML%20code.">embed code</a>.',
        },
        {
          type: "select",
          name: "size",
          label: "Size",
          defaultValue: "medium",
          configs: {
            options: [
              { value: "small", label: "Small" },
              { value: "medium", label: "Medium" },
              { value: "large", label: "Large" },
            ],
          },
          helpText: "For desktop only.",
        },
        {
          type: "range",
          name: "borderRadius",
          label: "Border radius",
          configs: {
            min: 0,
            max: 40,
            step: 2,
            unit: "px",
          },
          defaultValue: 0,
        },
      ],
    },
  ],
});
