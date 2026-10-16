import type { LoaderFunctionArgs } from "react-router";
import { Link, useLoaderData } from "react-router";
import {
  formatDate,
  OpsCard,
  OpsEmptyState,
  OpsNotice,
  OpsPageHeader,
  opsTextLinkClass,
} from "~/components/ops/ops-shell";
import { cn } from "~/utils/cn";
import { requireOpsAccess } from "~/utils/ops-auth.server";
import { daysSince, PO_STATE_LABELS } from "~/utils/production-po";
import { listProductionPos } from "~/utils/production-po.server";

const VIEWS = [
  {
    key: "review",
    label: "Ready for review",
    states: ["ready_for_review"],
    empty: "Nothing is waiting for review.",
  },
  {
    key: "awaiting",
    label: "Awaiting logistics",
    states: ["awaiting_logistics", "draft"],
    empty: "No order is waiting on delivery details.",
  },
  {
    key: "approved",
    label: "Approved & sent",
    states: ["approved", "sent"],
    empty: "No POs have been approved yet.",
  },
  {
    key: "cancelled",
    label: "Cancelled",
    states: ["cancelled"],
    empty: "No cancelled POs.",
  },
] as const;

type ViewKey = (typeof VIEWS)[number]["key"];

export async function loader({ request, context }: LoaderFunctionArgs) {
  await requireOpsAccess(request, context);

  const requested = new URL(request.url).searchParams.get("view");
  const view: ViewKey = VIEWS.some((v) => v.key === requested)
    ? (requested as ViewKey)
    : "review";

  let pos: Awaited<ReturnType<typeof listProductionPos>> = [];
  let error: string | null = null;
  try {
    pos = await listProductionPos(context.env);
  } catch (caught) {
    error = caught instanceof Error ? caught.message : "Could not load POs.";
  }

  const counts = Object.fromEntries(
    VIEWS.map((v) => [
      v.key,
      pos.filter((po) => (v.states as readonly string[]).includes(po.state))
        .length,
    ]),
  ) as Record<ViewKey, number>;

  const current = VIEWS.find((v) => v.key === view) ?? VIEWS[0];
  const rows = pos
    .filter((po) => (current.states as readonly string[]).includes(po.state))
    .map((po) => {
      const placedAt = po.snapshot?.order?.placedAt ?? null;
      return {
        param: po.param,
        orderName: po.orderName,
        state: po.state,
        customerName: po.snapshot?.order?.customerName || "",
        customerEmail: po.snapshot?.order?.customerEmail || "",
        phone: po.snapshot?.logistics?.phone || "",
        placedAt,
        daysOpen: daysSince(placedAt),
        logisticsStatus: po.snapshot?.status || "none",
        lines: po.lineSpecs.map(
          (spec: { product: string; quantity: number }) =>
            `${spec.quantity} × ${spec.product}`,
        ),
        approvedAt: po.approvedAt,
        updatedAt: po.updatedAt,
      };
    })
    // Oldest first where someone has to act; newest first otherwise.
    .sort((a, b) =>
      view === "review" || view === "awaiting"
        ? (a.placedAt ?? "").localeCompare(b.placedAt ?? "")
        : b.updatedAt.localeCompare(a.updatedAt),
    );

  return {
    view,
    views: VIEWS.map((v) => ({ key: v.key, label: v.label })),
    counts,
    rows,
    error,
    empty: current.empty,
  };
}

