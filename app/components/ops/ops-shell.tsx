import {
  ArrowLeftIcon,
  ArrowSquareOutIcon,
  CheckCircleIcon,
  SignOutIcon,
  WarningCircleIcon,
} from "@phosphor-icons/react";
import { Form, Link, NavLink } from "react-router";
import { cn } from "~/utils/cn";

/* ---------------------------------------------------------------------------
   Ops hub UI kit. Uses the storefront's own theme tokens (text-body,
   border-line, bg-background...) so the internal tools match moderncre8ve.com:
   white ground, charcoal type, square edges, emerald only on primary hover.
--------------------------------------------------------------------------- */

/** Delivery window for handcrafted pieces: 12–16 weeks. */
export const LEAD_TIME_MIN_DAYS = 12 * 7;
export const LEAD_TIME_MAX_DAYS = 16 * 7;

export const opsInputClass =
  "w-full rounded-none border border-line bg-background px-4 py-3 text-body placeholder:text-body-subtle transition-colors hover:border-body focus:border-body";

export const opsTextLinkClass =
  "inline-flex items-center gap-1.5 text-body underline decoration-line underline-offset-4 transition-colors hover:decoration-body";

export function OpsShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background text-body">
      <header className="sticky top-0 z-20 border-line-subtle border-b bg-background shadow-header">
        <div className="mx-auto flex h-16 max-w-(--page-width) items-center gap-6 px-4 md:h-20 md:px-8">
          <Link
            to="/ops"
            className="flex h-10 shrink-0 items-center gap-4 md:h-12"
            aria-label="ModernCre8ve Ops home"
          >
            <img
              src="/logo.png"
              alt=""
              width={3004}
              height={3600}
              className="h-full w-auto"
            />
            <span className="border-line-subtle border-l pl-4 font-sans text-lg tracking-wide">
              Ops
            </span>
          </Link>
          <nav aria-label="Ops" className="hidden h-full items-stretch sm:flex">
            <OpsNavLink to="/ops">Current orders</OpsNavLink>
          </nav>
          <div className="ml-auto flex items-center gap-5 text-sm">
            <a
              href="/"
              target="_blank"
              rel="noreferrer"
              className={cn(opsTextLinkClass, "hidden md:inline-flex")}
            >
              View store
              <ArrowSquareOutIcon size={14} aria-hidden="true" />
            </a>
            <Form method="post" action="/ops/logout">
              <button
                type="submit"
                className="inline-flex items-center gap-2 border border-line px-3 py-2 transition-colors hover:border-body hover:bg-(--color-header-bg-hover)"
              >
                <SignOutIcon size={16} aria-hidden="true" />
                Sign out
              </button>
            </Form>
          </div>
        </div>
      </header>
      <div className="mx-auto w-full max-w-(--page-width) px-4 py-8 md:px-8 md:py-12">
        {children}
      </div>
    </div>
  );
}

function OpsNavLink({
  children,
  to,
}: {
  children: React.ReactNode;
  to: string;
}) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        cn(
          "relative flex items-center px-3 font-sans transition-colors",
          "after:absolute after:inset-x-3 after:bottom-0 after:h-0.5 after:transition-colors",
          isActive
            ? "text-body after:bg-body"
            : "text-body-subtle after:bg-transparent hover:text-body",
        )
      }
    >
      {children}
    </NavLink>
  );
}

/** Page title block — Jost on the storefront heading scale. */
export function OpsPageHeader({
  title,
  description,
  aside,
  eyebrow,
}: {
  title: string;
  description?: React.ReactNode;
  aside?: React.ReactNode;
  eyebrow?: React.ReactNode;
}) {
  return (
    <div className="mb-8 flex flex-col gap-6 md:mb-10 md:flex-row md:items-end md:justify-between">
      <div className="max-w-2xl space-y-3">
        {eyebrow}
        <h1 className="h4">{title}</h1>
        {description ? (
          <p className="text-base text-body-subtle">{description}</p>
        ) : null}
      </div>
      {aside}
    </div>
  );
}

/** Square, bordered panel. Separation by line, never by shadow. */
export function OpsCard({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn("border border-line-subtle bg-background", className)}
    >
      {children}
    </section>
  );
}

export function OpsSectionHeading({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 border-line-subtle border-b px-5 py-4 md:flex-row md:items-center md:justify-between md:px-6">
      <div className="space-y-0.5">
        <h2 className="font-sans text-xl tracking-wide">{title}</h2>
        {description ? (
          <p className="text-body-subtle text-sm">{description}</p>
        ) : null}
      </div>
      {action}
    </div>
  );
}

export function OpsEmptyState({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="space-y-3 px-6 py-16 text-center">
      <h2 className="font-sans text-xl tracking-wide">{title}</h2>
      <p className="mx-auto max-w-md text-body-subtle">{body}</p>
      {action ? <div className="pt-2">{action}</div> : null}
    </div>
  );
}

export function OpsField({
  label,
  hint,
  children,
  className,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={cn("block space-y-1.5", className)}>
      <span className="block text-body-subtle text-sm">{label}</span>
      {children}
      {hint ? (
        <span className="block text-body-subtle text-xs">{hint}</span>
      ) : null}
    </label>
  );
}

export function OpsNotice({
  ok,
  children,
}: {
  ok: boolean;
  children: React.ReactNode;
}) {
  const Icon = ok ? CheckCircleIcon : WarningCircleIcon;
  return (
    <div
      role={ok ? "status" : "alert"}
      className={cn(
        "flex items-start gap-3 border bg-background px-4 py-3 text-sm",
        ok ? "border-line-subtle border-l-4 border-l-[#2CBF96]" : "border-body",
      )}
    >
      <Icon size={18} className="mt-0.5 shrink-0" aria-hidden="true" />
      <div>{children}</div>
    </div>
  );
}

