import {
  clean,
  EMAIL_PATTERN,
  sendOwnerEmail,
  upsertTaggedCustomer,
} from "./trade-application.server.js";

/**
 * "Request this piece" submissions from products tagged `request-only`
 * (see `isRequestOnly` in product-class.ts). Each request lands on a Shopify
 * customer tagged `piece-request`, with the request in the customer note, and
 * emails the owner. Nothing is charged or reserved.
 */
export const PIECE_REQUEST_TAG = "piece-request";

const FIELD_LIMITS = {
  firstName: 80,
  lastName: 80,
  email: 254,
  phone: 40,
  zip: 20,
  details: 2000,
  productHandle: 255,
  productTitle: 255,
  variantTitle: 255,
  variantPrice: 40,
};

/** Normalise and validate raw form values. Returns `{ values }` or `{ error }`. */
export function parsePieceRequest(formData) {
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
  if (!values.productHandle) {
    return { error: "Please choose the piece you'd like to request." };
  }
  values.email = values.email.toLowerCase();
  return { values };
}

export function buildPieceRequestNote(values, date = new Date()) {
  const lines = [
    `Piece request — ${date.toISOString().slice(0, 10)}`,
    `Product: ${values.productTitle || values.productHandle} (${values.productHandle})`,
    values.variantTitle && `Configuration: ${values.variantTitle}`,
    values.variantPrice && `Listed price: ${values.variantPrice}`,
    values.phone && `Phone: ${values.phone}`,
    values.zip && `Delivery ZIP: ${values.zip}`,
    values.details && `Notes: ${values.details}`,
  ];
  return lines.filter(Boolean).join("\n");
}

export function submitPieceRequest(env, values, fetchImpl = fetch) {
  return upsertTaggedCustomer(
    env,
    values,
    { tag: PIECE_REQUEST_TAG, note: buildPieceRequestNote(values) },
    fetchImpl,
  );
}

/**
 * Best-effort owner alert. The recipient comes from server config only
 * (`PIECE_REQUEST_NOTIFY_EMAIL`, falling back to the trade and PO addresses);
 * returns `{ sent: false }` when mail isn't configured.
 */
export async function notifyPieceRequest(
  env,
  values,
  { created, customerId },
  fetchImpl = fetch,
) {
  const to =
    env.PIECE_REQUEST_NOTIFY_EMAIL || env.TRADE_NOTIFY_EMAIL || env.PO_CC_EMAIL;
  if (!env.RESEND_API_KEY || !env.PO_FROM_EMAIL || !to) {
    return { sent: false };
  }
  const adminId = String(customerId).split("/").pop();
  const text = [
    `${values.firstName} ${values.lastName} <${values.email}> requested a piece.`,
    "",
    buildPieceRequestNote(values),
    "",
    `${created ? "New customer" : "Existing customer"}, tagged ${PIECE_REQUEST_TAG}.`,
    `https://${env.PUBLIC_STORE_DOMAIN}/admin/customers/${adminId}`,
  ].join("\n");
  await sendOwnerEmail(
    env,
    {
      to,
      replyTo: values.email,
      subject: `Piece request: ${values.productTitle || values.productHandle}`,
      text,
      label: "Piece request notification",
    },
    fetchImpl,
  );
  return { sent: true };
}
