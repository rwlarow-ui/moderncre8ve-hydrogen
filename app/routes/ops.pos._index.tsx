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
import {
  listPoLineImages,
  listProductionPos,
} from "~/utils/production-po.server";
import type { Route } from "./+types/ops.pos._index";

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

const LAYOUTS = [
  { key: "list", label: "List" },
  { key: "gallery", label: "Gallery" },
] as const;

type LayoutKey = (typeof LAYOUTS)[number]["key"];

type PoLine = {
  key: string;
  label: string;
  imageUrl: string | null;
  imageAlt: string;
};

export async function loader({ request, context }: Route.LoaderArgs) {
  await requireOpsAccess(request, context);

  const requested = new URL(request.url).searchParams.get("view");
  const view: ViewKey = VIEWS.some((v) => v.key === requested)
    ? (requested as ViewKey)
    : "review";
  const layout: LayoutKey =
    new URL(request.url).searchParams.get("layout") === "gallery"
      ? "gallery"
      : "list";

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
  const visible = pos.filter((po) =>
    (current.states as readonly string[]).includes(po.state),
  );

  // Thumbnails are a nicety: if they can't be read the queue still loads.
  let images: Record<string, { url: string; alt: string }> = {};
  let imagesFailed = false;
  if (visible.length) {
    try {
      images = await listPoLineImages(
        context.env,
        visible.map((po) => po.orderId),
      );
    } catch {
      imagesFailed = true;
    }
  }

  const rows = visible
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
          (
            spec: { lineItemId?: string; product: string; quantity: number },
            index: number,
          ): PoLine => {
            const image = spec.lineItemId ? images[spec.lineItemId] : null;
            return {
              key: spec.lineItemId || `${index}`,
              label: `${spec.quantity} × ${spec.product}`,
              imageUrl: image?.url ?? null,
              imageAlt: image?.alt || spec.product,
            };
          },
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
    layout,
    imagesFailed,
    views: VIEWS.map((v) => ({ key: v.key, label: v.label })),
    counts,
    rows,
    error,
    empty: current.empty,
  };
}

function PoThumb({
  line,
  className,
  size,
}: {
  line: PoLine;
  className?: string;
  size: number;
}) {
  return (
    <div
      className={cn(
        "grid shrink-0 place-items-center overflow-hidden bg-(--color-topbar-bg)",
        className,
      )}
    >
      {line.imageUrl ? (
        <img
          src={line.imageUrl}
          alt={line.imageAlt}
          loading="lazy"
          width={size}
          height={size}
          className="size-full object-cover"
        />
      ) : (
        <span className="px-1 text-center text-[10px] text-body-subtle leading-tight">
          No image
        </span>
      )}
    </div>
  );
}

function PoState({
  state,
  approvedAt,
}: {
  state: string;
  approvedAt: string | null;
}) {
  return (
    <>
      {PO_STATE_LABELS[state as keyof typeof PO_STATE_LABELS] ?? state}
      {approvedAt && (state === "approved" || state === "sent") ? (
        <p className="text-body-subtle">{formatDate(approvedAt)}</p>
      ) : null}
    </>
  );
}

export default function OpsPoQueue() {
  const { view, layout, imagesFailed, views, counts, rows, error, empty } =
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

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <nav aria-label="PO views" className="flex flex-wrap gap-2">
          {views.map((v) => (
            <Link
              key={v.key}
              to={`/ops/pos?view=${v.key}${layout === "gallery" ? "&layout=gallery" : ""}`}
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

        <nav aria-label="Layout" className="flex" data-test="ops-po-layout">
          {LAYOUTS.map((option) => (
            <Link
              key={option.key}
              to={`/ops/pos?view=${view}${option.key === "gallery" ? "&layout=gallery" : ""}`}
              preventScrollReset
              aria-current={option.key === layout ? "page" : undefined}
              className={cn(
                "-ml-px border px-4 py-2 text-sm transition-colors first:ml-0",
                option.key === layout
                  ? "relative border-body bg-body text-background"
                  : "border-line hover:border-body",
              )}
            >
              {option.label}
            </Link>
          ))}
        </nav>
      </div>

      {imagesFailed ? (
        <p className="mb-4 text-body-subtle text-sm">
          Product thumbnails couldn't be loaded from Shopify just now.
        </p>
      ) : null}

      {rows.length && layout === "gallery" ? (
        <ul
          data-test="ops-po-gallery"
          className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
        >
          {rows.map((row) => {
            const [lead, ...rest] = row.lines;
            return (
              <li key={row.param}>
                <Link
                  to={`/ops/pos/${row.param}`}
                  prefetch="intent"
                  className="group flex h-full flex-col border border-line-subtle bg-background transition-colors hover:border-body"
                >
                  {lead ? (
                    <PoThumb
                      line={lead}
                      size={600}
                      className="aspect-square w-full"
                    />
                  ) : (
                    <div className="grid aspect-square w-full place-items-center bg-(--color-topbar-bg) text-body-subtle text-sm">
                      No pieces
                    </div>
                  )}
                  {rest.length ? (
                    <div className="flex gap-1 border-line-subtle border-t p-1">
                      {rest.slice(0, 4).map((line) => (
                        <PoThumb
                          key={line.key}
                          line={line}
                          size={112}
                          className="size-14"
                        />
                      ))}
                      {rest.length > 4 ? (
                        <span className="grid size-14 place-items-center text-body-subtle text-sm">
                          +{rest.length - 4}
                        </span>
                      ) : null}
                    </div>
                  ) : null}
                  <div className="flex flex-1 flex-col gap-3 border-line-subtle border-t p-4 text-sm">
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="font-sans text-lg tracking-wide underline decoration-transparent underline-offset-4 group-hover:decoration-body">
                        {row.orderName}
                      </span>
                      <span className="whitespace-nowrap text-body-subtle tabular-nums">
                        {view === "awaiting"
                          ? `${row.daysOpen} ${row.daysOpen === 1 ? "day" : "days"}`
                          : row.placedAt
                            ? formatDate(row.placedAt)
                            : "—"}
                      </span>
                    </div>
                    <p className="truncate">{row.customerName || "Guest"}</p>
                    {row.lines.length ? (
                      <ul className="space-y-0.5 text-body-subtle">
                        {row.lines.map((line) => (
                          <li key={line.key} className="truncate">
                            {line.label}
                          </li>
                        ))}
                      </ul>
                    ) : null}
                    <div className="mt-auto pt-1">
                      <PoState state={row.state} approvedAt={row.approvedAt} />
                    </div>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      ) : null}

      {rows.length && layout === "gallery" ? null : (
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
                    <th
                      scope="col"
                      className="px-6 py-3 text-right font-normal"
                    >
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
                        <p className="truncate">
                          {row.customerName || "Guest"}
                        </p>
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
                      <td className="max-w-80 px-4 py-5">
                        {row.lines.length ? (
                          <ul className="space-y-2">
                            {row.lines.map((line) => (
                              <li
                                key={line.key}
                                className="flex items-center gap-3"
                              >
                                <PoThumb
                                  line={line}
                                  size={112}
                                  className="size-14"
                                />
                                <span className="min-w-0 truncate">
                                  {line.label}
                                </span>
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
                        <PoState
                          state={row.state}
                          approvedAt={row.approvedAt}
                        />
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
      )}
    </>
  );
}
