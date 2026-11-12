import { useLoaderData } from "react-router";
import { OpsCard, OpsSectionHeading } from "~/components/ops/ops-shell";
import { ContextText, OpsWorkspace } from "~/components/ops/workspace";
import { loadOpsGitHub } from "~/utils/ops-github.server";
import { privateHeaders } from "~/utils/ops-store.server";
import { loadWorkspace, workspaceAction } from "~/utils/ops-workspace.server";
import debt from "../../docs/tech-debt-2026-10.md?raw";
import type { Route } from "./+types/ops.tech";
export const headers = () => privateHeaders;
export async function loader({ request, context }: Route.LoaderArgs) {
  const info = await loadWorkspace(request, context, "tech");
  return { info, debt, github: await loadOpsGitHub(context.env) };
}
export const action = ({ request, context }: Route.ActionArgs) =>
  workspaceAction(request, context, "tech");
export default function Workspace() {
  const { info, debt, github } = useLoaderData<typeof loader>();
  return (
    <OpsWorkspace info={info}>
      <OpsCard>
        <OpsSectionHeading
          title="GitHub · current work"
          description="The production repository: rwlarow-ui/moderncre8ve-hydrogen."
        />
        <div className="space-y-4 p-6">
          {!github.connected ? (
            <p>
              A read-only GitHub connection has not been configured.{" "}
              <a
                className="underline"
                href="https://github.com/rwlarow-ui/moderncre8ve-hydrogen/issues"
                target="_blank"
                rel="noreferrer"
              >
                Open repository issues
              </a>
              .
            </p>
          ) : (
            <>
              {github.run ? (
                <p>
                  Latest main workflow:{" "}
                  <a
                    href={github.run.url}
                    className="underline"
                    target="_blank"
                    rel="noreferrer"
                  >
                    {github.run.conclusion || github.run.status}
                  </a>
                </p>
              ) : (
                <p>Latest main workflow is unavailable.</p>
              )}
              {github.issues ? (
                <ul className="space-y-2">
                  {github.issues.map((issue) => (
                    <li key={issue.number}>
                      <a
                        href={issue.url}
                        className="underline"
                        target="_blank"
                        rel="noreferrer"
                      >
                        #{issue.number} · {issue.title}
                      </a>
                    </li>
                  ))}
                </ul>
              ) : (
                <p>Issues are temporarily unavailable.</p>
              )}
            </>
          )}
        </div>
      </OpsCard>
      <OpsCard>
        <OpsSectionHeading
          title="Repository debt register"
          description="Deployed repository snapshot. Its own dates apply; GitHub and later verified work can supersede entries."
        />
        <details className="p-6">
          <summary className="cursor-pointer font-sans">
            Read the register
          </summary>
          <div className="mt-6">
            <ContextText content={debt} />
          </div>
        </details>
      </OpsCard>
    </OpsWorkspace>
  );
}
