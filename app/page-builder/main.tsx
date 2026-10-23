import type { RefObject } from "react";
import { createSchema } from "./schema";
import type { SectionComponentProps } from "./types";

/**
 * The root node of every page composition — the wrapper all top-level sections
 * are rendered into.
 */
const Main = ({
  ref,
  ...props
}: SectionComponentProps & { ref?: RefObject<HTMLDivElement | null> }) => {
  const { children, ...rest } = props;
  return (
    <div ref={ref} {...rest}>
      {children}
    </div>
  );
};

export default Main;

export const schema = createSchema({ type: "main", title: "Main" });
