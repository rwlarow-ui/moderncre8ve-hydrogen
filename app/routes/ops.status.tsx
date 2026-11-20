import {
  CheckCircleIcon,
  CircleIcon,
  HourglassIcon,
  QuestionIcon,
} from "@phosphor-icons/react";
import { Link, useLoaderData } from "react-router";
import {
  OpsCard,
  OpsPageHeader,
  OpsSectionHeading,
  opsTextLinkClass,
} from "~/components/ops/ops-shell";
import { cn } from "~/utils/cn";
import { requireOpsUser } from "~/utils/ops-identity.server";
import { STATUS_STAGES } from "~/utils/ops-status";
import { loadOpsStatus } from "~/utils/ops-status.server";
import { privateHeaders } from "~/utils/ops-store.server";
import type { Route } from "./+types/ops.status";

export const headers = () => privateHeaders;

export async function loader({ request, context }: Route.LoaderArgs) {
  const user = await requireOpsUser(request, context);
  return { status: await loadOpsStatus(context.env, user), me: user.email };
}

interface Step {
  title: string;
  done: boolean | null;
  text: string;
  waitingOn?: string | null;
}

/** Fixed zone so the server and browser render the same text. */
const checkedLabel = (iso: string) =>
  new Date(iso).toLocaleString("en-US", {
    timeZone: "America/New_York",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  });

const OWNER_NAME: Record<string, string> = { haven: "Haven", rob: "Rob" };

function StepIcon({ step }: { step: Step }) {
  if (step.done === true) {
    return (
      <CheckCircleIcon
        size={22}
        weight="fill"
        className="text-[#2CBF96]"
        aria-label="Done"
      />
    );
  }
  if (step.done === null) {
    return (
      <QuestionIcon
        size={22}
        className="text-body-subtle"
        aria-label="Can't be checked from the hub"
      />
    );
  }
  if (step.waitingOn) {
    return (
      <HourglassIcon
        size={22}
        className="text-body-subtle"
        aria-label="Waiting"
      />
    );
  }
  return <CircleIcon size={22} className="text-body" aria-label="To do" />;
}

function PersonColumn({
  name,
  steps,
  mine,
}: {
  name: string;
  steps: Step[];
  mine: boolean;
}) {
  const open = steps.filter((s) => s.done === false);
  const ordered = [
    ...open.filter((s) => !s.waitingOn),
    ...open.filter((s) => s.waitingOn),
    ...steps.filter((s) => s.done === null),
    ...steps.filter((s) => s.done === true),
  ];
  return (
    <OpsCard className={cn(mine && "border-body")}>
      <OpsSectionHeading
        title={`${name}'s to-dos`}
        description={
          open.length
            ? `${open.length} open · ${steps.filter((s) => s.done === true).length} done`
            : "Nothing open"
        }
        action={
          mine ? <span className="text-body-subtle text-sm">You</span> : null
        }
      />
      <ol className="divide-y divide-line-subtle">
        {ordered.map((step) => (
          <li
            key={step.title}
            className={cn(
              "flex gap-3 px-5 py-4 md:px-6",
              step.done === true && "opacity-60",
            )}
          >
            <span className="mt-0.5 shrink-0">
              <StepIcon step={step} />
            </span>
            <div className="min-w-0 space-y-1">
              <p
                className={cn(
                  "font-sans",
                  step.done === true && "line-through decoration-line",
                )}
              >
                {step.title}
              </p>
              {step.done !== true ? (
                <p className="text-body-subtle text-sm">{step.text}</p>
              ) : null}
              {step.done === false && step.waitingOn ? (
                <p className="text-sm">Waiting on: {step.waitingOn}</p>
              ) : null}
            </div>
          </li>
        ))}
      </ol>
    </OpsCard>
  );
}

function StageBar({ stage }: { stage: number }) {
  return (
    <div
      className="grid grid-cols-4 gap-0.5"
      role="img"
      aria-label={`${STATUS_STAGES[Math.min(stage, 4) - 1]}`}
    >
      {STATUS_STAGES.map((label, i) => (
        <span
          key={label}
          className={cn(
            "h-2.5",
            i < stage
              ? stage >= 4
                ? "bg-[#2CBF96]"
                : "bg-body"
              : "bg-line-subtle",
          )}
        />
      ))}
    </div>
  );
}

