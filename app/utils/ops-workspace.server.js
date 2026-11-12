import { data } from "react-router";
import {
  listContext,
  listOpsTasks,
  saveOpsTask,
} from "./ops-context.server.js";
import { requireOpsUser } from "./ops-identity.server.js";
import { visibleSources } from "./ops-sources.server.js";
import { privateHeaders } from "./ops-store.server.js";

export async function loadWorkspace(request, context, section) {
  const user = await requireOpsUser(request, context);
  const [documents, tasks] = await Promise.allSettled([
    listContext(context.env, user, section),
    section === "daily" && user.role !== "owner"
      ? Promise.resolve([])
      : listOpsTasks(context.env, user, section),
  ]);
  return {
    user,
    section,
    fetchedAt: new Date().toISOString(),
    sources:
      documents.status === "fulfilled"
        ? documents.value
        : visibleSources(user, section).map((source) => ({
            ...source,
            document: null,
          })),
    tasks: tasks.status === "fulfilled" ? tasks.value : [],
    sourceError: documents.status === "rejected",
    taskError: tasks.status === "rejected",
  };
}
export async function workspaceAction(request, context, section) {
  const user = await requireOpsUser(request, context);
  const form = await request.formData();
  try {
    await saveOpsTask(context.env, user, {
      section,
      id: form.get("id"),
      updatedAt: form.get("updatedAt"),
      title: form.get("title"),
      status: form.get("status"),
      evidence: form.get("evidence"),
      ownerEmail: form.get("ownerEmail"),
      dueDate: form.get("dueDate"),
    });
    return data(
      { ok: true, message: "Task saved." },
      { headers: privateHeaders },
    );
  } catch (error) {
    if (error instanceof Response) throw error;
    return data(
      { ok: false, message: error.message },
      { status: 422, headers: privateHeaders },
    );
  }
}
