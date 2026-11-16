import { ArrowSquareOutIcon } from "@phosphor-icons/react";
import {
  data,
  Form,
  useActionData,
  useLoaderData,
  useSearchParams,
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
} from "~/components/ops/ops-shell";
import {
  ActionForm,
  Choice,
  Dated,
  DateInput,
  formatUsd,
  Hidden,
  LinkInput,
  OwnerChoice,
  ownerName,
} from "~/components/ops/pipeline-form";
import { requireOpsUser } from "~/utils/ops-identity.server";
import {
  DEAL_EVENT_KINDS,
  DEAL_SOURCES,
  DEAL_STAGES,
  DEAL_TASK_KINDS,
  DEAL_TYPES,
  dealEventKindLabel,
  dealSourceLabel,
  dealStageLabel,
  dealTaskKindLabel,
  dealTypeLabel,
  isOpenStage,
  OPS_TASK_OWNERS,
  QUOTE_FOLLOW_UP_DAYS,
  todayIso,
} from "~/utils/ops-pipeline";
import {
  dealAction,
  isDealId,
  loadDealDetail,
  type PipelineCustomer,
  pipelineUnavailableReason,
  readCustomers,
} from "~/utils/ops-pipeline.server";
import { privateHeaders } from "~/utils/ops-store.server";
import type { Route } from "./+types/ops.pipeline.$dealId";

export const headers = () => privateHeaders;

function requireDealId(value: string | undefined) {
  if (!isDealId(value)) {
    throw new Response("Deal not found.", { status: 404 });
  }
  return value as string;
}

export async function loader({ request, context, params }: Route.LoaderArgs) {
  const user = await requireOpsUser(request, context);
  const dealId = requireDealId(params.dealId);
  let detail: Awaited<ReturnType<typeof loadDealDetail>> | null = null;
  let storeError: string | null = null;
  try {
    detail = await loadDealDetail(context.env, user, dealId);
  } catch (error) {
    storeError = pipelineUnavailableReason(error);
  }
  if (detail && !detail.deal) {
    throw new Response("Deal not found.", { status: 404 });
  }
  let customer: PipelineCustomer | null = null;
  let shopifyError: string | null = null;
  if (detail?.deal) {
    try {
      const customers = await readCustomers(context.env, [
        detail.deal.customer_id,
      ]);
      customer = customers.get(detail.deal.customer_id) ?? null;
      if (!customer) {
        shopifyError = "Shopify no longer has this customer.";
      }
    } catch {
      shopifyError = "The Shopify customer couldn't be loaded.";
    }
  }
  return data(
    {
      viewer: user.email,
      today: todayIso(),
      detail,
      customer,
      storeError,
      shopifyError,
    },
    { headers: privateHeaders },
  );
}

export async function action({ request, context, params }: Route.ActionArgs) {
  const user = await requireOpsUser(request, context);
  const dealId = requireDealId(params.dealId);
  const form = await request.formData();
  try {
    const message = await dealAction(context.env, user, dealId, form);
    return data({ ok: true, message }, { headers: privateHeaders });
  } catch (error) {
    if (error instanceof Response) {
      throw error;
    }
    return data(
      { ok: false, message: pipelineUnavailableReason(error) },
      { status: 422, headers: privateHeaders },
    );
  }
}

