import { CONTACT_TOPICS } from "./contact-topics.js";
import { pipelineNotificationLine } from "./ops-pipeline-inbound.server.js";
import {
  clean,
  EMAIL_PATTERN,
  sendOwnerEmail,
  upsertTaggedCustomer,
} from "./trade-application.server.js";

/**
 * Contact page submissions. Each message lands on a Shopify customer tagged
 * `contact-inquiry`, with the message appended to the customer note, and
 * emails the owner. Works like the trade and piece-request forms.
 */
export const CONTACT_TAG = "contact-inquiry";

const FIELD_LIMITS = {
  firstName: 80,
  lastName: 80,
  email: 254,
  phone: 40,
  topic: 60,
  message: 4000,
};

/** Normalise and validate raw form values. Returns `{ values }` or `{ error }`. */
export function parseContactMessage(formData) {
  const values = {};
  for (const [key, max] of Object.entries(FIELD_LIMITS)) {
    values[key] = clean(formData.get(key), max);
  }
  if (!values.firstName || !values.lastName) {
    return { error: "Please enter your first and last name." };
  }
  if (!EMAIL_PATTERN.test(values.email)) {
    return { error: "Please enter a valid email address." };
  }
  if (values.message.length < 10) {
    return { error: "Please tell us a little more in your message." };
  }
  // Only ever store a topic we offered.
  if (!CONTACT_TOPICS.includes(values.topic)) {
    values.topic = CONTACT_TOPICS[0];
  }
  values.email = values.email.toLowerCase();
  return { values };
}

export function buildContactNote(values, date = new Date()) {
  const lines = [
    `Contact form — ${date.toISOString().slice(0, 10)}`,
    `Topic: ${values.topic}`,
    values.phone && `Phone: ${values.phone}`,
    `Message: ${values.message}`,
  ];
  return lines.filter(Boolean).join("\n");
}

/** Contact topics that are about an existing order, not a sale: no deal. */
const NOT_A_LEAD_TOPICS = new Set(["Existing order"]);
const TOPIC_DEAL_TYPES = {
  "Custom furniture quote": "custom",
  "Showroom visit": "retail",
};

/**
 * The pipeline deal for a contact message, or null when the topic isn't a
 * sales lead (questions about an existing order belong to Communications).
 */
export function contactPipelineDeal(values, date = new Date()) {
  if (NOT_A_LEAD_TOPICS.has(values.topic)) {
    return null;
  }
  return {
    title: `Contact form: ${values.topic}`,
    dealType: TOPIC_DEAL_TYPES[values.topic] ?? "other",
    source: "contact_form",
    summary: buildContactNote(values, date),
  };
}

export function submitContactMessage(env, values, fetchImpl = fetch) {
  return upsertTaggedCustomer(
    env,
    values,
    { tag: CONTACT_TAG, note: buildContactNote(values) },
    fetchImpl,
  );
}

/**
 * Best-effort owner alert. The recipient comes from server config only
 * (`CONTACT_NOTIFY_EMAIL`, falling back to the trade and PO addresses);
 * returns `{ sent: false }` when mail isn't configured.
 */
export async function notifyContactMessage(
  env,
  values,
  { created, customerId, deal = null },
  fetchImpl = fetch,
) {
  const to =
    env.CONTACT_NOTIFY_EMAIL || env.TRADE_NOTIFY_EMAIL || env.PO_CC_EMAIL;
  if (!env.RESEND_API_KEY || !env.PO_FROM_EMAIL || !to) {
    return { sent: false };
  }
  const adminId = String(customerId).split("/").pop();
  const text = [
    `${values.firstName} ${values.lastName} <${values.email}> sent a message from the contact page.`,
    "",
    buildContactNote(values),
    "",
    `${created ? "New customer" : "Existing customer"}, tagged ${CONTACT_TAG}.`,
    `https://${env.PUBLIC_STORE_DOMAIN}/admin/customers/${adminId}`,
    pipelineNotificationLine(env, deal),
  ]
    .filter((line) => line !== null)
    .join("\n");
  await sendOwnerEmail(
    env,
    {
      to,
      replyTo: values.email,
      subject: `Contact form: ${values.topic} — ${values.firstName} ${values.lastName}`,
      text,
      label: "Contact notification",
    },
    fetchImpl,
  );
  return { sent: true };
}
