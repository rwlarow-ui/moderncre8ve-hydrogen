import { ArrowSquareOutIcon } from "@phosphor-icons/react";
import {
  data,
  Form,
  Link,
  useActionData,
  useLoaderData,
  useNavigation,
} from "react-router";
import { Button } from "~/components/button";
import {
  formatDate,
  OpsBackLink,
  OpsCard,
  OpsField,
  OpsNotice,
  OpsPageHeader,
  OpsSectionHeading,
  opsInputClass,
  opsTextLinkClass,
  StatusBadge,
} from "~/components/ops/ops-shell";
import {
  EVENT_KINDS,
  eventKindLabel,
  formStatusLabel,
  OPS_TASK_OWNERS,
  PRODUCTION_STAGES,
  reminderEligibility,
  stageLabel,
  TASK_KINDS,
  taskKindLabel,
  todayIso,
} from "~/utils/ops-comms";
import {
  commsAction,
  commsUnavailableReason,
  loadCommsDetail,
} from "~/utils/ops-comms.server";
import { getOrderDetail } from "~/utils/ops-dashboard.server";
import { requireOpsUser } from "~/utils/ops-identity.server";
import { privateHeaders } from "~/utils/ops-store.server";
import type { Route } from "./+types/ops.communications.$orderId";

export const headers = () => privateHeaders;

function requireOrderId(value: string | undefined) {
  if (!value || !/^\d{1,20}$/.test(value)) {
    throw new Response("Order not found.", { status: 404 });
  }
  return value;
}

export async function loader({ request, context, params }: Route.LoaderArgs) {
  const user = await requireOpsUser(request, context);
  const orderId = requireOrderId(params.orderId);
  const [order, detail] = await Promise.allSettled([
    getOrderDetail(context.env, orderId),
    loadCommsDetail(context.env, user, orderId),
  ]);
  if (order.status === "rejected") {
    throw new Response("Order not found.", { status: 404 });
  }
  return data(
    {
      viewer: user.email,
      today: todayIso(),
      order: order.value,
      detail: detail.status === "fulfilled" ? detail.value : null,
      storeError:
        detail.status === "rejected"
          ? commsUnavailableReason(detail.reason)
          : null,
    },
    { headers: privateHeaders },
  );
}

export async function action({ request, context, params }: Route.ActionArgs) {
  const user = await requireOpsUser(request, context);
  const orderId = requireOrderId(params.orderId);
  const form = await request.formData();
  try {
    // Identity and order number come from Shopify, never from the form.
    const order = await getOrderDetail(context.env, orderId);
    const message = await commsAction(context.env, user, order, form);
    return data({ ok: true, message }, { headers: privateHeaders });
  } catch (error) {
    if (error instanceof Response) {
      throw error;
    }
    return data(
      { ok: false, message: commsUnavailableReason(error) },
      { status: 422, headers: privateHeaders },
    );
  }
}

function Dated({ value }: { value: string | null | undefined }) {
  return value ? (
    <>{formatDate(`${value.slice(0, 10)}T12:00:00Z`)}</>
  ) : (
    <span className="text-body-subtle">Unknown</span>
  );
}

function Hidden({ values }: { values: Record<string, string> }) {
  return (
    <>
      {Object.entries(values).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}
    </>
  );
}

function ActionForm({
  title,
  intent,
  updatedAt,
  hidden = {},
  submit,
  children,
}: {
  title: string;
  intent: string;
  updatedAt: string;
  hidden?: Record<string, string>;
  submit: string;
  children?: React.ReactNode;
}) {
  const navigation = useNavigation();
  return (
    <details className="border border-line-subtle">
      <summary className="cursor-pointer px-4 py-2 text-sm">{title}</summary>
      <Form method="post" className="space-y-3 border-line-subtle border-t p-4">
        <Hidden values={{ intent, updatedAt, ...hidden }} />
        {children}
        <Button
          type="submit"
          variant="outline"
          disabled={navigation.state !== "idle"}
        >
          {submit}
        </Button>
      </Form>
    </details>
  );
}

