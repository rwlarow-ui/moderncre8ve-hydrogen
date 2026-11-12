import { hashSecret } from "./ops-identity.server.js";
import { requireSource, visibleSources } from "./ops-sources.server.js";
import { opsRpc } from "./ops-store.server.js";

export function validatePublication(input, user) {
  const source = requireSource(input.sourceId, user);
  if (
    !Number.isSafeInteger(input.expectedRevision) ||
    input.expectedRevision < 0
  )
    throw new Error("Read the source first and supply its expectedRevision.");
  if (
    typeof input.content !== "string" ||
    !input.content.trim() ||
    input.content.length > 100_000
  )
    throw new Error("Supply 1–100,000 characters of text or Markdown.");
  const date = new Date(input.sourceUpdatedAt);
  if (
    !input.sourceUpdatedAt ||
    !Number.isFinite(date.getTime()) ||
    date.getTime() > Date.now() + 300_000
  )
    throw new Error(
      "Supply a valid sourceUpdatedAt timestamp, not a future date.",
    );
  const status = input.status || source.status;
  if (!["current", "draft", "historical"].includes(status))
    throw new Error("Invalid document status.");
  return {
    sourceId: source.id,
    content: input.content,
    sourceUpdatedAt: date.toISOString(),
    status,
    expectedRevision: input.expectedRevision,
  };
}
export async function listContext(env, user, section) {
  const sources = visibleSources(user, section);
  if (!sources.length) return [];
  const rows = await opsRpc(env, "ops_read_artifacts", {
    p_email: user.email,
    p_ids: sources.map((s) => s.id),
  });
  return sources.map((source) => ({
    ...source,
    document: rows.find((row) => row.source_id === source.id) || null,
  }));
}
export async function publishContext(env, user, input) {
  const value = validatePublication(input, user);
  const fingerprint = await hashSecret(
    JSON.stringify([value.content, value.sourceUpdatedAt, value.status]),
  );
  return opsRpc(env, "ops_publish_artifact", {
    p_email: user.email,
    p_source_id: value.sourceId,
    p_content: value.content,
    p_source_updated_at: value.sourceUpdatedAt,
    p_status: value.status,
    p_expected_revision: value.expectedRevision,
    p_hash: fingerprint,
    p_withdrawn: false,
  });
}
export async function withdrawContext(env, user, input) {
  requireSource(input.sourceId, user);
  if (
    !Number.isSafeInteger(input.expectedRevision) ||
    input.expectedRevision < 1
  )
    throw new Error("Supply the current expectedRevision.");
  return opsRpc(env, "ops_publish_artifact", {
    p_email: user.email,
    p_source_id: input.sourceId,
    p_content: "",
    p_source_updated_at: new Date().toISOString(),
    p_status: "historical",
    p_expected_revision: input.expectedRevision,
    p_hash: await hashSecret(
      `withdraw:${input.sourceId}:${input.expectedRevision}`,
    ),
    p_withdrawn: true,
  });
}
export async function listOpsTasks(env, user, section) {
  return opsRpc(env, "ops_read_tasks", {
    p_email: user.email,
    p_section: section,
  });
}
export async function saveOpsTask(env, user, input) {
  if (
    !["catalog", "marketing", "sales", "tech", "brand", "daily"].includes(
      input.section,
    ) ||
    (input.section === "daily" && user.role !== "owner")
  )
    throw new Response("Forbidden", { status: 403 });
  const title = String(input.title || "").trim();
  const evidence = String(input.evidence || "").trim();
  if (
    !title ||
    title.length > 500 ||
    evidence.length > 2000 ||
    !["todo", "in_progress", "blocked", "done"].includes(input.status)
  )
    throw new Error("Check the task title, status and evidence.");
  if (input.status === "done" && !evidence)
    throw new Error("Record evidence before marking a task done.");
  const owner = input.ownerEmail || user.email;
  if (!["rob@moderncre8ve.com", "havenmb@moderncre8ve.com"].includes(owner))
    throw new Error("Choose Rob or Haven as the task owner.");
  const due = input.dueDate || null;
  if (
    due &&
    (!/^\d{4}-\d{2}-\d{2}$/.test(due) ||
      new Date(`${due}T00:00:00Z`).toISOString().slice(0, 10) !== due)
  )
    throw new Error("Choose a valid due date.");
  return opsRpc(env, "ops_save_task", {
    p_email: user.email,
    p_section: input.section,
    p_id: input.id || null,
    p_title: title,
    p_status: input.status,
    p_evidence: evidence,
    p_expected_updated_at: input.updatedAt || null,
    p_owner_email: owner,
    p_due_date: due,
  });
}
