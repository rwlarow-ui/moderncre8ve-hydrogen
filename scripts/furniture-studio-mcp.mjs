#!/usr/bin/env node

/**
 * Furniture Studio MCP server (stdio, newline-delimited JSON-RPC).
 *
 * Design-aware tools over the parametric model in
 * app/utils/furniture-studio.js: template + ranges, saved revisions, design
 * checks, cut list / materials / cost, CAD study exports (CSV, DXF, OpenSCAD,
 * CadQuery → STEP) and photoreal render prompts.
 *
 * Storage is local files, no Shopify or network access:
 *   $FURNITURE_STUDIO_DIR (default ~/.moderncre8ve/furniture-studio)
 *     concepts/<id>/r<N>.json   immutable revisions
 *     exports/<id>/r<N>/…       generated files
 *
 * Render prompts are returned, never sent: image generation (Adobe Firefly,
 * fal…) can spend credits, so the calling agent runs it only on the user's
 * explicit go-ahead.
 */

import { randomUUID } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { homedir } from "node:os";
import { join, resolve } from "node:path";
import {
  applyConceptPatch,
  apronLayout,
  COST_FIELDS,
  conceptErrors,
  conceptParts,
  costEstimate,
  DESIGN_PAGE_URL,
  designIssues,
  EXPORT_FORMATS,
  EXPORT_NOTICE,
  exportStem,
  FORM_KEYS,
  FORMS,
  formOf,
  GATES,
  isBlocked,
  MATERIAL_FIELDS,
  materialSchedule,
  renderPrompt,
  seedFor,
} from "../app/utils/furniture-studio.js";

const serverInfo = { name: "moderncre8ve-furniture-studio", version: "1.0.0" };

// Outside any checkout, so worktree cleanup never deletes saved concepts.
const ROOT = resolve(
  process.env.FURNITURE_STUDIO_DIR ||
    join(homedir(), ".moderncre8ve", "furniture-studio"),
);
const CONCEPTS = join(ROOT, "concepts");
const EXPORTS = join(ROOT, "exports");
const ID_PATTERN = /^[a-z0-9][a-z0-9-]{0,79}$/;
const MAX_IMPORT_BYTES = 100_000;

const LIMITS =
  "Concept study only: rectangular blanks stand in for sculpted sleds and profiles, rattan is an aperture panel and leather a flat blank. Joinery, radii, wood movement, cane retention, runner machining, hardware holes, loads and tolerances are unresolved. Material rows are net sizes; costs are editable allowances that do not scale with size.";

/* ------------------------------- schemas -------------------------------- */

/**
 * One flat schema over every form's parameters. Keys shared by both forms
 * get the widest range here; the model enforces each form's own range and
 * rejects keys that don't belong to the concept's form.
 */
function parameterProperties() {
  const props = {};
  for (const form of FORM_KEYS) {
    const { fields, integerFields } = FORMS[form];
    for (const [key, label, min, max] of fields) {
      const range = `${form} ${min}–${max}`;
      const prev = props[key];
      props[key] = prev
        ? {
            ...prev,
            minimum: Math.min(prev.minimum, min),
            maximum: Math.max(prev.maximum, max),
            description: `${prev.description}, ${range}`,
          }
        : {
            type: integerFields.includes(key) ? "integer" : "number",
            minimum: min,
            maximum: max,
            description: `${label} (${range}`,
          };
    }
  }
  for (const p of Object.values(props)) p.description += ")";
  return props;
}

const parameterSchema = {
  type: "object",
  description:
    "Any subset of the parameters of the concept's form, in mm (drawer counts are whole numbers). Cabinet and apron forms have different parameter sets; get_design_template lists both.",
  properties: parameterProperties(),
  additionalProperties: false,
};

const costSchema = {
  type: "object",
  description:
    "Any subset of the USD cost allowances (contingency is a percent).",
  properties: Object.fromEntries(
    COST_FIELDS.map(([key, label]) => [
      key,
      { type: "number", minimum: 0, maximum: 100000, description: label },
    ]),
  ),
  additionalProperties: false,
};

const checksSchema = {
  type: "object",
  description:
    "Prototype review gates to mark true/false. Any design edit in the same call clears earlier checks first.",
  properties: Object.fromEntries(
    GATES.map(([key, label]) => [key, { type: "boolean", description: label }]),
  ),
  additionalProperties: false,
};

