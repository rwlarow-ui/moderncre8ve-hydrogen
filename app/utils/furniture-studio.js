/**
 * Furniture Studio parametric model.
 *
 * Ported from the `/design` tab Codex added to the ChatGPT-hosted prototype
 * Ops Hub on 2026-11-13 (lib/furniture.ts there). That hub is being retired
 * (docs/ops-hub-prototype-retirement.md), so this repo now owns the model.
 * Pure functions, no runtime imports: shared by `/ops/design` and the local
 * `scripts/furniture-studio-mcp.mjs` server.
 *
 * Coordinate system, all mm: x left → right, y front → rear, z floor → up.
 * Output is a CONCEPT STUDY: rectangular blanks stand in for sculpted sleds,
 * rattan is an aperture panel, leather a flat blank. Joinery, radii, wood
 * movement, runner machining, loads and tolerances are unresolved.
 */

/** @typedef {"width"|"depth"|"height"|"leftWidth"|"rightWidth"|"towerRise"|"top"|"wall"|"base"|"rightCase"|"leg"|"frame"|"shelfRise"|"shelfDepth"|"gap"|"slideAllowance"|"leftDrawers"|"rightDrawers"} ParamKey */
/** @typedef {Record<ParamKey, number>} Parameters */
/** @typedef {{oak:number; drawer:number; cane:number; leather:number; slide:number; other:number; finish:number; hours:number; rate:number; packaging:number; contingency:number}} Costs */
/** @typedef {{name:string; brief:string; wood:string; finish:string; cane:string; leather:string; parameters:Parameters; checks:Record<string, boolean>; costs:Costs}} Concept */
/** @typedef {{id:string; label:string; material:"oak"|"drawer"|"cane"|"leather"; x:number; y:number; z:number; w:number; d:number; h:number; note:string}} Part */

/** The ChatGPT Page Codex wrote from the "Furniture Design Ideas" chat. */
export const DESIGN_PAGE_URL =
  "https://chatgpt.com/space/page_896fdec516808191895e43f68dfb9fcc";

/** @type {ReadonlyArray<readonly [ParamKey, string, number, number]>} */
export const FIELDS = [
  ["width", "Overall width", 1200, 2400],
  ["depth", "Overall depth", 450, 800],
  ["height", "Work surface height", 650, 850],
  ["leftWidth", "Left cabinet width", 300, 650],
  ["rightWidth", "Right cabinet width", 300, 650],
  ["towerRise", "Tower above worktop", 80, 300],
  ["top", "Top thickness", 20, 50],
  ["wall", "Case thickness", 18, 30],
  ["base", "Base height", 100, 250],
  ["rightCase", "Right case height", 280, 500],
  ["leg", "Sled rail section", 30, 65],
  ["frame", "Drawer front rail width", 30, 65],
  ["shelfRise", "Shelf above worktop", 70, 180],
  ["shelfDepth", "Shelf depth", 100, 220],
  ["gap", "Drawer front gap", 2, 5],
  ["slideAllowance", "Total runner width allowance", 20, 60],
  ["leftDrawers", "Left drawer count", 2, 6],
  ["rightDrawers", "Right drawer count", 1, 4],
];

export const INTEGER_FIELDS = ["leftDrawers", "rightDrawers"];

export const MATERIAL_FIELDS = [
  ["wood", "Primary wood"],
  ["finish", "Finish system"],
  ["cane", "Rattan specification"],
  ["leather", "Pull specification"],
];

export const COST_FIELDS = [
  ["oak", "Oak stock incl. waste"],
  ["drawer", "Drawer box stock"],
  ["cane", "Rattan allowance"],
  ["leather", "Leather pull each"],
  ["slide", "Runner set each"],
  ["other", "Other hardware"],
  ["finish", "Finish & consumables"],
  ["hours", "Build hours"],
  ["rate", "Shop rate per hour"],
  ["packaging", "Packaging"],
  ["contingency", "Contingency percent"],
];

