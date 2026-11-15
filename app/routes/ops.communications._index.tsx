import { Form, Link, useLoaderData } from "react-router";
import { Button } from "~/components/button";
import {
  formatDate,
  OpsCard,
  OpsEmptyState,
  OpsNotice,
  OpsPageHeader,
  opsInputClass,
  opsTextLinkClass,
} from "~/components/ops/ops-shell";
import { cn } from "~/utils/cn";
import {
  buildQueue,
  filterQueue,
  formStatusLabel,
  QUEUE_FILTERS,
  stageLabel,
  taskKindLabel,
  todayIso,
} from "~/utils/ops-comms";
import {
  commsUnavailableReason,
  loadCommsOverview,
} from "~/utils/ops-comms.server";
import { listCurrentOrders } from "~/utils/ops-dashboard.server";
import { requireOpsUser } from "~/utils/ops-identity.server";
import { privateHeaders } from "~/utils/ops-store.server";
import type { Route } from "./+types/ops.communications._index";

export const headers = () => privateHeaders;

export async function loader({ request, context }: Route.LoaderArgs) {
  const user = await requireOpsUser(request, context);
  const url = new URL(request.url);
  const requested = url.searchParams.get("filter") || "attention";
  const filter = QUEUE_FILTERS.some((f) => f.id === requested)
    ? requested
    : "attention";
  const search = url.searchParams.get("search") || "";
  const today = todayIso();

  const [orders, overview] = await Promise.allSettled([
    listCurrentOrders(context.env, { all: true }),
    loadCommsOverview(context.env, user),
  ]);
  const rows = buildQueue({
    currentOrders: orders.status === "fulfilled" ? orders.value.orders : [],
    overview:
      overview.status === "fulfilled"
        ? overview.value
        : { records: [], production: [], tasks: [], last: [] },
    today,
    viewer: user.email,
    currentListComplete:
      orders.status === "fulfilled" && !orders.value.scanCapped,
  });
  return {
    filter,
    search,
    today,
    viewer: user.email,
    counts: Object.fromEntries(
      QUEUE_FILTERS.map((f) => [f.id, filterQueue(rows, f.id).length]),
    ),
    rows: filterQueue(rows, filter, search),
    shopifyError:
      orders.status === "rejected"
        ? "Shopify orders couldn't be loaded; only orders with saved communications are shown."
        : orders.value.scanCapped
          ? "Shopify returned more orders than the hub scans, so the current list may be incomplete. Reminders are still shown for orders not in it."
          : null,
    storeError:
      overview.status === "rejected"
        ? commsUnavailableReason(overview.reason)
        : null,
  };
}

function Dated({ value }: { value: string | null }) {
  return value ? (
    <>{formatDate(`${value}T12:00:00Z`)}</>
  ) : (
    <span className="text-body-subtle">Unknown</span>
  );
}