const DateInput = ({
  label,
  name,
  hint,
  defaultValue,
}: {
  label: string;
  name: string;
  hint?: string;
  defaultValue?: string | null;
}) => (
  <OpsField
    label={label}
    hint={hint ?? "Leave blank if you don't know the exact date."}
  >
    <input
      type="date"
      name={name}
      defaultValue={defaultValue ?? ""}
      className={opsInputClass}
    />
  </OpsField>
);
const LinkInput = ({ label = "Gmail or file link", name = "evidenceUrl" }) => (
  <OpsField
    label={label}
    hint="Paste the Gmail message link or the Drive link to the PDF."
  >
    <input
      type="url"
      name={name}
      placeholder="https://"
      className={opsInputClass}
    />
  </OpsField>
);
const NoteInput = ({ label = "Note", name = "note", required = false }) => (
  <OpsField label={label}>
    <textarea
      name={name}
      rows={2}
      required={required}
      maxLength={2000}
      className={opsInputClass}
    />
  </OpsField>
);

type CommsRecord = NonNullable<
  NonNullable<Awaited<ReturnType<typeof loadCommsDetail>>>["record"]
>;

function LogisticsCard({
  record,
  status,
  updatedAt,
  reminder,
}: {
  record: CommsRecord | null | undefined;
  status: string;
  updatedAt: string;
  reminder: { due: boolean; reason: string };
}) {
  return (
    <OpsCard>
      <OpsSectionHeading
        title="Delivery logistics form"
        description="The existing PDF. Receipt is not approval: a person reviews it before it's ready for the carrier."
      />
      <div className="space-y-3 p-5 text-sm">
        <dl className="grid grid-cols-2 gap-x-4 gap-y-1">
          <dt className="text-body-subtle">Status</dt>
          <dd>
            <strong>{formStatusLabel(status)}</strong>
          </dd>
          <dt className="text-body-subtle">Requested</dt>
          <dd>
            <Dated value={record?.logistics_requested_on} />
          </dd>
          <dt className="text-body-subtle">Received</dt>
          <dd>
            <Dated value={record?.logistics_received_on} />
          </dd>
          <dt className="text-body-subtle">Current version</dt>
          <dd>
            {record?.form_version ? `v${record.form_version}` : "None received"}
          </dd>
          <dt className="text-body-subtle">Reviewed</dt>
          <dd>
            {record?.logistics_reviewed_at
              ? `${record.logistics_reviewed_by?.split("@")[0]} · ${formatDate(record.logistics_reviewed_at)}`
              : "Not yet"}
          </dd>
          <dt className="text-body-subtle">Delivery provider</dt>
          <dd>
            {record?.delivery_provider || (
              <span className="text-body-subtle">Not set</span>
            )}
          </dd>
          <dt className="text-body-subtle">Shared with carrier</dt>
          <dd>
            <Dated value={record?.carrier_shared_on} />
          </dd>
          <dt className="text-body-subtle">Form reminders</dt>
          <dd>
            {!record?.reminders_enabled
              ? "Off"
              : record.reminders_paused
                ? "Paused"
                : "On"}
            {" · "}
            {reminder.due ? <strong>Reminder due</strong> : reminder.reason}
          </dd>
        </dl>
        {record?.logistics_notes ? (
          <p className="border-line-subtle border-l-2 pl-3">
            {record.logistics_notes}
          </p>
        ) : null}

        {["not_requested", "awaiting_return"].includes(status) ? (
          <ActionForm
            title={
              status === "not_requested"
                ? "Record form request sent"
                : "Correct request date"
            }
            intent="logistics"
            updatedAt={updatedAt}
            hidden={{ action: "request_sent" }}
            submit="Record request"
          >
            <DateInput
              label="Request sent on"
              name="date"
              hint="Leave blank for an old order whose date is unknown. No reminder is scheduled then."
            />
            <LinkInput />
          </ActionForm>
        ) : null}
        <ActionForm
          title={
            record?.form_version
              ? "Record a corrected / resubmitted form"
              : "Record form received"
          }
          intent="logistics"
          updatedAt={updatedAt}
          hidden={{ action: "form_received" }}
          submit="Record receipt"
        >
          <p className="text-body-subtle">
            Stops missing-form reminders immediately and opens a review task. If
            you don't have the link yet, a task to attach it is added.
          </p>
          <DateInput label="Received on" name="date" />
          <LinkInput />
          <NoteInput />
        </ActionForm>
        {record?.form_version ? (
          <ActionForm
            title="Attach form / evidence link"
            intent="logistics"
            updatedAt={updatedAt}
            hidden={{ action: "attach_evidence" }}
            submit="Attach"
          >
            <LinkInput />
          </ActionForm>
        ) : null}
        {status === "received_needs_review" ? (
          <ActionForm
            title="Needs clarification"
            intent="logistics"
            updatedAt={updatedAt}
            hidden={{ action: "needs_clarification" }}
            submit="Mark needs clarification"
          >
            <NoteInput label="What needs clarifying" required />
          </ActionForm>
        ) : null}
        {["received_needs_review", "needs_clarification"].includes(status) ? (
          <ActionForm
            title="Reviewed: ready for carrier"
            intent="logistics"
            updatedAt={updatedAt}
            hidden={{ action: "ready_for_carrier" }}
            submit="Mark ready for carrier"
          >
            <p className="text-body-subtle">
              A blank measurements page (page 2) is fine unless the team asked
              for measurements.
            </p>
            <NoteInput label="Access notes for the carrier (optional)" />
          </ActionForm>
        ) : null}
        {status === "ready_for_carrier" ? (
          <ActionForm
            title="Record carrier handoff"
            intent="logistics"
            updatedAt={updatedAt}
            hidden={{ action: "carrier_shared" }}
            submit="Record handoff"
          >
            <OpsField label="Provider">
              <input
                name="provider"
                defaultValue={record?.delivery_provider ?? ""}
                maxLength={120}
                className={opsInputClass}
              />
            </OpsField>
            <OpsField label="Shared with (person or address)">
              <input
                name="recipient"
                required
                maxLength={200}
                className={opsInputClass}
              />
            </OpsField>
            <OpsField label="How">
              <input
                name="method"
                placeholder="Email, portal…"
                maxLength={120}
                className={opsInputClass}
              />
            </OpsField>
            <DateInput label="Shared on" name="date" />
            <LinkInput label="Link to the sent email" />
          </ActionForm>
        ) : null}
        <ActionForm
          title="Set delivery provider"
          intent="logistics"
          updatedAt={updatedAt}
          hidden={{ action: "set_provider" }}
          submit="Save provider"
        >
          <OpsField
            label="Provider"
            hint="Barkman, or the actual carrier for this destination."
          >
            <input
              name="provider"
              defaultValue={record?.delivery_provider ?? ""}
              maxLength={120}
              className={opsInputClass}
            />
          </OpsField>
        </ActionForm>
        <ActionForm
          title="Form reminder settings"
          intent="logistics"
          updatedAt={updatedAt}
          hidden={{ action: "set_reminders" }}
          submit="Save reminders"
        >
          <p className="text-body-subtle">
            Reminders only show as due here; the hub sends nothing. Weekly while
            the form is outstanding.
          </p>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              name="enabled"
              defaultChecked={record?.reminders_enabled}
            />{" "}
            Reminders on
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              name="paused"
              defaultChecked={record?.reminders_paused}
            />{" "}
            Paused
          </label>
          <DateInput
            label="Next reminder on"
            name="date"
            hint="Optional. Blank = 7 days after the last reminder or the request."
          />
        </ActionForm>
      </div>
    </OpsCard>
  );
}

