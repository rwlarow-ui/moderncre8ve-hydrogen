import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import {
  APRON_SEED,
  applyConceptPatch,
  apronLayout,
  cloneSeed,
  conceptErrors,
  conceptParts,
  costEstimate,
  designIssues,
  isBlocked,
  materialSchedule,
  renderPrompt,
  SEED_CONCEPT,
  toCadQuery,
  toCsv,
  toDxf,
  toScad,
  validConcept,
} from "../app/utils/furniture-studio.js";

const find = (parts, label) => parts.find((p) => p.label === label);

test("seed concept is valid with no design warnings", () => {
  assert.deepEqual(conceptErrors(SEED_CONCEPT), []);
  assert.deepEqual(designIssues(SEED_CONCEPT), []);
  assert.equal(isBlocked(SEED_CONCEPT), false);
});

test("dimensions consistently drive components, exports and estimate", () => {
  const a = conceptParts(SEED_CONCEPT);
  const changed = cloneSeed();
  changed.parameters.width += 100;
  const b = conceptParts(changed);
  assert.equal(find(b, "Bridge worktop").w - find(a, "Bridge worktop").w, 100);
  assert.equal(find(b, "Right side A").x - find(a, "Right side A").x, 100);
  assert.ok(
    a.every(
      (p) =>
        [p.x, p.y, p.z, p.w, p.d, p.h].every(Number.isFinite) &&
        Math.min(p.w, p.d, p.h) > 0,
    ),
  );
  assert.equal(a.length, 92);
  assert.equal(a.filter((p) => p.material === "leather").length, 6);
  assert.equal(toCsv(SEED_CONCEPT).split("\n").length, a.length + 1);
  assert.match(toScad(changed), /translate/);
  assert.match(toDxf(SEED_CONCEPT), /\$INSUNITS\n70\n4/);
  assert.match(
    toCadQuery(SEED_CONCEPT),
    /assembly.save\("moderncre8ve_concept.step"\)/,
  );
  const est = costEstimate(SEED_CONCEPT);
  assert.equal(est.materials, 1342.5);
  assert.equal(est.labor, 1625);
  assert.equal(est.total, 3608.13);
  assert.match(renderPrompt(SEED_CONCEPT), /1727 mm wide/);
  assert.match(renderPrompt(SEED_CONCEPT), /Exactly 4 left drawers/);
});

test("drawer counts change leather pulls and the cost", () => {
  const d = applyConceptPatch(SEED_CONCEPT, {
    parameters: { leftDrawers: 3, rightDrawers: 1 },
  });
  assert.equal(
    conceptParts(d).filter((p) => p.material === "leather").length,
    4,
  );
  assert.equal(
    costEstimate(d).materials,
    1342.5 - 2 * (SEED_CONCEPT.costs.leather + SEED_CONCEPT.costs.slide),
  );
});

test("narrow width warns about knee room but stays exportable", () => {
  const d = applyConceptPatch(SEED_CONCEPT, { parameters: { width: 1500 } });
  assert.match(designIssues(d).join(" "), /Knee/);
  assert.equal(isBlocked(d), false);
});

test("colliding geometry blocks exports", () => {
  const d = applyConceptPatch(SEED_CONCEPT, {
    parameters: { rightCase: 500, base: 250 },
  });
  assert.ok(validConcept(d));
  assert.match(designIssues(d).join(" "), /intersects the base/);
  assert.equal(isBlocked(d), true);
});

test("out-of-range and malformed input is rejected with reasons", () => {
  const d = cloneSeed();
  d.parameters.width = 5000;
  d.parameters.leftDrawers = 2.5;
  d.checks.bogus = true;
  const errors = conceptErrors(d);
  assert.ok(errors.some((e) => e.includes("(width) must be 1200–2400")));
  assert.ok(errors.some((e) => e.includes("whole number")));
  assert.ok(errors.some((e) => e.includes("Unknown check bogus")));
  assert.equal(validConcept(null), false);
  assert.equal(isBlocked({}), true);
});

test("design edits clear review checks; check-only patches keep them", () => {
  const checked = applyConceptPatch(SEED_CONCEPT, {
    checks: { envelope: true },
  });
  assert.equal(checked.checks.envelope, true);
  const more = applyConceptPatch(checked, { checks: { samples: true } });
  assert.deepEqual(more.checks, { envelope: true, samples: true });
  const edited = applyConceptPatch(more, { wood: "Walnut" });
  assert.deepEqual(edited.checks, {});
  assert.equal(SEED_CONCEPT.wood, "Light natural white oak");
});

