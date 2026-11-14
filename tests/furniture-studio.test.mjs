import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import {
  applyConceptPatch,
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

    const traversal = await s.call("get_concept", { id: "../../etc" });
    assert.equal(traversal.isError, true);

    const prompt = await s.call("build_render_prompt", { id });
    assert.match(prompt.structuredContent.prompt, /1800 mm wide/);
  } finally {
    s.child.kill();
    rmSync(dir, { recursive: true, force: true });
  }
});
