import {
  data,
  Form,
  Link,
  redirect,
  useActionData,
  useLoaderData,
} from "react-router";
import { Button } from "~/components/button";
import {
  OpsCard,
  OpsEmptyState,
  OpsField,
  OpsNotice,
  OpsPageHeader,
  opsInputClass,
  opsTextLinkClass,
} from "~/components/ops/ops-shell";
import {
  ActionForm,
  Choice,
  Dated,
  DateInput,
  formatUsd,
  LinkInput,
  OwnerChoice,
  ownerName,
} from "~/components/ops/pipeline-form";
import { cn } from "~/utils/cn";
import { requireOpsUser } from "~/utils/ops-identity.server";
import {
  BOARD_FILTERS,
  buildBoard,
  DEAL_SOURCES,
  DEAL_STAGES,
  DEAL_TYPES,
  DEFAULT_DEAL_OWNER,
  dealStageLabel,
  dealTaskKindLabel,
  dealTypeLabel,
  filterBoard,
  NEW_DEAL_NEXT_STEP,
  stageSummary,
  todayIso,
} from "~/utils/ops-pipeline";
import {
  createDeal,
  loadPipelineOverview,
  pipelineUnavailableReason,
  readCustomers,
} from "~/utils/ops-pipeline.server";
import { privateHeaders } from "~/utils/ops-store.server";
import type { Route } from "./+types/ops.pipeline._index";

export const headers = () => privateHeaders;

export async function loader({ request, context }: Route.LoaderArgs) {
  const user = await requireOpsUser(request, context);
  const url = new URL(request.url);
  const requested = url.searchParams.get("filter") || "attention";
  const filter = BOARD_FILTERS.some((f) => f.id === requested)
    ? requested
    : "attention";
  const requestedStage = url.searchParams.get("stage") || "";
  const stage = DEAL_STAGES.some((s) => s.id === requestedStage)
    ? requestedStage
    : "";
  const search = url.searchParams.get("search") || "";
  const today = todayIso();

  let storeError: string | null = null;
  let shopifyError: string | null = null;
  let overview = { deals: [], tasks: [], last: [] } as Awaited<
    ReturnType<typeof loadPipelineOverview>
  >;
  try {
    overview = await loadPipelineOverview(context.env, user);
  } catch (error) {
    storeError = pipelineUnavailableReason(error);
  }
  let customers: Awaited<ReturnType<typeof readCustomers>> = new Map();
  try {
    customers = await readCustomers(
      context.env,
      overview.deals.map((deal) => deal.customer_id),
    );
  } catch {
    shopifyError =
      "Shopify customers couldn't be loaded, so names and emails are missing. Deals are still listed.";
  }
  const rows = buildBoard({
    ...overview,
    customers,
    today,
    viewer: user.email,
  });
  const open = rows.filter((row) => row.open);

  return data(
    {
      filter,
      stage,
      search,
      today,
      viewer: user.email,
      counts: Object.fromEntries(
        BOARD_FILTERS.map((f) => [f.id, filterBoard(rows, f.id).length]),
      ),
      summary: stageSummary(open),
      rows: filterBoard(rows, filter, { stage, search }),
      storeError,
      shopifyError,
    },
    { headers: privateHeaders },
  );
}

