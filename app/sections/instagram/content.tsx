import type { ComponentSchema } from "~/page-builder";

const InstagramContent = ({ ref, ..._ }) => {
  return <div ref={ref} />;
};

export default InstagramContent;

export const schema: ComponentSchema = {
  type: "instagram--content",
  title: "Instagram content",
  settings: [
    {
      group: "Content",
      inputs: [
        {
          type: "text",
          name: "subtitle",
          label: "Subtitle",
        },
      ],
    },
  ],
};