export default function CommunicationsQueue() {
  const {
    filter,
    search,
    counts,
    rows,
    viewer,
    today,
    shopifyError,
    storeError,
  } = useLoaderData<typeof loader>();

  return (
    <>
      <OpsPageHeader
        title="Customer communications"
        description="One queue for customer updates, replies, delivery logistics and follow-up. Phase A: everything is recorded by hand. Nothing is emailed from the hub; send from Gmail (care@) and record it here."
      />

      <div className="mb-6 space-y-3">
        {storeError ? <OpsNotice ok={false}>{storeError}</OpsNotice> : null}
        {shopifyError ? <OpsNotice ok={false}>{shopifyError}</OpsNotice> : null}
      </div>

      <nav aria-label="Queue filters" className="mb-4 flex flex-wrap gap-2">
        {QUEUE_FILTERS.map((f) => (
          <Link
            key={f.id}
            to={`?filter=${f.id}${search ? `&search=${encodeURIComponent(search)}` : ""}`}
            aria-current={filter === f.id ? "page" : undefined}
            className={cn(
              "border px-3 py-1.5 text-sm",
              filter === f.id
                ? "border-body bg-body text-background"
                : "border-line-subtle hover:border-body",
            )}
          >
            {f.label} <span className="opacity-70">({counts[f.id] ?? 0})</span>
          </Link>
        ))}
      </nav>

      <Form method="get" className="mb-6 flex max-w-md gap-2">
        <input type="hidden" name="filter" value={filter} />
        <input
          name="search"
          defaultValue={search}
          placeholder="Order number or customer"
          aria-label="Search orders"
          className={opsInputClass}
        />
        <Button type="submit" variant="outline">
          Search
        </Button>
      </Form>

      <OpsCard>
        {rows.length === 0 ? (
          <OpsEmptyState
            title="Nothing here"
            body={
              filter === "attention"
                ? "No open tasks are assigned to you and no form reminder is due."
                : "No orders match this view."
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-line-subtle border-b text-body-subtle">
                <tr>
                  <th className="px-4 py-3 font-normal">Order / customer</th>
                  <th className="px-4 py-3 font-normal">Production</th>
                  <th className="px-4 py-3 font-normal">Last update sent</th>
                  <th className="px-4 py-3 font-normal">Last reply</th>
                  <th className="px-4 py-3 font-normal">Delivery logistics</th>
                  <th className="px-4 py-3 font-normal">Next action</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr
                    key={row.orderId}
                    className="border-line-subtle border-b align-top"
                  >
                    <td className="px-4 py-3">
                      <Link
                        to={`/ops/communications/${row.orderId}`}
                        className={opsTextLinkClass}
                      >
                        {row.orderName}
                      </Link>
                      <div className="text-body-subtle">
                        {row.customerName ??
                          (row.inCurrentWindow
                            ? "Guest checkout"
                            : "Older than 140 days")}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {stageLabel(row.stage)}
                      <div className="text-body-subtle text-xs">
                        {row.stageConfirmedOn ? (
                          <>
                            confirmed <Dated value={row.stageConfirmedOn} />
                          </>
                        ) : (
                          "not confirmed"
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {row.lastOutgoing || !row.undatedOutgoing ? (
                        <Dated value={row.lastOutgoing} />
                      ) : (
                        <span className="text-body-subtle">Date unknown</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {row.lastIncoming || !row.undatedIncoming ? (
                        <Dated value={row.lastIncoming} />
                      ) : (
                        <span className="text-body-subtle">Date unknown</span>
                      )}
                      {row.flags.reply ? (
                        <div className="font-medium text-xs">Reply needed</div>
                      ) : null}
                    </td>
                    <td className="px-4 py-3">
                      {formStatusLabel(row.record.logistics_status)}
                      {row.flags.reminder_due ? (
                        <div className="font-medium text-xs">
                          Reminder due ({row.reminder.reason.toLowerCase()})
                        </div>
                      ) : null}
                    </td>
                    <td className="px-4 py-3">
                      {row.tasks.length === 0 ? (
                        <span className="text-body-subtle">None set</span>
                      ) : (
                        <ul className="space-y-1">
                          {row.tasks.slice(0, 3).map((task) => (
                            <li key={task.id}>
                              {task.title || taskKindLabel(task.kind)}
                              <span className="text-body-subtle text-xs">
                                {" "}
                                ·{" "}
                                {task.owner_email === viewer
                                  ? "you"
                                  : task.owner_email.split("@")[0]}
                                {task.due_on ? (
                                  <>
                                    {" "}
                                    ·{" "}
                                    {task.due_on < today ? "overdue " : "due "}
                                    <Dated value={task.due_on} />
                                  </>
                                ) : null}
                              </span>
                            </li>
                          ))}
                          {row.tasks.length > 3 ? (
                            <li className="text-body-subtle text-xs">
                              +{row.tasks.length - 3} more
                            </li>
                          ) : null}
                        </ul>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </OpsCard>
    </>
  );
}
