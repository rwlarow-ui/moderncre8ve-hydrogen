import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { data, Form, Link, useActionData, useLoaderData, useNavigation } from "react-router";
import {
  OpsBackLink,
  OpsCard,
  OpsSectionHeading,
} from "~/components/ops/ops-shell";
import type { OpsMutationResult, OpsNoteTarget } from "~/utils/ops-dashboard.types";
import { requireOpsAccess } from "~/utils/ops-auth.server";
import {
  diffTags,
  getOrderDetail,
  normalizeTagList,
  setOpsNote,
  updateOwnerTags,
} from "~/utils/ops-dashboard.server";

export async function loader({
  request,
  context,
  params,
}: LoaderFunctionArgs) {
  await requireOpsAccess(request, context);

  if (!params.orderId) {
    throw new Response("Order not found.", { status: 404 });
  }

  return {
    order: await getOrderDetail(context.env, params.orderId),
  };
}

export async function action({
  request,
  context,
}: ActionFunctionArgs) {
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
    const currentTags = normalizeTagList(formData.get("currentTags")) as string[];
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

export default function OpsOrderDetailRoute() {
  const { order } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();

  return (
    <div className="space-y-6">
      <OpsBackLink to="/ops">Back to current orders</OpsBackLink>

      {actionData?.mutationResult ? (
        <div
          className={`rounded-2xl border px-5 py-4 text-sm ${
            actionData.mutationResult.ok
              ? "border-[#b7e4d6] bg-[#ebfaf4] text-[#1b6b54]"
              : "border-[#f0c7c9] bg-[#fff2f2] text-[#9b2f35]"
          }`}
        >
          {actionData.mutationResult.message}
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[1.7fr_1fr]">
        <OpsCard>
          <OpsSectionHeading
            title={order.name}
            description={`Placed ${new Date(order.processedAt).toLocaleString()} • ${order.ageInDays} operational day${order.ageInDays === 1 ? "" : "s"} old`}
            action={
              <div className="flex flex-wrap gap-3">
                <StatusBadge kind="fulfillment">
                  {order.displayFulfillmentStatus}
                </StatusBadge>
                <StatusBadge kind="financial">
                  {order.displayFinancialStatus}
                </StatusBadge>
              </div>
            }
          />
          <div className="grid gap-6 px-6 py-6 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="space-y-6">
              <section className="space-y-3">
                <h3 className="font-sans text-lg tracking-tight">Line Items</h3>
                <div className="space-y-3">
                  {order.lineItems.map((lineItem) => (
                    <div
                      key={lineItem.id}
                      className="flex gap-4 rounded-2xl border border-[#ece2d0] bg-[#fcfaf5] p-4"
                    >
                      <div className="grid h-18 w-18 shrink-0 place-items-center overflow-hidden rounded-2xl bg-white">
                        {lineItem.imageUrl ? (
                          <img
                            src={lineItem.imageUrl}
                            alt={lineItem.imageAlt || lineItem.name}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <span className="font-sans text-[10px] uppercase tracking-[0.18em] text-[#8b8e95]">
                            No image
                          </span>
                        )}
                      </div>
                      <div className="min-w-0 flex-1 space-y-1">
                        <p className="font-medium">{lineItem.name}</p>
                        <p className="text-[#6d7077] text-sm">
                          Qty {lineItem.quantity}
                          {lineItem.variantTitle ? ` • ${lineItem.variantTitle}` : ""}
                          {lineItem.sku ? ` • SKU ${lineItem.sku}` : ""}
                        </p>
                        <p className="text-sm">
                          {lineItem.lineTotal
                            ? new Intl.NumberFormat("en-US", {
                                style: "currency",
                                currency: lineItem.lineTotal.currencyCode,
                              }).format(Number(lineItem.lineTotal.amount))
                            : "N/A"}
                          {lineItem.unitPrice
                            ? ` total at ${new Intl.NumberFormat("en-US", {
                                style: "currency",
                                currency: lineItem.unitPrice.currencyCode,
                              }).format(Number(lineItem.unitPrice.amount))} each`
                            : ""}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              <section className="space-y-3">
                <h3 className="font-sans text-lg tracking-tight">Shipping Snapshot</h3>
                <div className="rounded-2xl border border-[#ece2d0] bg-[#fcfaf5] p-4 text-[#5f636b]">
                  {order.shippingAddress.length ? (
                    <ul className="space-y-1">
                      {order.shippingAddress.map((line) => (
                        <li key={line}>{line}</li>
                      ))}
                    </ul>
                  ) : (
                    <p>No shipping address on file.</p>
                  )}
                </div>
              </section>
            </div>

            <div className="space-y-4">
              <MetaPanel
                order={order}
                isSubmitting={navigation.state !== "idle"}
              />
            </div>
          </div>
        </OpsCard>
      </div>
    </div>
  );
}

function MetaPanel({
  order,
  isSubmitting,
}: {
  order: Awaited<ReturnType<typeof loader>>["order"];
  isSubmitting: boolean;
}) {
  return (
    <div className="space-y-4">
      <OpsCard>
        <OpsSectionHeading
          title="Order Controls"
          description="Keep native Shopify statuses intact while maintaining lightweight ops tags and notes."
        />
        <div className="space-y-5 px-6 py-6">
          <KeyValue label="Order ID" value={order.legacyId} />
          <KeyValue
            label="Created"
            value={new Date(order.createdAt).toLocaleString()}
          />
          <KeyValue
            label="Cancelled"
            value={order.cancelledAt ? new Date(order.cancelledAt).toLocaleString() : "No"}
          />
          <KeyValue
            label="Closed"
            value={order.closedAt ? new Date(order.closedAt).toLocaleString() : "No"}
          />
          <div className="flex flex-wrap gap-3">
            <a
              href={order.adminUrl}
              target="_blank"
              rel="noreferrer"
              className="rounded-full bg-[#323640] px-4 py-2 font-sans text-xs uppercase tracking-[0.18em] text-white hover:bg-[#2CBF96] hover:text-[#16372d]"
            >
              Open in Shopify Admin
            </a>
            {order.statusPageUrl ? (
              <a
                href={order.statusPageUrl}
                target="_blank"
                rel="noreferrer"
                className="rounded-full border border-[#d8d0bf] px-4 py-2 font-sans text-xs uppercase tracking-[0.18em] text-[#323640] hover:border-[#323640]"
              >
                Customer status page
              </a>
            ) : null}
          </div>
        </div>
      </OpsCard>

      <TagFormCard
        title="Order Tags"
        description="Comma-separated Shopify tags on the order record."
            ownerType="order"
            ownerId={order.id}
            tags={order.tags as string[]}
            isSubmitting={isSubmitting}
          />

      <NoteFormCard
        title="Order Ops Note"
        description="Stored in the app-owned order metafield."
        ownerType="order"
        ownerId={order.id}
        note={order.opsNote || ""}
        isSubmitting={isSubmitting}
      />

      {order.customer ? (
        <>
          <OpsCard>
            <OpsSectionHeading
              title="Customer Snapshot"
              description={order.customer.email || "No email available"}
            />
            <div className="space-y-3 px-6 py-6 text-sm">
              <KeyValue label="Customer" value={order.customer.name} />
              <KeyValue label="Legacy ID" value={order.customer.legacyId} />
              <KeyValue label="Phone" value={order.customer.phone || "No phone"} />
              <a
                href={order.customer.adminUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex rounded-full border border-[#d8d0bf] px-4 py-2 font-sans text-xs uppercase tracking-[0.18em] text-[#323640] hover:border-[#323640]"
              >
                Open customer in Admin
              </a>
            </div>
          </OpsCard>

          <TagFormCard
            title="Customer Tags"
            description="Comma-separated Shopify tags on the customer record."
            ownerType="customer"
            ownerId={order.customer.id}
            tags={order.customer.tags as string[]}
            isSubmitting={isSubmitting}
          />

          <NoteFormCard
            title="Customer Ops Note"
            description="Stored in the app-owned customer metafield."
            ownerType="customer"
            ownerId={order.customer.id}
            note={order.customer.opsNote || ""}
            isSubmitting={isSubmitting}
          />
        </>
      ) : null}
    </div>
  );
}

function TagFormCard({
  title,
  description,
  ownerType,
  ownerId,
  tags,
  isSubmitting,
}: {
  title: string;
  description: string;
  ownerType: OpsNoteTarget;
  ownerId: string;
  tags: string[];
  isSubmitting: boolean;
}) {
  return (
    <OpsCard>
      <OpsSectionHeading title={title} description={description} />
      <Form method="post" className="space-y-4 px-6 py-6">
        <input type="hidden" name="intent" value="save-tags" />
        <input type="hidden" name="ownerType" value={ownerType} />
        <input type="hidden" name="ownerId" value={ownerId} />
        <input type="hidden" name="currentTags" value={tags.join(", ")} />
        <textarea
          name="tags"
          rows={3}
          defaultValue={tags.join(", ")}
          className="w-full rounded-2xl border border-[#d9cfbd] bg-[#fcfaf5] px-4 py-3 focus:border-[#323640] focus:outline-hidden"
        />
        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-full bg-[#323640] px-5 py-2 font-sans text-xs uppercase tracking-[0.18em] text-white transition-colors hover:bg-[#2CBF96] hover:text-[#16372d] disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isSubmitting ? "Saving..." : "Save tags"}
        </button>
      </Form>
    </OpsCard>
  );
}

function NoteFormCard({
  title,
  description,
  ownerType,
  ownerId,
  note,
  isSubmitting,
}: {
  title: string;
  description: string;
  ownerType: OpsNoteTarget;
  ownerId: string;
  note: string;
  isSubmitting: boolean;
}) {
  return (
    <OpsCard>
      <OpsSectionHeading title={title} description={description} />
      <Form method="post" className="space-y-4 px-6 py-6">
        <input type="hidden" name="intent" value="save-note" />
        <input type="hidden" name="ownerType" value={ownerType} />
        <input type="hidden" name="ownerId" value={ownerId} />
        <textarea
          name="note"
          rows={5}
          defaultValue={note}
          placeholder="Add a private ops note. Clear the field and save to remove it."
          className="w-full rounded-2xl border border-[#d9cfbd] bg-[#fcfaf5] px-4 py-3 focus:border-[#323640] focus:outline-hidden"
        />
        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-full bg-[#323640] px-5 py-2 font-sans text-xs uppercase tracking-[0.18em] text-white transition-colors hover:bg-[#2CBF96] hover:text-[#16372d] disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isSubmitting ? "Saving..." : "Save note"}
        </button>
      </Form>
    </OpsCard>
  );
}

function KeyValue({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1">
      <p className="font-sans text-[11px] uppercase tracking-[0.2em] text-[#6d7077]">
        {label}
      </p>
      <p>{value}</p>
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
      className={`inline-flex rounded-full px-3 py-1 font-sans text-[11px] uppercase tracking-[0.18em] ${classes}`}
    >
      {children}
    </span>
  );
}