/** Prototype-readiness review gates (recorded decisions, not automated approval). */
export const GATES = [
  ["envelope", "Approve full-size mockup and chair clearance"],
  ["samples", "Approve oak, cane, leather and finish samples"],
  ["drawer", "Test actual runner, drawer and pull assembly"],
  ["structure", "Resolve sled joints, span support and wood movement"],
  ["drawings", "Complete joinery drawings and critical tolerances"],
  ["quote", "Obtain manufacturer quote and lead times"],
  ["prototype", "Build and measure the full-size prototype"],
  ["testing", "Complete agreed structural, stability and finish tests"],
  ["packing", "Validate packaging and care instructions"],
  ["pilot", "Approve pilot units, master sample and final BOM"],
];

/** @type {Concept} */
export const SEED_CONCEPT = {
  name: "Oak and rattan vanity",
  brief:
    "Higher-end MODERNCRE8VE vanity / desk. Four drawers in a taller left tower, two on the right, sculpted sled bases, elevated rear shelf. Slim light tan leather pulls with discreet fasteners. Mirror is a separate accessory pending scope approval.",
  wood: "Light natural white oak",
  finish: "Low sheen clear finish — sample pending",
  cane: "Pale natural woven rattan",
  leather: "Slim light tan leather",
  parameters: {
    width: 1727,
    depth: 610,
    height: 762,
    leftWidth: 420,
    rightWidth: 420,
    towerRise: 150,
    top: 25,
    wall: 20,
    base: 160,
    rightCase: 390,
    leg: 40,
    frame: 40,
    shelfRise: 110,
    shelfDepth: 140,
    gap: 3,
    slideAllowance: 42,
    leftDrawers: 4,
    rightDrawers: 2,
  },
  checks: {},
  costs: {
    oak: 575,
    drawer: 140,
    cane: 100,
    leather: 11.25,
    slide: 47.5,
    other: 65,
    finish: 110,
    hours: 25,
    rate: 65,
    packaging: 170,
    contingency: 15,
  },
};

export const EXPORT_NOTICE =
  "CONCEPT STUDY — NOT FOR MANUFACTURE. All dimensions mm. Joinery, runner machining, sculpted profiles, loads and tolerances require engineering and prototype validation.";

const TEXT_KEYS = ["name", "brief", "wood", "finish", "cane", "leather"];
const MAX_TEXT = 4000;
const MAX_COST = 100000;

/** @returns {Concept} */
export function cloneSeed() {
  return structuredClone(SEED_CONCEPT);
}

/**
 * Lists every reason a value is not a valid concept (empty = valid).
 * @param {unknown} value
 * @returns {string[]}
 */
export function conceptErrors(value) {
  if (!value || typeof value !== "object")
    return ["Concept must be an object."];
  const d = /** @type {Concept} */ (value);
  const errors = [];
  for (const key of TEXT_KEYS) {
    if (typeof d[key] !== "string") errors.push(`${key} must be text.`);
    else if (d[key].length > MAX_TEXT)
      errors.push(`${key} is over ${MAX_TEXT} characters.`);
  }
  if (typeof d.name === "string" && !d.name.trim())
    errors.push("name is required.");
  if (!d.parameters || typeof d.parameters !== "object") {
    errors.push("parameters are required.");
  } else {
    for (const [key, label, min, max] of FIELDS) {
      const v = d.parameters[key];
      if (!Number.isFinite(v) || v < min || v > max)
        errors.push(`${label} (${key}) must be ${min}–${max}.`);
      else if (INTEGER_FIELDS.includes(key) && !Number.isInteger(v))
        errors.push(`${label} (${key}) must be a whole number.`);
    }
    for (const key of Object.keys(d.parameters))
      if (!FIELDS.some(([f]) => f === key))
        errors.push(`Unknown parameter ${key}.`);
  }
  if (!d.costs || typeof d.costs !== "object") {
    errors.push("costs are required.");
  } else {
    for (const [key, label] of COST_FIELDS) {
      const v = d.costs[key];
      if (!Number.isFinite(v) || v < 0 || v > MAX_COST)
        errors.push(`${label} (${key}) must be 0–${MAX_COST}.`);
    }
    for (const key of Object.keys(d.costs))
      if (!COST_FIELDS.some(([f]) => f === key))
        errors.push(`Unknown cost ${key}.`);
  }
  if (!d.checks || typeof d.checks !== "object") {
    errors.push("checks are required.");
  } else {
    for (const [key, v] of Object.entries(d.checks)) {
      if (!GATES.some(([g]) => g === key)) errors.push(`Unknown check ${key}.`);
      else if (typeof v !== "boolean")
        errors.push(`Check ${key} must be true/false.`);
    }
  }
  return errors;
}