export function OpsBackLink({
  to,
  children,
}: {
  to: string;
  children: string;
}) {
  return (
    <Link
      to={to}
      className="inline-flex items-center gap-2 text-body-subtle text-sm transition-colors hover:text-body"
    >
      <ArrowLeftIcon size={16} aria-hidden="true" />
      {children}
    </Link>
  );
}

export function OpsTag({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center border border-line-subtle px-2 py-0.5 text-body text-xs">
      {children}
    </span>
  );
}

/* ---------------------------------------------------------------- status */

type StatusTone = "complete" | "progress" | "attention" | "neutral";

const STATUS_TONES: Record<string, StatusTone> = {
  // Fulfillment
  FULFILLED: "complete",
  UNFULFILLED: "progress",
  PARTIALLY_FULFILLED: "progress",
  IN_PROGRESS: "progress",
  SCHEDULED: "progress",
  OPEN: "progress",
  PENDING_FULFILLMENT: "progress",
  ON_HOLD: "attention",
  RESTOCKED: "neutral",
  // Financial
  PAID: "complete",
  PARTIALLY_PAID: "progress",
  PENDING: "progress",
  AUTHORIZED: "progress",
  PARTIALLY_REFUNDED: "attention",
  REFUNDED: "neutral",
  VOIDED: "neutral",
  EXPIRED: "neutral",
};

const TONE_SWATCH: Record<StatusTone, string> = {
  complete: "bg-[#2CBF96]",
  progress: "bg-[#F2AC29]",
  attention: "bg-body",
  neutral: "border border-[#9DA0A7] bg-transparent",
};

export function formatStatus(status: string) {
  const text = String(status || "Unknown")
    .replace(/_/g, " ")
    .toLowerCase();
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function StatusBadge({
  label,
  children,
}: {
  /** Visually hidden context, e.g. "Fulfillment" */
  label?: string;
  children: string;
}) {
  const tone = STATUS_TONES[String(children)] ?? "neutral";
  return (
    <span className="inline-flex items-center gap-2 whitespace-nowrap text-sm">
      <span
        aria-hidden="true"
        className={cn("size-2 shrink-0", TONE_SWATCH[tone])}
      />
      {label ? <span className="sr-only">{label}: </span> : null}
      {formatStatus(children)}
    </span>
  );
}

/* ------------------------------------------------------------- lead time */

/**
 * Where an order sits in the 12–16 week handcrafted window. The track runs
 * from order date to week 16; the shaded band is the delivery window.
 */
export function LeadTimeMeter({
  days,
  size = "sm",
}: {
  days: number;
  size?: "sm" | "lg";
}) {
  const week = Math.floor(days / 7) + 1;
  const late = days > LEAD_TIME_MAX_DAYS;
  const inWindow = !late && days >= LEAD_TIME_MIN_DAYS;
  const fill = Math.min(days / LEAD_TIME_MAX_DAYS, 1) * 100;
  const windowStart = (LEAD_TIME_MIN_DAYS / LEAD_TIME_MAX_DAYS) * 100;

  const status = late
    ? "Past the 16-week window"
    : inWindow
      ? "In the delivery window"
      : `${Math.ceil((LEAD_TIME_MIN_DAYS - days) / 7)} wk to window`;

  return (
    <div
      className={cn("space-y-1.5", size === "lg" ? "w-full max-w-sm" : "w-36")}
    >
      <div className="flex items-baseline justify-between gap-2">
        <span
          className={cn(
            "font-sans tabular-nums",
            size === "lg" ? "text-2xl" : "text-base",
          )}
        >
          Week {week}
        </span>
        <span className="text-body-subtle text-xs tabular-nums">
          {days} day{days === 1 ? "" : "s"}
        </span>
      </div>
      <div
        role="meter"
        aria-label="Lead time"
        aria-valuemin={0}
        aria-valuemax={LEAD_TIME_MAX_DAYS}
        aria-valuenow={Math.min(days, LEAD_TIME_MAX_DAYS)}
        aria-valuetext={`Week ${week} of a 12 to 16 week lead time. ${status}.`}
        className={cn(
          "relative w-full bg-(--color-topbar-bg)",
          size === "lg" ? "h-2" : "h-1",
        )}
      >
        <span
          aria-hidden="true"
          className="absolute inset-y-0 right-0 bg-[#F2AC29]/35"
          style={{ left: `${windowStart}%` }}
        />
        <span
          aria-hidden="true"
          className="absolute inset-y-0 left-0 bg-body"
          style={{ width: `${fill}%` }}
        />
      </div>
      <p
        className={cn(
          "flex items-center gap-1 text-xs",
          late ? "text-body" : "text-body-subtle",
        )}
      >
        {late ? (
          <WarningCircleIcon size={14} weight="fill" aria-hidden="true" />
        ) : null}
        {status}
      </p>
    </div>
  );
}

/* ----------------------------------------------------------------- money */

export function formatMoney(
  money: { amount: string; currencyCode: string } | null | undefined,
) {
  if (!money) {
    return "—";
  }
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: money.currencyCode,
  }).format(Number(money.amount));
}

export function formatDate(value: string, withTime = false) {
  return new Date(value).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    ...(withTime ? { hour: "numeric", minute: "2-digit" } : {}),
  });
}
