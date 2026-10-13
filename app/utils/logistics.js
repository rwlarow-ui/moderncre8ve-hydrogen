/**
 * White-glove delivery logistics collected on the cart page (ADR-0001).
 *
 * The form is stored as cart attributes, which Shopify copies to
 * `order.customAttributes`. Attributes are customer-controlled input, so the
 * server validates them (see the cart route action) and the order-creation
 * step must validate again before copying them into the
 * `moderncre8ve.logistics` metafield. Never treat attributes as the record.
 */

export const LOGISTICS_ATTRIBUTE_KEYS = [
  "logistics",
  "logistics_status",
  "stairs",
  "elevator",
  "delivery_zip",
];

export const STAIRS_OPTIONS = [
  { value: "none", label: "No stairs" },
  { value: "few", label: "A few steps (1–5)" },
  { value: "one_flight", label: "One flight" },
  { value: "multiple", label: "Multiple flights" },
];

export const ELEVATOR_OPTIONS = [
  { value: "none", label: "No elevator" },
  { value: "passenger", label: "Passenger elevator" },
  { value: "freight", label: "Freight / service elevator" },
];

export const DWELLING_OPTIONS = [
  { value: "house", label: "House" },
  { value: "townhome", label: "Townhome" },
  { value: "apartment_condo", label: "Apartment / condo" },
  { value: "business", label: "Business" },
];

const ZIP_RE = /^\d{5}(-\d{4})?$/;
const STATE_RE = /^[A-Za-z]{2}$/;
const MAX_TEXT = 120;
const MAX_NOTES = 300;
const MIN_WIDTH_IN = 10;
const MAX_WIDTH_IN = 120;

/** Strips control characters and collapses surrounding whitespace. */
function clean(value, max = MAX_TEXT) {
  let out = "";
  for (const char of String(value ?? "")) {
    const code = char.charCodeAt(0);
    out += code < 32 || code === 127 ? " " : char;
  }
  return out.trim().slice(0, max);
}

function optionValues(options) {
  return options.map((option) => option.value);
}

function parseWidth(raw) {
  const text = clean(raw, 8);
  if (!text) return null;
  const number = Number(text);
  if (!Number.isFinite(number)) return Number.NaN;
  return Math.round(number * 10) / 10;
}

/**
 * Validates raw form input.
 *
 * `later: true` is the "I'll provide this after I order" escape hatch and
 * requires nothing; the post-purchase form collects the details instead.
 *
 * @returns {{ ok: boolean, errors: Record<string, string>, value: object | null }}
 */
export function validateLogistics(input = {}) {
  if (input?.later === true || input?.later === "true") {
    return { ok: true, errors: {}, value: { later: true } };
  }

  const errors = {};

  const value = {
    dwelling: clean(input.dwelling),
    address1: clean(input.address1),
    address2: clean(input.address2),
    city: clean(input.city),
    state: clean(input.state, 2).toUpperCase(),
    zip: clean(input.zip, 10),
    phone: clean(input.phone, 20),
    stairs: clean(input.stairs),
    elevator: clean(input.elevator),
    doorwayWidthIn: parseWidth(input.doorwayWidthIn),
    hallwayWidthIn: parseWidth(input.hallwayWidthIn),
    stairwellWidthIn: parseWidth(input.stairwellWidthIn),
    notes: clean(input.notes, MAX_NOTES),
  };

  if (!optionValues(DWELLING_OPTIONS).includes(value.dwelling)) {
    errors.dwelling = "Choose the type of home.";
  }
  if (!value.address1) errors.address1 = "Enter the delivery address.";
  if (!value.city) errors.city = "Enter the city.";
  if (!STATE_RE.test(value.state)) {
    errors.state = "Use the 2-letter state code.";
  }
  if (!ZIP_RE.test(value.zip)) errors.zip = "Enter a valid ZIP code.";
  if (value.phone.replace(/\D/g, "").length < 10) {
    errors.phone = "Enter a phone number the delivery team can reach.";
  }
  if (!optionValues(STAIRS_OPTIONS).includes(value.stairs)) {
    errors.stairs = "Tell us about stairs.";
  }
  if (!optionValues(ELEVATOR_OPTIONS).includes(value.elevator)) {
    errors.elevator = "Tell us about elevators.";
  }

  for (const [field, label, required] of [
    ["doorwayWidthIn", "narrowest doorway", true],
    ["hallwayWidthIn", "narrowest hallway", true],
    [
      "stairwellWidthIn",
      "stairwell",
      value.stairs !== "" && value.stairs !== "none",
    ],
  ]) {
    const width = value[field];
    if (width === null) {
      if (required)
        errors[field] = `Enter the width of the ${label} in inches.`;
    } else if (
      Number.isNaN(width) ||
      width < MIN_WIDTH_IN ||
      width > MAX_WIDTH_IN
    ) {
      errors[field] =
        `Enter a width between ${MIN_WIDTH_IN} and ${MAX_WIDTH_IN} inches.`;
    }
  }

  if (Object.keys(errors).length) {
    return { ok: false, errors, value: null };
  }
  return { ok: true, errors: {}, value };
}

/**
 * Builds the cart attributes for a validated value. `stairs`, `elevator` and
 * `delivery_zip` are duplicated as flat attributes so the lower-friction
 * tier in the ADR (and Flow, which reads flat keys) works without parsing JSON.
 */
export function toCartAttributes(value) {
  if (value?.later) {
    return [
      { key: "logistics", value: JSON.stringify({ later: true }) },
      { key: "logistics_status", value: "later" },
    ];
  }
  return [
    { key: "logistics", value: JSON.stringify(value) },
    { key: "logistics_status", value: "complete" },
    { key: "stairs", value: value.stairs },
    { key: "elevator", value: value.elevator },
    { key: "delivery_zip", value: value.zip },
  ];
}

/**
 * Merges new logistics attributes into the cart's existing ones so unrelated
 * attributes survive regardless of how cartAttributesUpdate treats omitted
 * keys.
 */
export function mergeCartAttributes(existing = [], value) {
  const managed = new Set(LOGISTICS_ATTRIBUTE_KEYS);
  const kept = (existing ?? [])
    .filter((attribute) => attribute && !managed.has(attribute.key))
    .map(({ key, value: attrValue }) => ({ key, value: attrValue ?? "" }));
  return [...kept, ...toCartAttributes(value)];
}

/**
 * Reads logistics state back from a cart's attributes.
 *
 * Re-validates the stored JSON: an attribute can be overwritten by anything
 * holding the cart, so `complete` is only reported when the payload passes.
 *
 * @returns {{ status: "none" | "later" | "complete", value: object | null }}
 */
export function readLogistics(attributes = []) {
  const raw = (attributes ?? []).find((a) => a?.key === "logistics")?.value;
  if (!raw) return { status: "none", value: null };

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { status: "none", value: null };
  }

  const result = validateLogistics(parsed);
  if (!result.ok) return { status: "none", value: null };
  if (result.value.later) return { status: "later", value: null };
  return { status: "complete", value: result.value };
}

/** True when the customer may proceed to checkout. */
export function isLogisticsReady(attributes) {
  return readLogistics(attributes).status !== "none";
}