const patchProperties = {
  form: {
    type: "string",
    enum: FORM_KEYS,
    description:
      "Template form: cabinet (left tower, right case, sled bases) or apron (slab-side desk with apron drawers). Switching form on an existing concept resets parameters to that form's seed values before applying any parameters given in the same call.",
  },
  name: { type: "string", maxLength: 140 },
  brief: { type: "string", maxLength: 4000, description: "Design intent" },
  ...Object.fromEntries(
    MATERIAL_FIELDS.map(([key, label]) => [
      key,
      { type: "string", maxLength: 4000, description: label },
    ]),
  ),
  parameters: parameterSchema,
  costs: costSchema,
  checks: checksSchema,
};

const ref = {
  id: { type: "string", description: "Saved concept id (from list_concepts)." },
  revision: {
    type: "integer",
    minimum: 1,
    description: "Revision number; defaults to the latest.",
  },
};

const TOOLS = [
  {
    name: "get_design_template",
    description:
      "Describe the parametric furniture template and its two forms: cabinet (asymmetric vanity / desk: left drawer tower, right drawer case, bridge worktop, rear shelf, sled bases) and apron (slab-side desk: top on two full-height side panels, side-by-side drawers in an apron, open knee space). Returns each form's parameters with label and mm range and its seed concept, material and cost fields, the 10 prototype review gates, the design brief link and the export limits. Call this first.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "list_concepts",
    description:
      "List saved furniture concepts with their latest revision, name and update time.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "get_concept",
    description:
      "Read a saved concept revision with its design warnings, whether exports are blocked, and the cost estimate.",
    inputSchema: { type: "object", properties: ref, required: ["id"] },
  },
  {
    name: "save_concept",
    description:
      "Create a concept or save the next immutable revision of one. Without id, starts from the seed of the given form (cabinet by default) or from fromId, and applies the given fields. With id, applies the fields to its latest revision; pass expectedRevision to refuse the save if someone else saved first. Rejected when values are out of range or the geometry collides (knee-room warnings are allowed). Design edits clear review checks.",
    inputSchema: {
      type: "object",
      properties: {
        id: ref.id,
        expectedRevision: {
          type: "integer",
          minimum: 0,
          description:
            "The revision you edited from; the save fails if the latest differs.",
        },
        fromId: {
          type: "string",
          description:
            "New concept only: copy this saved concept's latest revision instead of the seed.",
        },
        ...patchProperties,
      },
    },
  },
  {
    name: "evaluate_concept",
    description:
      "Dry-run a design change without saving: applies the fields to a saved concept (or the seed of the given form) and returns validation errors, design warnings, whether exports would be blocked, key derived dimensions (knee opening / clearance, drawer front sizes), part count and cost estimate.",
    inputSchema: {
      type: "object",
      properties: { ...ref, ...patchProperties },
    },
  },
  {
    name: "get_cut_list",
    description:
      "Net component schedule for a saved concept (or the seed when id is omitted): every part with position and W × D × H mm, per-material totals, oak board feet and the cost breakdown. Net sizes only; add joinery, machining and yield allowances before buying stock.",
    inputSchema: {
      type: "object",
      properties: {
        ...ref,
        material: {
          type: "string",
          enum: ["oak", "drawer", "cane", "leather"],
          description: "Only list parts of this material.",
        },
      },
    },
  },
  {
    name: "export_concept",
    description: `Write CAD / build-study files for a saved revision and return their paths. Formats: json (portable revision, importable in /ops/design), csv (materials schedule), dxf (front elevation, mm), scad (OpenSCAD study solids), cadquery (Python that writes a STEP assembly when run in a CadQuery environment), prompt (render prompt). Refused while the geometry collides. ${LIMITS}`,
    inputSchema: {
      type: "object",
      properties: {
        ...ref,
        formats: {
          type: "array",
          items: { type: "string", enum: Object.keys(EXPORT_FORMATS) },
          description: "Defaults to all formats.",
        },
      },
      required: ["id"],
    },
  },
  {
    name: "build_render_prompt",
    description:
      "Build a photorealistic concept-render prompt (4:3, three-quarter front view) from a saved revision or the seed. This tool does NOT generate an image. Image tools (Adobe Firefly, fal) may spend credits: ask the user before sending the prompt to one, and review drawer count, proportions and materials of the result against the cut list, since prompts do not lock geometry.",
    inputSchema: { type: "object", properties: ref },
  },
  {
    name: "import_concept",
    description:
      "Save a JSON export (from /ops/design or export_concept) as a new concept. Review checks are cleared.",
    inputSchema: {
      type: "object",
      properties: {
        path: {
          type: "string",
          description: "Absolute path to the .json export (under 100 KB).",
        },
      },
      required: ["path"],
    },
  },
];