export default function DealPage() {
  const { viewer, today, detail, customer, storeError, shopifyError } =
    useLoaderData<typeof loader>();
  const result = useActionData<typeof action>();
  const [params] = useSearchParams();
  const deal = detail?.deal;

  if (!deal || !detail) {
    return (
      <>
        <div className="mb-6">
          <OpsBackLink to="/ops/pipeline">Sales pipeline</OpsBackLink>
        </div>
        <OpsNotice ok={false}>
          {storeError ?? "This deal couldn't be loaded."}
        </OpsNotice>
      </>
    );
  }

  const updatedAt = deal.updated_at;
  const open = isOpenStage(deal.stage);
  const openTasks = detail.tasks.filter((t) =>
    ["open", "snoozed"].includes(t.status),
  );
  const gmailSearch = customer?.email
    ? `https://mail.google.com/mail/u/0/#search/${encodeURIComponent(customer.email)}`
    : null;

  return (
    <>
      <div className="mb-6">
        <OpsBackLink to="/ops/pipeline">Sales pipeline</OpsBackLink>
      </div>
      <OpsPageHeader
        eyebrow={dealStageLabel(deal.stage)}
        title={`${customer?.name ?? "Customer"} · ${deal.title}`}
        description={
          <>
            {customer?.email || "No email loaded"}
            {customer?.phone ? ` · ${customer.phone}` : ""} ·{" "}
            {dealTypeLabel(deal.deal_type)} · from{" "}
            {dealSourceLabel(deal.source).toLowerCase()} · added{" "}
            {formatDate(deal.created_at)}
          </>
        }
        aside={
          <div className="flex flex-col gap-2 text-sm">
            {customer ? (
              <a
                href={customer.adminUrl}
                target="_blank"
                rel="noreferrer"
                className={opsTextLinkClass}
              >
                Customer in Shopify{" "}
                <ArrowSquareOutIcon
                  size={12}
                  className="inline"
                  aria-hidden="true"
                />
              </a>
            ) : null}
            {gmailSearch ? (
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
            ) : null}
          </div>
        }
      />

      <div className="mb-6 space-y-3">
        {params.get("customer") === "created" ? (
          <OpsNotice ok>
            No Shopify customer had this email, so one was created and tagged
            pipeline-lead.
          </OpsNotice>
        ) : null}
        {storeError ? <OpsNotice ok={false}>{storeError}</OpsNotice> : null}
        {shopifyError ? <OpsNotice ok={false}>{shopifyError}</OpsNotice> : null}
        {result ? <OpsNotice ok={result.ok}>{result.message}</OpsNotice> : null}
        <OpsNotice ok>
          Nothing on this page emails the customer. Reply from Gmail, then
          record it here.
        </OpsNotice>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <OpsCard>
          <OpsSectionHeading
            title="Deal"
            description="Stage changes only through “Move to another stage”. Recording a reply or quote never moves a deal by itself."
          />
          <div className="space-y-3 p-5 text-sm">
            <dl className="grid grid-cols-2 gap-x-4 gap-y-1">
              <dt className="text-body-subtle">Stage</dt>
              <dd>
                <strong>{dealStageLabel(deal.stage)}</strong> since{" "}
                <Dated value={deal.stage_changed_at} />
              </dd>
              <dt className="text-body-subtle">Owner</dt>
              <dd>{ownerName(deal.owner_email, viewer)}</dd>
              <dt className="text-body-subtle">Estimated value</dt>
              <dd>{formatUsd(deal.estimated_value)}</dd>
              <dt className="text-body-subtle">Next step</dt>
              <dd>
                {deal.next_step || (
                  <span className="text-body-subtle">None set</span>
                )}
                {deal.next_step_due ? (
                  <>
                    {" · "}
                    {open && deal.next_step_due < today ? (
                      <strong>overdue, was due </strong>
                    ) : (
                      "due "
                    )}
                    <Dated value={deal.next_step_due} />
                  </>
                ) : null}
              </dd>
              {deal.closed_on ? (
                <>
                  <dt className="text-body-subtle">Closed</dt>
                  <dd>
                    <Dated value={deal.closed_on} />
                  </dd>
                </>
              ) : null}
              {deal.lost_reason ? (
                <>
                  <dt className="text-body-subtle">Lost because</dt>
                  <dd>{deal.lost_reason}</dd>
                </>
              ) : null}
            </dl>

            <ActionForm
              title="Move to another stage"
              intent="stage"
              updatedAt={updatedAt}
              submit="Move"
            >
              <Choice
                label="New stage"
                name="stage"
                options={DEAL_STAGES.filter((s) => s.id !== deal.stage)}
              />
              <DateInput
                label="Date"
                name="date"
                hint={`When it happened. Won and Lost use today if blank. Moving to Quote sent opens a follow-up task due ${QUOTE_FOLLOW_UP_DAYS} days later.`}
              />
              <OpsField label="Lost reason" hint="Required only for Lost.">
                <input
                  name="lostReason"
                  maxLength={500}
                  className={opsInputClass}
                />
              </OpsField>
              <OpsField label="Note" hint="Optional.">
                <input name="note" maxLength={1000} className={opsInputClass} />
              </OpsField>
            </ActionForm>

            <ActionForm
              title="Edit details and next step"
              intent="edit"
              updatedAt={updatedAt}
              submit="Save"
            >
              <OpsField label="What it's for">
                <input
                  name="title"
                  required
                  maxLength={200}
                  defaultValue={deal.title}
                  className={opsInputClass}
                />
              </OpsField>
              <Choice
                label="Type"
                name="dealType"
                options={DEAL_TYPES}
                defaultValue={deal.deal_type}
              />
              <Choice
                label="Source"
                name="source"
                options={DEAL_SOURCES}
                defaultValue={deal.source}
              />
              <OwnerChoice defaultValue={deal.owner_email} />
              <OpsField label="Estimated value (USD)">
                <input
                  name="estimatedValue"
                  inputMode="decimal"
                  defaultValue={deal.estimated_value ?? ""}
                  className={opsInputClass}
                />
              </OpsField>
              <OpsField label="Next step">
                <input
                  name="nextStep"
                  maxLength={500}
                  defaultValue={deal.next_step}
                  className={opsInputClass}
                />
              </OpsField>
              <DateInput
                label="Next step due"
                name="nextStepDue"
                hint="An open deal without a next step and a date shows on the board as needing one."
                defaultValue={deal.next_step_due}
              />
            </ActionForm>
          </div>
        </OpsCard>

        <OpsCard>
          <OpsSectionHeading title="Tasks" />
          <div className="space-y-3 p-5 text-sm">
            {openTasks.length === 0 ? (
              <p className="text-body-subtle">No open tasks.</p>
            ) : (
              <ul className="space-y-3">
                {openTasks.map((task) => (
                  <li key={task.id} className="border border-line-subtle p-3">
                    <p>
                      <strong>{task.title}</strong>{" "}
                      <span className="text-body-subtle">
                        · {dealTaskKindLabel(task.kind)} ·{" "}
                        {ownerName(task.owner_email, viewer)}
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
              title="Add a task"
              intent="new-task"
              updatedAt={updatedAt}
              submit="Add"
            >
              <Choice
                label="Type"
                name="kind"
                options={DEAL_TASK_KINDS}
                defaultValue="follow_up"
              />
              <OpsField label="Title (optional)">
                <input name="title" maxLength={500} className={opsInputClass} />
              </OpsField>
              <OwnerChoice defaultValue={deal.owner_email} />
              <DateInput label="Due" name="dueOn" hint="Optional." />
            </ActionForm>
          </div>
        </OpsCard>

        <OpsCard>
          <OpsSectionHeading
            title="Record what happened"
            description="Replies sent from Gmail, customer replies, calls, visits, designs and quotes. A customer reply opens a Reply needed task; a reply you send closes it."
          />
          <div className="p-5 text-sm">
            <Form method="post" className="space-y-3">
              <Hidden values={{ intent: "event", updatedAt }} />
              <Choice
                label="What"
                name="kind"
                options={DEAL_EVENT_KINDS}
                defaultValue="reply_sent"
              />
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
                      <strong>{dealEventKindLabel(event.kind)}</strong> ·{" "}
                      {event.summary}
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
    </>
  );
}
