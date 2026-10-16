/**
 * Turns a stored production PO into a plain document model that the PDF
 * renderer lays out and the email summarises. Pure functions: no Shopify, no
 * PDF library, so the content rules are testable on their own.
 *
 * The model is built only from fields that are frozen once a PO is approved
 * (line specs and the logistics snapshot), so the PDF a reviewer previews is
 * the PDF the partner receives.
 */

import {
  DWELLING_OPTIONS,
  ELEVATOR_OPTIONS,
  STAIRS_OPTIONS,
} from "./logistics.js";

export const PO_PARTNER_NAME = "Barkman";
export const PO_COMPANY_NAME = "ModernCre8ve";

function optionLabel(options, value) {
  return options.find((option) => option.value === value)?.label ?? value ?? "";
}

/** `#1009` + revision 1 -> `PO-1009-R1`. */
export function buildPoNumber(orderName, revision = 1) {
  const base =
    String(orderName ?? "")
      .replace(/^#/, "")
      .trim() || "ORDER";
  return `PO-${base}-R${Number(revision) || 1}`;
}

function deliveryRows(snapshot) {
  const logistics = snapshot?.logistics;
  if (!logistics || snapshot?.status !== "complete") return null;

  const address = [
    logistics.address1,
    logistics.address2,
    [logistics.city, logistics.state, logistics.zip].filter(Boolean).join(" "),
  ]
    .filter(Boolean)
    .join(", ");

  const rows = [
    ["Deliver to", address],
    ["Contact", snapshot.order?.customerName || ""],
    ["Phone", logistics.phone],
    ["Home type", optionLabel(DWELLING_OPTIONS, logistics.dwelling)],
    ["Stairs", optionLabel(STAIRS_OPTIONS, logistics.stairs)],
    ["Elevator", optionLabel(ELEVATOR_OPTIONS, logistics.elevator)],
    ["Narrowest doorway", `${logistics.doorwayWidthIn} in`],
    ["Narrowest hallway", `${logistics.hallwayWidthIn} in`],
  ];
  if (logistics.stairwellWidthIn != null) {
    rows.push(["Stairwell width", `${logistics.stairwellWidthIn} in`]);
  }
  if (logistics.notes) rows.push(["Access notes", logistics.notes]);
  return rows.filter(([, value]) => value !== "" && value != null);
}

/**
 * @param {{ po: object, issuedAt?: Date }} input
 * `po` is the object returned by getProductionPo / parsePoFields.
 */
export function buildPoDocument({ po, issuedAt }) {
  const approved = po.state === "approved" || po.state === "sent";
  // An approved PO is dated by its approval, so a re-send (or a later preview)
  // shows the same date as the original. Unapproved previews use today.
  const approvedOn = approved && po.approvedAt ? new Date(po.approvedAt) : null;
  const issued =
    issuedAt ??
    (approvedOn && !Number.isNaN(approvedOn.getTime())
      ? approvedOn
      : new Date());
  return {
    company: PO_COMPANY_NAME,
    partner: PO_PARTNER_NAME,
    number: buildPoNumber(po.orderName, po.revision),
    orderName: po.orderName,
    issuedAt: issued.toISOString().slice(0, 10),
    // A preview of an unapproved PO must never be mistaken for the real thing.
    draft: !approved,
    lines: po.lineSpecs.map((spec, index) => ({
      number: index + 1,
      quantity: spec.quantity,
      product: spec.product,
      size: spec.size,
      species: spec.species,
      leaf: spec.leaf,
      finish: spec.finish,
      other: spec.otherOptions,
      notes: spec.notes,
    })),
    delivery: deliveryRows(po.snapshot),
  };
}

/**
 * Greedy word wrap. `measure(text)` returns the rendered width, so the same
 * function serves any font. Words wider than `maxWidth` are split by
 * character rather than overflowing.
 */
export function wrapText(text, maxWidth, measure) {
  const lines = [];
  for (const paragraph of String(text ?? "").split(/\r?\n/)) {
    let current = "";
    for (const word of paragraph.split(/\s+/).filter(Boolean)) {
      const candidate = current ? `${current} ${word}` : word;
      if (measure(candidate) <= maxWidth) {
        current = candidate;
        continue;
      }
      if (current) lines.push(current);
      current = "";
      let rest = word;
      while (measure(rest) > maxWidth && rest.length > 1) {
        let cut = rest.length - 1;
        while (cut > 1 && measure(rest.slice(0, cut)) > maxWidth) cut -= 1;
        lines.push(rest.slice(0, cut));
        rest = rest.slice(cut);
      }
      current = rest;
    }
    lines.push(current);
  }
  return lines;
}