test("unknown parameter or cost keys are rejected, not silently saved", () => {
  assert.throws(
    () => applyConceptPatch(SEED_CONCEPT, { parameters: { widht: 1800 } }),
    /Unknown parameter "widht"/,
  );
  assert.throws(
    () =>
      applyConceptPatch(
        SEED_CONCEPT,
        JSON.parse('{"costs":{"__proto__":{"oak":1}}}'),
      ),
    /Unknown cost "__proto__"/,
  );
  const d = cloneSeed();
  d.parameters.widht = 1800;
  assert.ok(conceptErrors(d).includes("Unknown parameter widht."));
});

test("material schedule reports board feet and per-material counts", () => {
  const s = materialSchedule(SEED_CONCEPT);
  assert.equal(s.byMaterial.leather.count, 6);
  assert.equal(s.byMaterial.cane.count, 6);
  assert.ok(s.oakBoardFeet > 10 && s.oakBoardFeet < 100);
});

/* ------------------------------ apron form ------------------------------ */

const overlap = (a, b) =>
  ["x", "y", "z"].every((k, i) => {
    const size = ["w", "d", "h"][i];
    return a[k] < b[k] + b[size] - 1e-9 && b[k] < a[k] + a[size] - 1e-9;
  });

test("apron seed is valid, fits its envelope and parts don't collide", () => {
  assert.deepEqual(conceptErrors(APRON_SEED), []);
  assert.deepEqual(designIssues(APRON_SEED), []);
  const parts = conceptParts(APRON_SEED);
  // top, 2 sides, deck, rear rail, 1 divider, 2 × (front + 2 sides + 2 ends + bottom)
  assert.equal(parts.length, 18);
  const p = APRON_SEED.parameters;
  for (const part of parts) {
    assert.ok(part.x >= 0 && part.x + part.w <= p.width + 1e-9, part.label);
    assert.ok(part.y >= 0 && part.y + part.d <= p.depth + 1e-9, part.label);
    assert.ok(part.z >= 0 && part.z + part.h <= p.height + 1e-9, part.label);
  }
  // Drawer boxes are studied as overlapping blanks; everything else must not
  // touch anything else, boxes included.
  for (let i = 0; i < parts.length; i++)
    for (let j = i + 1; j < parts.length; j++) {
      const [a, b] = [parts[i], parts[j]];
      if (a.material === "drawer" && b.material === "drawer") continue;
      assert.ok(!overlap(a, b), `${a.label} overlaps ${b.label}`);
    }
  assert.equal(
    parts.filter((x) => x.material !== "oak" && x.material !== "drawer").length,
    0,
  );
});

test("lead drawer share sizes the rightmost drawer", () => {
  const l = apronLayout(APRON_SEED.parameters);
  const zone = l.openings.reduce((sum, o) => sum + o.w, 0);
  assert.ok(Math.abs(l.openings[1].w / zone - 0.55) < 1e-9);
  const three = applyConceptPatch(APRON_SEED, {
    parameters: { width: 1400, drawers: 3, leadShare: 40 },
  });
  const o = apronLayout(three.parameters).openings;
  assert.equal(o.length, 3);
  assert.ok(Math.abs(o[0].w - o[1].w) < 1e-9);
  assert.ok(o[2].w > o[0].w);
  assert.equal(
    conceptParts(three).filter((x) => x.label.endsWith("front")).length,
    3,
  );
});

test("apron checks: low knee is advisory, cramped drawers block", () => {
  const low = applyConceptPatch(APRON_SEED, {
    parameters: { height: 700, apron: 220 },
  });
  assert.match(designIssues(low).join(" "), /Knee clearance/);
  assert.equal(isBlocked(low), false);
  const narrow = applyConceptPatch(APRON_SEED, {
    parameters: { width: 800, drawers: 3, leadShare: 80 },
  });
  assert.match(designIssues(narrow).join(" "), /too narrow/);
  assert.equal(isBlocked(narrow), true);
});

