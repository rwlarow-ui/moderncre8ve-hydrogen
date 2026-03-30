import type { HydrogenComponentSchema } from "@weaverse/hydrogen";
import { forwardRef } from "react";

const InstagramSlider = forwardRef<HTMLDivElement>((_, ref) => {
  return <div ref={ref} />;
});

export default InstagramSlider;

export const schema: HydrogenComponentSchema = {
  type: "instagram--slider",
  title: "Instagram slider",
  settings: [
    {
      group: "Slider",
      inputs: [
        {
          type: "range",
          name: "slidesPerView",
          label: "Slides per view",
          defaultValue: 3,
          configs: { min: 1, max: 6, step: 1 },
        },
      ],
    },
  ],
};
