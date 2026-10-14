import { ArrowSquareOutIcon } from "@phosphor-icons/react";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import {
  data,
  Form,
  useActionData,
  useLoaderData,
  useNavigation,
} from "react-router";
import { Button, variants as buttonVariants } from "~/components/button";
import {
  formatDate,
  formatMoney,
  LeadTimeMeter,
  OpsBackLink,
  OpsCard,
  OpsField,
  OpsNotice,
  OpsSectionHeading,
  OpsTag,
  opsInputClass,
  opsTextLinkClass,
  StatusBadge,
} from "~/components/ops/ops-shell";
import { cn } from "~/utils/cn";
import { requireOpsAccess } from "~/utils/ops-auth.server";
import {
  diffTags,
  getOrderDetail,
  normalizeTagList,
  setOpsNote,
  updateOwnerTags,
} from "~/utils/ops-dashboard.server";
import type {
  OpsMutationResult,
  OpsNoteTarget,
} from "~/utils/ops-dashboard.types";

export async function loader({ request, context, params }: LoaderFunctionArgs) {
  await requireOpsAccess(request, context);

  if (!params.orderId) {
    throw new Response("Order not found.", { status: 404 });
  }

  return {
    order: await getOrderDetail(context.env, params.orderId),
  };
}

export async function action({ request, context }: ActionFunctionArgs) {
  await requireOpsAccess(request, context);

  const formData = await request.formData();
  const intent = String(formData.get("intent") || "");
  const ownerType = String(formData.get("ownerType") || "") as OpsNoteTarget;
  const ownerId = String(formData.get("ownerId") || "");

  if (!ownerId || !["order", "customer"].includes(ownerType)) {
    return data(
      {
        mutationResult: {
          ok: false,
          message: "Missing owner metadata.",
        },
      },
      { status: 400 },
    );
  }

  let mutationResult: OpsMutationResult;

  if (intent === "save-tags") {
    const currentTags = normalizeTagList(
      formData.get("currentTags"),
    ) as string[];
    const nextTags = normalizeTagList(formData.get("tags")) as string[];
    const tagDiff = diffTags(currentTags, nextTags) as {
      addTags: string[];
      removeTags: string[];
    };
    mutationResult = (await updateOwnerTags(context.env, {
      ownerType,
      ownerId,
      addTags: tagDiff.addTags,
      removeTags: tagDiff.removeTags,
    })) as OpsMutationResult;
  } else if (intent === "save-note") {
    mutationResult = (await setOpsNote(context.env, {
      ownerType,
      ownerId,
      note: String(formData.get("note") || ""),
    })) as OpsMutationResult;
  } else {
    return data(
      {
        mutationResult: {
          ok: false,
          message: "Unsupported action.",
        },
      },
      { status: 400 },
    );
  }

  return data({ mutationResult });
}

type OrderDetail = Awaited<ReturnType<typeof loader>>["order"];

