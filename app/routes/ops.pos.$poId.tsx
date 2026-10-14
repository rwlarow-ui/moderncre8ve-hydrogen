import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import {
  data,
  Form,
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
  OpsSectionHeading,
  opsInputClass,
  opsTextLinkClass,
} from "~/components/ops/ops-shell";
import {
  DWELLING_OPTIONS,
  ELEVATOR_OPTIONS,
  STAIRS_OPTIONS,
} from "~/utils/logistics";
import { requireOpsAccess } from "~/utils/ops-auth.server";
import {
  checkTransition,
  isEditableState,
  PO_STATE_LABELS,
  reviewBlockers,
} from "~/utils/production-po";
import {
  getProductionPo,
  refreshPoLogistics,
  savePoSpecs,
  transitionPo,
} from "~/utils/production-po.server";

const SPEC_FIELDS = ["size", "species", "leaf", "finish", "notes"] as const;

export async function loader({ request, context, params }: LoaderFunctionArgs) {
  await requireOpsAccess(request, context);
  if (!params.poId) throw new Response("PO not found.", { status: 404 });

  let po: Awaited<ReturnType<typeof getProductionPo>>;
  try {
    po = await getProductionPo(context.env, params.poId);
  } catch {
    throw new Response("PO not found.", { status: 404 });
  }

  const blockers = reviewBlockers({
    state: po.state,
    lineSpecs: po.lineSpecs,
    snapshot: po.snapshot,
  });
  return {
    po,
    blockers,
    orderLegacyId: String(po.orderId).split("/").pop() ?? "",
    editable: isEditableState(po.state),
    canApprove: checkTransition({
      state: po.state,
      to: "approved",
      lineSpecs: po.lineSpecs,
      snapshot: po.snapshot,
    }).ok,
  };
}

export async function action({ request, context, params }: ActionFunctionArgs) {
  await requireOpsAccess(request, context);
  if (!params.poId) throw new Response("PO not found.", { status: 404 });

  const formData = await request.formData();
  const intent = String(formData.get("intent") || "");

  try {
    if (intent === "save-specs") {
      const count = Number(formData.get("lineCount")) || 0;
      const edits = Array.from({ length: count }, (_, index) =>
        Object.fromEntries(
          SPEC_FIELDS.map((field) => [
            field,
            String(formData.get(`${field}-${index}`) ?? ""),
          ]),
        ),
      );
      await savePoSpecs(context.env, params.poId, edits);
      return data({ ok: true, message: "Specs saved." });
    }
    if (intent === "refresh-logistics") {
      await refreshPoLogistics(context.env, params.poId);
      return data({ ok: true, message: "Logistics refreshed from the order." });
    }
    const targets: Record<string, [string, string]> = {
      approve: ["approved", "PO approved. It has not been sent."],
      "revoke-approval": ["ready_for_review", "Approval revoked."],
      cancel: ["cancelled", "PO cancelled."],
    };
    if (targets[intent]) {
      const [to, message] = targets[intent];
      await transitionPo(context.env, params.poId, to);
      return data({ ok: true, message });
    }
    return data({ ok: false, message: "Unsupported action." }, { status: 400 });
  } catch (error) {
    return data(
      {
        ok: false,
        message: error instanceof Error ? error.message : "Action failed.",
      },
      { status: 422 },
    );
  }
}

