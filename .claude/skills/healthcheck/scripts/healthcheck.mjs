#!/usr/bin/env node
// Repo-shape-aware healthcheck. Discovers what the repo contains, then runs
// only the checks that apply. Zero dependencies; read-only by design.
//
//   node .claude/skills/healthcheck/scripts/healthcheck.mjs [--tier static|env|live|all]
//        [--fast] [--url https://host] [--typecheck-baseline N] [--json]
//
// Tiers: static (no env, no network) | env (needs .env, read-only Admin/Storefront
// calls via the repo's own scripts) | live (GET/HEAD against the production host).
// Default tier is "static". Exit code 1 when any check is FAIL.

import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join, resolve } from "node:path";

const args = process.argv.slice(2);
const flag = (n) => args.includes(`--${n}`);
const opt = (n) => {
  const i = args.indexOf(`--${n}`);
  return i >= 0 ? args[i + 1] : undefined;
};

const ROOT = resolve(
  spawnSync("git", ["rev-parse", "--show-toplevel"], {
    encoding: "utf8",
  }).stdout.trim() || process.cwd(),
);
const p = (...s) => join(ROOT, ...s);
const read = (f) => (existsSync(p(f)) ? readFileSync(p(f), "utf8") : "");
const tierArg = opt("tier") || "static";
const wants = (t) => tierArg === "all" || tierArg === t;

// ---- redaction: never let a token reach the report ----
const redact = (s) =>
  s
    .replace(/\b(shp(at|ss|ca|pa)_[A-Za-z0-9]{8,})\b/g, "[redacted]")
    .replace(/\b[a-f0-9]{32,}\b/gi, "[redacted]")
    .replace(
      /^(.*(token|secret|password|api[_-]?key)[^\n=:]*[=:]\s*).+$/gim,
      "$1[redacted]",
    );

// ---- discovery ----
const pkg = existsSync(p("package.json"))
  ? JSON.parse(read("package.json"))
  : {};
const scripts = pkg.scripts || {};
const deps = { ...pkg.dependencies, ...pkg.devDependencies };
const lockfile = [
  "package-lock.json",
  "pnpm-lock.yaml",
  "yarn.lock",
  "bun.lockb",
].find((f) => existsSync(p(f)));
const pm =
  {
    "package-lock.json": "npm",
    "pnpm-lock.yaml": "pnpm",
    "yarn.lock": "yarn",
    "bun.lockb": "bun",
  }[lockfile] || "npm";
const docs = ["CLAUDE.md", "AGENTS.md"].filter((f) => existsSync(p(f)));
const claudeMd = read("CLAUDE.md") || read("AGENTS.md");
const shape = {
  root: ROOT,
  packageManager: pm,
  hydrogen: Boolean(deps["@shopify/hydrogen"]),
  reactRouter: Boolean(deps["react-router"]),
  remix: Boolean(deps["@remix-run/react"]),
  biome: existsSync(p("biome.json")),
  typescript: existsSync(p("tsconfig.json")),
  playwright: existsSync(p("playwright.config.ts")),
  ci: existsSync(p(".github/workflows")),
  envFile: existsSync(p(".env")),
  envExample: existsSync(p(".env.example")),
  docs,
  scripts: Object.keys(scripts),
};

const results = [];
const add = (status, tier, id, detail = "", repro = "") =>
  results.push({ status, tier, id, detail, repro });

const run = (cmd, cmdArgs, env = {}, timeout = 600000) => {
  const r = spawnSync(cmd, cmdArgs, {
    cwd: ROOT,
    encoding: "utf8",
    env: { ...process.env, ...env },
    timeout,
    maxBuffer: 64 * 1024 * 1024,
  });
  return { code: r.status ?? 1, out: `${r.stdout || ""}${r.stderr || ""}` };
};
const tail = (s, n = 6) => redact(s.trim().split("\n").slice(-n).join("\n"));
// Keep only lines matching `re` (e.g. file diagnostics); fall back to the raw tail.
const pick = (s, re, n = 8) => {
  const hits = s
    .split("\n")
    .filter((l) => re.test(l))
    .map((l) => l.slice(0, 160));
  return redact(hits.length ? hits.slice(0, n).join("\n") : tail(s));
};
const npmRun = (name, env) => run(pm, ["run", name, "--silent"], env);