/* ------------------------------- storage -------------------------------- */

function conceptDir(id) {
  if (typeof id !== "string" || !ID_PATTERN.test(id))
    throw new ToolError("id must be lowercase letters, digits and dashes.");
  return join(CONCEPTS, id);
}

function revisionsOf(id) {
  const dir = conceptDir(id);
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .map((f) => /^r(\d+)\.json$/.exec(f)?.[1])
    .filter(Boolean)
    .map(Number)
    .sort((a, b) => a - b);
}

function readRevision(id, revision) {
  const revisions = revisionsOf(id);
  if (!revisions.length) throw new ToolError(`No concept with id ${id}.`);
  const n = revision ?? revisions.at(-1);
  if (!revisions.includes(n))
    throw new ToolError(
      `Concept ${id} has no revision ${n}. Latest is ${revisions.at(-1)}.`,
    );
  const record = JSON.parse(
    readFileSync(join(conceptDir(id), `r${n}.json`), "utf8"),
  );
  return { ...record, latestRevision: revisions.at(-1) };
}

/**
 * Writes revision `baseRevision + 1`, the one after the revision the caller
 * read. The exclusive "wx" create is the compare-and-swap: if another save
 * already took that number, this one fails instead of landing on top of it.
 */
function writeRevision(id, baseRevision, document, note) {
  const dir = conceptDir(id);
  mkdirSync(dir, { recursive: true });
  const revision = baseRevision + 1;
  const record = {
    id,
    revision,
    savedAt: new Date().toISOString(),
    note: note || "",
    document,
  };
  try {
    writeFileSync(
      join(dir, `r${revision}.json`),
      JSON.stringify(record, null, 2),
      { flag: "wx" },
    );
  } catch (error) {
    if (error?.code === "EEXIST")
      throw new ToolError(
        `Concept ${id} was saved by someone else as revision ${revision} while you edited revision ${baseRevision}. Read it again before saving.`,
      );
    throw error;
  }
  return record;
}

/* -------------------------------- tools --------------------------------- */

class ToolError extends Error {}

function pickPatch(args) {
  const patch = {};
  for (const key of [
    "form",
    "name",
    "brief",
    "wood",
    "finish",
    "cane",
    "leather",
    "parameters",
    "costs",
    "checks",
  ])
    if (args[key] !== undefined) patch[key] = args[key];
  return patch;
}

function summary(document) {
  const p = document.parameters;
  const valid = conceptErrors(document).length === 0;
  return {
    valid,
    errors: conceptErrors(document),
    warnings: valid ? designIssues(document) : [],
    exportsBlocked: isBlocked(document),
    derived: valid ? derived(document) : null,
    estimateUsd: valid ? costEstimate(document) : null,
    reviewChecks: `${GATES.filter(([k]) => document.checks?.[k]).length} of ${GATES.length}`,
  };
}

function derived(document) {
  const p = document.parameters;
  if (formOf(document) === "apron") {
    const l = apronLayout(p);
    return {
      form: "apron",
      kneeClearanceMm: round(l.kneeClearance),
      kneeWidthMm: round(l.span),
      drawerOpeningWidthsMm: l.openings.map((o) => round(o.w)),
      drawerFrontHeightMm: round(l.openingH - 2 * p.gap),
      drawerBoxMm: { height: round(l.boxH), depth: round(l.boxD) },
      partCount: conceptParts(document).length,
    };
  }
  return {
    form: "cabinet",
    kneeOpeningMm: p.width - p.leftWidth - p.rightWidth,
    leftDrawerFrontMm: round(
      (p.height +
        p.towerRise -
        p.base -
        2 * p.wall -
        (p.leftDrawers + 1) * p.gap) /
        p.leftDrawers,
    ),
    rightDrawerFrontMm: round(
      (p.rightCase - 2 * p.wall - (p.rightDrawers + 1) * p.gap) /
        p.rightDrawers,
    ),
    partCount: conceptParts(document).length,
  };
}

const round = (n) => Math.round(n * 10) / 10;

function baseDocument(args) {
  if (args.id) return readRevision(args.id, args.revision).document;
  return seedFor(args.form === "apron" ? "apron" : "cabinet");
}