/**
 * @param {unknown} value
 * @returns {value is Concept}
 */
export function validConcept(value) {
  return conceptErrors(value).length === 0;
}

/**
 * Design-rule warnings for a valid concept. Only the knee-opening warning is
 * advisory; the others mean the geometry collides and exports are blocked.
 * @param {Concept} d
 */
export function designIssues(d) {
  const p = d.parameters;
  const warnings = [];
  if (p.width <= p.leftWidth + p.rightWidth)
    warnings.push(
      "Cabinets overlap. Increase overall width or reduce cabinet widths.",
    );
  if (p.width - p.leftWidth - p.rightWidth < 762)
    warnings.push("Knee opening is below the 762 mm / 30 in study target.");
  if (p.height - p.top - p.rightCase < p.base)
    warnings.push(
      "Right cabinet intersects the base. Reduce case height or base height.",
    );
  if (p.shelfRise + p.top > p.towerRise)
    warnings.push(
      "Shelf extends above the left tower. Review the intended silhouette.",
    );
  if (
    p.height - p.base + p.towerRise - 2 * p.wall <
    p.leftDrawers * (2 * p.frame + 30 + p.gap)
  )
    warnings.push(
      "Left drawer height is too small for the selected frame and cane aperture.",
    );
  if (p.rightCase - 2 * p.wall < p.rightDrawers * (2 * p.frame + 30 + p.gap))
    warnings.push(
      "Right drawer height is too small for the selected frame and cane aperture.",
    );
  return warnings;
}

/**
 * True when exports should be withheld: invalid input or a geometry warning
 * other than the advisory knee-opening one.
 * @param {unknown} d
 */
export function isBlocked(d) {
  if (!validConcept(d)) return true;
  return designIssues(d).some((w) => !w.startsWith("Knee"));
}

/**
 * Net component list derived from the parameters.
 * @param {Concept} d
 * @returns {Part[]}
 */
