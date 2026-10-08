import { HammerIcon, HourglassIcon, TruckIcon } from "@phosphor-icons/react";
import { clsx } from "clsx";

/**
 * The three promises that answer a furniture shopper's first questions — who
 * makes it, how long it takes, how it arrives — shown where they browse rather
 * than only on the product page.
 *
 * Copy follows .claude/brand-voice-guidelines.md: name the makers, state the
 * lead time plainly and frame it as proof of craft, no urgency language.
 * Colours are the brand's Dark Charcoal (#323640) on Warm Cream (#F2EBD5),
 * about 11:1 contrast.
 */
const PROMISES = [
  {
    icon: HammerIcon,
    title: "Handcrafted to order",
    detail: "By our Amish craftsmen partners in the Midwest",
  },
  {
    icon: HourglassIcon,
    title: "Made for you in 12–16 weeks",
    detail: "Solid American hardwood, built one piece at a time",
  },
  {
    icon: TruckIcon,
    title: "White glove delivery included",
    detail: "Delivered into your home and fully assembled",
  },
] as const;

export function TrustStrip({ className }: { className?: string }) {
  return (
    <ul
      aria-label="Why shop ModernCre8ve"
      className={clsx(
        "grid gap-4 bg-[#F2EBD5] px-5 py-5 text-[#323640] sm:grid-cols-3 sm:gap-6 sm:px-8",
        className,
      )}
    >
      {PROMISES.map(({ icon: Icon, title, detail }) => (
        <li key={title} className="flex items-start gap-3">
          <Icon aria-hidden="true" className="mt-0.5 h-6 w-6 shrink-0" />
          <span className="flex flex-col">
            <span className="font-medium font-sans">{title}</span>
            <span className="text-sm">{detail}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}
