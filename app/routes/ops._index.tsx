import { ArrowSquareOutIcon, MagnifyingGlassIcon } from "@phosphor-icons/react";
import { Form, Link, useLoaderData, useNavigation } from "react-router";
import { Button } from "~/components/button";
import {
  formatDate,
  formatMoney,
  formatStatus,
  LeadTimeMeter,
  OpsCard,
  OpsEmptyState,
  OpsField,
  OpsNotice,
  OpsPageHeader,
  OpsTag,
  opsInputClass,
  opsTextLinkClass,
  StatusBadge,
} from "~/components/ops/ops-shell";
import { requireOpsAccess } from "~/utils/ops-auth.server";
import { listCurrentOrders } from "~/utils/ops-dashboard.server";
import type { OpsDashboardFilters } from "~/utils/ops-dashboard.types";
import type { Route } from "./+types/ops._index";

export async function loader({ request, context }: Route.LoaderArgs) {
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
  const {
    fulfillmentStatuses,
    financialStatuses,
    tags: availableTags,
  } = dashboard.facets;

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
  const navigation = useNavigation();
  const isLoading =
    navigation.state === "loading" && navigation.location?.pathname === "/ops";
  const { filters, orders, total } = dashboard;
  const hasFilters = Boolean(
    filters.search ||
      filters.fulfillmentStatus ||
      filters.financialStatus ||
      filters.tag,
  );
  const lateCount = dashboard.pastLeadTimeCount;

  return (
    <>
      <OpsPageHeader
        title="Current orders"
        description="Open and in-progress orders from the last 140 days, live from Shopify. Handcrafted pieces are tracked against the 12–16 week lead time."
        aside={
          <dl className="flex gap-8 md:gap-10">
            <Stat label="Showing" value={`${orders.length} of ${total}`} />
            <Stat label="Past 16 weeks" value={String(lateCount)} />
          </dl>
        }
      />

      {dashboard.scanCapped ? (
        <div className="mb-6">
          <OpsNotice ok={false}>
            This window has more orders than the hub scans at once (
            {dashboard.scanned} loaded), so counts may be incomplete. Open
            Shopify Admin for the full list.
          </OpsNotice>
        </div>
      ) : null}

      <OpsCard>
        <Form
          method="get"
          className="grid gap-4 border-line-subtle border-b p-5 md:grid-cols-2 md:p-6 lg:grid-cols-[minmax(0,2fr)_repeat(3,minmax(0,1fr))_6rem_auto] lg:items-end"
        >
          <OpsField label="Search">
            <span className="relative block">
              <MagnifyingGlassIcon
                size={18}
                aria-hidden="true"
                className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-body-subtle"
              />
              <input
                data-test="ops-search"
                type="search"
                name="search"
                defaultValue={filters.search}
                placeholder="Order, customer, email or tag"
                className={`${opsInputClass} pl-10`}
              />
            </span>
          </OpsField>
          <OpsField label="Fulfillment">
            <select
              name="fulfillmentStatus"
              defaultValue={filters.fulfillmentStatus}
              className={opsInputClass}
            >
              <option value="">All</option>
              {fulfillmentStatuses.map((status) => (
                <option key={status} value={status}>
                  {formatStatus(status)}
                </option>
              ))}
            </select>
          </OpsField>
          <OpsField label="Payment">
            <select
              name="financialStatus"
              defaultValue={filters.financialStatus}
              className={opsInputClass}
            >
              <option value="">All</option>
              {financialStatuses.map((status) => (
                <option key={status} value={status}>
                  {formatStatus(status)}
                </option>
              ))}
            </select>
          </OpsField>
          <OpsField label="Tag">
            <select
              name="tag"
              defaultValue={filters.tag}
              className={opsInputClass}
            >
              <option value="">Any tag</option>
              {availableTags.map((tag) => (
                <option key={tag} value={tag}>
                  {tag}
                </option>
              ))}
            </select>
          </OpsField>
          <OpsField label="Show">
            <input
              type="number"
              min={1}
              max={100}
              name="limit"
              defaultValue={filters.limit}
              className={`${opsInputClass} tabular-nums`}
            />
          </OpsField>
          <div className="flex items-center gap-4">
            <Button
              type="submit"
              animate={false}
              loading={isLoading}
              className="w-full px-6 py-3 lg:w-auto"
            >
              Apply filters
            </Button>
            {hasFilters ? (
              <Link
                to="/ops"
                className={`${opsTextLinkClass} shrink-0 text-sm`}
              >
                Clear
              </Link>
            ) : null}
          </div>
        </Form>

        {orders.length ? (
          <div
            className={`overflow-x-auto transition-opacity ${isLoading ? "opacity-50" : ""}`}
          >
            <table className="w-full min-w-[960px] text-left text-sm">
              <caption className="sr-only">Current orders</caption>
              <thead className="border-line border-b text-body-subtle">
                <tr>
                  <th scope="col" className="px-6 py-3 font-normal">
                    Order
                  </th>
                  <th scope="col" className="px-4 py-3 font-normal">
                    Customer
                  </th>
                  <th scope="col" className="px-4 py-3 font-normal">
                    Lead time
                  </th>
                  <th scope="col" className="px-4 py-3 font-normal">
                    Fulfillment
                  </th>
                  <th scope="col" className="px-4 py-3 font-normal">
                    Payment
                  </th>
                  <th scope="col" className="px-4 py-3 text-right font-normal">
                    Total
                  </th>
                  <th scope="col" className="px-4 py-3 font-normal">
                    Tags
                  </th>
                  <th scope="col" className="px-6 py-3 text-right font-normal">
                    <span className="sr-only">Shopify Admin</span>
                  </th>
                </tr>
              </thead>
              <tbody data-test="ops-orders-table">
                {orders.map((order) => (
                  <tr
                    key={order.id}
                    className="border-line-subtle border-b align-top transition-colors last:border-b-0 hover:bg-(--color-topbar-bg)"
                  >
                    <td className="px-6 py-5">
                      <Link
                        to={`/ops/orders/${order.legacyId}`}
                        prefetch="intent"
                        className="font-sans text-lg tracking-wide underline decoration-transparent underline-offset-4 transition-colors hover:decoration-body"
                      >
                        {order.name}
                      </Link>
                      <p className="mt-0.5 text-body-subtle">
                        {formatDate(order.processedAt)}
                      </p>
                    </td>
                    <td className="max-w-56 px-4 py-5">
                      {order.customer ? (
                        <>
                          <p className="truncate">{order.customer.name}</p>
                          <p className="truncate text-body-subtle">
                            {order.customer.email || "No email"}
                          </p>
                        </>
                      ) : (
                        <p className="text-body-subtle">Guest checkout</p>
                      )}
                    </td>
                    <td className="px-4 py-5">
                      <LeadTimeMeter days={order.ageInDays} />
                    </td>
                    <td className="px-4 py-5">
                      <StatusBadge label="Fulfillment">
                        {order.displayFulfillmentStatus}
                      </StatusBadge>
                    </td>
                    <td className="px-4 py-5">
                      <StatusBadge label="Payment">
                        {order.displayFinancialStatus}
                      </StatusBadge>
                    </td>
                    <td className="px-4 py-5 text-right tabular-nums">
                      {formatMoney(order.totalPrice)}
                    </td>
                    <td className="max-w-56 px-4 py-5">
                      {order.tags.length ? (
                        <div className="flex flex-wrap gap-1.5">
                          {order.tags.map((tag) => (
                            <OpsTag key={tag}>{tag}</OpsTag>
                          ))}
                        </div>
                      ) : (
                        <span className="text-body-subtle">—</span>
                      )}
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex flex-col items-end gap-1.5 whitespace-nowrap">
                        <a
                          href={order.adminUrl}
                          target="_blank"
                          rel="noreferrer"
                          className={opsTextLinkClass}
                        >
                          Order
                          <ArrowSquareOutIcon size={14} aria-hidden="true" />
                          <span className="sr-only">
                            {order.name} in Shopify Admin
                          </span>
                        </a>
                        {order.customer ? (
                          <a
                            href={order.customer.adminUrl}
                            target="_blank"
                            rel="noreferrer"
                            className={opsTextLinkClass}
                          >
                            Customer
                            <ArrowSquareOutIcon size={14} aria-hidden="true" />
                            <span className="sr-only">
                              {order.customer.name} in Shopify Admin
                            </span>
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
          <OpsEmptyState
            title={
              hasFilters ? "No orders match these filters" : "No open orders"
            }
            body={
              hasFilters
                ? "Try a broader search, a different status, or clear the tag filter."
                : "Every order from the last 140 days is fulfilled or closed."
            }
            action={
              hasFilters ? (
                <Link to="/ops" className={`${opsTextLinkClass} text-sm`}>
                  Clear filters
                </Link>
              ) : null
            }
          />
        )}
      </OpsCard>
    </>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-0.5">
      <dt className="text-body-subtle text-sm">{label}</dt>
      <dd className="font-sans text-3xl tabular-nums tracking-wide">{value}</dd>
    </div>
  );
}