async function callTool(name, args) {
  switch (name) {
    case "get_design_template":
      return {
        template:
          "Parametric vanity / desk with two forms. A concept without form is a cabinet.",
        units: "mm, USD",
        forms: Object.fromEntries(
          FORM_KEYS.map((form) => {
            const seed = seedFor(form);
            const { label, description, fields, integerFields } = FORMS[form];
            return [
              form,
              {
                label,
                description,
                parameters: fields.map(([key, l, min, max]) => ({
                  key,
                  label: l,
                  min,
                  max,
                  integer: integerFields.includes(key),
                  seed: seed.parameters[key],
                })),
                seed,
              },
            ];
          }),
        ),
        materials: MATERIAL_FIELDS.map(([key, label]) => ({ key, label })),
        costs: COST_FIELDS.map(([key, label]) => ({ key, label })),
        reviewGates: GATES.map(([key, label]) => ({ key, label })),
        designBrief: DESIGN_PAGE_URL,
        exportFormats: Object.keys(EXPORT_FORMATS),
        limits: LIMITS,
        storage: ROOT,
      };

    case "list_concepts": {
      if (!existsSync(CONCEPTS)) return { concepts: [], storage: ROOT };
      const concepts = readdirSync(CONCEPTS)
        .filter((id) => ID_PATTERN.test(id) && revisionsOf(id).length)
        .map((id) => {
          const r = readRevision(id);
          return {
            id,
            name: r.document.name,
            latestRevision: r.revision,
            savedAt: r.savedAt,
          };
        })
        .sort((a, b) => b.savedAt.localeCompare(a.savedAt));
      return { concepts, storage: ROOT };
    }

    case "get_concept": {
      const r = readRevision(args.id, args.revision);
      return { ...r, ...summary(r.document) };
    }

    case "evaluate_concept": {
      const document = applyConceptPatch(baseDocument(args), pickPatch(args));
      return { document, ...summary(document) };
    }

    case "save_concept": {
      let id = args.id;
      let base;
      let baseRevision = 0;
      if (id) {
        const latest = readRevision(id);
        if (
          args.expectedRevision !== undefined &&
          args.expectedRevision !== latest.revision
        )
          throw new ToolError(
            `Concept ${id} is at revision ${latest.revision}, not ${args.expectedRevision}. Read it again before saving.`,
          );
        base = latest.document;
        baseRevision = latest.revision;
      } else {
        base = args.fromId
          ? readRevision(args.fromId).document
          : seedFor(args.form === "apron" ? "apron" : "cabinet");
        id = `${exportStem({ name: args.name || base.name })
          .replace(/-r0$/, "")
          .slice(0, 60)}-${randomUUID().slice(0, 8)}`;
        if (!args.name && args.fromId) base.name = `${base.name} (copy)`;
      }
      const document = applyConceptPatch(base, pickPatch(args));
      const s = summary(document);
      if (!s.valid) throw new ToolError(`Not saved. ${s.errors.join(" ")}`);
      if (s.exportsBlocked)
        throw new ToolError(
          `Not saved: geometry collides. ${s.warnings.join(" ")}`,
        );
      const record = writeRevision(id, baseRevision, document);
      return { ...record, ...s };
    }

    case "get_cut_list": {
      const document = baseDocument(args);
      if (isBlocked(document))
        throw new ToolError(
          "This concept's geometry collides; fix it before using the cut list.",
        );
      const parts = conceptParts(document).filter(
        (p) => !args.material || p.material === args.material,
      );
      return {
        notice: EXPORT_NOTICE,
        parts: parts.map((p) => ({
          ...p,
          x: round(p.x),
          y: round(p.y),
          z: round(p.z),
          w: round(p.w),
          d: round(p.d),
          h: round(p.h),
        })),
        schedule: materialSchedule(document),
        estimateUsd: costEstimate(document),
        costNote:
          "Illustrative repeat-unit budget from editable allowances. Excludes mirror, freight, taxes, tooling and profit. Replace with a maker's quote.",
      };
    }

    case "export_concept": {
      const r = readRevision(args.id, args.revision);
      if (isBlocked(r.document))
        throw new ToolError(
          `Geometry collides; fix before exporting. ${designIssues(r.document).join(" ")}`,
        );
      const formats = args.formats?.length
        ? args.formats
        : Object.keys(EXPORT_FORMATS);
      const dir = join(EXPORTS, args.id, `r${r.revision}`);
      mkdirSync(dir, { recursive: true });
      const stem = exportStem(r.document, r.revision);
      const files = formats.map((format) => {
        const spec = EXPORT_FORMATS[format];
        if (!spec) throw new ToolError(`Unknown format ${format}.`);
        const [ext, mimeType, build] = spec;
        const path = join(dir, `${stem}.${ext}`);
        writeFileSync(
          path,
          build(r.document, { id: args.id, revision: r.revision }),
        );
        return { format, path, mimeType };
      });
      return {
        id: args.id,
        revision: r.revision,
        files,
        notice: EXPORT_NOTICE,
        limits: LIMITS,
      };
    }

    case "build_render_prompt": {
      const document = baseDocument(args);
      return {
        prompt: renderPrompt(document),
        aspectRatio: "4:3",
        source: args.id
          ? {
              id: args.id,
              revision: args.revision ?? readRevision(args.id).revision,
            }
          : "seed",
        guidance:
          "Not sent anywhere. Ask the user before passing this to an image generator (it may use credits). Prompts do not lock geometry: check drawer counts, proportions and materials of any result against get_cut_list.",
      };
    }

    case "import_concept": {
      const path = resolve(String(args.path || ""));
      if (!existsSync(path) || statSync(path).size > MAX_IMPORT_BYTES)
        throw new ToolError("path must be an existing JSON file under 100 KB.");
      let data;
      try {
        data = JSON.parse(readFileSync(path, "utf8"));
      } catch {
        throw new ToolError("File is not valid JSON.");
      }
      const document = { ...data?.document, checks: {} };
      const errors = conceptErrors(document);
      if (errors.length)
        throw new ToolError(`Not a valid concept export. ${errors.join(" ")}`);
      const id = `${exportStem(document).replace(/-r0$/, "").slice(0, 60)}-${randomUUID().slice(0, 8)}`;
      const record = writeRevision(id, 0, document, `Imported from ${path}`);
      return { ...record, ...summary(document) };
    }

    default:
      throw new ToolError(`Unknown tool: ${name}`);
  }
}