export function conceptParts(d) {
  const p = d.parameters;
  /** @type {Part[]} */
  const out = [];
  let seq = 0;
  /** @param {string} label @param {Part["material"]} material */
  const add = (
    label,
    material,
    x,
    y,
    z,
    w,
    depth,
    h,
    note = "Net study size; machining and joinery allowances pending",
  ) => {
    if (Math.min(w, depth, h) > 0)
      out.push({
        id: `P${String(++seq).padStart(3, "0")}`,
        label,
        material,
        x,
        y,
        z,
        w,
        d: depth,
        h,
        note,
      });
  };
  add(
    "Bridge worktop",
    "oak",
    p.leftWidth,
    0,
    p.height - p.top,
    p.width - p.leftWidth,
    p.depth,
    p.top,
  );
  const cabinets = [
    {
      label: "Left",
      x: 0,
      w: p.leftWidth,
      z: p.base,
      h: p.height + p.towerRise - p.base,
      n: p.leftDrawers,
    },
    {
      label: "Right",
      x: p.width - p.rightWidth,
      w: p.rightWidth,
      z: p.height - p.top - p.rightCase,
      h: p.rightCase,
      n: p.rightDrawers,
    },
  ];
  for (const c of cabinets) {
    add(`${c.label} side A`, "oak", c.x, 0, c.z, p.wall, p.depth, c.h);
    add(
      `${c.label} side B`,
      "oak",
      c.x + c.w - p.wall,
      0,
      c.z,
      p.wall,
      p.depth,
      c.h,
    );
    for (const z of [c.z, c.z + c.h - p.wall])
      add(
        `${c.label} case horizontal`,
        "oak",
        c.x + p.wall,
        0,
        z,
        c.w - 2 * p.wall,
        p.depth,
        p.wall,
      );
    add(
      `${c.label} rear panel`,
      "oak",
      c.x + p.wall,
      p.depth - p.wall,
      c.z + p.wall,
      c.w - 2 * p.wall,
      p.wall,
      c.h - 2 * p.wall,
      "Floating solid panel concept; movement and fastening unresolved",
    );
    const frontH = (c.h - 2 * p.wall - (c.n + 1) * p.gap) / c.n;
    const frontW = c.w - 2 * p.wall - 2 * p.gap;
    for (let i = 0; i < c.n; i++) {
      const z = c.z + p.wall + p.gap + i * (frontH + p.gap);
      const x = c.x + p.wall + p.gap;
      const name = `${c.label} drawer ${i + 1}`;
      for (const railZ of [z, z + frontH - p.frame])
        add(
          `${name} front rail`,
          "oak",
          x,
          -p.wall,
          railZ,
          frontW,
          p.wall,
          p.frame,
        );
      for (const railX of [x, x + frontW - p.frame])
        add(
          `${name} front stile`,
          "oak",
          railX,
          -p.wall,
          z + p.frame,
          p.frame,
          p.wall,
          frontH - 2 * p.frame,
        );
      add(
        `${name} cane`,
        "cane",
        x + p.frame,
        -5,
        z + p.frame,
        frontW - 2 * p.frame,
        3,
        frontH - 2 * p.frame,
        "Visible aperture only; add supplier retention allowance",
      );
      const boxX = c.x + p.wall + p.slideAllowance / 2;
      const boxW = c.w - 2 * p.wall - p.slideAllowance;
      const boxD = p.depth - p.wall - 35;
      const boxH = frontH - 30;
      for (const sx of [boxX, boxX + boxW - 15])
        add(
          `${name} box side`,
          "drawer",
          sx,
          10,
          z + 10,
          15,
          boxD,
          boxH,
          "15 mm study box; slide notches and dovetails unresolved",
        );
      for (const sy of [10, 10 + boxD - 15])
        add(
          `${name} box end`,
          "drawer",
          boxX + 15,
          sy,
          z + 10,
          boxW - 30,
          15,
          boxH,
        );
      add(
        `${name} bottom`,
        "drawer",
        boxX,
        10,
        z + 10,
        boxW,
        boxD,
        6,
        "6 mm bottom study; groove allowance and load capacity unresolved",
      );
      add(
        `${name} leather pull`,
        "leather",
        x + frontW / 2 - 50,
        -p.wall - 10,
        z + frontH - 24,
        100,
        4,
        15,
        "Flat study blank; fold, hole spacing and fasteners pending",
      );
    }
    const sledNote =
      "Rectangular study blank; sculpted profile and joint design pending";
    for (const sx of [c.x + 5, c.x + c.w - p.leg - 5]) {
      add(
        `${c.label} sled floor rail`,
        "oak",
        sx,
        0,
        0,
        p.leg,
        p.depth,
        p.leg,
        sledNote,
      );
      for (const sy of [0, p.depth - p.leg])
        add(
          `${c.label} sled upright`,
          "oak",
          sx,
          sy,
          p.leg,
          p.leg,
          p.leg,
          c.z - p.leg,
          sledNote,
        );
    }
  }
  add(
    "Rear shelf",
    "oak",
    p.leftWidth,
    p.depth - p.shelfDepth,
    p.height + p.shelfRise,
    p.width - p.leftWidth,
    p.shelfDepth,
    p.top,
  );
  for (const sx of [p.leftWidth + 80, p.width - 120])
    add(
      "Shelf support",
      "oak",
      sx,
      p.depth - p.shelfDepth + 30,
      p.height,
      40,
      p.shelfDepth - 60,
      p.shelfRise,
    );
  return out;
}

/** Cubic millimetres in one board foot (144 in³). */
const MM3_PER_BOARD_FOOT = 2359737.216;

/**
 * Totals per material, plus net oak board feet (not a stock order quantity).
 * @param {Concept} d
 */