test("apron cost, prompt and form switching", () => {
  assert.equal(costEstimate(APRON_SEED).drawers, 2);
  const prompt = renderPrompt(APRON_SEED);
  assert.match(prompt, /Exactly 2 drawers side by side/);
  assert.match(prompt, /1050 mm wide/);
  assert.doesNotMatch(prompt, /rattan|leather|sled/i);
  for (const [leadShare, wording] of [
    [40, /rightmost one narrowest/],
    [50, /all the same width/],
  ])
    assert.match(
      renderPrompt(
        applyConceptPatch(APRON_SEED, { parameters: { leadShare } }),
      ),
      wording,
    );

  const switched = applyConceptPatch(
    applyConceptPatch(SEED_CONCEPT, { checks: { envelope: true } }),
    { form: "apron", parameters: { width: 1100 } },
  );
  assert.equal(switched.form, "apron");
  assert.equal(switched.parameters.width, 1100);
  assert.equal(switched.parameters.drawers, APRON_SEED.parameters.drawers);
  assert.deepEqual(switched.checks, {});
  assert.deepEqual(conceptErrors(switched), []);
  assert.throws(
    () => applyConceptPatch(APRON_SEED, { parameters: { leftDrawers: 3 } }),
    /Unknown parameter "leftDrawers"/,
  );
  const back = applyConceptPatch(switched, { form: "cabinet" });
  assert.deepEqual(back.parameters, SEED_CONCEPT.parameters);

  const cabinetRanges = cloneSeed();
  cabinetRanges.form = "apron";
  assert.ok(
    conceptErrors(cabinetRanges).some((e) =>
      e.includes("Unknown parameter leftWidth"),
    ),
  );
  for (const form of ["__proto__", "constructor", "sled"]) {
    assert.ok(
      conceptErrors({ ...APRON_SEED, form }).some((e) =>
        e.startsWith("form must be"),
      ),
    );
    assert.throws(
      () => applyConceptPatch(APRON_SEED, { form }),
      /Unknown form/,
    );
  }
});

/* ------------------------------ MCP server ------------------------------ */

const serverPath = fileURLToPath(
  new URL("../scripts/furniture-studio-mcp.mjs", import.meta.url),
);

function startServer(dir) {
  const child = spawn(process.execPath, [serverPath], {
    env: { ...process.env, FURNITURE_STUDIO_DIR: dir },
    stdio: ["pipe", "pipe", "inherit"],
  });
  let buffer = "";
  const waiting = new Map();
  child.stdout.on("data", (chunk) => {
    buffer += chunk;
    let i = buffer.indexOf("\n");
    while (i !== -1) {
      const msg = JSON.parse(buffer.slice(0, i));
      buffer = buffer.slice(i + 1);
      waiting.get(msg.id)?.(msg);
      waiting.delete(msg.id);
      i = buffer.indexOf("\n");
    }
  });
  let nextId = 1;
  const request = (method, params) =>
    new Promise((resolve) => {
      const id = nextId++;
      waiting.set(id, resolve);
      child.stdin.write(
        `${JSON.stringify({ jsonrpc: "2.0", id, method, params })}\n`,
      );
    });
  const call = async (name, args = {}) => {
    const res = await request("tools/call", { name, arguments: args });
    return res.result;
  };
  return { child, request, call };
}

