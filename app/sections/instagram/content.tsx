import type { HydrogenComponentSchema } from "@weaverse/hydrogen";
import { forwardRef } from "react";

const InstagramContent = forwardRef<HTMLDivElement>((_, ref) => {
  return <div ref={ref} />;
});

export default InstagramContent;

export const schema: HydrogenComponentSchema = {
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
