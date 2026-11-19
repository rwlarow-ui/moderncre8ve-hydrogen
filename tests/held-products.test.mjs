import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { getHeldProduct, HELD_PRODUCTS } from "../app/data/held-products.js";
import {
  buildHeldProducts,
  COLLECTION_PRIORITY,
  displayName,
  FALLBACK_COLLECTION,
  generate,
  OUTPUT,
  pickCollection,
} from "../scripts/build-held-products.mjs";

const read = (name) =>
  JSON.parse(
    readFileSync(
      new URL(`../docs/catalog-rollout-2026-11/${name}`, import.meta.url),
      "utf8",
    ),
  );
const register = read("register.json");
const snapshot = read(register.currentSnapshot);

test("generated module is up to date with the register", () => {
  assert.equal(readFileSync(OUTPUT, "utf8"), generate());
});

test("every held register entry is listed, and nothing else", () => {
  const held = register.entries
    .filter((e) => e.disposition === "held")
    .map((e) => e.handle)
    .sort();
  assert.deepEqual(Object.keys(HELD_PRODUCTS).sort(), held);
});

test("only name and collection ship, never register internals", () => {
  for (const entry of Object.values(HELD_PRODUCTS)) {
    assert.deepEqual(Object.keys(entry).sort(), ["collection", "name"]);
    assert.deepEqual(Object.keys(entry.collection).sort(), ["handle", "title"]);
  }
  const source = readFileSync(OUTPUT, "utf8");
  for (const word of ["blocker", "approvals", "owner", "gid://"]) {
    assert.ok(!source.includes(word), `${word} leaked into ${OUTPUT}`);
  }
});

test("collections come from the curated list", () => {
  const allowed = new Set([
    ...COLLECTION_PRIORITY.map(([handle]) => handle),
    FALLBACK_COLLECTION.handle,
  ]);
  for (const { collection } of Object.values(HELD_PRODUCTS)) {
    assert.ok(allowed.has(collection.handle), collection.handle);
  }
});

test("pickCollection prefers the most specific collection", () => {
  assert.deepEqual(pickCollection(["dining", "benches", "all"]), {
    handle: "benches",
    title: "Benches",
  });
  assert.deepEqual(pickCollection(["all", "japandi"]), FALLBACK_COLLECTION);
});

test("displayName drops the SEO tail", () => {
  assert.equal(
    displayName(
      "Warwick Solid Wood Bed Frame - Modern Platform Bed with Nordic Elegance",
    ),
    "Warwick Solid Wood Bed Frame",
  );
  assert.equal(
    displayName("The Vista: Scandinavian Oval Extendable Dining Table"),
    "The Vista: Scandinavian Oval Extendable Dining Table",
  );
});

test("getHeldProduct knows held handles only", () => {
  assert.equal(getHeldProduct("not-a-real-handle"), null);
  assert.equal(getHeldProduct(""), null);
  assert.equal(getHeldProduct(undefined), null);
  assert.equal(getHeldProduct("constructor"), null);
  const warwick = getHeldProduct("scandinavian-solid-hardwood-bed-frame");
  assert.equal(warwick?.name, "Warwick Solid Wood Bed Frame");
  assert.equal(warwick?.collection.handle, "modern-bed-frames");
});

test("buildHeldProducts skips entries that are not held", () => {
  const r = structuredClone(register);
  r.entries[0].disposition = "launched";
  const built = buildHeldProducts(r, snapshot);
  assert.equal(built[r.entries[0].handle], undefined);
});
