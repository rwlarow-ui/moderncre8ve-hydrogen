import { createContext, type ReactNode, useContext } from "react";

/**
 * Marks the images inside a subtree as above-the-fold. The page builder
 * renders section children as opaque nodes, so a parent such as the
 * slideshow can't pass a prop to its first slide's background image —
 * it wraps that slide in <ImagePriority> instead, and BackgroundImage
 * reads it to load eagerly with fetchpriority="high" (the LCP image).
 */
const ImagePriorityContext = createContext(false);

export function ImagePriority({
  enabled = true,
  children,
}: {
  enabled?: boolean;
  children?: ReactNode;
}) {
  return (
    <ImagePriorityContext.Provider value={enabled}>
      {children}
    </ImagePriorityContext.Provider>
  );
}

export function useImagePriority() {
  return useContext(ImagePriorityContext);
}
