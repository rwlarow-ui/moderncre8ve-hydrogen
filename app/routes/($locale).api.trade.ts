import type { ActionFunction, ActionFunctionArgs } from "react-router";
import { data } from "react-router";
import {
  notifyTradeApplication,
  parseTradeApplication,
  submitTradeApplication,
} from "~/utils/trade-application.server";
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

  const { values, error } = parseTradeApplication(formData);
  if (error || !values) {
    return data({ ok: false, errorMessage: error }, { status: 400 });
  }

  try {
    const result = await submitTradeApplication(context.env, values);
    // Best-effort and off the response path: the applicant is already tagged,
    // so a slow or failing alert must not delay or fail the submission.
    const notification = notifyTradeApplication(
      context.env,
      values,
      result,
    ).catch((notifyErr) => {
      console.error("Trade notification failed:", notifyErr);
    });
    context.waitUntil?.(notification);
  } catch (err) {
    console.error("Trade application failed:", err);
    return data(
      {
        ok: false,
        errorMessage:
          "We couldn't submit your application. Please email info@moderncre8ve.com.",
      },
      { status: 500 },
    );
  }
  return data({ ok: true }, { status: 201 });
};

export interface TradeApiPayload {
  ok: boolean;
  errorMessage?: string;
}
