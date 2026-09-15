import type { ReactNode } from "react";
import { forwardRef } from "react";
import {
  Section,
  type SectionProps,
  sectionSettings,
} from "~/components/section";
import type { SectionComponent } from "~/page-builder";

interface VideosProps extends SectionProps {
  children?: ReactNode;
}

let Videos = forwardRef<HTMLElement, VideosProps>((props, ref) => {
  let { children, ...rest } = props;

  return (
    <Section ref={ref} {...rest}>
      {children}
    </Section>
  );
});

export let schema: SectionComponent["schema"] = {
  title: "Videos",
  type: "videos",
  settings: sectionSettings,
  childTypes: ["heading", "video--items"],
  presets: {
    children: [
      {
        type: "heading",
        content: "VIDEOS",
      },
      {
        type: "video--items",
      },
    ],
  },
};

Videos.displayName = "Videos";
export default Videos;
