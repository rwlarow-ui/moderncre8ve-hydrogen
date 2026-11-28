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

/** @typedef {"width"|"depth"|"height"|"leftWidth"|"rightWidth"|"towerRise"|"top"|"wall"|"base"|"rightCase"|"leg"|"frame"|"shelfRise"|"shelfDepth"|"gap"|"slideAllowance"|"leftDrawers"|"rightDrawers"|"side"|"overhang"|"apron"|"rail"|"drawers"|"leadShare"} ParamKey */
/** @typedef {Record<ParamKey, number>} Parameters */
/** @typedef {"cabinet"|"apron"} Form */
/** @typedef {{oak:number; drawer:number; cane:number; leather:number; slide:number; other:number; finish:number; hours:number; rate:number; packaging:number; contingency:number}} Costs */
/** @typedef {{form?:Form; name:string; brief:string; wood:string; finish:string; cane:string; leather:string; parameters:Parameters; checks:Record<string, boolean>; costs:Costs}} Concept */
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

/**
 * Slab-side desk: a top on two full-height side panels, with an apron of
 * side-by-side drawers under the top and open knee space below. The last
 * (rightmost) drawer is the lead drawer and takes `leadShare` % of the
 * drawer zone; the others share the rest equally.
 * @type {ReadonlyArray<readonly [ParamKey, string, number, number]>}
 */
export const APRON_FIELDS = [
  ["width", "Overall width", 800, 1600],
  ["depth", "Overall depth", 380, 600],
  ["height", "Work surface height", 700, 800],
  ["top", "Top thickness", 20, 40],
  ["side", "Side panel thickness", 20, 45],
  ["overhang", "Top overhang (ends and front)", 0, 60],
  ["apron", "Apron (drawer band) height", 100, 220],
  ["rail", "Deck, divider and front thickness", 18, 30],
  ["drawers", "Drawer count", 1, 3],
  ["leadShare", "Right (lead) drawer share %", 20, 80],
  ["gap", "Drawer front gap", 2, 5],
  ["slideAllowance", "Total runner width allowance", 20, 60],
];

/** Template forms. A concept without `form` is a cabinet (older saves). */
export const FORMS = /** @type {const} */ ({
  cabinet: {
    label: "Asymmetric cabinet vanity / desk",
    description:
      "Left drawer tower, right drawer case, bridge worktop, rear shelf, sled bases.",
    fields: FIELDS,
    integerFields: INTEGER_FIELDS,
  },
  apron: {
    label: "Slab-side apron desk / vanity",
    description:
      "Top on two full-height slab side panels, side-by-side drawers in an apron under the top, open knee space.",
    fields: APRON_FIELDS,
    integerFields: ["drawers"],
  },
});

export const FORM_KEYS = /** @type {Form[]} */ (Object.keys(FORMS));

/** @param {{form?: unknown}} d @returns {Form} */
export function formOf(d) {
  return d?.form === "apron" ? "apron" : "cabinet";
}

/** Parameter fields for a concept's form. @param {{form?: unknown}} d */
export function fieldsFor(d) {
  return FORMS[formOf(d)].fields;
}

/** @param {{form?: unknown}} d */
export function integerFieldsFor(d) {
  return FORMS[formOf(d)].integerFields;
}

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

/** @type {Concept} */
export const APRON_SEED = {
  form: "apron",
  name: "Slab-side oak vanity",
  brief:
    "Compact MODERNCRE8VE vanity / dressing table. Thin top on two full-height slab side panels, two handle-free drawers side by side in a shallow apron (the right one larger), open knee space for a low stool. Mirror and stool are separate accessories.",
  wood: "Light natural white oak",
  finish: "Matte clear finish — sample pending",
  cane: "None",
  leather: "None — handle-free fronts (finger grip under the front)",
  parameters: {
    width: 1050,
    depth: 450,
    height: 760,
    top: 22,
    side: 25,
    overhang: 15,
    apron: 120,
    rail: 20,
    drawers: 2,
    leadShare: 55,
    gap: 3,
    slideAllowance: 26,
  },
  checks: {},
  costs: {
    oak: 420,
    drawer: 70,
    cane: 0,
    leather: 0,
    slide: 47.5,
    other: 40,
    finish: 80,
    hours: 16,
    rate: 65,
    packaging: 130,
    contingency: 15,
  },
};

