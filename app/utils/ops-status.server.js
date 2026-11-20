/**
 * Gathers the live facts behind /ops/status. Every read is independent and
 * best-effort: a failed read becomes "couldn't check", never a guess.
 * Only booleans, counts and timestamps leave this file; no secret, token or
 * customer detail is returned to the browser.
 */
import { careUnavailableReason, loadCareOverview } from "./ops-care.server.js";
import {
  commsUnavailableReason,
  loadCommsOverview,
} from "./ops-comms.server.js";
import { adminGraphql } from "./ops-dashboard.server.js";
import { googleConfigured } from "./ops-identity.server.js";
import {
  loadPipelineOverview,
  pipelineUnavailableReason,
} from "./ops-pipeline.server.js";
import { OPS_SOURCES } from "./ops-sources.server.js";
import { buildOpsStatus, HAVEN } from "./ops-status.js";
import { hasOpsStore, opsStore } from "./ops-store.server.js";
import { readEmailConfig } from "./po-email.js";

const settled = async (promise) => {
  try {
    return { ok: true, value: await promise };
  } catch (error) {
    return { ok: false, error };
  }
};

/** Most recent value of `field` per user_email. */
function latestByUser(rows, field) {
  const out = {};
  for (const row of rows ?? []) {
    const prev = out[row.user_email];
    if (!prev || row[field] > prev) {
      out[row.user_email] = row[field];
    }
  }
  return out;
}

const LAST_REQUEST_QUERY = `
  query OpsStatusLastPieceRequest {
    customers(first: 1, query: "tag:piece-request", sortKey: CREATED_AT, reverse: true) {
      nodes { createdAt }
    }
  }
`;

export async function loadOpsStatusFacts(env, user, now = new Date()) {
  const store = hasOpsStore(env);
  const fromStore = (path) =>
    store ? opsStore(env, path) : Promise.reject(new Error("No store"));
  const adminToken = Boolean(
    env.OPS_ADMIN_API_TOKEN || env.SHOPIFY_ADMIN_API_TOKEN,
  );

  const [sessions, connections, artifacts, care, comms, pipeline, request] =
    await Promise.all([
      // Expired sessions stay until cleanup, so this is the last sign-in
      // unless the person signed out. No token hashes are selected.
      settled(
        fromStore(
          "ops_sessions?select=user_email,created_at&order=created_at.desc&limit=200",
        ),
      ),
      settled(fromStore("ops_connections?select=user_email,updated_at")),
      settled(
        fromStore(
          "ops_artifacts?select=source_id,published_at,source_updated_at,withdrawn",
        ),
      ),
      settled(loadCareOverview(env, user)),
      settled(loadCommsOverview(env, user)),
      settled(loadPipelineOverview(env, user)),
      adminToken
        ? settled(adminGraphql(env, LAST_REQUEST_QUERY))
        : Promise.resolve({ ok: false, error: new Error("No token") }),
    ]);

  const deals = pipeline.ok ? pipeline.value.deals : [];
  const websiteDeals = deals.filter((d) => d.created_by === "website");
  const facts = {
    now: now.toISOString(),
    store,
    googleLogin: googleConfigured(env),
    cutover: env.OPS_INDIVIDUAL_LOGIN_ENABLED === "true",
    encryptionKey: Boolean(env.OPS_CONNECTION_ENCRYPTION_KEY),
    jobSecret: Boolean(env.OPS_JOB_SECRET),
    adminToken,
    requestEmail: Boolean(
      env.RESEND_API_KEY &&
        env.PO_FROM_EMAIL &&
        (env.PIECE_REQUEST_NOTIFY_EMAIL ||
          env.TRADE_NOTIFY_EMAIL ||
          env.PO_CC_EMAIL),
    ),
    poEmail: (({ ok, missing, invalid }) => ({ ok, missing, invalid }))(
      readEmailConfig(env),
    ),
    sessions: sessions.ok ? latestByUser(sessions.value, "created_at") : null,
    connections: connections.ok
      ? latestByUser(connections.value, "updated_at")
      : null,
    artifacts: artifacts.ok ? artifacts.value : null,
    sources: OPS_SOURCES.map(({ id, title, status, freshnessDays }) => ({
      id,
      title,
      status,
      freshnessDays,
    })),
    care: care.ok
      ? {
          settings: care.value.settings,
          sender: care.value.sender
            ? {
                send_as_ok: Boolean(care.value.sender.send_as_ok),
                send_as_problem: care.value.sender.send_as_problem || null,
              }
            : null,
          templates: care.value.templates.map(
            ({ key, version, active, approved_at }) => ({
              key,
              version,
              active,
              approved_at,
            }),
          ),
          assets: care.value.assets.map(
            ({ kind, version, active, approved_at }) => ({
              kind,
              version,
              active,
              approved_at,
            }),
          ),
          accepted: care.value.recent.filter((m) => m.status === "accepted")
            .length,
        }
      : { error: careUnavailableReason(care.error) },
    comms: comms.ok
      ? {
          records: comms.value.records.length,
          openTasks: comms.value.tasks.filter((t) =>
            ["open", "snoozed"].includes(t.status),
          ).length,
        }
      : { error: commsUnavailableReason(comms.error) },
    pipeline: pipeline.ok
      ? {
          openDeals: deals.filter(
            (d) => !["won", "lost", "on_hold"].includes(d.stage),
          ).length,
          websiteDeals: websiteDeals.length,
          lastWebsiteDealAt:
            websiteDeals
              .map((d) => d.created_at)
              .sort()
              .at(-1) ?? null,
          personDeals: deals.filter(
            (d) => d.created_by !== "website" || d.updated_by !== "website",
          ).length,
          havenReplies: pipeline.value.tasks.filter(
            (t) =>
              t.kind === "reply" &&
              t.owner_email === HAVEN &&
              ["open", "snoozed"].includes(t.status),
          ).length,
        }
      : { error: pipelineUnavailableReason(pipeline.error) },
    requestForm: request.ok
      ? {
          lastRequestAt:
            request.value?.customers?.nodes?.[0]?.createdAt ?? null,
        }
      : { error: "Couldn't read Shopify" },
  };
  return facts;
}

export async function loadOpsStatus(env, user, now = new Date()) {
  return buildOpsStatus(await loadOpsStatusFacts(env, user, now));
}
