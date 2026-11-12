import { useEffect } from "react";
import {
  Form,
  useActionData,
  useNavigation,
  useRevalidator,
} from "react-router";
import {
  OpsCard,
  OpsField,
  OpsNotice,
  OpsPageHeader,
  OpsSectionHeading,
  OpsTag,
  opsInputClass,
} from "./ops-shell";

const TITLES = {
  daily: "Daily",
  catalog: "Catalog",
  marketing: "Marketing",
  sales: "Sales",
  tech: "Tech",
  brand: "Brand",
};
const DESCRIPTIONS = {
  daily:
    "The work in front of you, with shared order information and your permitted context.",
  catalog: "Release decisions, catalog cleanup and verified follow-through.",
  marketing: "Content drafts, upcoming decisions and search visibility.",
  sales: "Trade opportunities, quote context and the next action.",
  tech: "Current technical work, with historical research kept in context.",
  brand: "The shared language, colors and components of ModernCre8ve.",
};
export type WorkspaceData = {
  section: string;
  user: { email: string; role: string; name: string };
  sources: any[];
  tasks: any[];
  sourceError: boolean;
  taskError: boolean;
  fetchedAt: string;
};
function when(value: string) {
  return new Date(value).toLocaleString("en-US", {
    timeZone: "America/New_York",
    dateStyle: "medium",
    timeStyle: "short",
  });
}
/** Deliberately renders text as React text nodes. No imported HTML/scripts execute. */
export function ContextText({ content }: { content: string }) {
  return (
    <div className="space-y-3 leading-relaxed">
      {content
        .split(/(```[\s\S]*?```)/g)
        .flatMap((block) =>
          block.startsWith("```") ? [block] : block.split(/\n\s*\n/),
        )
        .filter((block) => block.trim())
        .map((paragraph, i) => {
          const lines = paragraph.split("\n");
          if (lines.length > 1 && /^\|?\s*:?-+:?\s*\|/.test(lines[1])) {
            const cells = (line: string) =>
              line
                .replace(/^\||\|$/g, "")
                .split("|")
                .map((cell) => cell.trim());
            return (
              <div key={i} className="overflow-x-auto">
                <table className="w-full text-left font-sans text-sm">
                  <thead>
                    <tr>
                      {cells(lines[0]).map((cell, j) => (
                        <th
                          key={j}
                          className="border-line border-b p-3 font-medium"
                        >
                          {cell}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {lines
                      .slice(2)
                      .filter(Boolean)
                      .map((line, j) => (
                        <tr key={j}>
                          {cells(line).map((cell, k) => (
                            <td
                              key={k}
                              className="min-w-32 border-line-subtle border-b p-3 align-top"
                            >
                              {cell}
                            </td>
                          ))}
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            );
          }
          if (paragraph.startsWith("```"))
            return (
              <pre
                key={i}
                className="overflow-x-auto border border-line-subtle bg-(--color-topbar-bg) p-4 text-sm"
              >
                <code>
                  {paragraph
                    .replace(/^```[^\n]*\n?/, "")
                    .replace(/\n?```$/, "")}
                </code>
              </pre>
            );
          if (lines.every((line) => /^[-*]\s/.test(line)))
            return (
              <ul key={i} className="list-disc space-y-2 pl-5">
                {lines.map((line, j) => (
                  <li key={j}>{line.replace(/^[-*]\s/, "")}</li>
                ))}
              </ul>
            );
          if (/^#{1,4}\s/.test(paragraph) && !paragraph.includes("\n"))
            return (
              <h3 key={i} className="font-sans text-xl">
                {paragraph.replace(/^#+\s/, "")}
              </h3>
            );
          return (
            <p key={i} className="whitespace-pre-wrap break-words">
              {paragraph}
            </p>
          );
        })}
    </div>
  );
}
function SourceBody({ content }: { content: string }) {
  return content.length > 1800 ? (
    <div className="space-y-4">
      <p className="whitespace-pre-wrap">{content.slice(0, 240).trimEnd()}…</p>
      <details>
        <summary className="cursor-pointer font-sans underline underline-offset-4">
          Read full context
        </summary>
        <div className="mt-5">
          <ContextText content={content} />
        </div>
      </details>
    </div>
  ) : (
    <ContextText content={content} />
  );
}
export function OpsWorkspace({
  info,
  children,
}: {
  info: WorkspaceData;
  children?: React.ReactNode;
}) {
  const revalidator = useRevalidator();
  useEffect(() => {
    const timer = window.setInterval(() => {
      // Avoid replacing an in-progress task form with a background refresh.
      if (
        document.visibilityState === "visible" &&
        revalidator.state === "idle" &&
        !document.querySelector("details[open] form") &&
        !document.activeElement?.closest("form")
      )
        revalidator.revalidate();
    }, 60_000);
    return () => window.clearInterval(timer);
  }, [revalidator]);
  const action = useActionData() as
    | { ok: boolean; message: string }
    | undefined;
  return (
    <>
      <OpsPageHeader
        title={TITLES[info.section]}
        description={DESCRIPTIONS[info.section]}
        aside={
          <span className="text-body-subtle text-sm">
            {info.user.name} · {info.user.role === "owner" ? "Owner" : "Team"}
          </span>
        }
      />
      <div className="space-y-8">
        {children}
        {info.sourceError ? (
          <OpsNotice ok={false}>
            Published context is temporarily unavailable. The dated initial
            summaries below are reference material, not a current
            synchronization.
          </OpsNotice>
        ) : null}
        {info.sources.length ? (
          <div className="grid items-start gap-5 lg:grid-cols-2">
            {info.sources.map((source) => {
              const doc = source.document;
              const stale =
                doc &&
                doc.status !== "historical" &&
                Date.now() - new Date(doc.source_updated_at).getTime() >
                  (source.freshnessDays || 7) * 86400000;
              return (
                <OpsCard key={source.id}>
                  <OpsSectionHeading
                    title={source.title}
                    action={
                      <OpsTag>
                        {doc?.withdrawn
                          ? "Withdrawn"
                          : doc
                            ? doc.status === "historical"
                              ? "Historical"
                              : stale
                                ? "Needs refresh"
                                : doc.status === "draft"
                                  ? "Draft"
                                  : "Published context"
                            : "Initial summary"}
                      </OpsTag>
                    }
                  />
                  <div className="space-y-5 p-5 md:p-6">
                    {doc?.withdrawn ? (
                      <p>
                        This source was withdrawn from the hub. Its former
                        content is no longer displayed.
                      </p>
                    ) : (
                      <SourceBody
                        content={
                          doc?.content || source.seedContent || source.summary
                        }
                      />
                    )}
                    <dl className="grid grid-cols-2 gap-3 border-line border-t pt-4 font-sans text-body-subtle text-xs leading-relaxed">
                      <div>
                        <dt>Source updated</dt>
                        <dd>
                          {doc
                            ? when(doc.source_updated_at)
                            : `${source.date} · supplied summary`}
                        </dd>
                      </div>
                      <div>
                        <dt>Last synchronized</dt>
                        <dd>
                          {doc
                            ? `${when(doc.published_at)} · revision ${doc.revision}`
                            : "Not yet published from Claude"}
                        </dd>
                      </div>
                    </dl>
                    {doc ? (
                      <p className="text-body-subtle text-xs">
                        Published by {doc.published_by}. Context updates after a
                        publish-to-hub step; underlying business facts need
                        their own source checks.
                      </p>
                    ) : (
                      <p className="text-body-subtle text-xs">
                        {source.seedContent
                          ? "Dated repository draft, pending approval. "
                          : "Full artifact contents have not been imported. "}
                        Ask Claude to publish this source to synchronize the
                        full artifact.
                      </p>
                    )}
                    <a
                      className="text-sm underline underline-offset-4"
                      href={source.url}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Open original in Claude ↗
                    </a>
                  </div>
                </OpsCard>
              );
            })}
          </div>
        ) : null}
        {action ? <OpsNotice ok={action.ok}>{action.message}</OpsNotice> : null}
        {info.section !== "daily" || info.user.role === "owner" ? (
          <OpsCard>
            <OpsSectionHeading
              title="Next actions"
              description="These records belong to the hub. Publishing a document does not replace task status or completion evidence."
            />
            {info.taskError ? (
              <div className="p-6">
                <OpsNotice ok={false}>
                  Tasks are temporarily unavailable. Reload before making
                  changes.
                </OpsNotice>
              </div>
            ) : (
              <div className="divide-y divide-line">
                {info.tasks.map((task) => (
                  <details
                    key={`${task.id}:${task.updated_at}`}
                    className="p-5 md:p-6"
                  >
                    <summary className="cursor-pointer font-sans">
                      {task.title}{" "}
                      <span className="ml-3 text-body-subtle text-sm">
                        {task.status.replaceAll("_", " ")}
                      </span>
                    </summary>
                    <p className="mt-3 text-body-subtle text-xs">
                      Owner: {task.owner_email}
                      {task.due_date ? ` · due ${task.due_date}` : ""} · Last
                      saved by {task.updated_by} · {when(task.updated_at)}
                    </p>
                    <TaskForm task={task} email={info.user.email} />
                  </details>
                ))}
                <details className="p-5 md:p-6">
                  <summary className="cursor-pointer font-sans">
                    Add an action
                  </summary>
                  <TaskForm email={info.user.email} />
                </details>
              </div>
            )}
          </OpsCard>
        ) : null}
      </div>
    </>
  );
}
function TaskForm({ task, email }: { task?: any; email: string }) {
  const navigation = useNavigation();
  return (
    <Form method="post" className="mt-5 grid gap-4">
      <input type="hidden" name="id" value={task?.id || ""} />
      <input type="hidden" name="updatedAt" value={task?.updated_at || ""} />
      <OpsField label="Action">
        <input
          required
          maxLength={500}
          name="title"
          defaultValue={task?.title}
          className={opsInputClass}
        />
      </OpsField>
      <div className="grid gap-4 sm:grid-cols-2">
        <OpsField label="Owner">
          <select
            name="ownerEmail"
            defaultValue={task?.owner_email || email}
            className={opsInputClass}
          >
            <option value="rob@moderncre8ve.com">Rob</option>
            <option value="havenmb@moderncre8ve.com">Haven</option>
          </select>
        </OpsField>
        <OpsField label="Due date">
          <input
            type="date"
            name="dueDate"
            defaultValue={task?.due_date || ""}
            className={opsInputClass}
          />
        </OpsField>
      </div>
      <OpsField label="Status">
        <select
          name="status"
          defaultValue={task?.status || "todo"}
          className={opsInputClass}
        >
          <option value="todo">To do</option>
          <option value="in_progress">In progress</option>
          <option value="blocked">Blocked</option>
          <option value="done">Done</option>
        </select>
      </OpsField>
      <OpsField
        label="Notes / completion evidence"
        hint="Evidence is required to mark an action done."
      >
        <textarea
          name="evidence"
          maxLength={2000}
          rows={3}
          defaultValue={task?.evidence}
          className={opsInputClass}
        />
      </OpsField>
      <button
        disabled={navigation.state !== "idle"}
        className="justify-self-start border border-body px-5 py-3 hover:bg-(--color-topbar-bg) disabled:opacity-50"
      >
        Save action
      </button>
    </Form>
  );
}
