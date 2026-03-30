import { Button } from "~/components/button";
import { cn } from "~/utils/cn";
import { Form, Link, NavLink } from "react-router";

interface OpsShellProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}

export function OpsShell({ title, subtitle, children }: OpsShellProps) {
  return (
    <div className="min-h-screen bg-[#f6f2e9] text-[#323640]">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-8 md:px-8">
        <header className="overflow-hidden rounded-[28px] border border-[#d4cbba] bg-white shadow-[0_20px_60px_rgba(50,54,64,0.08)]">
          <div className="grid gap-6 border-[#efe6d4] border-b bg-[linear-gradient(135deg,#323640_0%,#435765_100%)] px-6 py-8 text-white md:grid-cols-[1fr_auto] md:px-8">
            <div className="space-y-3">
              <p className="font-sans text-xs uppercase tracking-[0.28em] text-white/70">
                ModernCre8ve Ops
              </p>
              <div className="space-y-1">
                <h1 className="font-sans text-3xl tracking-tight md:text-4xl">
                  {title}
                </h1>
                {subtitle ? (
                  <p className="max-w-2xl text-sm text-white/80 md:text-base">
                    {subtitle}
                  </p>
                ) : null}
              </div>
            </div>
            <div className="flex items-start justify-start md:justify-end">
              <Form method="post" action="/ops/logout">
                <Button
                  type="submit"
                  variant="outline"
                  className="border-white/30 text-white hover:bg-white/10 hover:text-white"
                >
                  Sign out
                </Button>
              </Form>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3 px-6 py-4 md:px-8">
            <OpsNavLink to="/ops">Current Orders</OpsNavLink>
          </div>
        </header>
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
      end
      className={({ isActive }) =>
        cn(
          "rounded-full border px-4 py-2 font-sans text-sm uppercase tracking-[0.2em] transition-colors",
          isActive
            ? "border-[#323640] bg-[#323640] text-white"
            : "border-[#d8d0bf] bg-[#f8f4ea] text-[#5f636b] hover:border-[#323640] hover:text-[#323640]",
        )
      }
    >
      {children}
    </NavLink>
  );
}

export function OpsCard({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "overflow-hidden rounded-[24px] border border-[#ddd3c1] bg-white shadow-[0_18px_50px_rgba(50,54,64,0.06)]",
        className,
      )}
    >
      {children}
    </section>
  );
}

export function OpsEmptyState({
  title,
  body,
}: {
  title: string;
  body: string;
}) {
  return (
    <OpsCard className="p-8">
      <div className="space-y-2 text-center">
        <h2 className="font-sans text-xl tracking-tight">{title}</h2>
        <p className="mx-auto max-w-xl text-[#6d7077]">{body}</p>
      </div>
    </OpsCard>
  );
}

export function OpsMetaPill({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-full border border-[#e5dccb] bg-[#faf7f0] px-3 py-1 text-xs uppercase tracking-[0.18em] text-[#6d7077]">
      <span className="mr-2 text-[#323640]">{label}</span>
      {value}
    </div>
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
    <div className="flex flex-col gap-3 border-[#efe6d4] border-b px-6 py-5 md:flex-row md:items-center md:justify-between">
      <div className="space-y-1">
        <h2 className="font-sans text-xl tracking-tight">{title}</h2>
        {description ? (
          <p className="text-[#6d7077] text-sm md:text-base">{description}</p>
        ) : null}
      </div>
      {action}
    </div>
  );
}

export function OpsBackLink({ to, children }: { to: string; children: string }) {
  return (
    <Link
      to={to}
      className="inline-flex items-center gap-2 font-sans text-xs uppercase tracking-[0.22em] text-[#5f636b] transition-colors hover:text-[#323640]"
    >
      <span aria-hidden="true">←</span>
      {children}
    </Link>
  );
}