/** @param {Form} form */
export const seedFor = (form) =>
  structuredClone(form === "apron" ? APRON_SEED : SEED_CONCEPT);

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
  if (!value || typeof value !== "object") {
    return ["Concept must be an object."];
  }
  const d = /** @type {Concept} */ (value);
  const errors = [];
  if (d.form !== undefined && !FORM_KEYS.includes(d.form))
    errors.push(`form must be one of ${FORM_KEYS.join(", ")}.`);
  textErrors(d, errors);
  parameterErrors(d.parameters, errors, fieldsFor(d), integerFieldsFor(d));
  costErrors(d.costs, errors);
  checkErrors(d.checks, errors);
  return errors;
}

/** @param {Concept} d @param {string[]} errors */
function textErrors(d, errors) {
  for (const key of TEXT_KEYS) {
    if (typeof d[key] !== "string") {
      errors.push(`${key} must be text.`);
    } else if (d[key].length > MAX_TEXT) {
      errors.push(`${key} is over ${MAX_TEXT} characters.`);
    }
  }
  if (typeof d.name === "string" && !d.name.trim()) {
    errors.push("name is required.");
  }
}

/** @param {unknown} parameters @param {string[]} errors */
function parameterErrors(
  parameters,
  errors,
  fields = FIELDS,
  integers = INTEGER_FIELDS,
) {
  if (!parameters || typeof parameters !== "object") {
    errors.push("parameters are required.");
    return;
  }
  for (const [key, label, min, max] of fields) {
    const v = parameters[key];
    if (!Number.isFinite(v) || v < min || v > max) {
      errors.push(`${label} (${key}) must be ${min}–${max}.`);
    } else if (integers.includes(key) && !Number.isInteger(v)) {
      errors.push(`${label} (${key}) must be a whole number.`);
    }
  }
  for (const key of Object.keys(parameters)) {
    if (!fields.some(([f]) => f === key)) {
      errors.push(`Unknown parameter ${key}.`);
    }
  }
}

/** @param {unknown} costs @param {string[]} errors */
function costErrors(costs, errors) {
  if (!costs || typeof costs !== "object") {
    errors.push("costs are required.");
    return;
  }
  for (const [key, label] of COST_FIELDS) {
    const v = costs[key];
    if (!Number.isFinite(v) || v < 0 || v > MAX_COST) {
      errors.push(`${label} (${key}) must be 0–${MAX_COST}.`);
    }
  }
  for (const key of Object.keys(costs)) {
    if (!COST_FIELDS.some(([f]) => f === key)) {
      errors.push(`Unknown cost ${key}.`);
    }
  }
}

