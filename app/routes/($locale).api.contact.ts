import { data } from "react-router";
import {
  notifyContactMessage,
  parseContactMessage,
  submitContactMessage,
} from "~/utils/contact-message.server";
import { verifyTurnstile } from "~/utils/turnstile.server";
import type { Route } from "./+types/($locale).api.contact";

export async function action({ request, context }: Route.ActionArgs) {
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

  const { values, error } = parseContactMessage(formData);
  if (error || !values) {
    return data({ ok: false, errorMessage: error }, { status: 400 });
  }

  try {
    const result = await submitContactMessage(context.env, values);
    // Best-effort and off the response path, as for trade applications.
    const notification = notifyContactMessage(
      context.env,
      values,
      result,
    ).catch((notifyErr) => {
      console.error("Contact notification failed:", notifyErr);
    });
    context.waitUntil?.(notification);
  } catch (err) {
    console.error("Contact message failed:", err);
    return data(
      {
        ok: false,
        errorMessage:
          "We couldn't send your message. Please email info@moderncre8ve.com.",
      },
      { status: 500 },
    );
  }
  return data({ ok: true }, { status: 201 });
}

export interface ContactApiPayload {
  ok: boolean;
  errorMessage?: string;
}