export async function action({ request, context }: Route.ActionArgs) {
  const user = await requireOpsUser(request, context);
  const form = await request.formData();
  try {
    const { dealId, customerCreated } = await createDeal(
      context.env,
      user,
      form,
    );
    return redirect(
      `/ops/pipeline/${dealId}${customerCreated ? "?customer=created" : ""}`,
    );
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

function boardLink(filter: string, stage: string, search: string) {
  const params = new URLSearchParams({ filter });
  if (stage) {
    params.set("stage", stage);
  }
  if (search) {
    params.set("search", search);
  }
  return `?${params}`;
}

export default function PipelineBoard() {
  const {
    filter,
    stage,
    search,
    counts,
    summary,
    rows,
    viewer,
    today,
    storeError,
    shopifyError,
  } = useLoaderData<typeof loader>();
  const result = useActionData<typeof action>();

  return (
    <>
      <OpsPageHeader
        title="Sales pipeline"
        description="Every inquiry, custom project and trade lead, from first contact to an order. Contacts are Shopify customers; nothing here emails anyone. Reply from Gmail, then record it on the deal."
      />

      <div className="mb-6 space-y-3">
        {storeError ? <OpsNotice ok={false}>{storeError}</OpsNotice> : null}
        {shopifyError ? <OpsNotice ok={false}>{shopifyError}</OpsNotice> : null}
        {result && !result.ok ? (
          <OpsNotice ok={false}>{result.message}</OpsNotice>
        ) : null}
      </div>

      <div className="mb-6">
        <ActionForm
          title="Add a deal"
          intent="new-deal"
          submit="Add deal"
          open={Boolean(result && !result.ok)}
        >
          <p className="text-body-subtle text-sm">
            Uses the Shopify customer with this email, or creates one tagged{" "}
            <code>pipeline-lead</code> with no marketing consent.
          </p>
          <div className="grid gap-3 md:grid-cols-2">
            <OpsField label="Customer email">
              <input
                type="email"
                name="email"
                required
                maxLength={254}
                className={opsInputClass}
              />
            </OpsField>
            <OpsField
              label="Phone"
              hint="Optional. Used only for a new customer."
            >
              <input name="phone" maxLength={40} className={opsInputClass} />
            </OpsField>
            <OpsField label="First name" hint="Used only for a new customer.">
              <input
                name="firstName"
                maxLength={100}
                className={opsInputClass}
              />
            </OpsField>
            <OpsField label="Last name">
              <input
                name="lastName"
                maxLength={100}
                className={opsInputClass}
              />
            </OpsField>
            <OpsField
              label="What it's for"
              hint="For example: Walnut extension table, banquette and table."
              className="md:col-span-2"
            >
              <input
                name="title"
                required
                maxLength={200}
                className={opsInputClass}
              />
            </OpsField>
            <Choice
              label="Type"
              name="dealType"
              options={DEAL_TYPES}
              defaultValue="custom"
            />
            <Choice
              label="Source"
              name="source"
              options={DEAL_SOURCES}
              defaultValue="email"
            />
            <OwnerChoice defaultValue={DEFAULT_DEAL_OWNER} />
            <OpsField label="Estimated value (USD)" hint="Optional.">
              <input
                name="estimatedValue"
                inputMode="decimal"
                className={opsInputClass}
              />
            </OpsField>
            <OpsField
              label="What they asked"
              hint="A short summary of the inquiry."
              className="md:col-span-2"
            >
              <textarea
                name="inquiry"
                rows={3}
                maxLength={2000}
                className={opsInputClass}
              />
            </OpsField>
            <DateInput label="Inquiry received on" name="inquiryDate" />
            <LinkInput />
            <OpsField
              label="Next step"
              hint={`Defaults to “${NEW_DEAL_NEXT_STEP}”.`}
            >
              <input
                name="nextStep"
                maxLength={500}
                className={opsInputClass}
              />
            </OpsField>
            <DateInput
              label="Next step due"
              name="nextStepDue"
              hint="Defaults to today."
            />
          </div>
        </ActionForm>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
        {summary.map((s) => (
          <Link
            key={s.id}
            to={boardLink("open", stage === s.id ? "" : s.id, search)}
            aria-current={stage === s.id ? "true" : undefined}
            className={cn(
              "border p-3 text-sm",
              stage === s.id
                ? "border-body"
                : "border-line-subtle hover:border-body",
            )}
          >
            <div className="text-body-subtle text-xs">{s.label}</div>
            <div className="font-medium text-lg">{s.count}</div>
            <div className="text-body-subtle text-xs">
              {s.value ? formatUsd(s.value) : "—"}
            </div>
          </Link>
        ))}
      </div>

      <nav aria-label="Board filters" className="mb-4 flex flex-wrap gap-2">
        {BOARD_FILTERS.map((f) => (
          <Link
            key={f.id}
            to={boardLink(f.id, stage, search)}
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
        {stage ? <input type="hidden" name="stage" value={stage} /> : null}
        <input
          name="search"
          defaultValue={search}
          placeholder="Customer, email or deal"
          aria-label="Search deals"
          className={opsInputClass}
        />
        <Button type="submit" variant="outline">
          Search
        </Button>
      </Form>

      {stage ? (
        <p className="mb-4 text-sm">
          Showing only <strong>{dealStageLabel(stage)}</strong>.{" "}
          <Link to={boardLink(filter, "", search)} className={opsTextLinkClass}>
            Show every stage
          </Link>
        </p>
      ) : null}

      <OpsCard>
        {rows.length === 0 ? (
          <OpsEmptyState
            title="Nothing here"
            body={
              filter === "attention"
                ? "No deal of yours needs a next step, a reply or an overdue task."
                : "No deals match this view."
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-line-subtle border-b text-body-subtle">
                <tr>
                  <th className="px-4 py-3 font-normal">Customer / deal</th>
                  <th className="px-4 py-3 font-normal">Stage</th>
                  <th className="px-4 py-3 font-normal">Value</th>
                  <th className="px-4 py-3 font-normal">Next step</th>
                  <th className="px-4 py-3 font-normal">Last contact</th>
                  <th className="px-4 py-3 font-normal">Tasks</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr
                    key={row.deal.id}
                    className="border-line-subtle border-b align-top"
                  >
                    <td className="px-4 py-3">
                      <Link
                        to={`/ops/pipeline/${row.deal.id}`}
                        className={opsTextLinkClass}
                      >
                        {row.customer?.name ?? "Customer not loaded"}
                      </Link>
                      <div>{row.deal.title}</div>
                      <div className="text-body-subtle text-xs">
                        {dealTypeLabel(row.deal.deal_type)} ·{" "}
                        {ownerName(row.deal.owner_email, viewer)}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {dealStageLabel(row.deal.stage)}
                      <div className="text-body-subtle text-xs">
                        since <Dated value={row.deal.stage_changed_at} />
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {formatUsd(row.deal.estimated_value)}
                    </td>
                    <td className="px-4 py-3">
                      {row.deal.next_step || (
                        <span className="text-body-subtle">None set</span>
                      )}
                      {row.open ? (
                        <div
                          className={cn(
                            "text-xs",
                            row.flags.next_step_overdue ||
                              row.flags.next_step_missing
                              ? "font-medium"
                              : "text-body-subtle",
                          )}
                        >
                          {row.flags.next_step_missing ? (
                            "Needs a next step and a date"
                          ) : (
                            <>
                              {row.flags.next_step_overdue
                                ? "overdue, was due "
                                : "due "}
                              <Dated value={row.deal.next_step_due} />
                            </>
                          )}
                        </div>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 text-xs">
                      <div>
                        Them: <Dated value={row.lastIncoming} />
                      </div>
                      <div>
                        Us: <Dated value={row.lastOutgoing} />
                      </div>
                      {row.flags.reply ? (
                        <div className="font-medium">Reply needed</div>
                      ) : null}
                    </td>
                    <td className="px-4 py-3">
                      {row.tasks.length === 0 ? (
                        <span className="text-body-subtle">None</span>
                      ) : (
                        <ul className="space-y-1">
                          {row.tasks.slice(0, 3).map((task) => (
                            <li key={task.id}>
                              {task.title || dealTaskKindLabel(task.kind)}
                              <span className="text-body-subtle text-xs">
                                {" "}
                                · {ownerName(task.owner_email, viewer)}
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
