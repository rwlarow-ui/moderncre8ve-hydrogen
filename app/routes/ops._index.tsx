import type { LoaderFunctionArgs } from "react-router";
import { Form, Link, useLoaderData } from "react-router";
import {
  OpsCard,
  OpsEmptyState,
  OpsMetaPill,
  OpsSectionHeading,
} from "~/components/ops/ops-shell";
import type { OpsDashboardFilters } from "~/utils/ops-dashboard.types";
import { requireOpsAccess } from "~/utils/ops-auth.server";
import { listCurrentOrders } from "~/utils/ops-dashboard.server";

export async function loader({ request, context }: LoaderFunctionArgs) {
  await requireOpsAccess(request, context);

  const url = new URL(request.url);
  const filters: OpsDashboardFilters = {
    search: url.searchParams.get("search") || "",
    fulfillmentStatus: url.searchParams.get("fulfillmentStatus") || "",
    financialStatus: url.searchParams.get("financialStatus") || "",
    tag: url.searchParams.get("tag") || "",
    limit: Number(url.searchParams.get("limit") || 50),
  };
  const dashboard = await listCurrentOrders(context.env, filters);
  const fulfillmentStatuses = Array.from(
    new Set(
      dashboard.orders.map((order) => String(order.displayFulfillmentStatus)),
    ),
  ) as string[];
  const financialStatuses = Array.from(
    new Set(
      dashboard.orders.map((order) => String(order.displayFinancialStatus)),
    ),
  ) as string[];
  const availableTags = Array.from(
    new Set(
      dashboard.orders.flatMap((order) =>
        order.tags.map((tag) => String(tag)),
      ),
    ),
  ) as string[];

  return {
    dashboard,
    fulfillmentStatuses,
    financialStatuses,
    availableTags,
  };
}

