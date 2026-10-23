import type { RefObject } from "react";
import type { ReactNode } from "react";
import {
  Section,
  type SectionProps,
  sectionSettings,
} from "~/components/section";
import type { SectionComponent } from "~/page-builder";

interface VideosProps extends SectionProps {
  children?: ReactNode;
}

let Videos = ({
  ref,
  ...props
}: VideosProps & { ref?: RefObject<HTMLElement | null> }) => {
  let { children, ...rest } = props;

  return (
    <Section ref={ref} {...rest}>
      {children}
    </Section>
  );
};

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

export default Videos;