export default function OpsOrderDetailRoute() {
  const { order } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const result = actionData?.mutationResult as OpsMutationResult | undefined;

  return (
    <div className="space-y-8">
      <div className="space-y-6">
        <OpsBackLink to="/ops">Current orders</OpsBackLink>
        <div className="flex flex-col gap-8 border-line-subtle border-b pb-8 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-3">
            <h1 className="h4">Order {order.name}</h1>
            <p className="text-body-subtle">
              Placed {formatDate(order.processedAt, true)}
              {order.customer ? ` by ${order.customer.name}` : ""}
            </p>
            <div className="flex flex-wrap gap-x-6 gap-y-2 pt-1">
              <span className="inline-flex items-center gap-2 text-sm">
                <span className="text-body-subtle">Fulfillment</span>
                <StatusBadge>{order.displayFulfillmentStatus}</StatusBadge>
              </span>
              <span className="inline-flex items-center gap-2 text-sm">
                <span className="text-body-subtle">Payment</span>
                <StatusBadge>{order.displayFinancialStatus}</StatusBadge>
              </span>
            </div>
          </div>
          <LeadTimeMeter days={order.ageInDays} size="lg" />
        </div>
      </div>

      {result ? (
        <OpsNotice ok={result.ok}>
          <p>{result.message}</p>
          {result.userErrors?.length ? (
            <ul className="mt-1 list-disc pl-4 text-body-subtle">
              {result.userErrors.map((error) => (
                <li key={error.message}>{error.message}</li>
              ))}
            </ul>
          ) : null}
        </OpsNotice>
      ) : null}

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_22rem] xl:grid-cols-[minmax(0,1fr)_24rem]">
        <div className="min-w-0 space-y-8">
          <OpsCard>
            <OpsSectionHeading
              title="Items"
              description={`${order.lineItems.length} line item${order.lineItems.length === 1 ? "" : "s"}, ${formatMoney(order.totalPrice)} total`}
            />
            <ul>
              {order.lineItems.map((lineItem) => (
                <li
                  key={lineItem.id}
                  className="flex gap-4 border-line-subtle border-b px-5 py-5 last:border-b-0 md:gap-5 md:px-6"
                >
                  <div className="grid size-20 shrink-0 place-items-center overflow-hidden bg-(--color-topbar-bg) md:size-24">
                    {lineItem.imageUrl ? (
                      <img
                        src={lineItem.imageUrl}
                        alt={lineItem.imageAlt || lineItem.name}
                        loading="lazy"
                        width={192}
                        height={192}
                        className="size-full object-cover"
                      />
                    ) : (
                      <span className="text-body-subtle text-xs">No image</span>
                    )}
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col gap-3 sm:flex-row sm:justify-between">
                    <div className="min-w-0 space-y-1">
                      <p className="font-sans text-lg tracking-wide">
                        {lineItem.name}
                      </p>
                      <dl className="flex flex-wrap gap-x-4 gap-y-0.5 text-body-subtle text-sm">
                        {lineItem.variantTitle ? (
                          <div>
                            <dt className="sr-only">Variant</dt>
                            <dd>{lineItem.variantTitle}</dd>
                          </div>
                        ) : null}
                        {lineItem.sku ? (
                          <div className="flex gap-1">
                            <dt>SKU</dt>
                            <dd>{lineItem.sku}</dd>
                          </div>
                        ) : null}
                      </dl>
                    </div>
                    <div className="shrink-0 text-sm tabular-nums sm:text-right">
                      <p>{formatMoney(lineItem.lineTotal)}</p>
                      <p className="text-body-subtle">
                        {lineItem.quantity} × {formatMoney(lineItem.unitPrice)}
                      </p>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </OpsCard>

          <div className="grid gap-8 md:grid-cols-2">
            <OpsCard>
              <OpsSectionHeading title="Delivery address" />
              <div className="px-5 py-5 md:px-6">
                {order.shippingAddress.length ? (
                  <address className="space-y-0.5 not-italic">
                    {order.shippingAddress.map((line) => (
                      <p key={line}>{line}</p>
                    ))}
                  </address>
                ) : (
                  <p className="text-body-subtle">No address on file.</p>
                )}
                <p className="mt-4 text-body-subtle text-sm">
                  White glove delivery with in-home assembly.
                </p>
              </div>
            </OpsCard>

            <OpsCard>
              <OpsSectionHeading title="Order record" />
              <dl className="divide-y divide-(--color-line-subtle) px-5 md:px-6">
                <KeyValue label="Order ID" value={order.legacyId} />
                <KeyValue
                  label="Created"
                  value={formatDate(order.createdAt, true)}
                />
                <KeyValue
                  label="Cancelled"
                  value={
                    order.cancelledAt
                      ? formatDate(order.cancelledAt, true)
                      : "No"
                  }
                />
                <KeyValue
                  label="Closed"
                  value={
                    order.closedAt ? formatDate(order.closedAt, true) : "No"
                  }
                />
              </dl>
            </OpsCard>
          </div>

          {order.customer ? <CustomerSection order={order} /> : null}
        </div>

        <aside className="space-y-8 lg:sticky lg:top-28 lg:self-start">
          <div className="flex flex-col gap-3">
            <a
              href={order.adminUrl}
              target="_blank"
              rel="noreferrer"
              className={cn(
                buttonVariants({ variant: "primary" }),
                "w-full gap-2 py-4",
              )}
            >
              Open in Shopify Admin
              <ArrowSquareOutIcon size={16} aria-hidden="true" />
            </a>
            {order.statusPageUrl ? (
              <a
                href={order.statusPageUrl}
                target="_blank"
                rel="noreferrer"
                className={buttonVariants({
                  variant: "outline",
                  className: "gap-2 py-4",
                })}
              >
                Customer status page
                <ArrowSquareOutIcon size={16} aria-hidden="true" />
              </a>
            ) : null}
          </div>

          <OpsCard>
            <OpsSectionHeading
              title="Order notes and tags"
              description="Private to the team. Shopify statuses stay untouched."
            />
            <div className="divide-y divide-(--color-line-subtle)">
              <NoteForm
                label="Ops note"
                ownerType="order"
                ownerId={order.id}
                note={order.opsNote || ""}
              />
              <TagForm
                ownerType="order"
                ownerId={order.id}
                tags={order.tags as string[]}
              />
            </div>
          </OpsCard>
        </aside>
      </div>
    </div>
  );
}

function CustomerSection({ order }: { order: OrderDetail }) {
  const customer = order.customer;
  if (!customer) {
    return null;
  }

  return (
    <OpsCard>
      <OpsSectionHeading
        title={customer.name}
        description="Customer"
        action={
          <a
            href={customer.adminUrl}
            target="_blank"
            rel="noreferrer"
            className={`${opsTextLinkClass} text-sm`}
          >
            Open in Shopify Admin
            <ArrowSquareOutIcon size={14} aria-hidden="true" />
          </a>
        }
      />
      <div className="grid md:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
        <dl className="divide-y divide-(--color-line-subtle) border-line-subtle px-5 md:border-r md:px-6">
          <KeyValue
            label="Email"
            value={
              customer.email ? (
                <a
                  href={`mailto:${customer.email}`}
                  className={opsTextLinkClass}
                >
                  {customer.email}
                </a>
              ) : (
                "No email"
              )
            }
          />
          <KeyValue
            label="Phone"
            value={
              customer.phone ? (
                <a href={`tel:${customer.phone}`} className={opsTextLinkClass}>
                  {customer.phone}
                </a>
              ) : (
                "No phone"
              )
            }
          />
          <KeyValue label="Customer ID" value={customer.legacyId} />
        </dl>
        <div className="divide-y divide-(--color-line-subtle) border-line-subtle border-t md:border-t-0">
          <NoteForm
            label="Customer ops note"
            ownerType="customer"
            ownerId={customer.id}
            note={customer.opsNote || ""}
          />
          <TagForm
            label="Customer tags"
            ownerType="customer"
            ownerId={customer.id}
            tags={customer.tags as string[]}
          />
        </div>
      </div>
    </OpsCard>
  );
}

/** True only while *this* form is submitting, so other forms stay usable. */
function useIsSaving(intent: string, ownerType: OpsNoteTarget) {
  const navigation = useNavigation();
  return (
    navigation.state !== "idle" &&
    navigation.formData?.get("intent") === intent &&
    navigation.formData?.get("ownerType") === ownerType
  );
}

function TagForm({
  label = "Tags",
  ownerType,
  ownerId,
  tags,
}: {
  label?: string;
  ownerType: OpsNoteTarget;
  ownerId: string;
  tags: string[];
}) {
  const isSaving = useIsSaving("save-tags", ownerType);

  return (
    <Form method="post" className="space-y-3 px-5 py-5 md:px-6">
      <input type="hidden" name="intent" value="save-tags" />
      <input type="hidden" name="ownerType" value={ownerType} />
      <input type="hidden" name="ownerId" value={ownerId} />
      <input type="hidden" name="currentTags" value={tags.join(", ")} />
      {tags.length ? (
        <div className="flex flex-wrap gap-1.5" aria-hidden="true">
          {tags.map((tag) => (
            <OpsTag key={tag}>{tag}</OpsTag>
          ))}
        </div>
      ) : null}
      <OpsField label={label} hint="Separate tags with commas.">
        <input
          type="text"
          name="tags"
          defaultValue={tags.join(", ")}
          placeholder="e.g. walnut, rush"
          className={opsInputClass}
        />
      </OpsField>
      <Button
        type="submit"
        variant="outline"
        animate={false}
        loading={isSaving}
        disabled={isSaving}
        className="px-5 py-3"
      >
        Save tags
      </Button>
    </Form>
  );
}

function NoteForm({
  label,
  ownerType,
  ownerId,
  note,
}: {
  label: string;
  ownerType: OpsNoteTarget;
  ownerId: string;
  note: string;
}) {
  const isSaving = useIsSaving("save-note", ownerType);

  return (
    <Form method="post" className="space-y-3 px-5 py-5 md:px-6">
      <input type="hidden" name="intent" value="save-note" />
      <input type="hidden" name="ownerType" value={ownerType} />
      <input type="hidden" name="ownerId" value={ownerId} />
      <OpsField label={label} hint="Clear the note and save to remove it.">
        <textarea
          name="note"
          rows={4}
          defaultValue={note}
          placeholder="Add a private note for the team"
          className={`${opsInputClass} resize-y leading-relaxed`}
        />
      </OpsField>
      <Button
        type="submit"
        animate={false}
        loading={isSaving}
        disabled={isSaving}
        className="px-5 py-3"
      >
        Save note
      </Button>
    </Form>
  );
}

function KeyValue({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-3 text-sm">
      <dt className="shrink-0 text-body-subtle">{label}</dt>
      <dd className="min-w-0 truncate text-right">{value}</dd>
    </div>
  );
}
