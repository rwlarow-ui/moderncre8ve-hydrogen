import type { ComponentSchema } from "~/page-builder";

const InstagramSlider = ({ ref, ..._ }) => {
  return <div ref={ref} />;
};

export default InstagramSlider;

export const schema: ComponentSchema = {
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
