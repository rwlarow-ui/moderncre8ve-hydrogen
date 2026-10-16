/**
 * Sends an approved production PO to the partner (ADR-0001).
 *
 * Safety properties:
 *  - Only an `approved` PO can be sent (a `sent` PO can be re-sent on purpose).
 *  - The recipient comes from server config, never from the request.
 *  - The PDF is rendered here from stored, frozen fields.
 *  - The first send uses a deterministic Idempotency-Key, so a retry after a
 *    partial failure can't email the partner twice.
 *  - The PO is marked sent only after the email provider accepts the message.
 */

import { buildPoDocument } from "./po-document.js";
import { buildPoEmail, readEmailConfig } from "./po-email.js";
import { renderPoPdf } from "./po-pdf.server.js";
import { getProductionPo, markPoSent } from "./production-po.server.js";

const RESEND_URL = "https://api.resend.com/emails";

async function postToResend({ fetchImpl, config, payload, idempotencyKey }) {
  const response = await fetchImpl(RESEND_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      "Content-Type": "application/json",
      "Idempotency-Key": idempotencyKey,
    },
    body: JSON.stringify(payload),
  });

  let body = null;
  try {
    body = await response.json();
  } catch {
    // Non-JSON error body: fall through to the status check.
  }
  if (!response.ok || !body?.id) {
    const detail = body?.message || body?.error || `HTTP ${response.status}`;
    throw new Error(`The email provider rejected the message: ${detail}`);
  }
  return String(body.id);
}

/**
 * @param {object} env  Oxygen env (context.env)
 * @param {string} param  PO id as used in URLs
 * @param {{ resend?: boolean, deps?: object }} [options]
 */
export async function sendProductionPo(
  env,
  param,
  { resend = false, deps = {} } = {},
) {
  const {
    getPo = getProductionPo,
    markSent = markPoSent,
    render = renderPoPdf,
    fetchImpl = fetch,
    newKey = () => crypto.randomUUID(),
  } = deps;

  const config = readEmailConfig(env);
  if (!config.ok) {
    const parts = [
      config.missing.length ? `missing ${config.missing.join(", ")}` : "",
      config.invalid.length ? `invalid ${config.invalid.join(", ")}` : "",
    ].filter(Boolean);
    throw new Error(`Email isn't configured: ${parts.join("; ")}.`);
  }

  const po = await getPo(env, param);
  const expected = resend ? "sent" : "approved";
  if (po.state !== expected) {
    throw new Error(
      resend
        ? "Only a PO that has already been sent can be re-sent."
        : `Only an approved PO can be sent (this one is ${po.state.replace(/_/g, " ")}).`,
    );
  }

  const document = buildPoDocument({ po });
  const pdfBytes = await render(document);
  const payload = buildPoEmail({ document, pdfBytes, config, resend });

  // A first send is keyed on the PO + revision so retries are deduplicated by
  // the provider; a deliberate re-send needs a fresh key.
  const idempotencyKey = resend ? newKey() : `po-${param}-r${po.revision}`;
  const messageId = await postToResend({
    fetchImpl,
    config,
    payload,
    idempotencyKey,
  });

  try {
    await markSent(env, param, { messageId, resend });
  } catch (error) {
    const reason = error instanceof Error ? error.message : "unknown error";
    throw new Error(
      resend
        ? `The email WAS re-sent (message ${messageId}) but the PO record could not be updated: ${reason}. The record still shows the earlier send.`
        : `The email WAS sent (message ${messageId}) but the PO could not be marked sent: ${reason}. Press Send again to record it: the provider will not email the partner a second time.`,
    );
  }

  return { messageId, to: config.to, number: document.number };
}