// ================= static tier =================
if (wants("static")) {
  const T = "static";
  add(
    lockfile ? "PASS" : "FAIL",
    T,
    "lockfile",
    lockfile || "no lockfile found",
  );
  const hasModules = existsSync(p("node_modules"));
  if (!hasModules) {
    add(
      "FAIL",
      T,
      "node_modules",
      "missing; run `npm ci` before tool checks",
      "npm ci",
    );
  }

  if (hasModules && scripts.biome) {
    const r = npmRun("biome");
    add(
      r.code === 0 ? "PASS" : "FAIL",
      T,
      "lint",
      r.code === 0
        ? "biome clean"
        : pick(r.out, /^\S+\.(tsx?|jsx?|mjs|json|css)\b/),
      "npm run biome",
    );
  } else {
    add(
      "SKIP",
      T,
      "lint",
      scripts.biome ? "no node_modules" : "no biome script",
    );
  }

  if (hasModules && scripts.typecheck) {
    // Route types live in .react-router/ (generated, gitignored). A fresh clone or CI
    // checkout lacks them, which adds a spurious "virtual:react-router" error.
    let typegen = "";
    if (!existsSync(p(".react-router")) && deps["@react-router/dev"]) {
      const g = run("npx", ["react-router", "typegen"]);
      typegen =
        g.code === 0
          ? " (ran react-router typegen first)"
          : " (typegen failed)";
    }
    const r = npmRun("typecheck");
    const n = (r.out.match(/error TS\d+/g) || []).length;
    const claimed = claudeMd.match(/reports\s+(\d+)[^\n]*errors/i);
    const baseline = Number(
      opt("typecheck-baseline") ?? (claimed ? claimed[1] : 0),
    );
    if (n === 0) {
      add("PASS", T, "typecheck", `0 errors${typegen}`);
    } else if (n <= baseline) {
      add(
        "BASELINE",
        T,
        "typecheck",
        `${n} errors, known baseline ${baseline}${typegen}`,
        "npm run typecheck",
      );
    } else {
      add(
        "FAIL",
        T,
        "typecheck",
        `${n} errors, baseline ${baseline}\n${pick(r.out, /error TS\d+/)}`,
        "npm run typecheck",
      );
    }
  } else {
    add(
      "SKIP",
      T,
      "typecheck",
      scripts.typecheck ? "no node_modules" : "no typecheck script",
    );
  }

  if (flag("fast")) {
    add("SKIP", T, "build", "--fast");
  } else if (hasModules && scripts.build) {
    const r = npmRun("build");
    add(
      r.code === 0 ? "PASS" : "FAIL",
      T,
      "build",
      r.code === 0 ? "build ok" : tail(r.out),
      "npm run build",
    );
  } else {
    add(
      "SKIP",
      T,
      "build",
      scripts.build ? "no node_modules" : "no build script",
    );
  }

  // Unit tests: only scripts named test or test:* (the repo's e2e/check scripts are other tiers).
  const unit = Object.keys(scripts).filter(
    (k) => k === "test" || k.startsWith("test:"),
  );
  if (!unit.length) {
    add("SKIP", T, "unit-tests", "no test scripts");
  }
  for (const name of unit) {
    const r = npmRun(name);
    add(
      r.code === 0 ? "PASS" : "FAIL",
      T,
      `unit:${name}`,
      r.code === 0 ? "ok" : tail(r.out),
      `npm run ${name}`,
    );
  }

  // .env.example must cover the env names the docs say are required.
  const req = claudeMd.match(/^Required:\s*(.+)$/m);
  if (req && shape.envExample) {
    const names = [...req[1].matchAll(/`([A-Z][A-Z0-9_]+)`/g)].map((m) => m[1]);
    const have = new Set(
      [
        ...read(".env.example").matchAll(/^\s*#?\s*([A-Z][A-Z0-9_]+)\s*=/gm),
      ].map((m) => m[1]),
    );
    const missing = names.filter((n) => !have.has(n));
    add(
      missing.length ? "WARN" : "PASS",
      T,
      "env-example",
      missing.length
        ? `.env.example lacks: ${missing.join(", ")}`
        : `${names.length} required names covered`,
    );
  } else {
    add(
      "SKIP",
      T,
      "env-example",
      req ? "no .env.example" : "docs list no Required: env line",
    );
  }

  // Version in package.json should be the newest CHANGELOG entry.
  const cl = read("CHANGELOG.md");
  if (pkg.version && cl) {
    const top = cl.match(/^##\s*\[?v?(\d+\.\d+\.\d+)/m);
    const ok = top && top[1] === pkg.version;
    add(
      ok ? "PASS" : "WARN",
      T,
      "changelog-version",
      ok
        ? pkg.version
        : `package.json ${pkg.version} vs CHANGELOG top ${top ? top[1] : "none found"}`,
    );
  } else {
    add("SKIP", T, "changelog-version", "no CHANGELOG.md or version");
  }

  // Paths named in backticks in the docs must exist. Home-relative paths are machine-specific -> WARN.
  const seen = new Set();
  const missing = [];
  const homeMissing = [];
  for (const m of claudeMd.matchAll(/`([^`\s]+)`/g)) {
    const tok = m[1].replace(/[.,:;]+$/, "");
    if (
      seen.has(tok) ||
      /^https?:|[*$()[\]{}<>@=]|^\/|^--|^npm |^npx /.test(
        tok.replace(/^~\//, "x/"),
      )
    ) {
      continue;
    }
    if (!/\//.test(tok) || !/(\.[a-z0-9]{1,5}|\/)$/i.test(tok)) {
      continue;
    }
    seen.add(tok);
    if (tok.startsWith("~/")) {
      if (!existsSync(join(homedir(), tok.slice(2)))) {
        homeMissing.push(tok);
      }
    } else if (!existsSync(p(tok))) {
      missing.push(tok);
    }
  }
  add(
    missing.length ? "FAIL" : "PASS",
    T,
    "doc-paths",
    missing.length
      ? `named in docs but absent: ${missing.join(", ")}`
      : `${seen.size} paths checked`,
  );
  if (homeMissing.length) {
    add(
      "WARN",
      T,
      "doc-home-paths",
      `docs reference home paths missing on this machine: ${homeMissing.join(", ")}`,
    );
  }

  // CLAUDE.md and AGENTS.md are copies of each other in this repo; flag drift.
  if (docs.length === 2) {
    const a = new Set(read("CLAUDE.md").split("\n"));
    const b = new Set(read("AGENTS.md").split("\n"));
    const diff =
      [...a].filter((l) => !b.has(l)).length +
      [...b].filter((l) => !a.has(l)).length;
    add(
      diff > 6 ? "WARN" : "PASS",
      T,
      "doc-drift",
      `${diff} differing lines between CLAUDE.md and AGENTS.md`,
    );
  }

  // Secrets hygiene: presence/tracking only, values are never read.
  for (const f of [".env", ".claude/settings.local.json"]) {
    if (!existsSync(p(f))) {
      continue;
    }
    const tracked = run("git", ["ls-files", "--error-unmatch", f]).code === 0;
    add(
      tracked ? "FAIL" : "PASS",
      T,
      `secrets:${f}`,
      tracked ? "tracked by git" : "untracked",
    );
  }
}

// ================= env tier =================
if (wants("env")) {
  const T = "env";
  // Read-only against Shopify. debug:admin-auth is excluded on purpose: it prints a token prefix.
  // audit:content writes a local report under reports/.
  const allow = ["check:collections", "audit:content"];
  for (const name of allow) {
    if (!scripts[name]) {
      add("SKIP", T, name, "script not present");
    } else if (!shape.envFile) {
      add("SKIP", T, name, "needs .env");
    } else {
      const r = npmRun(name);
      add(
        r.code === 0 ? "PASS" : "FAIL",
        T,
        name,
        r.code === 0 ? "ok" : tail(r.out),
        `npm run ${name}`,
      );
    }
  }
}

// ================= live tier =================
if (wants("live")) {
  const T = "live";
  const hostRow = claudeMd.match(/\|\s*`([^`\s]+)`\s*\|\s*Hydrogen/);
  const url =
    opt("url") ||
    process.env.HEALTHCHECK_URL ||
    (hostRow ? `https://${hostRow[1]}` : "");
  if (!url) {
    add("SKIP", T, "site-head", "no --url and no Hydrogen host found in docs");
  } else {
    try {
      const res = await fetch(`${url}/`, {
        method: "HEAD",
        redirect: "manual",
      });
      const pb = res.headers.get("powered-by") || "";
      const ok = res.status === 200 && /hydrogen/i.test(pb);
      add(
        ok ? "PASS" : "FAIL",
        T,
        "site-head",
        `${res.status} powered-by: ${pb || "(none)"}`,
        `curl -sI ${url}/`,
      );
    } catch (e) {
      add(
        "FAIL",
        T,
        "site-head",
        `request failed: ${e.message}`,
        `curl -sI ${url}/`,
      );
    }
    if (scripts["check:homepage"]) {
      const r = npmRun("check:homepage", { BASE_URL: url });
      add(
        r.code === 0 ? "PASS" : "FAIL",
        T,
        "check:homepage",
        r.code === 0 ? "ok" : pick(r.out, /"message"/),
        `BASE_URL=${url} npm run check:homepage`,
      );
    }
  }
}

// ---- report ----
const out = (line) => process.stdout.write(`${line}\n`);
const pad = " ".repeat(17);
if (flag("json")) {
  out(JSON.stringify({ shape, results }, null, 2));
} else {
  out(
    `SHAPE  pm=${pm} hydrogen=${shape.hydrogen} react-router=${shape.reactRouter} biome=${shape.biome} tsc=${shape.typescript} playwright=${shape.playwright} ci=${shape.ci} env=${shape.envFile} docs=${docs.join("+") || "none"}`,
  );
  for (const r of results) {
    const detail = r.detail ? `  ${r.detail.replace(/\n/g, `\n${pad}`)}` : "";
    const repro = r.repro && r.status !== "PASS" ? `\n${pad}↳ ${r.repro}` : "";
    out(`${r.status.padEnd(8)} ${r.tier.padEnd(6)} ${r.id}${detail}${repro}`);
  }
  const c = (st) => results.filter((r) => r.status === st).length;
  out(
    `\n${c("PASS")} pass, ${c("BASELINE")} baseline, ${c("WARN")} warn, ${c("FAIL")} fail, ${c("SKIP")} skip`,
  );
}
process.exit(results.some((r) => r.status === "FAIL") ? 1 : 0);
