import { useEffect, useMemo, useState } from "react";
import {
  OpsCard,
  OpsField,
  OpsNotice,
  OpsSectionHeading,
  opsInputClass,
  opsTextLinkClass,
} from "~/components/ops/ops-shell";
import { cn } from "~/utils/cn";
import {
  applyConceptPatch,
  COST_FIELDS,
  cloneSeed,
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
  fieldsFor,
  formOf,
  GATES,
  integerFieldsFor,
  isBlocked,
  MATERIAL_FIELDS,
  materialSchedule,
  renderPrompt,
  seedFor,
} from "~/utils/furniture-studio";

/* ---------------------------------------------------------------------------
   Furniture Studio: parametric workbench for prototype concepts. Ported from
   the retired ChatGPT-hosted hub's /design tab. Drafts live in this browser
   (localStorage) and move between people and the furniture-studio MCP server
   as JSON exports; there is no server-side store yet.
--------------------------------------------------------------------------- */

type Concept = ReturnType<typeof cloneSeed>;
type Part = ReturnType<typeof conceptParts>[number];
/** Stored draft / JSON export shape (untrusted until conceptErrors passes). */
type ConceptFile = { document?: Concept; revision?: number };
type Tab = "design" | "materials" | "render" | "release";
type View = "iso" | "front" | "side" | "plan";

const DRAFT_KEY = "mc8-studio-draft-v1";

const buttonClass =
  "inline-flex items-center justify-center border border-line px-4 py-2 text-sm transition-colors hover:border-body disabled:cursor-not-allowed disabled:opacity-40";
const primaryButtonClass =
  "inline-flex items-center justify-center border border-body bg-body px-4 py-2 text-background text-sm transition-colors hover:border-[#2CBF96] hover:bg-[#2CBF96] disabled:cursor-not-allowed disabled:opacity-40";

const MATERIAL_FILL: Record<Part["material"], string> = {
  oak: "#d6b68d",
  drawer: "#b59c79",
  cane: "url(#cane)",
  leather: "#bb9369",
};

function download(name: string, text: string, type: string) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const mm = (n: number) => n.toFixed(1);
const usd = (n: number) =>
  n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });

export function Drawing({ concept, view }: { concept: Concept; view: View }) {
  const parts = conceptParts(concept);
  const p = concept.parameters;
  const project = ([x, y, z]: number[]) =>
    view === "front"
      ? [x, -z]
      : view === "side"
        ? [y, -z]
        : view === "plan"
          ? [x, y]
          : [x + y * 0.55, -z - y * 0.35];
  const corners = parts
    .flatMap((a) => [
      [a.x, a.y, a.z],
      [a.x + a.w, a.y + a.d, a.z + a.h],
    ])
    .map(project);
  const xs = corners.map((c) => c[0]);
  const ys = corners.map((c) => c[1]);
  const minX = Math.min(...xs) - 70;
  const minY = Math.min(...ys) - 70;
  const w = Math.max(...xs) - minX + 70;
  const h = Math.max(...ys) - minY + 100;
  const faces =
    view === "iso"
      ? [
          [4, 5, 6, 7],
          [1, 2, 6, 5],
          [0, 1, 5, 4],
        ]
      : view === "front"
        ? [[0, 1, 5, 4]]
        : view === "side"
          ? [[1, 2, 6, 5]]
          : [[4, 5, 6, 7]];
  return (
    <svg
      className="h-auto w-full"
      viewBox={`${minX} ${minY} ${w} ${h}`}
      role="img"
      aria-label={`${view} component study, ${p.width} millimeters wide`}
    >
      <defs>
        <pattern id="cane" width="9" height="9" patternUnits="userSpaceOnUse">
          <rect width="9" height="9" fill="#eee0bb" />
          <path d="M0 0H9M0 0V9" stroke="#baa67d" strokeWidth="2" />
        </pattern>
      </defs>
      {[...parts]
        .sort((a, b) => b.y - a.y || a.x - b.x)
        .map((a) => {
          const v = [
            [a.x, a.y, a.z],
            [a.x + a.w, a.y, a.z],
            [a.x + a.w, a.y + a.d, a.z],
            [a.x, a.y + a.d, a.z],
            [a.x, a.y, a.z + a.h],
            [a.x + a.w, a.y, a.z + a.h],
            [a.x + a.w, a.y + a.d, a.z + a.h],
            [a.x, a.y + a.d, a.z + a.h],
          ].map(project);
          return (
            <g key={a.id}>
              <title>{`${a.id}: ${a.label}, ${mm(a.w)} × ${mm(a.d)} × ${mm(a.h)} mm`}</title>
              {faces.map((f, i) => (
                <polygon
                  key={f.join("-")}
                  points={f.map((j) => v[j].join(",")).join(" ")}
                  fill={MATERIAL_FILL[a.material]}
                  stroke="#765f48"
                  strokeWidth={1.3}
                  opacity={view === "iso" && i === 1 ? 0.84 : 1}
                />
              ))}
            </g>
          );
        })}
      <text x={minX + 12} y={minY + h - 18} fill="#695d50" fontSize="19">
        {view.toUpperCase()} · {p.width} W × {p.depth} D × {p.height} H mm ·
        STUDY
      </text>
    </svg>
  );
}

