#!/usr/bin/env node
/**
 * Offline check for trust content that does not come from real data.
 *
 * Postmortem 2026-11-03 (docs/postmortems/2026-11-03-placeholder-customer-names.md):
 * the "In Your Home" gallery shipped four sample customer names on every
 * product page for ~7 months, and a reviews block whose component type was
 * never registered left an empty "What Our Customers Say" heading.
 *
 * Checks (source only, no network, no .env):
 *   1. attribution-default — a section schema input that attributes words or
 *      photos to a person (author, customerName, reviewer...) has a non-empty
 *      `defaultValue`, or a section `presets` block sets one. Either would
 *      publish an invented person the moment the section is added.
 *   2. sample-attribution — a page composition attributes content to a known
 *      sample name ("Sarah M., Chicago" style placeholders).
 *   3. unregistered-type — a page composition item uses a `type` that no
 *      section schema registers, so it silently renders nothing.
 *
 * Exits 1 on any finding. Run: `npm run check:trust`.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SECTIONS_DIR = join(ROOT, "app/sections");
const PAGES_DIR = join(ROOT, "app/page-builder/pages");

/** Input / preset keys that attribute content to a person. */
export const ATTRIBUTION_KEYS = [
  "author",
  "authorName",
  "customerName",
  "reviewer",
  "reviewerName",
];

/**
 * Attributions that make no claim about an invented person and are used only
 * with real quotes: the review-quotes presets reproduce actual Etsy reviews.
 * Allowed in `presets` only; an input `defaultValue` must still be empty.
 */
export const ALLOWED_PRESET_ATTRIBUTIONS = ["Verified Etsy buyer"];

/** Placeholder people that have shipped before. Matched case-insensitively. */
export const SAMPLE_NAMES = [
  "Sarah M.",
  "Michael T.",
  "Emily R.",
  "David L.",
  "John Doe",
  "Jane Doe",
];

function walk(dir, ext) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) {
      out.push(...walk(p, ext));
    } else if (ext.some((e) => p.endsWith(e))) {
      out.push(p);
    }
  }
  return out;
}

function lineOf(src, index) {
  return src.slice(0, index).split("\n").length;
}

const keyAlt = ATTRIBUTION_KEYS.join("|");

/** Check 1: attribution defaults in section schemas and presets. */
export function findAttributionDefaults(src, file) {
  const findings = [];
  // An input block: `name: "author"` followed (within the same object) by a
  // non-empty `defaultValue: "..."`.
  const inputRe = new RegExp(
    `name:\\s*"(${keyAlt})"[^{}]*?defaultValue:\\s*"([^"]+)"`,
    "g",
  );
  for (const m of src.matchAll(inputRe)) {
    findings.push({
      check: "attribution-default",
      file,
      line: lineOf(src, m.index),
      detail: `input "${m[1]}" defaults to "${m[2]}"`,
    });
  }
  // A presets block that sets an attribution key to a literal.
  const presetsAt = src.indexOf("presets:");
  if (presetsAt !== -1) {
    const presetRe = new RegExp(`\\b(${keyAlt}):\\s*"([^"]+)"`, "g");
    for (const m of src.slice(presetsAt).matchAll(presetRe)) {
      if (ALLOWED_PRESET_ATTRIBUTIONS.includes(m[2])) {
        continue;
      }
      findings.push({
        check: "attribution-default",
        file,
        line: lineOf(src, presetsAt + m.index),
        detail: `preset sets ${m[1]}: "${m[2]}"`,
      });
    }
  }
  return findings;
}

/** Check 2: known sample names attributed in page compositions. */
export function findSampleAttributions(src, file) {
  const findings = [];
  const attrRe = new RegExp(`\\b(${keyAlt}):\\s*"([^"]+)"`, "g");
  for (const m of src.matchAll(attrRe)) {
    const value = m[2].toLowerCase();
    const hit = SAMPLE_NAMES.find((n) => value.includes(n.toLowerCase()));
    if (hit) {
      findings.push({
        check: "sample-attribution",
        file,
        line: lineOf(src, m.index),
        detail: `${m[1]}: "${m[2]}" is a known placeholder name`,
      });
    }
  }
  return findings;
}

/** The schema `type` a component module registers, if any. */
const SCHEMA_TYPE_RE =
  /export\s+(?:let|const)\s+schema[^=]*=\s*(?:createSchema\(\s*)?\{[\s\S]*?\btype:\s*"([^"]+)"/;

/**
 * Every `type` the renderer can resolve: the schema types of the modules
 * imported by `app/page-builder/components.ts` (the registry
 * `componentsByType` is built from).
 */
export function registeredTypes(root = ROOT) {
  const registry = readFileSync(
    join(root, "app/page-builder/components.ts"),
    "utf8",
  );
  const types = new Set();
  for (const m of registry.matchAll(/from\s+"~\/([^"]+)"/g)) {
    const base = join(root, "app", m[1]);
    const file = [".tsx", ".ts", "/index.tsx", "/index.ts"]
      .map((ext) => base + ext)
      .find((p) => {
        try {
          return statSync(p).isFile();
        } catch {
          return false;
        }
      });
    const type = file && readFileSync(file, "utf8").match(SCHEMA_TYPE_RE)?.[1];
    if (type) {
      types.add(type);
    }
  }
  return types;
}

/** Check 3: composition item types with no registered section. */
export function findUnregisteredTypes(src, file, types) {
  const findings = [];
  // Composition items are `{ id: "...", type: "...", ... }`.
  const re = /\bid:\s*"([^"]+)",\s*\n\s*type:\s*"([^"]+)"/g;
  for (const m of src.matchAll(re)) {
    if (!types.has(m[2])) {
      findings.push({
        check: "unregistered-type",
        file,
        line: lineOf(src, m.index),
        detail: `item "${m[1]}" has type "${m[2]}", which no section registers (renders nothing)`,
      });
    }
  }
  return findings;
}

export function run(root = ROOT) {
  const sectionFiles = walk(join(root, "app/sections"), [".tsx", ".ts"]);
  const pageFiles = walk(join(root, "app/page-builder/pages"), [".ts"]);
  const rel = (p) => relative(root, p);

  const sectionSrc = sectionFiles.map((f) => readFileSync(f, "utf8"));
  const types = registeredTypes(root);
  // `main` is the page-builder root container, registered outside app/sections.
  types.add("main");

  const findings = [];
  sectionFiles.forEach((f, i) => {
    findings.push(...findAttributionDefaults(sectionSrc[i], rel(f)));
  });
  for (const f of pageFiles) {
    const src = readFileSync(f, "utf8");
    findings.push(...findSampleAttributions(src, rel(f)));
    findings.push(...findUnregisteredTypes(src, rel(f), types));
  }
  return findings;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const findings = run();
  if (findings.length === 0) {
    console.log("check:trust — no findings.");
  } else {
    for (const f of findings) {
      console.log(`${f.file}:${f.line}  [${f.check}]  ${f.detail}`);
    }
    console.log(`\ncheck:trust — ${findings.length} finding(s).`);
    process.exitCode = 1;
  }
}
