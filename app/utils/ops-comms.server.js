/**
 * Customer Communications storage adapter. Rules are in ops-comms.js; this
 * file only reads/writes the private Ops database through server-only RPCs.
 */
import {
  applyLogisticsAction,
  applyManualEvent,
  emptyCommsRecord,
  recordForStorage,
  validateNewTask,
  validateProductionUpdate,
  validateTaskUpdate,
} from "./ops-comms.js";
import { hasOpsStore, opsRpc } from "./ops-store.server.js";

export const COMMS_SETUP_SQL = "scripts/sql/ops-hub-communications.sql";

/**
 * Explains why the communications store can't be used, or null when it can.
 * PostgREST answers 404 for an RPC that doesn't exist yet.
 */
export function commsUnavailableReason(error) {
  const message = error instanceof Error ? error.message : String(error);
  if (/\(404\)/.test(message)) {
    return `The communications tables haven't been created yet. Run ${COMMS_SETUP_SQL} in the Ops Supabase project.`;
  }
  return message;
}

export async function loadCommsOverview(env, user) {
  if (!hasOpsStore(env)) {
    throw new Error("The Ops database is not connected yet.");
  }
  const overview = await opsRpc(env, "ops_comms_overview", {
    p_email: user.email,
  });
  return {
    records: overview?.records ?? [],
    production: overview?.production ?? [],
    tasks: overview?.tasks ?? [],
    last: overview?.last ?? [],
  };
}

export async function loadCommsDetail(env, user, orderId) {
  if (!hasOpsStore(env)) {
    throw new Error("The Ops database is not connected yet.");
  }
  const detail = await opsRpc(env, "ops_comms_detail", {
    p_email: user.email,
    p_order_id: orderId,
  });
  return {
    record: detail?.record ?? null,
    production: detail?.production ?? null,
    events: detail?.events ?? [],
    tasks: detail?.tasks ?? [],
  };
}

function apply(env, user, order, current, change) {
  return opsRpc(env, "ops_comms_apply", {
    p_email: user.email,
    p_order_id: order.legacyId,
    p_order_name: order.name,
    p_expected_updated_at: current?.updated_at ?? null,
    p_record: recordForStorage(change.record),
    p_events: change.events,
    p_open_tasks: change.openTasks.map((task) => ({
      owner_email: "haven@moderncre8ve.com",
      ...task,
    })),
    p_close_task_kinds: change.closeTaskKinds,
  });
}

/**
 * @param {any} env
 * @param {{ email: string }} user
 * @param {{ legacyId: string, name: string }} order  Read from Shopify, never from the form.
 * @param {FormData} form
 */
export async function commsAction(env, user, order, form) {
  const intent = String(form.get("intent") || "");
  const { record: current } = await loadCommsDetail(env, user, order.legacyId);
  // The record version the user was looking at, so concurrent edits conflict.
  const seen = String(form.get("updatedAt") || "") || null;
  const base = current
    ? { ...current, updated_at: seen }
    : { ...emptyCommsRecord(), updated_at: seen };
  const text = (name) => String(form.get(name) ?? "");

  switch (intent) {
    case "logistics": {
      const change = applyLogisticsAction(
        base,
        text("action"),
        {
          date: text("date"),
          evidenceUrl: text("evidenceUrl"),
          note: text("note"),
          provider: text("provider"),
          recipient: text("recipient"),
          method: text("method"),
          enabled: form.get("enabled") === "on",
          paused: form.get("paused") === "on",
        },
        { actor: user.email },
      );
      await apply(env, user, order, base, change);
      return "Saved.";
    }
    case "event": {
      const change = applyManualEvent(base, {
        kind: text("kind"),
        date: text("date"),
        summary: text("summary"),
        evidenceUrl: text("evidenceUrl"),
        includesReminder: form.get("includesReminder") === "on",
      });
      await apply(env, user, order, base, change);
      return "Recorded.";
    }
    case "new-task": {
      const task = validateNewTask({
        kind: text("kind"),
        title: text("title"),
        ownerEmail: text("ownerEmail"),
        dueOn: text("dueOn"),
      });
      await apply(env, user, order, base, {
        record: base,
        events: [],
        openTasks: [
          {
            kind: task.kind,
            title: task.title,
            owner_email: task.ownerEmail,
            due_on: task.dueOn,
          },
        ],
        closeTaskKinds: [],
      });
      return "Task added. If one of that type was already open, it was kept.";
    }
    case "task": {
      const update = validateTaskUpdate({
        status: text("status"),
        dueOn: text("dueOn"),
        ownerEmail: text("ownerEmail"),
        note: text("note"),
      });
      await opsRpc(env, "ops_comms_update_task", {
        p_email: user.email,
        p_id: text("taskId"),
        p_status: update.status,
        p_due_on: update.dueOn,
        p_owner_email: update.ownerEmail,
        p_note: update.note,
        p_expected_updated_at: text("taskUpdatedAt") || null,
      });
      return "Task updated.";
    }
    case "production": {
      const production = validateProductionUpdate({
        stage: text("stage"),
        confirmedOn: text("confirmedOn"),
        source: text("source"),
        estimateWeeks: text("estimateWeeks"),
      });
      await opsRpc(env, "ops_save_production", {
        p_email: user.email,
        p_order_id: order.legacyId,
        p_order_name: order.name,
        p_stage: production.stage,
        p_confirmed_on: production.confirmedOn,
        p_source: production.source,
        p_estimate_weeks: production.estimateWeeks,
        p_expected_updated_at: text("productionUpdatedAt") || null,
      });
      return "Production stage saved.";
    }
    default:
      throw new Error("Unknown action.");
  }
}