export function materialSchedule(d) {
  const totals = {};
  for (const part of conceptParts(d)) {
    const t = (totals[part.material] ||= { count: 0, netVolumeMm3: 0 });
    t.count += 1;
    t.netVolumeMm3 += part.w * part.d * part.h;
  }
  return {
    byMaterial: totals,
    oakBoardFeet: Number(
      ((totals.oak?.netVolumeMm3 || 0) / MM3_PER_BOARD_FOOT).toFixed(1),
    ),
    specification: {
      wood: d.wood,
      finish: d.finish,
      cane: d.cane,
      leather: d.leather,
    },
  };
}

/**
 * Illustrative repeat-unit budget in USD. Allowances do not scale with size;
 * excludes mirror, freight, taxes, tooling and profit.
 * @param {Concept} d
 */
export function costEstimate(d) {
  const c = d.costs;
  const drawers = d.parameters.leftDrawers + d.parameters.rightDrawers;
  const materials =
    c.oak +
    c.drawer +
    c.cane +
    drawers * (c.leather + c.slide) +
    c.other +
    c.finish;
  const labor = c.hours * c.rate;
  const subtotal = materials + labor + c.packaging;
  return {
    drawers,
    materials,
    labor,
    subtotal,
    // subtotal × (100 + %) is exact in cents; × (1 + %/100) drifts below .5.
    total: Math.round(subtotal * (100 + c.contingency)) / 100,
  };
}

/**
 * Photoreal render prompt for an image model. Does not lock geometry.
 * @param {Concept} d
 */
export function renderPrompt(d) {
  const p = d.parameters;
  return `Photorealistic studio product visualization of a premium MODERNCRE8VE asymmetric vanity / desk. ${d.brief.slice(0, 450)} Primary wood: ${d.wood}. Finish: ${d.finish}. Drawer inserts: ${d.cane}. Pulls: ${d.leather}, discreet fasteners. Exactly ${p.leftDrawers} left drawers and ${p.rightDrawers} right drawers. Study envelope ${p.width} mm wide, ${p.depth} mm deep, ${p.height} mm worktop height. Left tower ${p.leftWidth} mm wide, right case ${p.rightWidth} mm wide, knee opening ${p.width - p.leftWidth - p.rightWidth} mm. Sculpted sled bases, softened corners, elevated slim rear shelf. Warm neutral seamless background, physically plausible oak grain and woven texture, soft daylight, three-quarter front view, full piece in frame. No text, labels, props covering the piece or watermark. Concept visualization only; no dimensional accuracy claim.`.slice(
    0,
    1500,
  );
}

/** @param {Concept} d */
export function toCsv(d) {
  const rows = [
    [
      "Part",
      "Description",
      "Material",
      "X mm",
      "Y mm",
      "Z mm",
      "Width mm",
      "Depth mm",
      "Height mm",
      "Note",
    ],
    ...conceptParts(d).map((p) => [
      p.id,
      p.label,
      p.material,
      p.x,
      p.y,
      p.z,
      p.w,
      p.d,
      p.h,
      p.note,
    ]),
  ];
  return rows
    .map((r) => r.map((v) => `"${String(v).replaceAll('"', '""')}"`).join(","))
    .join("\n");
}

/** CadQuery Python that writes a neutral STEP assembly when run externally. @param {Concept} d */
export function toCadQuery(d) {
  return `# ${EXPORT_NOTICE}
# Install CadQuery in a Python environment, then run this file.
# Component snapshot plus neutral STEP assembly; regenerate after parameter changes.
import cadquery as cq
import json

parameters = json.loads(${JSON.stringify(JSON.stringify(d.parameters))})
# Component study generated from the parameter snapshot above.
parts = json.loads(${JSON.stringify(JSON.stringify(conceptParts(d)))})
assembly = cq.Assembly(name="MODERNCRE8VE_concept")
for p in parts:
    solid = cq.Workplane("XY").box(p["w"], p["d"], p["h"], centered=(False,False,False)).translate((p["x"],p["y"],p["z"]))
    assembly.add(solid, name=p["id"])
assembly.save("moderncre8ve_concept.step")
print("Exported study STEP assembly; engineering approval required.")
`;
}

const SCAD_COLORS = {
  cane: "Wheat",
  leather: "Tan",
  drawer: "BurlyWood",
  oak: "PeachPuff",
};