export default function OpsOrdersIndex() {
  const { dashboard, fulfillmentStatuses, financialStatuses, availableTags } =
    useLoaderData<typeof loader>();

  return (
    <div className="space-y-6">
      <OpsCard>
        <OpsSectionHeading
          title="Current Orders"
          description="Read-mostly operations view across open and in-flight orders from the last 140 days."
          action={
            <OpsMetaPill
              label="Showing"
              value={`${dashboard.orders.length} of ${dashboard.total}`}
            />
          }
        />
        <Form
          method="get"
          className="grid gap-4 border-[#efe6d4] border-b bg-[#fbf8f1] px-6 py-5 md:grid-cols-5"
        >
          <label className="space-y-2">
            <span className="font-sans text-xs uppercase tracking-[0.18em] text-[#5f636b]">
              Search
            </span>
            <input
              data-test="ops-search"
              type="search"
              name="search"
              defaultValue={dashboard.filters.search}
              placeholder="Order, customer, email, tag"
              className="w-full rounded-2xl border border-[#d9cfbd] bg-white px-4 py-3 focus:border-[#323640] focus:outline-hidden"
            />
          </label>
          <label className="space-y-2">
            <span className="font-sans text-xs uppercase tracking-[0.18em] text-[#5f636b]">
              Fulfillment
            </span>
            <select
              name="fulfillmentStatus"
              defaultValue={dashboard.filters.fulfillmentStatus}
              className="w-full rounded-2xl border border-[#d9cfbd] bg-white px-4 py-3 focus:border-[#323640] focus:outline-hidden"
            >
              <option value="">All statuses</option>
              {fulfillmentStatuses.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-2">
            <span className="font-sans text-xs uppercase tracking-[0.18em] text-[#5f636b]">
              Financial
            </span>
            <select
              name="financialStatus"
              defaultValue={dashboard.filters.financialStatus}
              className="w-full rounded-2xl border border-[#d9cfbd] bg-white px-4 py-3 focus:border-[#323640] focus:outline-hidden"
            >
              <option value="">All statuses</option>
              {financialStatuses.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-2">
            <span className="font-sans text-xs uppercase tracking-[0.18em] text-[#5f636b]">
              Tag
            </span>
            <select
              name="tag"
              defaultValue={dashboard.filters.tag}
              className="w-full rounded-2xl border border-[#d9cfbd] bg-white px-4 py-3 focus:border-[#323640] focus:outline-hidden"
            >
              <option value="">Any tag</option>
              {availableTags.map((tag) => (
                <option key={tag} value={tag}>
                  {tag}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-2">
            <span className="font-sans text-xs uppercase tracking-[0.18em] text-[#5f636b]">
              Limit
            </span>
            <div className="flex gap-3">
              <input
                type="number"
                min={1}
                max={100}
                name="limit"
                defaultValue={dashboard.filters.limit}
                className="w-full rounded-2xl border border-[#d9cfbd] bg-white px-4 py-3 focus:border-[#323640] focus:outline-hidden"
              />
              <button
                type="submit"
                className="rounded-2xl bg-[#323640] px-5 py-3 font-sans text-xs uppercase tracking-[0.18em] text-white transition-colors hover:bg-[#2CBF96] hover:text-[#16372d]"
              >
                Apply
              </button>
            </div>
          </label>
        </Form>

        {dashboard.orders.length ? (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left">
              <thead className="bg-[#f8f3e8] font-sans text-[11px] uppercase tracking-[0.24em] text-[#6d7077]">
                <tr>
                  <th className="px-6 py-4">Order</th>
                  <th className="px-6 py-4">Customer</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Age</th>
                  <th className="px-6 py-4">Total</th>
                  <th className="px-6 py-4">Tags</th>
                  <th className="px-6 py-4 text-right">Links</th>
                </tr>
              </thead>
              <tbody data-test="ops-orders-table">
                {dashboard.orders.map((order) => (
                  <tr
                    key={order.id}
                    className="border-[#efe6d4] border-t align-top transition-colors hover:bg-[#fcfaf5]"
                  >
                    <td className="px-6 py-5">
                      <div className="space-y-1">
                        <Link
                          to={`/ops/orders/${order.legacyId}`}
                          className="font-medium text-lg text-[#323640] hover:text-[#2CBF96]"
                        >
                          {order.name}
                        </Link>
                        <p className="text-[#6d7077] text-sm">
                          Placed {new Date(order.processedAt).toLocaleDateString()}
                        </p>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      {order.customer ? (
                        <div className="space-y-1">
                          <p className="font-medium">{order.customer.name}</p>
                          <p className="text-[#6d7077] text-sm">
                            {order.customer.email || "No email"}
                          </p>
                        </div>
                      ) : (
                        <p className="text-[#6d7077] text-sm">Guest checkout</p>
                      )}
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex flex-col gap-2">
                        <StatusBadge kind="fulfillment">
                          {order.displayFulfillmentStatus}
                        </StatusBadge>
                        <StatusBadge kind="financial">
                          {order.displayFinancialStatus}
                        </StatusBadge>
                      </div>
                    </td>
                    <td className="px-6 py-5 text-sm">
                      {order.ageInDays} day{order.ageInDays === 1 ? "" : "s"}
                    </td>
                    <td className="px-6 py-5 text-sm">
                      {order.totalPrice
                        ? new Intl.NumberFormat("en-US", {
                            style: "currency",
                            currency: order.totalPrice.currencyCode,
                          }).format(Number(order.totalPrice.amount))
                        : "N/A"}
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex flex-wrap gap-2">
                        {order.tags.length ? (
                          order.tags.map((tag) => (
                            <span
                              key={tag}
                              className="rounded-full bg-[#f2ebd5] px-3 py-1 text-xs text-[#5f636b]"
                            >
                              {tag}
                            </span>
                          ))
                        ) : (
                          <span className="text-[#8b8e95] text-sm">No tags</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex items-center justify-end gap-4 text-sm">
                        <a
                          href={order.adminUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[#323640] underline underline-offset-4 hover:text-[#2CBF96]"
                        >
                          Admin order
                        </a>
                        {order.customer ? (
                          <a
                            href={order.customer.adminUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-[#323640] underline underline-offset-4 hover:text-[#2CBF96]"
                          >
                            Admin customer
                          </a>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-6">
            <OpsEmptyState
              title="No current orders matched these filters"
              body="Try broadening the search, clearing the tag filter, or increasing the limit."
            />
          </div>
        )}
      </OpsCard>
    </div>
  );
}

function StatusBadge({
  kind,
  children,
}: {
  kind: "fulfillment" | "financial";
  children: string;
}) {
  const classes =
    kind === "fulfillment"
      ? "bg-[#e8f7f2] text-[#1b6b54]"
      : "bg-[#fff4dd] text-[#8a5a00]";

  return (
    <span
      className={`inline-flex w-fit rounded-full px-3 py-1 font-sans text-[11px] uppercase tracking-[0.18em] ${classes}`}
    >
      {children}
    </span>
  );
}
