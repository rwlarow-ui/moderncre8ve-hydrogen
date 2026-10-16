import assert from "node:assert/strict";
import test from "node:test";
import {
  isLogisticsReady,
  mergeCartAttributes,
  readLogistics,
  toCartAttributes,
  validateLogistics,
} from "../app/utils/logistics.js";

const valid = {
  dwelling: "house",
  address1: "12 Maple St",
  address2: "",
  city: "Lancaster",
  state: "pa",
  zip: "17601",
  phone: "(717) 555-0100",
  stairs: "none",
  elevator: "none",
  doorwayWidthIn: "32",
  hallwayWidthIn: "36",
};

test("accepts a complete form and normalizes it", () => {
  const result = validateLogistics(valid);
  assert.equal(result.ok, true);
  assert.equal(result.value.state, "PA");
  assert.equal(result.value.doorwayWidthIn, 32);
});

test("reports every missing required field", () => {
  const result = validateLogistics({});
  assert.equal(result.ok, false);
  for (const key of [
    "dwelling",
    "address1",
    "city",
    "state",
    "zip",
    "phone",
    "stairs",
    "elevator",
    "doorwayWidthIn",
    "hallwayWidthIn",
  ]) {
    assert.ok(result.errors[key], `expected error for ${key}`);
  }
});

test("stairwell width is required only when there are stairs", () => {
  assert.equal(validateLogistics(valid).ok, true);
  const withStairs = validateLogistics({ ...valid, stairs: "one_flight" });
  assert.equal(withStairs.ok, false);
  assert.ok(withStairs.errors.stairwellWidthIn);
  assert.equal(
    validateLogistics({
      ...valid,
      stairs: "one_flight",
      stairwellWidthIn: "34",
    }).ok,
    true,
  );
});

test("rejects implausible widths and bad ZIPs", () => {
  assert.ok(
    validateLogistics({ ...valid, doorwayWidthIn: "3" }).errors.doorwayWidthIn,
  );
  assert.ok(
    validateLogistics({ ...valid, hallwayWidthIn: "abc" }).errors
      .hallwayWidthIn,
  );
  assert.ok(validateLogistics({ ...valid, zip: "1760" }).errors.zip);
});

test("'provide later' needs no fields", () => {
  const result = validateLogistics({ later: true });
  assert.deepEqual(result.value, { later: true });
  assert.deepEqual(
    toCartAttributes(result.value).map((a) => a.key),
    ["logistics", "logistics_status"],
  );
});

test("round-trips through cart attributes", () => {
  const { value } = validateLogistics(valid);
  const attributes = toCartAttributes(value);
  const read = readLogistics(attributes);
  assert.equal(read.status, "complete");
  assert.equal(read.value.zip, "17601");
  assert.equal(attributes.find((a) => a.key === "delivery_zip").value, "17601");
});

test("tampered or malformed attributes do not unlock checkout", () => {
  assert.equal(isLogisticsReady([]), false);
  assert.equal(
    isLogisticsReady([{ key: "logistics", value: "{not json" }]),
    false,
  );
  assert.equal(
    isLogisticsReady([{ key: "logistics_status", value: "complete" }]),
    false,
  );
  assert.equal(
    isLogisticsReady([
      { key: "logistics", value: JSON.stringify({ city: "x" }) },
    ]),
    false,
  );
  assert.equal(isLogisticsReady(toCartAttributes({ later: true })), true);
});

test("merge keeps unrelated attributes and replaces old logistics keys", () => {
  const { value } = validateLogistics(valid);
  const merged = mergeCartAttributes(
    [
      { key: "gift", value: "yes" },
      { key: "stairs", value: "stale" },
      { key: "logistics_status", value: "later" },
    ],
    value,
  );
  assert.equal(merged.filter((a) => a.key === "stairs").length, 1);
  assert.equal(merged.find((a) => a.key === "stairs").value, "none");
  assert.equal(merged.find((a) => a.key === "gift").value, "yes");
  assert.equal(
    merged.find((a) => a.key === "logistics_status").value,
    "complete",
  );
});

test("strips control characters from free text", () => {
  const result = validateLogistics({
    ...valid,
    notes: "gate code\u0000 1234\n",
  });
  assert.equal(result.value.notes, "gate code  1234");
});
