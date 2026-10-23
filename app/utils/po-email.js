/**
 * Builds the partner email for an approved PO (pure; no network). Sending is
 * in po-send.server.js.
 *
 * Environment (Oxygen env vars, never committed or put in
 * .claude/settings.local.json):
 *   RESEND_API_KEY     Resend API key for this storefront
 *   PO_FROM_EMAIL      sender on a domain verified in Resend, e.g.
 *                      "ModernCre8ve Orders <orders@moderncre8ve.com>"
 *   PO_PARTNER_EMAIL   production partner address (Barkman)
 *   PO_CC_EMAIL        optional; copy to the shop so there is a record
 */

const EMAIL_RE = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/;
// Display-name form: Name <addr@host>
const FROM_RE =
  /^(?:[^<>@]+<[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+>|[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+)$/;

export function readEmailConfig(env = {}) {
  const missing = [];
  const invalid = [];
  const apiKey = String(env.RESEND_API_KEY ?? "").trim();
  const from = String(env.PO_FROM_EMAIL ?? "").trim();
  const to = String(env.PO_PARTNER_EMAIL ?? "").trim();
  const cc = String(env.PO_CC_EMAIL ?? "").trim();

  if (!apiKey) {
    missing.push("RESEND_API_KEY");
  }
  if (!from) {
    missing.push("PO_FROM_EMAIL");
  } else if (!FROM_RE.test(from)) {
    invalid.push("PO_FROM_EMAIL");
  }
  if (!to) {
    missing.push("PO_PARTNER_EMAIL");
  } else if (!EMAIL_RE.test(to)) {
    invalid.push("PO_PARTNER_EMAIL");
  }
  if (cc && !EMAIL_RE.test(cc)) {
    invalid.push("PO_CC_EMAIL");
  }

  return {
    ok: !missing.length && !invalid.length,
    missing,
    invalid,
    apiKey,
    from,
    to,
    cc: cc || null,
  };
}

export function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Standard base64 of bytes, chunked so large PDFs don't overflow the stack. */
export function bytesToBase64(bytes) {
  const CHUNK = 0x8000;
  let binary = "";
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return btoa(binary);
}

/**
 * The body lists what to build but leaves the customer's address and phone to
 * the PDF, so contact details travel in one place only.
 */
export function buildPoEmail({ document, pdfBytes, config, resend = false }) {
  const filename = `${document.number}.pdf`;
  const subject = `${resend ? "Resent: " : ""}Purchase order ${document.number} (order ${document.orderName})`;
  const pieces = document.lines.map((line) => {
    const spec = [line.size, line.species, line.finish]
      .filter(Boolean)
      .join(", ");
    return `${line.quantity} x ${line.product}${spec ? ` (${spec})` : ""}`;
  });

  const text = [
    `Hi ${document.partner} team,`,
    "",
    `Attached is purchase order ${document.number} for order ${document.orderName}.`,
    "",
    "Pieces:",
    ...pieces.map((piece) => `- ${piece}`),
    "",
    "Delivery details and access notes are in the PDF. Please reply to confirm you have received it and let us know the expected completion date.",
    "",
    "Thank you,",
    document.company,
  ].join("\n");

  const html = [
    `<p>Hi ${escapeHtml(document.partner)} team,</p>`,
    `<p>Attached is purchase order <strong>${escapeHtml(document.number)}</strong> for order ${escapeHtml(document.orderName)}.</p>`,
    "<p>Pieces:</p>",
    `<ul>${pieces.map((piece) => `<li>${escapeHtml(piece)}</li>`).join("")}</ul>`,
    "<p>Delivery details and access notes are in the PDF. Please reply to confirm you have received it and let us know the expected completion date.</p>",
    `<p>Thank you,<br>${escapeHtml(document.company)}</p>`,
  ].join("");

  return {
    from: config.from,
    to: [config.to],
    ...(config.cc ? { cc: [config.cc] } : {}),
    reply_to: config.cc || undefined,
    subject,
    text,
    html,
    attachments: [{ filename, content: bytesToBase64(pdfBytes) }],
  };
}
