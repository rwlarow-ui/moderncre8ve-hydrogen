import { forwardRef } from "react";
import type { ComponentSchema } from "~/page-builder";

const InstagramContent = forwardRef<HTMLDivElement>((_, ref) => {
  return <div ref={ref} />;
});

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