export default function OpsPoDetail() {
  const { po, blockers, orderLegacyId, editable, canApprove } =
    useLoaderData<typeof loader>();
  const result = useActionData<typeof action>();
  const navigation = useNavigation();
  const busy = navigation.state !== "idle";
  const logistics = po.snapshot?.logistics ?? null;
  const label = (options: { value: string; label: string }[], value: string) =>
    options.find((option) => option.value === value)?.label ?? value;

  return (
    <div className="space-y-8">
      <div className="space-y-6">
        <OpsBackLink to="/ops/pos">Production POs</OpsBackLink>
        <div className="flex flex-col gap-4 border-line-subtle border-b pb-8 md:flex-row md:items-end md:justify-between">
          <div className="space-y-2">
            <h1 className="h4">PO for order {po.orderName}</h1>
            <p className="text-body-subtle">
              {PO_STATE_LABELS[po.state as keyof typeof PO_STATE_LABELS]} ·
              revision {po.revision}
              {po.approvedAt && ["approved", "sent"].includes(po.state)
                ? ` · approved ${formatDate(po.approvedAt, true)}`
                : ""}
            </p>
          </div>
          <a
            href={`/ops/orders/${orderLegacyId}`}
            className={`${opsTextLinkClass} text-sm`}
          >
            View order
          </a>
        </div>
      </div>

      {result ? (
        <OpsNotice ok={Boolean(result.ok)}>{result.message}</OpsNotice>
      ) : null}

      {po.state === "awaiting_logistics" ? (
        <OpsNotice ok={false}>
          Waiting on the customer's delivery details
          {po.snapshot?.order?.customerEmail
            ? ` (${po.snapshot.order.customerEmail}${logistics?.phone ? `, ${logistics.phone}` : ""})`
            : ""}
          . Use “Refresh from order” once they've provided them.
        </OpsNotice>
      ) : null}

      <OpsCard>
        <OpsSectionHeading
          title="Pieces"
          description={
            editable
              ? "Edit anything the order didn't fill in, then save. Approval uses the saved values."
              : "Locked. Revoke approval to edit."
          }
        />
        <Form method="post" className="space-y-0">
          <input type="hidden" name="intent" value="save-specs" />
          <input type="hidden" name="lineCount" value={po.lineSpecs.length} />
          {po.lineSpecs.map(
            (
              spec: {
                lineItemId: string;
                product: string;
                quantity: number;
                size: string;
                species: string;
                leaf: string;
                finish: string;
                otherOptions: string;
                notes: string;
              },
              index: number,
            ) => (
              <fieldset
                key={spec.lineItemId}
                disabled={!editable || busy}
                className="grid gap-4 border-line-subtle border-b px-5 py-5 md:grid-cols-4 md:px-6"
              >
                <legend className="sr-only">Line {index + 1}</legend>
                <div className="md:col-span-4">
                  <p className="font-sans text-lg tracking-wide">
                    {spec.quantity} × {spec.product}
                  </p>
                  {spec.otherOptions ? (
                    <p className="text-body-subtle text-sm">
                      {spec.otherOptions}
                    </p>
                  ) : null}
                </div>
                <OpsField label="Size / dimensions">
                  <input
                    name={`size-${index}`}
                    defaultValue={spec.size}
                    className={opsInputClass}
                  />
                </OpsField>
                <OpsField label="Species / material">
                  <input
                    name={`species-${index}`}
                    defaultValue={spec.species}
                    className={opsInputClass}
                  />
                </OpsField>
                <OpsField label="Leaf">
                  <input
                    name={`leaf-${index}`}
                    defaultValue={spec.leaf}
                    className={opsInputClass}
                  />
                </OpsField>
                <OpsField label="Finish">
                  <input
                    name={`finish-${index}`}
                    defaultValue={spec.finish}
                    className={opsInputClass}
                  />
                </OpsField>
                <OpsField
                  label="Notes for the builder"
                  className="md:col-span-4"
                >
                  <input
                    name={`notes-${index}`}
                    defaultValue={spec.notes}
                    maxLength={500}
                    className={opsInputClass}
                  />
                </OpsField>
              </fieldset>
            ),
          )}
          {editable ? (
            <div className="px-5 py-4 md:px-6">
              <Button type="submit" loading={busy} disabled={busy}>
                Save specs
              </Button>
            </div>
          ) : null}
        </Form>
      </OpsCard>

      <OpsCard>
        <OpsSectionHeading
          title="Delivery & logistics"
          description={
            po.snapshot?.capturedAt
              ? `Captured ${formatDate(po.snapshot.capturedAt, true)}`
              : undefined
          }
        />
        {logistics ? (
          <dl className="grid gap-x-8 gap-y-4 px-5 py-5 text-sm md:grid-cols-2 md:px-6">
            <Item
              label="Address"
              value={[
                logistics.address1,
                logistics.address2,
                `${logistics.city}, ${logistics.state} ${logistics.zip}`,
              ]
                .filter(Boolean)
                .join("\n")}
            />
            <Item label="Phone" value={logistics.phone} />
            <Item
              label="Home"
              value={label(DWELLING_OPTIONS, logistics.dwelling)}
            />
            <Item
              label="Stairs"
              value={label(STAIRS_OPTIONS, logistics.stairs)}
            />
            <Item
              label="Elevator"
              value={label(ELEVATOR_OPTIONS, logistics.elevator)}
            />
            <Item
              label="Narrowest doorway"
              value={`${logistics.doorwayWidthIn}"`}
            />
            <Item
              label="Narrowest hallway"
              value={`${logistics.hallwayWidthIn}"`}
            />
            {logistics.stairwellWidthIn != null ? (
              <Item
                label="Stairwell"
                value={`${logistics.stairwellWidthIn}"`}
              />
            ) : null}
            {logistics.notes ? (
              <Item label="Notes" value={logistics.notes} />
            ) : null}
          </dl>
        ) : (
          <p className="px-5 py-5 text-body-subtle text-sm md:px-6">
            {po.snapshot?.status === "later"
              ? "The customer chose to provide delivery details after ordering."
              : "No delivery details yet."}
          </p>
        )}
      </OpsCard>

      <OpsCard>
        <OpsSectionHeading title="Review" />
        <div className="space-y-5 px-5 py-5 md:px-6">
          {blockers.length &&
          po.state !== "sent" &&
          po.state !== "cancelled" ? (
            <div>
              <p className="mb-2 font-medium text-sm">Can't approve yet:</p>
              <ul className="list-disc space-y-1 pl-5 text-sm">
                {blockers.map((blocker: string) => (
                  <li key={blocker}>{blocker}</li>
                ))}
              </ul>
            </div>
          ) : null}
          <div className="flex flex-wrap items-center gap-3">
            {editable ? (
              <Form method="post">
                <input type="hidden" name="intent" value="refresh-logistics" />
                <Button type="submit" variant="outline" disabled={busy}>
                  Refresh from order
                </Button>
              </Form>
            ) : null}
            {po.state === "ready_for_review" ? (
              <Form method="post">
                <input type="hidden" name="intent" value="approve" />
                <Button type="submit" disabled={busy || !canApprove}>
                  Approve PO
                </Button>
              </Form>
            ) : null}
            {po.state === "approved" ? (
              <Form method="post">
                <input type="hidden" name="intent" value="revoke-approval" />
                <Button type="submit" variant="outline" disabled={busy}>
                  Revoke approval
                </Button>
              </Form>
            ) : null}
            {!["sent", "cancelled"].includes(po.state) ? (
              <Form
                method="post"
                onSubmit={(event) => {
                  if (!window.confirm("Cancel this PO?")) {
                    event.preventDefault();
                  }
                }}
              >
                <input type="hidden" name="intent" value="cancel" />
                <Button type="submit" variant="outline" disabled={busy}>
                  Cancel PO
                </Button>
              </Form>
            ) : null}
          </div>
          {po.state === "approved" ? (
            <p className="text-body-subtle text-sm">
              Approved but not sent. Sending to the partner needs the PDF +
              email step, which isn't built yet.
            </p>
          ) : null}
        </div>
      </OpsCard>
    </div>
  );
}

function Item({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-0.5">
      <dt className="text-body-subtle">{label}</dt>
      <dd className="whitespace-pre-line">{value || "—"}</dd>
    </div>
  );
}
