import type { RefObject } from "react";
import { createSchema, type SectionComponentProps } from "~/page-builder";

interface TestimonialProps extends SectionComponentProps {}

const TestimonialItem = ({
  ref,
  ...props
}: TestimonialProps & { ref?: RefObject<HTMLDivElement | null> }) => {
  const { children, ...rest } = props;

  return (
    <div
      ref={ref}
      {...rest}
      className="flex h-full flex-col gap-10 md:flex-row"
    >
      {children}
    </div>
  );
};

export default TestimonialItem;

export const schema = createSchema({
  type: "testimonial--item",
  title: "Testimonial",
  childTypes: ["testimonial--content", "testimonial--hotspots-item"],
  presets: {
    children: [
      // Empty on purpose: fill in a real review and its author in the composition.
      { type: "testimonial--content" },
      { type: "testimonial--hotspots-item" },
    ],
  },
});