/* ------------------------------ transport ------------------------------- */

let negotiatedProtocolVersion = "2024-11-05";
let buffer = Buffer.alloc(0);

process.stdin.on("data", (chunk) => {
  buffer = Buffer.concat([buffer, Buffer.from(chunk)]);
  consumeMessages();
});
process.stdin.on("end", () => process.exit(0));

function consumeMessages() {
  while (true) {
    const newlineIndex = buffer.indexOf("\n");
    if (newlineIndex === -1) return;
    const line = buffer.slice(0, newlineIndex).toString("utf8").trim();
    buffer = buffer.slice(newlineIndex + 1);
    if (!line) continue;
    handleMessage(line).catch((error) => {
      writeError(
        null,
        -32603,
        error instanceof Error ? error.message : "Unknown error",
      );
    });
  }
}

async function handleMessage(payload) {
  const message = JSON.parse(payload);
  if (!message.method || message.method.startsWith("notifications/")) return;

  if (message.method === "initialize") {
    negotiatedProtocolVersion =
      message.params?.protocolVersion || negotiatedProtocolVersion;
    writeResponse(message.id, {
      protocolVersion: negotiatedProtocolVersion,
      capabilities: { tools: {} },
      serverInfo,
    });
    return;
  }

  if (message.method === "ping") {
    writeResponse(message.id, {});
    return;
  }

  if (message.method === "tools/list") {
    writeResponse(message.id, { tools: TOOLS });
    return;
  }

  if (message.method === "tools/call") {
    const { name, arguments: args = {} } = message.params || {};
    try {
      const result = await callTool(name, args);
      writeResponse(message.id, {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        structuredContent: result,
      });
    } catch (error) {
      // Tool failures go back to the model as a result it can act on.
      writeResponse(message.id, {
        content: [
          {
            type: "text",
            text: error instanceof Error ? error.message : String(error),
          },
        ],
        isError: true,
      });
    }
    return;
  }

  writeError(message.id, -32601, `Method not found: ${message.method}`);
}

function writeResponse(id, result) {
  process.stdout.write(`${JSON.stringify({ jsonrpc: "2.0", id, result })}\n`);
}

function writeError(id, code, message) {
  process.stdout.write(
    `${JSON.stringify({ jsonrpc: "2.0", id, error: { code, message } })}\n`,
  );
}
