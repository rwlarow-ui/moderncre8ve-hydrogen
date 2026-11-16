import type { ActionFunction, ActionFunctionArgs } from "react-router";
import { data } from "react-router";
import { afterIntake } from "~/utils/ops-pipeline-inbound.server";
import {
  notifyPieceRequest,
  parsePieceRequest,
  piecePipelineDeal,
  submitPieceRequest,
} from "~/utils/piece-request.server";
import { verifyTurnstile } from "~/utils/turnstile.server";

export const action: ActionFunction = async ({
  request,
  context,
}: ActionFunctionArgs) => {
  const formData = await request.formData();

  // Hidden "website" honeypot: pretend success to bots.
  if (formData.get("website")) {
    return data({ ok: true }, { status: 201 });
  }

  const turnstileValid = await verifyTurnstile(
    formData.get("cf-turnstile-response") as string,
    context.env?.TURNSTILE_SECRET_KEY,
    request.headers.get("CF-Connecting-IP") || undefined,
  );
  if (!turnstileValid) {
    return data(
      {
        ok: false,
        errorMessage:
          "Please complete the verification challenge and try again.",
      },
      { status: 400 },
    );
  }

  const { values, error } = parsePieceRequest(formData);
  if (error || !values) {
    return data({ ok: false, errorMessage: error }, { status: 400 });
  }

  try {
    const result = await submitPieceRequest(context.env, values);
    // Best-effort and off the response path: the customer is already saved,
    // so a slow or failing pipeline or alert must not delay or fail the form.
    context.waitUntil?.(
      afterIntake(
        context.env,
        result,
        piecePipelineDeal(values),
        (saved) => notifyPieceRequest(context.env, values, saved),
        "Piece request",
      ),
    );
  } catch (err) {
    console.error("Piece request failed:", err);
    return data(
      {
        ok: false,
        errorMessage:
          "We couldn't send your request. Please email info@moderncre8ve.com.",
      },
      { status: 500 },
    );
  }
  return data({ ok: true }, { status: 201 });
};

export interface PieceRequestApiPayload {
  ok: boolean;
  errorMessage?: string;
}