export default function OpsPoQueue() {
  const { view, views, counts, rows, error, empty } =
    useLoaderData<typeof loader>();

  return (
    <>
      <OpsPageHeader
        title="Production POs"
        description="Review, approve and track purchase orders for the production partner. Nothing here sends anything: sending arrives with the PDF + email step."
      />

      {error ? (
        <div className="mb-6">
          <OpsNotice ok={false}>
            <p className="font-medium">Couldn't load production POs.</p>
            <p className="text-body-subtle">
              {error} If this is the first run, create the Shopify definitions
              with <code>node scripts/create-po-definitions.mjs</code>.
            </p>
          </OpsNotice>
        </div>
      ) : null}

      <nav aria-label="PO views" className="mb-4 flex flex-wrap gap-2">
        {views.map((v) => (
          <Link
            key={v.key}
            to={`/ops/pos?view=${v.key}`}
            aria-current={v.key === view ? "page" : undefined}
            className={cn(
              "inline-flex items-center gap-2 border px-4 py-2 text-sm transition-colors",
              v.key === view
                ? "border-body bg-body text-background"
                : "border-line hover:border-body",
            )}
          >
            {v.label}
            <span className="tabular-nums opacity-70">
              {counts[v.key as ViewKey]}
            </span>
          </Link>
        ))}
      </nav>

      <OpsCard>
        {rows.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-left text-sm">
              <caption className="sr-only">Production POs</caption>
              <thead className="border-line border-b text-body-subtle">
                <tr>
                  <th scope="col" className="px-6 py-3 font-normal">
                    Order
                  </th>
                  <th scope="col" className="px-4 py-3 font-normal">
                    Customer
                  </th>
                  <th scope="col" className="px-4 py-3 font-normal">
                    Pieces
                  </th>
                  <th scope="col" className="px-4 py-3 font-normal">
                    {view === "awaiting" ? "Waiting" : "Placed"}
                  </th>
                  <th scope="col" className="px-4 py-3 font-normal">
                    State
                  </th>
                  <th scope="col" className="px-6 py-3 text-right font-normal">
                    <span className="sr-only">Open</span>
                  </th>
                </tr>
              </thead>
              <tbody data-test="ops-po-table">
                {rows.map((row) => (
                  <tr
                    key={row.param}
                    className="border-line-subtle border-b align-top last:border-b-0 hover:bg-(--color-topbar-bg)"
                  >
                    <td className="px-6 py-5">
                      <Link
                        to={`/ops/pos/${row.param}`}
                        prefetch="intent"
                        className="font-sans text-lg tracking-wide underline decoration-transparent underline-offset-4 hover:decoration-body"
                      >
                        {row.orderName}
                      </Link>
                    </td>
                    <td className="max-w-56 px-4 py-5">
                      <p className="truncate">{row.customerName || "Guest"}</p>
                      <p className="truncate text-body-subtle">
                        {row.customerEmail || "No email"}
                      </p>
                      {view === "awaiting" && row.phone ? (
                        <a
                          href={`tel:${row.phone.replace(/[^\d+]/g, "")}`}
                          className={cn(opsTextLinkClass, "mt-1")}
                        >
                          {row.phone}
                        </a>
                      ) : null}
                    </td>
                    <td className="max-w-72 px-4 py-5">
                      {row.lines.length ? (
                        <ul className="space-y-0.5">
                          {row.lines.map((line: string) => (
                            <li key={line} className="truncate">
                              {line}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <span className="text-body-subtle">—</span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-5 tabular-nums">
                      {view === "awaiting" ? (
                        <>
                          {row.daysOpen} {row.daysOpen === 1 ? "day" : "days"}
                          <p className="text-body-subtle">
                            {row.logisticsStatus === "later"
                              ? "Customer will provide later"
                              : "No details yet"}
                          </p>
                        </>
                      ) : row.placedAt ? (
                        formatDate(row.placedAt)
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-5">
                      {PO_STATE_LABELS[
                        row.state as keyof typeof PO_STATE_LABELS
                      ] ?? row.state}
                      {row.approvedAt &&
                      (row.state === "approved" || row.state === "sent") ? (
                        <p className="text-body-subtle">
                          {formatDate(row.approvedAt)}
                        </p>
                      ) : null}
                    </td>
                    <td className="px-6 py-5 text-right">
                      <Link
                        to={`/ops/pos/${row.param}`}
                        className={opsTextLinkClass}
                      >
                        Open
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <OpsEmptyState
            title={error ? "No data" : empty}
            body={
              error
                ? "Fix the error above to see POs."
                : "Create a PO from an order's detail page."
            }
          />
        )}
      </OpsCard>
    </>
  );
}