test("MCP server lists tools and saves, revises and exports a concept", async () => {
  const dir = mkdtempSync(join(tmpdir(), "furniture-studio-"));
  const s = startServer(dir);
  try {
    const init = await s.request("initialize", {
      protocolVersion: "2024-11-05",
    });
    assert.equal(init.result.serverInfo.name, "moderncre8ve-furniture-studio");
    const list = await s.request("tools/list", {});
    const names = list.result.tools.map((t) => t.name);
    for (const n of [
      "get_design_template",
      "list_concepts",
      "get_concept",
      "save_concept",
      "evaluate_concept",
      "get_cut_list",
      "export_concept",
      "build_render_prompt",
    ])
      assert.ok(names.includes(n), n);

    const evaluated = await s.call("evaluate_concept", {
      parameters: { width: 1500 },
    });
    assert.ok(!evaluated.isError);
    assert.match(evaluated.structuredContent.warnings.join(" "), /Knee/);

    const created = await s.call("save_concept", {
      name: "Walnut vanity",
      wood: "Black walnut",
    });
    const id = created.structuredContent.id;
    assert.equal(created.structuredContent.revision, 1);

    const stale = await s.call("save_concept", {
      id,
      expectedRevision: 0,
      parameters: { width: 1800 },
    });
    assert.equal(stale.isError, true);
    assert.match(stale.content[0].text, /revision 1/);

    const revised = await s.call("save_concept", {
      id,
      expectedRevision: 1,
      parameters: { width: 1800 },
    });
    assert.equal(revised.structuredContent.revision, 2);

    const bad = await s.call("save_concept", {
      id,
      parameters: { width: 9999 },
    });
    assert.equal(bad.isError, true);
    const typo = await s.call("save_concept", {
      id,
      parameters: { widht: 1900 },
    });
    assert.equal(typo.isError, true);
    assert.match(typo.content[0].text, /Unknown parameter/);

    const got = await s.call("get_concept", { id, revision: 1 });
    assert.equal(got.structuredContent.document.parameters.width, 1727);
    assert.equal(got.structuredContent.document.wood, "Black walnut");

    const listed = await s.call("list_concepts");
    assert.equal(listed.structuredContent.concepts[0].latestRevision, 2);

    const exported = await s.call("export_concept", {
      id,
      formats: ["csv", "dxf", "scad"],
    });
    const files = exported.structuredContent.files;
    assert.equal(files.length, 3);
    assert.match(readFileSync(files[0].path, "utf8"), /^"Part"/);
    assert.ok(files.every((f) => f.path.startsWith(dir)));

    const template = await s.call("get_design_template");
    assert.deepEqual(Object.keys(template.structuredContent.forms), [
      "cabinet",
      "apron",
    ]);

    const apron = await s.call("save_concept", {
      form: "apron",
      name: "Slab vanity",
      parameters: { width: 1000 },
    });
    assert.ok(!apron.isError, apron.content[0].text);
    assert.equal(apron.structuredContent.document.form, "apron");
    assert.equal(apron.structuredContent.document.cane, "None");
    assert.equal(apron.structuredContent.derived.form, "apron");
    const wrongKey = await s.call("save_concept", {
      id: apron.structuredContent.id,
      parameters: { leftDrawers: 3 },
    });
    assert.equal(wrongKey.isError, true);

    const converted = await s.call("save_concept", {
      id,
      expectedRevision: 2,
      form: "apron",
      parameters: { width: 1200 },
    });
    assert.ok(!converted.isError, converted.content[0].text);
    assert.equal(converted.structuredContent.revision, 3);
    assert.equal(converted.structuredContent.document.wood, "Black walnut");
    assert.equal(converted.structuredContent.document.parameters.width, 1200);
    const apronPrompt = await s.call("build_render_prompt", { id });
    assert.match(apronPrompt.structuredContent.prompt, /slab-side/);

    const traversal = await s.call("get_concept", { id: "../../etc" });
    assert.equal(traversal.isError, true);

    const prompt = await s.call("build_render_prompt", { id, revision: 2 });
    assert.match(prompt.structuredContent.prompt, /1800 mm wide/);
  } finally {
    s.child.kill();
    rmSync(dir, { recursive: true, force: true });
  }
});

test("concurrent saves from the same revision never both land", async () => {
  const dir = mkdtempSync(join(tmpdir(), "furniture-studio-race-"));
  const a = startServer(dir);
  const b = startServer(dir);
  try {
    const created = await a.call("save_concept", { name: "Race vanity" });
    const id = created.structuredContent.id;
    for (let round = 1; round <= 20; round++) {
      const [ra, rb] = await Promise.all([
        a.call("save_concept", {
          id,
          expectedRevision: round,
          parameters: { width: 1700 + round },
        }),
        b.call("save_concept", {
          id,
          expectedRevision: round,
          parameters: { depth: 600 + round },
        }),
      ]);
      const wins = [ra, rb].filter((r) => !r.isError);
      assert.equal(wins.length, 1, `round ${round}: exactly one save lands`);
      assert.equal(wins[0].structuredContent.revision, round + 1);
    }
    const latest = await a.call("get_concept", { id });
    assert.equal(latest.structuredContent.revision, 21);
  } finally {
    a.child.kill();
    b.child.kill();
    rmSync(dir, { recursive: true, force: true });
  }
});