export default function CommunicationsDetail() {
  const { order, detail, storeError, viewer, today } =
    useLoaderData<typeof loader>();
  const result = useActionData<typeof action>();
  const record = detail?.record;
  const status = record?.logistics_status ?? "not_requested";
  const updatedAt = record?.updated_at ?? "";
  const reminder = reminderEligibility(record ?? {}, {
    today,
    orderClosed: Boolean(order.cancelledAt || order.closedAt),
  });
  const openTasks = (detail?.tasks ?? []).filter((t) =>
    ["open", "snoozed"].includes(t.status),
  );
  const gmailSearch = `https://mail.google.com/mail/u/0/#search/${encodeURIComponent(
    [order.customer?.email, `"${order.name}"`].filter(Boolean).join(" OR "),
  )}`;

  return (
    <>
      <div className="mb-6">
        <OpsBackLink to="/ops/communications">
          Customer communications
        </OpsBackLink>
      </div>
      <OpsPageHeader
        title={`${order.name} · ${order.customer?.name ?? "Guest checkout"}`}
        description={
          <>
            {order.customer?.email ?? "No email on the order"} · ordered{" "}
            {formatDate(order.processedAt)} ·{" "}
            <StatusBadge label="Fulfillment">
              {order.displayFulfillmentStatus}
            </StatusBadge>
          </>
        }
        aside={
          <div className="flex flex-col gap-2 text-sm">
            <Link
              to={`/ops/orders/${order.legacyId}`}
              className={opsTextLinkClass}
            >
              Open in Current orders
            </Link>
            <a
              href={gmailSearch}
              target="_blank"
              rel="noreferrer"
              className={opsTextLinkClass}
            >
              Search Gmail{" "}
              <ArrowSquareOutIcon
                size={12}
                className="inline"
                aria-hidden="true"
              />
            </a>
          </div>
        }
      />

      <div className="mb-6 space-y-3">
        {storeError ? <OpsNotice ok={false}>{storeError}</OpsNotice> : null}
        {result ? <OpsNotice ok={result.ok}>{result.message}</OpsNotice> : null}
        <OpsNotice ok>
          Nothing on this page emails the customer. Send from Gmail (care@),
          then record it here.
        </OpsNotice>
      </div>

      {detail ? (
        <div className="grid gap-6 lg:grid-cols-2">
          <OpsCard>
            <OpsSectionHeading
              title="Production stage"
              description="Shared with Current orders. Only this form changes it. Customer replies and forms never do."
            />
            <div className="space-y-3 p-5 text-sm">
              <p>
                <strong>{stageLabel(detail.production?.stage)}</strong>
                {" · confirmed "}
                <Dated value={detail.production?.stage_confirmed_on} />
                {detail.production?.stage_source
                  ? ` · ${detail.production.stage_source}`
                  : ""}
                {detail.production?.estimate_weeks
                  ? ` · estimate ${detail.production.estimate_weeks} weeks`
                  : ""}
              </p>
              <details className="border border-line-subtle">
                <summary className="cursor-pointer px-4 py-2">
                  Update production stage
                </summary>
                <Form
                  method="post"
                  className="space-y-3 border-line-subtle border-t p-4"
                >
                  <Hidden
                    values={{
                      intent: "production",
                      productionUpdatedAt: detail.production?.updated_at ?? "",
                    }}
                  />
                  <OpsField label="Stage">
                    <select
                      name="stage"
                      defaultValue={detail.production?.stage ?? "unknown"}
                      className={opsInputClass}
                    >
                      {PRODUCTION_STAGES.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.label}
                        </option>
                      ))}
                    </select>
                  </OpsField>
                  <DateInput
                    label="Confirmed on"
                    name="confirmedOn"
                    defaultValue={detail.production?.stage_confirmed_on}
                  />
                  <OpsField
                    label="Confirmed by / source"
                    hint="For example: Barkman email, call with the builder."
                  >
                    <input
                      name="source"
                      defaultValue={detail.production?.stage_source ?? ""}
                      maxLength={200}
                      className={opsInputClass}
                    />
                  </OpsField>
                  <OpsField label="Current estimate (weeks)">
                    <input
                      name="estimateWeeks"
                      defaultValue={detail.production?.estimate_weeks ?? ""}
                      type="number"
                      min={1}
                      max={52}
                      className={opsInputClass}
                    />
                  </OpsField>
                  <Button type="submit" variant="outline">
                    Save stage
                  </Button>
                </Form>
              </details>
            </div>
          </OpsCard>

          <OpsCard>
            <OpsSectionHeading title="Next actions" />
            <div className="space-y-3 p-5 text-sm">
              {openTasks.length === 0 ? (
                <p className="text-body-subtle">No open actions.</p>
              ) : (
                <ul className="space-y-3">
                  {openTasks.map((task) => (
                    <li key={task.id} className="border border-line-subtle p-3">
                      <p>
                        <strong>{task.title}</strong>{" "}
                        <span className="text-body-subtle">
                          · {taskKindLabel(task.kind)} ·{" "}
                          {task.owner_email === viewer
                            ? "you"
                            : task.owner_email.split("@")[0]}
                          {task.status === "snoozed"
                            ? " · snoozed until "
                            : " · due "}
                          <Dated value={task.due_on} />
                        </span>
                      </p>
                      <Form
                        method="post"
                        className="mt-2 flex flex-wrap items-end gap-2"
                      >
                        <Hidden
                          values={{
                            intent: "task",
                            taskId: task.id,
                            taskUpdatedAt: task.updated_at,
                          }}
                        />
                        <select
                          name="status"
                          defaultValue="done"
                          aria-label="Status"
                          className={opsInputClass}
                        >
                          <option value="done">Done</option>
                          <option value="snoozed">Snooze until…</option>
                          <option value="open">Keep open</option>
                          <option value="cancelled">Cancel</option>
                        </select>
                        <input
                          type="date"
                          name="dueOn"
                          defaultValue={task.due_on ?? ""}
                          aria-label="Due or snooze date"
                          className={opsInputClass}
                        />
                        <select
                          name="ownerEmail"
                          defaultValue={task.owner_email}
                          aria-label="Owner"
                          className={opsInputClass}
                        >
                          {OPS_TASK_OWNERS.map((o) => (
                            <option key={o} value={o}>
                              {o.split("@")[0]}
                            </option>
                          ))}
                        </select>
                        <input
                          name="note"
                          placeholder="How it was resolved"
                          maxLength={2000}
                          aria-label="Note"
                          className={opsInputClass}
                        />
                        <Button type="submit" variant="outline">
                          Save
                        </Button>
                      </Form>
                    </li>
                  ))}
                </ul>
              )}
              <ActionForm
                title="Add an action"
                intent="new-task"
                updatedAt={updatedAt}
                submit="Add"
              >
                <OpsField label="Type">
                  <select
                    name="kind"
                    defaultValue="update"
                    className={opsInputClass}
                  >
                    {TASK_KINDS.map((k) => (
                      <option key={k.id} value={k.id}>
                        {k.label}
                      </option>
                    ))}
                  </select>
                </OpsField>
                <OpsField label="Title (optional)">
                  <input
                    name="title"
                    maxLength={500}
                    className={opsInputClass}
                  />
                </OpsField>
                <OpsField label="Owner">
                  <select
                    name="ownerEmail"
                    defaultValue="haven@moderncre8ve.com"
                    className={opsInputClass}
                  >
                    {OPS_TASK_OWNERS.map((o) => (
                      <option key={o} value={o}>
                        {o.split("@")[0]}
                      </option>
                    ))}
                  </select>
                </OpsField>
                <DateInput label="Due" name="dueOn" hint="Optional." />
              </ActionForm>
            </div>
          </OpsCard>

          <LogisticsCard
            record={record}
            status={status}
            updatedAt={updatedAt}
            reminder={reminder}
          />

          <OpsCard>
            <OpsSectionHeading
              title="Record what happened"
              description="Emails sent from Gmail, replies, calls, notes, delivery."
            />
            <div className="p-5 text-sm">
              <Form method="post" className="space-y-3">
                <Hidden values={{ intent: "event", updatedAt }} />
                <OpsField label="What">
                  <select
                    name="kind"
                    defaultValue="customer_update"
                    className={opsInputClass}
                  >
                    {EVENT_KINDS.map((k) => (
                      <option key={k.id} value={k.id}>
                        {k.label}
                      </option>
                    ))}
                  </select>
                </OpsField>
                <DateInput label="Date" name="date" />
                <OpsField label="Summary">
                  <textarea
                    name="summary"
                    rows={2}
                    required
                    maxLength={2000}
                    className={opsInputClass}
                  />
                </OpsField>
                <LinkInput />
                {status === "awaiting_return" ? (
                  <label className="flex items-center gap-2">
                    <input type="checkbox" name="includesReminder" /> This
                    update included the logistics form reminder
                  </label>
                ) : null}
                <Button type="submit" variant="outline">
                  Record
                </Button>
              </Form>
            </div>
          </OpsCard>

          <OpsCard className="lg:col-span-2">
            <OpsSectionHeading
              title="Timeline"
              description="Newest first. Dates are when it happened; unknown dates show as unknown."
            />
            {detail.events.length === 0 ? (
              <p className="p-5 text-body-subtle text-sm">
                Nothing recorded yet.
              </p>
            ) : (
              <ol className="divide-y divide-line-subtle text-sm">
                {detail.events.map((event) => (
                  <li
                    key={event.id}
                    className="grid gap-1 px-5 py-3 md:grid-cols-[10rem_1fr]"
                  >
                    <div className="text-body-subtle">
                      <Dated value={event.occurred_on} />
                      <div className="text-xs">{event.direction}</div>
                    </div>
                    <div>
                      <p>
                        <strong>
                          {eventKindLabel(event.kind).replace(/_/g, " ")}
                        </strong>{" "}
                        · {event.summary}
                      </p>
                      <p className="text-body-subtle text-xs">
                        {event.actor.split("@")[0]} · entered{" "}
                        {formatDate(event.created_at, true)}
                        {event.evidence_url ? (
                          <>
                            {" · "}
                            <a
                              href={event.evidence_url}
                              target="_blank"
                              rel="noreferrer"
                              className={opsTextLinkClass}
                            >
                              evidence
                            </a>
                          </>
                        ) : null}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </OpsCard>
        </div>
      ) : null}
    </>
  );
}
