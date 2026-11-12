import { Link, useLoaderData } from "react-router";
import {
  OpsCard,
  OpsNotice,
  OpsSectionHeading,
} from "~/components/ops/ops-shell";
import { OpsWorkspace } from "~/components/ops/workspace";
import { listCurrentOrders } from "~/utils/ops-dashboard.server";
import { paidOrderWeek } from "~/utils/ops-live.server";
import { loadPersonalDay } from "~/utils/ops-personal.server";
import { privateHeaders } from "~/utils/ops-store.server";
import { loadWorkspace, workspaceAction } from "~/utils/ops-workspace.server";
import type { Route } from "./+types/ops.daily";
export const headers = () => privateHeaders;
export async function loader({ request, context }: Route.LoaderArgs) {
  const info = await loadWorkspace(request, context, "daily");
  const [orders, personal, paid] = await Promise.allSettled([
    listCurrentOrders(context.env, { limit: 5 }),
    info.user.role === "owner"
      ? loadPersonalDay(context.env, info.user)
      : Promise.resolve(null),
    paidOrderWeek(context.env),
  ]);
  return {
    info,
    paid: paid.status === "fulfilled" ? paid.value : null,
    orders: orders.status === "fulfilled" ? orders.value : null,
    personal:
      personal.status === "fulfilled"
        ? personal.value
        : {
            connected: false,
            error: "Private Google data is temporarily unavailable.",
          },
  };
}
export const action = ({ request, context }: Route.ActionArgs) =>
  workspaceAction(request, context, "daily");
export default function Daily() {
  const { info, orders, personal, paid } = useLoaderData<typeof loader>();
  return (
    <OpsWorkspace info={info}>
      <OpsCard>
        <OpsSectionHeading
          title="Current orders"
          action={
            <Link to="/ops" className="text-sm underline">
              View all orders
            </Link>
          }
        />
        <div className="space-y-4 p-6">
          {orders ? (
            <>
              <p className="font-sans text-3xl">
                {orders.total} open / in-progress
              </p>
              <p className="text-body-subtle text-sm">
                Last 140 days · {orders.pastLeadTimeCount} past the furniture’s
                16-week window.{" "}
                {orders.scanCapped
                  ? "Scan limit reached; counts may be incomplete."
                  : ""}
              </p>
              <div className="flex flex-wrap gap-3">
                {orders.orders.map((order) => (
                  <Link
                    key={order.id}
                    to={`/ops/orders/${order.legacyId}`}
                    className="border border-line px-3 py-2 underline"
                  >
                    {order.name}
                  </Link>
                ))}
              </div>
            </>
          ) : (
            <OpsNotice ok={false}>
              Shopify orders could not be refreshed. Open Current orders to try
              again.
            </OpsNotice>
          )}
          <p className="text-body-subtle text-xs">
            Checked{" "}
            {new Date(info.fetchedAt).toLocaleString("en-US", {
              timeZone: "America/New_York",
            })}{" "}
            ET. Production stages are not tracked by an authoritative source
            yet.
          </p>
        </div>
      </OpsCard>
      <OpsCard>
        <OpsSectionHeading
          title="Fully paid order value · week to date"
          description="Monday 00:00 Eastern to the latest refresh. Current order totals include tax and shipping; cancelled and not-fully-paid orders are excluded."
        />
        <div className="p-6">
          {paid ? (
            <>
              <div className="flex flex-wrap gap-8">
                {paid.totals.map((value) => (
                  <div key={value.currency}>
                    <p className="font-sans text-3xl">
                      {new Intl.NumberFormat("en-US", {
                        style: "currency",
                        currency: value.currency,
                      }).format(Number(value.amount))}
                    </p>
                    <p className="text-body-subtle text-sm">
                      {value.orders} orders · {value.currency}
                    </p>
                  </div>
                ))}
              </div>
              {!paid.totals.length ? (
                <p>No fully paid, non-cancelled orders in this period.</p>
              ) : null}
              {paid.incomplete ? (
                <OpsNotice ok={false}>
                  The scan limit was reached. Totals are incomplete.
                </OpsNotice>
              ) : null}
            </>
          ) : (
            <OpsNotice ok={false}>
              Weekly order value is temporarily unavailable.
            </OpsNotice>
          )}
        </div>
      </OpsCard>
      {info.user.role === "owner" ? (
        <OpsCard>
          <OpsSectionHeading
            title="Your daybook"
            description="Private to Rob · unread Primary mail and the next seven calendar days"
            action={
              <a
                className="text-sm underline"
                href="/ops/auth/google?connect=personal"
              >
                {personal?.connected ? "Reconnect Google" : "Connect Google"}
              </a>
            }
          />
          <div className="p-6">
            {personal?.error ? (
              <OpsNotice ok={false}>{personal.error}</OpsNotice>
            ) : !personal?.connected ? (
              <p>
                Connect your Google account to display your private mail and
                calendar here.
              </p>
            ) : (
              <div className="grid gap-8 md:grid-cols-2">
                <section>
                  <h3 className="mb-4 font-sans text-xl">
                    Unread Primary mail · up to 10
                  </h3>
                  {personal.mail === null ? (
                    <p>Mail is temporarily unavailable.</p>
                  ) : personal.mail?.length ? (
                    <ul className="space-y-4">
                      {personal.mail.map((item) => (
                        <li key={item.id}>
                          <a
                            href={item.url}
                            target="_blank"
                            rel="noreferrer"
                            className="underline"
                          >
                            {item.subject}
                          </a>
                          <p className="text-body-subtle text-sm">
                            {item.from}
                          </p>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p>No unread Primary messages.</p>
                  )}
                </section>
                <section>
                  <h3 className="mb-4 font-sans text-xl">
                    Calendar · next seven days
                  </h3>
                  {personal.calendar === null ? (
                    <p>Calendar is temporarily unavailable.</p>
                  ) : personal.calendar?.length ? (
                    <ul className="space-y-4">
                      {personal.calendar.map((item) => (
                        <li key={item.id}>
                          <span>{item.title}</span>
                          <p className="text-body-subtle text-sm">
                            {item.start}
                          </p>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p>No upcoming events in the primary calendar.</p>
                  )}
                </section>
              </div>
            )}
          </div>
        </OpsCard>
      ) : null}
    </OpsWorkspace>
  );
}