export default function OpsStatus() {
  const { status, me } = useLoaderData<typeof loader>();
  const { tally } = status;
  return (
    <div className="space-y-8">
      <OpsPageHeader
        title="Rollout status"
        description={
          <>
            Worked out from the hub's own data each time this page loads.
            Checked {checkedLabel(status.checkedAt)}.{" "}
            <Link to="." reloadDocument className={opsTextLinkClass}>
              Refresh
            </Link>
          </>
        }
        aside={
          <dl className="grid grid-cols-2 gap-x-8 gap-y-3 font-sans sm:grid-cols-4">
            {[
              ["Haven open", tally.havenOpen],
              ["Rob open", tally.robOpen],
              ["Areas in use", `${tally.inUse}/${tally.areas}`],
              ["Emails sent", tally.emailsSent ?? "?"],
            ].map(([label, value]) => (
              <div key={label}>
                <dd className="text-3xl tabular-nums">{value}</dd>
                <dt className="text-body-subtle text-sm">{label}</dt>
              </div>
            ))}
          </dl>
        }
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <PersonColumn
          name="Haven"
          steps={status.haven}
          mine={me === "haven@moderncre8ve.com"}
        />
        <PersonColumn
          name="Rob"
          steps={status.rob}
          mine={me === "rob@moderncre8ve.com"}
        />
      </div>

      <OpsCard>
        <OpsSectionHeading
          title="Settings for Haven to decide"
          description="Current values on the Automation page. Change them there before going live."
        />
        <dl className="divide-y divide-line-subtle">
          {status.decisions.map((d) => (
            <div
              key={d.label}
              className="grid gap-1 px-5 py-3 sm:grid-cols-[14rem_1fr] md:px-6"
            >
              <dt className="text-body-subtle text-sm">{d.label}</dt>
              <dd>
                {d.value}
                {d.decided === false ? (
                  <span className="ml-2 text-body-subtle text-sm">
                    · not decided yet
                  </span>
                ) : null}
              </dd>
            </div>
          ))}
        </dl>
      </OpsCard>

      <OpsCard>
        <OpsSectionHeading
          title="Area by area"
          description={`Each bar fills as an area goes ${STATUS_STAGES.join(" → ").toLowerCase()}. Open a row for its checks.`}
        />
        <div className="divide-y divide-line-subtle">
          {status.areas.map((area) => (
            <details key={area.id} className="group px-5 py-4 md:px-6">
              <summary className="grid cursor-pointer list-none gap-3 md:grid-cols-[16rem_10rem_1fr] md:items-center">
                <span className="font-sans">{area.title}</span>
                <StageBar stage={area.stage} />
                <span className="text-sm">
                  {area.next.owner ? (
                    <span className="mr-2 inline-block border border-line px-1.5 py-0.5 font-sans text-xs">
                      {OWNER_NAME[area.next.owner]}
                    </span>
                  ) : null}
                  {area.next.text}
                </span>
              </summary>
              <ul className="mt-3 space-y-1.5 text-sm md:ml-[16rem]">
                {area.checks.map((c) => (
                  <li key={c.label} className="flex gap-2">
                    <span className="w-4 shrink-0" aria-hidden="true">
                      {c.ok === true ? "✓" : c.ok === false ? "✗" : "?"}
                    </span>
                    <span>
                      <span className="sr-only">
                        {c.ok === true
                          ? "Passing"
                          : c.ok === false
                            ? "Not yet"
                            : "Couldn't check"}
                        :{" "}
                      </span>
                      {c.label}:{" "}
                      <span className="text-body-subtle">{c.text}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </details>
          ))}
        </div>
      </OpsCard>

      <p className="text-body-subtle text-sm">
        Not checkable here: the old ChatGPT hub, Gmail send permission in
        Google, and anything outside Shopify and the Ops database. The full
        write-up is the Ops Hub status document on the{" "}
        <Link to="/ops/tech" className={opsTextLinkClass}>
          Tech tab
        </Link>
        .
      </p>
    </div>
  );
}