export function FurnitureStudio() {
  const [draft, setDraft] = useState<Concept>(cloneSeed);
  const [revision, setRevision] = useState(0);
  const [tab, setTab] = useState<Tab>("design");
  const [view, setView] = useState<View>("iso");
  const [message, setMessage] = useState(
    "Start from the oak and rattan vanity, or import a JSON export.",
  );
  const [ready, setReady] = useState(false);

  // Recover the local draft after hydration (localStorage is browser-only).
  useEffect(() => {
    try {
      const stored = JSON.parse(
        localStorage.getItem(DRAFT_KEY) || "null",
      ) as ConceptFile | null;
      if (stored && conceptErrors(stored.document).length === 0) {
        setDraft(stored.document);
        setRevision(stored.revision || 0);
        setMessage("Recovered your draft from this browser.");
      }
    } catch {}
    setReady(true);
  }, []);
  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem(
        DRAFT_KEY,
        JSON.stringify({ document: draft, revision }),
      );
    } catch {}
  }, [draft, revision, ready]);

  const errors = conceptErrors(draft);
  const valid = errors.length === 0;
  const warnings = valid ? designIssues(draft) : [];
  const blocked = isBlocked(draft);
  const parts = useMemo(
    () => (valid ? conceptParts(draft) : []),
    [draft, valid],
  );
  const budget = valid ? costEstimate(draft) : null;
  const schedule = valid ? materialSchedule(draft) : null;
  const p = draft.parameters;
  const form = formOf(draft);
  const knee: [number, string] =
    form === "apron"
      ? [p.height - p.top - p.apron, "Knee clearance"]
      : [p.width - p.leftWidth - p.rightWidth, "Knee opening"];

  /** Any design edit clears the review checks, as in the original studio. */
  const edit = (next: Concept) => setDraft({ ...next, checks: {} });

  function exportFile(format: keyof typeof EXPORT_FORMATS) {
    if (blocked) return;
    const [ext, type, build] = EXPORT_FORMATS[format];
    download(
      `${exportStem(draft, revision)}.${ext}`,
      build(draft, { revision }),
      type,
    );
  }

  async function importFile(file: File | undefined) {
    if (!file) return;
    try {
      if (file.size > 100_000) throw new Error("too large");
      const data = JSON.parse(await file.text()) as ConceptFile;
      if (conceptErrors({ ...data.document, checks: {} }).length)
        throw new Error("invalid");
      if (!window.confirm("Replace the current draft with this concept?"))
        return;
      setDraft({ ...data.document, checks: {} });
      setRevision(Number(data.revision) || 0);
      setMessage(
        `Imported ${data.document.name}${data.revision ? ` r${data.revision}` : ""}. Review checks were cleared.`,
      );
    } catch {
      setMessage("Choose a valid Furniture Studio JSON export under 100 KB.");
    }
  }

  function reset() {
    if (!window.confirm("Discard this draft and start from the seed concept?"))
      return;
    const seed = seedFor(form);
    setDraft(seed);
    setRevision(0);
    setMessage(`Started again from the ${seed.name}.`);
  }

  function switchForm(next: (typeof FORM_KEYS)[number]) {
    if (next === form) return;
    if (
      !window.confirm(
        `Switch to the ${FORMS[next].label} form? Its parameters start from that form's seed values; name, brief and materials are kept.`,
      )
    )
      return;
    edit(applyConceptPatch(draft, { form: next }));
    setMessage(`Switched to the ${FORMS[next].label} form.`);
  }

  const tabs: [Tab, string][] = [
    ["design", "Design & parameters"],
    ["materials", "Materials & costs"],
    ["render", "Render prompt"],
    ["release", "Prototype & exports"],
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="grid flex-1 gap-4 md:max-w-xl">
          <OpsField label="Concept name">
            <input
              className={opsInputClass}
              maxLength={140}
              value={draft.name}
              onChange={(e) => edit({ ...draft, name: e.target.value })}
            />
          </OpsField>
          <OpsField label="Template form" hint={FORMS[form].description}>
            <select
              className={opsInputClass}
              value={form}
              onChange={(e) =>
                switchForm(e.target.value as (typeof FORM_KEYS)[number])
              }
            >
              {FORM_KEYS.map((key) => (
                <option key={key} value={key}>
                  {FORMS[key].label}
                </option>
              ))}
            </select>
          </OpsField>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" className={buttonClass} onClick={reset}>
            New from seed
          </button>
          <label className={cn(buttonClass, "cursor-pointer")}>
            Import JSON
            <input
              type="file"
              accept=".json,application/json"
              className="sr-only"
              onChange={(e) => {
                void importFile(e.target.files?.[0]);
                e.target.value = "";
              }}
            />
          </label>
          <button
            type="button"
            className={primaryButtonClass}
            disabled={blocked}
            onClick={() => exportFile("json")}
          >
            Export JSON
          </button>
        </div>
      </div>

      <p role="status" className="text-body-subtle text-sm">
        {revision ? `Based on revision ${revision}. ` : ""}
        {message} Drafts are kept in this browser only; export JSON to share or
        to hand to the furniture-studio MCP tools.
      </p>

      {errors.length > 0 && (
        <OpsNotice ok={false}>
          <ul className="list-disc pl-4">
            {errors.map((x) => (
              <li key={x}>{x}</li>
            ))}
          </ul>
        </OpsNotice>
      )}
      {warnings.length > 0 && (
        <OpsNotice ok={!blocked}>
          <strong className="font-sans">
            {blocked ? "Geometry collides — exports paused" : "Design check"}
          </strong>
          <ul className="list-disc pl-4">
            {warnings.map((x) => (
              <li key={x}>{x}</li>
            ))}
          </ul>
        </OpsNotice>
      )}

      <div
        role="tablist"
        aria-label="Furniture workbench"
        className="flex overflow-x-auto border-line-subtle border-b text-sm"
      >
        {tabs.map(([key, label]) => (
          <button
            type="button"
            role="tab"
            aria-selected={tab === key}
            key={key}
            onClick={() => setTab(key)}
            className={cn(
              "-mb-px shrink-0 border-b-2 px-4 py-3 transition-colors",
              tab === key
                ? "border-body text-body"
                : "border-transparent text-body-subtle hover:text-body",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "design" && (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
          <OpsCard>
            <OpsSectionHeading
              title="Component study"
              description="Geometry follows the parameters. Square blanks stand in for sculpted sleds and profiles; not a photoreal render or joinery model."
              action={
                <select
                  aria-label="Drawing view"
                  className="border border-line bg-background px-3 py-2 text-sm"
                  value={view}
                  onChange={(e) => setView(e.target.value as View)}
                >
                  <option value="iso">Isometric</option>
                  <option value="front">Front</option>
                  <option value="side">Side</option>
                  <option value="plan">Plan</option>
                </select>
              }
            />
            <div className="space-y-5 p-5 md:p-6">
              {valid ? (
                <Drawing concept={draft} view={view} />
              ) : (
                <p className="text-body-subtle">
                  Fix the highlighted values to redraw.
                </p>
              )}
              <dl className="grid grid-cols-2 gap-4 text-sm md:grid-cols-4">
                {[
                  [p.width, "Width"],
                  [p.depth, "Depth"],
                  [p.height, "Worktop"],
                  knee,
                ].map(([value, label]) => (
                  <div key={label} className="border-line-subtle border-l pl-3">
                    <dt className="text-body-subtle">{label} mm</dt>
                    <dd className="font-sans text-xl">{value}</dd>
                  </div>
                ))}
              </dl>
              <OpsField label="Design intent">
                <textarea
                  className={opsInputClass}
                  rows={4}
                  maxLength={4000}
                  value={draft.brief}
                  onChange={(e) => edit({ ...draft, brief: e.target.value })}
                />
              </OpsField>
              <p className="text-body-subtle text-xs">
                Concept images and the development brief live in the{" "}
                <a
                  className={opsTextLinkClass}
                  href={DESIGN_PAGE_URL}
                  target="_blank"
                  rel="noreferrer"
                >
                  design Page
                </a>
                .
              </p>
            </div>
          </OpsCard>
          <OpsCard>
            <OpsSectionHeading
              title="Shape the prototype"
              description="Millimetres. Study inputs; the original image was not measured."
            />
            <div className="grid gap-3 p-5">
              {fieldsFor(draft).map(([key, label, min, max]) => {
                const integer = integerFieldsFor(draft).includes(key);
                return (
                  <OpsField
                    key={key}
                    label={label}
                    hint={`${min}–${max}${integer ? "" : " mm"}`}
                  >
                    <input
                      type="number"
                      className={opsInputClass}
                      min={min}
                      max={max}
                      step={integer ? 1 : 0.5}
                      value={p[key]}
                      onChange={(e) =>
                        edit({
                          ...draft,
                          parameters: { ...p, [key]: Number(e.target.value) },
                        })
                      }
                    />
                  </OpsField>
                );
              })}
              <p className="text-body-subtle text-xs">
                Runner allowance is provisional. Set it from the exact hardware
                drawing before machining.
              </p>
            </div>
          </OpsCard>
        </div>
      )}

      {tab === "materials" && (
        <>
          <div className="grid gap-6 lg:grid-cols-2">
            <OpsCard>
              <OpsSectionHeading
                title="Material palette"
                description="Drawer stock, cane retention and leather hole spacing remain engineering decisions."
              />
              <div className="grid gap-4 p-5 md:p-6">
                {MATERIAL_FIELDS.map(([key, label]) => (
                  <OpsField key={key} label={label}>
                    <input
                      className={opsInputClass}
                      maxLength={4000}
                      value={draft[key]}
                      onChange={(e) =>
                        edit({ ...draft, [key]: e.target.value })
                      }
                    />
                  </OpsField>
                ))}
              </div>
            </OpsCard>
            <OpsCard>
              <OpsSectionHeading
                title={
                  budget ? `${usd(budget.total)} per unit` : "Cost allowances"
                }
                description="Illustrative repeat-batch budget in USD. Allowances don't scale with size. Excludes mirror, freight, taxes, tooling and profit; replace with a quote."
              />
              <div className="grid grid-cols-2 gap-4 p-5 md:p-6">
                {COST_FIELDS.map(([key, label]) => (
                  <OpsField key={key} label={label}>
                    <input
                      type="number"
                      className={opsInputClass}
                      min={0}
                      max={100000}
                      step={0.25}
                      value={draft.costs[key]}
                      onChange={(e) =>
                        edit({
                          ...draft,
                          costs: {
                            ...draft.costs,
                            [key]: Number(e.target.value),
                          },
                        })
                      }
                    />
                  </OpsField>
                ))}
                {budget && (
                  <p className="col-span-2 text-body-subtle text-sm">
                    {budget.drawers} drawers / runner sets / pulls · Materials{" "}
                    {usd(budget.materials)} · Labor {usd(budget.labor)} · Before
                    contingency {usd(budget.subtotal)}
                  </p>
                )}
              </div>
            </OpsCard>
          </div>
          <OpsCard>
            <OpsSectionHeading
              title="Component schedule"
              description={`Net sizes only; add joint, machining, cane retention and yield allowances before buying or cutting.${schedule ? ` Oak net volume ${schedule.oakBoardFeet} board feet (not an order quantity).` : ""}`}
              action={
                <button
                  type="button"
                  className={buttonClass}
                  disabled={blocked}
                  onClick={() => exportFile("csv")}
                >
                  Export CSV
                </button>
              }
            />
            <div className="max-h-[480px] overflow-auto">
              <table className="w-full text-left text-sm">
                <thead className="sticky top-0 bg-background">
                  <tr className="border-line-subtle border-b">
                    <th className="px-5 py-2 font-normal">Part</th>
                    <th className="px-5 py-2 font-normal">Component</th>
                    <th className="px-5 py-2 font-normal">Material</th>
                    <th className="px-5 py-2 font-normal">Net W × D × H mm</th>
                  </tr>
                </thead>
                <tbody>
                  {parts.map((part) => (
                    <tr key={part.id} className="border-line-subtle border-b">
                      <td className="px-5 py-2">{part.id}</td>
                      <td className="px-5 py-2">{part.label}</td>
                      <td className="px-5 py-2">{part.material}</td>
                      <td className="px-5 py-2 tabular-nums">
                        {[part.w, part.d, part.h].map(mm).join(" × ")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </OpsCard>
        </>
      )}

      {tab === "render" && (
        <OpsCard>
          <OpsSectionHeading
            title="Photoreal render prompt"
            description="Paste into Adobe Firefly or another image tool (4:3). Generating may use credits. Prompts don't lock geometry: check drawer count, proportions and materials against the component schedule."
            action={
              <div className="flex gap-2">
                <button
                  type="button"
                  className={buttonClass}
                  disabled={!valid}
                  onClick={() => {
                    void navigator.clipboard
                      ?.writeText(renderPrompt(draft))
                      .then(() => setMessage("Render prompt copied."));
                  }}
                >
                  Copy
                </button>
                <button
                  type="button"
                  className={buttonClass}
                  disabled={blocked}
                  onClick={() => exportFile("prompt")}
                >
                  Download
                </button>
              </div>
            }
          />
          <div className="p-5 md:p-6">
            <textarea
              aria-label="Generated rendering prompt"
              className={opsInputClass}
              rows={10}
              readOnly
              value={valid ? renderPrompt(draft) : ""}
            />
            <p className="mt-3 text-body-subtle text-xs">
              In Claude Code, the furniture-studio MCP tool{" "}
              <code>build_render_prompt</code> returns the same prompt for a
              saved concept.
            </p>
          </div>
        </OpsCard>
      )}

      {tab === "release" && (
        <div className="grid gap-6 lg:grid-cols-2">
          <OpsCard>
            <OpsSectionHeading
              title={`${GATES.filter(([k]) => draft.checks[k]).length} of ${GATES.length} decisions checked`}
              description="Your recorded review checks, not automated engineering approval. Editing the design clears them."
            />
            <div className="grid gap-3 p-5 md:p-6">
              {GATES.map(([key, label]) => (
                <label key={key} className="flex items-start gap-3 text-sm">
                  <input
                    type="checkbox"
                    className="mt-1"
                    checked={Boolean(draft.checks[key])}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        checks: { ...draft.checks, [key]: e.target.checked },
                      })
                    }
                  />
                  {label}
                </label>
              ))}
            </div>
          </OpsCard>
          <OpsCard>
            <OpsSectionHeading
              title="Take the study to your maker"
              description={EXPORT_NOTICE}
            />
            <div className="grid gap-3 p-5 sm:grid-cols-2 md:p-6">
              {(
                [
                  ["json", "Design parameters", "JSON · portable revision"],
                  ["csv", "Materials schedule", "CSV · net components"],
                  ["scad", "CAD study model", "OpenSCAD · solids"],
                  ["dxf", "Front elevation", "DXF · mm lines"],
                  [
                    "cadquery",
                    "STEP conversion",
                    "CadQuery Python · run locally",
                  ],
                ] as const
              ).map(([key, title, description]) => (
                <button
                  type="button"
                  key={key}
                  disabled={blocked}
                  onClick={() => exportFile(key)}
                  className={cn(buttonClass, "flex-col items-start text-left")}
                >
                  <span className="font-sans">{title} ↓</span>
                  <span className="text-body-subtle text-xs">
                    {description}
                  </span>
                </button>
              ))}
            </div>
            <p className="px-5 pb-5 text-body-subtle text-xs md:px-6">
              Rattan is an aperture panel and leather a flat blank. Sculpted
              profiles, radii, joints, cane retention and runner machining are
              unresolved.
            </p>
          </OpsCard>
        </div>
      )}
    </div>
  );
}
