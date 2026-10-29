import type { OptimisticCartLineInput } from "@shopify/hydrogen";
import { Money } from "@shopify/hydrogen";
import type { MoneyV2 } from "@shopify/hydrogen/storefront-api-types";
import clsx from "clsx";
import type { RefObject } from "react";
import { useEffect, useState } from "react";
import { AddToCartButton } from "~/components/product/add-to-cart-button";

// Mobile-only bar that keeps price + Add to Cart reachable once the main
// button has scrolled out of view (furniture PDPs are long image galleries)
export function StickyAddToCart({
  targetRef,
  title,
  price,
  lines,
  disabled,
  buttonText,
}: {
  targetRef: RefObject<HTMLElement | null>;
  title: string;
  price: MoneyV2;
  lines: OptimisticCartLineInput[];
  disabled: boolean;
  buttonText: string;
}) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const target = targetRef.current;
    if (!target || typeof IntersectionObserver === "undefined") {
      return;
    }
    const observer = new IntersectionObserver(([entry]) =>
      setVisible(!entry.isIntersecting),
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, [targetRef]);

  return (
    <div
      aria-hidden={!visible}
      inert={!visible}
      className={clsx(
        "fixed inset-x-0 bottom-0 z-30 border-line-subtle border-t bg-background lg:hidden",
        "px-4 pt-3 pb-[calc(env(safe-area-inset-bottom)+12px)]",
        "transition-transform duration-300",
        visible ? "translate-y-0" : "translate-y-full",
      )}
    >
      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm">{title}</p>
          <Money withoutTrailingZeros data={price} as="p" className="text-lg" />
        </div>
        <AddToCartButton
          disabled={disabled}
          lines={lines}
          width="auto"
          className="h-12 shrink-0 uppercase"
        >
          {buttonText}
        </AddToCartButton>
      </div>
    </div>
  );
}
