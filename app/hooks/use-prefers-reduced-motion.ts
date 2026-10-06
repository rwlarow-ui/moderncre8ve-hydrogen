import { useEffect, useState } from "react";

const QUERY = "(prefers-reduced-motion: reduce)";

/**
 * Whether the visitor has asked the OS to reduce motion.
 *
 * Returns `false` during SSR and on the first client render -- there is no way
 * to know the preference on the server. Callers should use it to *stop* motion
 * (autoplay, parallax), so the worst case is one frame before it settles, which
 * is well inside any autoplay delay.
 */
export function usePrefersReducedMotion(): boolean {
  const [prefersReduced, setPrefersReduced] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mql = window.matchMedia(QUERY);
    setPrefersReduced(mql.matches);
    const onChange = (event: MediaQueryListEvent) =>
      setPrefersReduced(event.matches);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  return prefersReduced;
}