/** @param {unknown} checks @param {string[]} errors */
function checkErrors(checks, errors) {
  if (!checks || typeof checks !== "object") {
    errors.push("checks are required.");
    return;
  }
  for (const [key, v] of Object.entries(checks)) {
    if (!GATES.some(([g]) => g === key)) {
      errors.push(`Unknown check ${key}.`);
    } else if (typeof v !== "boolean") {
      errors.push(`Check ${key} must be true/false.`);
    }
  }
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
  if (formOf(d) === "apron") return apronIssues(d);
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

/** Seated clearance under the apron for a vanity stool (≈ 24 in). */
const APRON_KNEE_TARGET = 610;

/**
 * Derived apron-desk geometry shared by the checks, parts and summaries.
 * @param {Parameters} p
 */
export function apronLayout(p) {
  const x0 = p.overhang + p.side;
  const span = p.width - 2 * x0;
  const zone = span - (p.drawers - 1) * p.rail;
  const lead = p.drawers === 1 ? zone : (zone * p.leadShare) / 100;
  const other = p.drawers === 1 ? 0 : (zone - lead) / (p.drawers - 1);
  const openings = [];
  let x = x0;
  for (let i = 0; i < p.drawers; i++) {
    const w = i === p.drawers - 1 ? lead : other;
    openings.push({ x, w });
    x += w + p.rail;
  }
  const deckZ = p.height - p.top - p.apron;
  const openingH = p.apron - p.rail;
  return {
    x0,
    span,
    openings,
    deckZ,
    openingH,
    kneeClearance: deckZ,
    boxH: openingH - 25,
    boxD: p.depth - p.overhang - 2 * p.rail - 20,
  };
}

/** @param {Concept} d */
function apronIssues(d) {
  const p = d.parameters;
  const l = apronLayout(p);
  const warnings = [];
  if (l.kneeClearance < APRON_KNEE_TARGET)
    warnings.push(
      `Knee clearance under the apron is below the ${APRON_KNEE_TARGET} mm / 24 in study target.`,
    );
  if (Math.min(...l.openings.map((o) => o.w)) - p.slideAllowance < 150)
    warnings.push(
      "A drawer opening is too narrow for a box and runners. Widen the piece, use fewer drawers or rebalance the lead drawer share.",
    );
  if (l.boxH < 50)
    warnings.push(
      "Apron is too shallow for a drawer box. Increase apron height or reduce deck thickness.",
    );
  if (l.boxD < 250)
    warnings.push(
      "Depth is too shallow for drawer boxes. Increase depth or reduce the front overhang.",
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
 * Part collector: numbers parts P001… and drops non-positive blanks.
 * @param {Part[]} out
 */
function partAdder(out) {
  let seq = 0;
  /** @param {string} label @param {Part["material"]} material */
  return (
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
  const add = partAdder(out);
  if (formOf(d) === "apron") {
    apronParts(p, add);
    return out;
  }
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

/**
 * Apron-desk components. Sides start behind the front overhang and run to
 * the rear edge (wall side); fronts are inset slabs flush with the sides.
 * @param {Parameters} p
 * @param {ReturnType<typeof partAdder>} add
 */
function apronParts(p, add) {
  const l = apronLayout(p);
  const front = p.overhang;
  const underTop = p.height - p.top;
  add("Top", "oak", 0, 0, underTop, p.width, p.depth, p.top);
  for (const [label, x] of [
    ["Left slab side", p.overhang],
    ["Right slab side", p.width - p.overhang - p.side],
  ])
    add(
      label,
      "oak",
      x,
      front,
      0,
      p.side,
      p.depth - front,
      underTop,
      "Solid panel study; grain vertical, top attachment must allow movement",
    );
  add(
    "Drawer deck",
    "oak",
    l.x0,
    front,
    l.deckZ,
    l.span,
    p.depth - front,
    p.rail,
    "Visible underside of the apron; carries the runners",
  );
  add(
    "Rear apron rail",
    "oak",
    l.x0,
    p.depth - p.rail,
    l.deckZ + p.rail,
    l.span,
    p.rail,
    l.openingH,
    "Main racking resistance with the deck; joint to sides unresolved",
  );
  for (let i = 0; i < l.openings.length - 1; i++) {
    const o = l.openings[i];
    add(
      `Drawer divider ${i + 1}`,
      "oak",
      o.x + o.w,
      front,
      l.deckZ + p.rail,
      p.rail,
      p.depth - front - p.rail,
      l.openingH,
    );
  }
  l.openings.forEach((o, i) => {
    const name = `Drawer ${i + 1}${i === l.openings.length - 1 && l.openings.length > 1 ? " (lead)" : ""}`;
    const z = l.deckZ + p.rail;
    add(
      `${name} front`,
      "oak",
      o.x + p.gap,
      front,
      z + p.gap,
      o.w - 2 * p.gap,
      p.rail,
      l.openingH - 2 * p.gap,
      "Slab front, handle-free; finger-grip profile under the front pending",
    );
    const boxX = o.x + p.slideAllowance / 2;
    const boxW = o.w - p.slideAllowance;
    const boxY = front + p.rail + 5;
    for (const sx of [boxX, boxX + boxW - 15])
      add(
        `${name} box side`,
        "drawer",
        sx,
        boxY,
        z + 10,
        15,
        l.boxD,
        l.boxH,
        "15 mm study box; slide notches and dovetails unresolved",
      );
    for (const sy of [boxY, boxY + l.boxD - 15])
      add(
        `${name} box end`,
        "drawer",
        boxX + 15,
        sy,
        z + 10,
        boxW - 30,
        15,
        l.boxH,
      );
    add(
      `${name} bottom`,
      "drawer",
      boxX,
      boxY,
      z + 10,
      boxW,
      l.boxD,
      6,
      "6 mm bottom study; groove allowance and load capacity unresolved",
    );
  });
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
  const drawers =
    formOf(d) === "apron"
      ? d.parameters.drawers
      : d.parameters.leftDrawers + d.parameters.rightDrawers;
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

/** First paragraph of the brief (≤ 450 chars): later paragraphs are notes. @param {Concept} d */
const briefLead = (d) =>
  d.brief
    .split(/\n\s*\n/)[0]
    .trim()
    .slice(0, 450);

/**
 * Photoreal render prompt for an image model. Does not lock geometry.
 * @param {Concept} d
 */
export function renderPrompt(d) {
  const p = d.parameters;
  if (formOf(d) === "apron") {
    const l = apronLayout(p);
    const [first, ...rest] = l.openings;
    const lead = rest.at(-1)?.w ?? first.w;
    const others = l.openings.slice(0, -1).map((o) => o.w);
    const sizing = others.every((w) => Math.abs(w - lead) < 1)
      ? "all the same width"
      : lead > Math.max(...others)
        ? "the rightmost one widest"
        : "the rightmost one narrowest";
    const drawers =
      p.drawers === 1
        ? "Exactly 1 drawer in the apron"
        : `Exactly ${p.drawers} drawers side by side in the apron, ${sizing}`;
    return `Photorealistic studio product visualization of a premium MODERNCRE8VE slab-side vanity / desk. ${briefLead(d)} Primary wood: ${d.wood}. Finish: ${d.finish}. ${drawers}; flat slab drawer fronts with no hardware. Study envelope ${p.width} mm wide, ${p.depth} mm deep, ${p.height} mm worktop height. Thin top on two full-height solid side panels that reach the floor, no legs, ${p.apron} mm apron, open knee space about ${Math.round(l.kneeClearance)} mm high. Warm neutral seamless background, physically plausible oak grain, soft daylight, three-quarter front view, full piece in frame. No text, labels, props covering the piece or watermark. Concept visualization only; no dimensional accuracy claim.`.slice(
      0,
      1500,
    );
  }
  return `Photorealistic studio product visualization of a premium MODERNCRE8VE asymmetric vanity / desk. ${briefLead(d)} Primary wood: ${d.wood}. Finish: ${d.finish}. Drawer inserts: ${d.cane}. Pulls: ${d.leather}, discreet fasteners. Exactly ${p.leftDrawers} left drawers and ${p.rightDrawers} right drawers. Study envelope ${p.width} mm wide, ${p.depth} mm deep, ${p.height} mm worktop height. Left tower ${p.leftWidth} mm wide, right case ${p.rightWidth} mm wide, knee opening ${p.width - p.leftWidth - p.rightWidth} mm. Sculpted sled bases, softened corners, elevated slim rear shelf. Warm neutral seamless background, physically plausible oak grain and woven texture, soft daylight, three-quarter front view, full piece in frame. No text, labels, props covering the piece or watermark. Concept visualization only; no dimensional accuracy claim.`.slice(
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
 * @param {{form?:Form; name?:string; brief?:string; wood?:string; finish?:string; cane?:string; leather?:string; parameters?:Partial<Parameters>; costs?:Partial<Costs>; checks?:Record<string, boolean>}} patch
 * @returns {Concept}
 */
export function applyConceptPatch(base, patch = {}) {
  const next = structuredClone(base);
  let designChanged = false;
  if (patch.form !== undefined && patch.form !== formOf(next)) {
    if (!FORM_KEYS.includes(patch.form))
      throw new Error(`Unknown form "${patch.form}".`);
    // A form has its own parameter set: start from that form's seed values.
    next.form = patch.form;
    next.parameters = seedFor(patch.form).parameters;
    designChanged = true;
  }
  for (const key of TEXT_KEYS) {
    if (patch[key] !== undefined && patch[key] !== next[key]) {
      next[key] = patch[key];
      designChanged = true;
    }
  }
  const known = {
    parameters: fieldsFor(next).map(([key]) => key),
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