/** OpenSCAD study solids. @param {Concept} d */
export function toScad(d) {
  return `// ${EXPORT_NOTICE}\n// Rectangular solids show envelope and component layout, not sculpted final profiles.\n${conceptParts(
    d,
  )
    .map(
      (p) =>
        `// ${p.id} ${p.label}\ncolor("${SCAD_COLORS[p.material]}") translate([${p.x},${p.y},${p.z}]) cube([${p.w},${p.d},${p.h}]);`,
    )
    .join("\n")}`;
}

/** Front-elevation DXF (x/z plane, mm, one layer per material). @param {Concept} d */
export function toDxf(d) {
  let out =
    "0\nSECTION\n2\nHEADER\n9\n$INSUNITS\n70\n4\n0\nENDSEC\n0\nSECTION\n2\nENTITIES\n";
  for (const p of conceptParts(d)) {
    const pts = [
      [p.x, p.z],
      [p.x + p.w, p.z],
      [p.x + p.w, p.z + p.h],
      [p.x, p.z + p.h],
    ];
    for (let i = 0; i < 4; i++) {
      const a = pts[i];
      const b = pts[(i + 1) % 4];
      out += `0\nLINE\n8\n${p.material.toUpperCase()}\n10\n${a[0]}\n20\n${a[1]}\n30\n0\n11\n${b[0]}\n21\n${b[1]}\n31\n0\n`;
    }
  }
  return `${out}0\nENDSEC\n0\nEOF\n`;
}

/**
 * Portable JSON export, the same shape `/ops/design` imports.
 * @param {Concept} d
 * @param {{id?: string; revision?: number}} [meta]
 */
export function toJsonExport(d, meta = {}) {
  return JSON.stringify(
    {
      schemaVersion: 1,
      notice: EXPORT_NOTICE,
      id: meta.id || "",
      revision: meta.revision || 0,
      document: d,
    },
    null,
    2,
  );
}

/**
 * Export formats: key → [file extension, MIME type, builder].
 * @type {Record<"json"|"csv"|"scad"|"dxf"|"cadquery"|"prompt", [string, string, (d: Concept, meta?: {id?: string; revision?: number}) => string]>}
 */
export const EXPORT_FORMATS = {
  json: ["json", "application/json", (d, meta) => toJsonExport(d, meta)],
  csv: ["csv", "text/csv", toCsv],
  scad: ["scad", "text/plain", toScad],
  dxf: ["dxf", "application/dxf", toDxf],
  cadquery: ["py", "text/x-python", toCadQuery],
  prompt: ["txt", "text/plain", renderPrompt],
};

/** File-name stem for a concept, e.g. "oak-and-rattan-vanity-r2". */
export function exportStem(d, revision = 0) {
  const slug =
    d.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 70) || "concept";
  return `${slug}-r${revision}`;
}

/**
 * Applies a partial update (throws on unknown parameter / cost keys); any design change clears the review checks, as in
 * the original studio, unless only `checks` were supplied.
 * @param {Concept} base
 * @param {{name?:string; brief?:string; wood?:string; finish?:string; cane?:string; leather?:string; parameters?:Partial<Parameters>; costs?:Partial<Costs>; checks?:Record<string, boolean>}} patch
 * @returns {Concept}
 */
export function applyConceptPatch(base, patch = {}) {
  const next = structuredClone(base);
  let designChanged = false;
  for (const key of TEXT_KEYS) {
    if (patch[key] !== undefined && patch[key] !== next[key]) {
      next[key] = patch[key];
      designChanged = true;
    }
  }
  const known = {
    parameters: FIELDS.map(([key]) => key),
    costs: COST_FIELDS.map(([key]) => key),
  };
  for (const group of ["parameters", "costs"]) {
    for (const [key, value] of Object.entries(patch[group] || {})) {
      // Reject typos (and __proto__) instead of saving a no-op revision.
      if (!known[group].includes(key))
        throw new Error(`Unknown ${group.slice(0, -1)} "${key}".`);
      if (next[group][key] !== value) {
        next[group][key] = value;
        designChanged = true;
      }
    }
  }
  if (designChanged) next.checks = {};
  if (patch.checks) next.checks = { ...next.checks, ...patch.checks };
  return next;
}
