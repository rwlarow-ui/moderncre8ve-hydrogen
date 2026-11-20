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
  CARE_SENDER_EMAIL,
  CARE_TEMPLATES,
  careTemplateLabel,
  lintTemplate,
  messageStatusLabel,
  renderTemplate,
} from "~/utils/ops-care";
import {
  careAdminAction,
  careUnavailableReason,
  loadCareOverview,
} from "~/utils/ops-care.server";
import { googleConnectErrorMessage } from "~/utils/ops-google-errors";
import { requireOpsUser } from "~/utils/ops-identity.server";
import { privateHeaders } from "~/utils/ops-store.server";
import type { Route } from "./+types/ops.communications.automation";

export const headers = () => privateHeaders;

export async function loader({ request, context }: Route.LoaderArgs) {
  const user = await requireOpsUser(request, context, { owner: true });
  const googleError = googleConnectErrorMessage(
    new URL(request.url).searchParams.get("googleError"),
  );
  try {
    const overview = await loadCareOverview(context.env, user);
    return data(
      {
        viewer: user.email,
        googleError,
        overview,
        jobSecretSet: String(context.env.OPS_JOB_SECRET || "").length >= 32,
        storeError: null,
      },
      { headers: privateHeaders },
    );
  } catch (error) {
    return data(
      {
        viewer: user.email,
        googleError,
        overview: null,
        jobSecretSet: false,
        storeError: careUnavailableReason(error),
      },
      { headers: privateHeaders },
    );
  }
}

export async function action({ request, context }: Route.ActionArgs) {
  const user = await requireOpsUser(request, context, { owner: true });
  const form = await request.formData();
  try {
    const message = await careAdminAction(context.env, user, form);
    return data({ ok: true, message }, { headers: privateHeaders });
  } catch (error) {
    if (error instanceof Response) {
      throw error;
    }
    return data(
      { ok: false, message: careUnavailableReason(error) },
      { status: 422, headers: privateHeaders },
    );
  }
}

type Overview = NonNullable<Awaited<ReturnType<typeof loadCareOverview>>>;
type Message = Overview["recent"][number];

function Hidden({ values }: { values: Record<string, string> }) {
  return (
    <>
      {Object.entries(values).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}
    </>
  );
}

function Submit({
  children,
  variant = "outline",
}: {
  children: React.ReactNode;
  variant?: "outline" | "primary";
}) {
  const navigation = useNavigation();
  return (
    <Button
      type="submit"
      variant={variant}
      disabled={navigation.state === "submitting"}
    >
      {children}
    </Button>
  );
}

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function MessageRow({ m, actions = true }: { m: Message; actions?: boolean }) {
  return (
    <li className="grid gap-2 px-5 py-3 md:grid-cols-[1fr_auto]">
      <div>
        <p>
          <Link
            to={`/ops/communications/${m.order_id}`}
            className={opsTextLinkClass}
          >
            {m.order_name}
          </Link>{" "}
          · {m.template_key} · <strong>{messageStatusLabel(m.status)}</strong>
        </p>
        <p className="text-body-subtle text-xs">
          {m.status === "accepted" && m.accepted_at
            ? `Accepted ${formatDate(m.accepted_at, true)}`
            : `Due ${formatDate(m.override_due_at ?? m.due_at, true)}`}
          {m.attempts ? ` · ${m.attempts} attempt(s)` : ""}
          {m.outcome_note ? ` · ${m.outcome_note}` : ""}
        </p>
      </div>
      {actions ? <JobActions m={m} /> : null}
    </li>
  );
}

function JobActions({ m }: { m: Message }) {
  const available = [
    m.status === "held" && ["release", "Release"],
    m.status === "failed" && ["retry", "Retry (after checking Gmail Sent)"],
    ["scheduled", "held", "failed"].includes(m.status) && ["cancel", "Cancel"],
  ].filter(Boolean) as [string, string][];
  if (!available.length) {
    return null;
  }
  return (
    <div className="flex flex-wrap gap-2">
      {available.map(([action, label]) => (
        <Form method="post" key={action}>
          <Hidden values={{ intent: "care-job", jobId: m.id, action }} />
          <Submit>{label}</Submit>
        </Form>
      ))}
    </div>
  );
}

function TemplatePreview({ t }: { t: Overview["templates"][number] }) {
  const sample = (firstName: string) => {
    try {
      return renderTemplate(t, { firstName, orderName: "#1000" });
    } catch (error) {
      return {
        subject: "",
        text: `Cannot render: ${(error as Error).message}`,
      };
    }
  };
  const named = sample("Ana");
  const neutral = sample("");
  const problems = lintTemplate({
    subject: t.subject,
    body: t.body_text,
    neutralGreeting: t.neutral_greeting,
  });
  return (
    <details className="border border-line-subtle">
      <summary className="cursor-pointer px-4 py-2 text-sm">
        v{t.version}{" "}
        {t.active ? <StatusBadge label="Active">Active</StatusBadge> : null}{" "}
        <span className="text-body-subtle">
          imported {formatDate(t.imported_at)} by {t.imported_by.split("@")[0]}
          {t.source_revision ? ` · source ${t.source_revision}` : ""}
          {t.approved_by ? ` · approved by ${t.approved_by.split("@")[0]}` : ""}
        </span>
      </summary>
      <div className="space-y-3 border-line-subtle border-t p-4 text-sm">
        {problems.length ? (
          <OpsNotice ok={false}>{problems.join(" ")}</OpsNotice>
        ) : null}
        <p>
          <strong>Subject:</strong> {named.subject}
        </p>
        <pre className="whitespace-pre-wrap font-serif">{named.text}</pre>
        <p className="text-body-subtle text-xs">
          Without a first name the greeting becomes:{" "}
          {neutral.text.split("\n")[0]}
        </p>
        <p className="text-body-subtle text-xs">
          The approved care@ signature is added below this once, at sending.
          Fingerprint {t.content_sha256.slice(0, 12)}.
        </p>
        {!t.active && !problems.length ? (
          <Form method="post">
            <Hidden
              values={{
                intent: "activate-template",
                key: t.key,
                version: String(t.version),
              }}
            />
            <Submit variant="primary">
              Approve and make v{t.version} active
            </Submit>
          </Form>
        ) : null}
      </div>
    </details>
  );
}

export default function CareAutomation() {
  const { overview, storeError, viewer, jobSecretSet, googleError } =
    useLoaderData<typeof loader>();
  const result = useActionData<typeof action>();
  const navigation = useNavigation();
  if (!overview) {
    return (
      <>
        <OpsPageHeader title="Logistics email automation" />
        {googleError ? <OpsNotice ok={false}>{googleError}</OpsNotice> : null}
        <OpsNotice ok={false}>{storeError}</OpsNotice>
      </>
    );
  }
  const { settings, sender } = overview;
  const tickAge = settings.last_tick_at
    ? (Date.now() - Date.parse(settings.last_tick_at)) / 3600000
    : null;
  const pdfs = overview.assets.filter((a) => a.kind === "logistics_blank_pdf");
  const signatures = overview.assets.filter((a) => a.kind === "care_signature");
  const lastResult = settings.last_tick_result as { errors?: string[] } | null;

  return (
    <>
      <div className="mb-6">
        <OpsBackLink to="/ops/communications">
          Customer communications
        </OpsBackLink>
      </div>
      <OpsPageHeader
        title="Logistics email automation"
        description="CARE-01 delivery logistics request and CARE-02 weekly reminder, sent from Haven's Gmail as care@. ADR-0010."
        aside={
          <div className="flex flex-col gap-1 text-sm">
            <StatusBadge label="Mode">{settings.mode}</StatusBadge>
            {settings.global_pause ? (
              <StatusBadge label="Paused">Global pause on</StatusBadge>
            ) : null}
          </div>
        }
      />

      <div className="mb-6 space-y-3">
        {googleError ? <OpsNotice ok={false}>{googleError}</OpsNotice> : null}
        {result ? <OpsNotice ok={result.ok}>{result.message}</OpsNotice> : null}
        {settings.mode === "off" ? (
          <OpsNotice ok>
            Automation is off. Nothing is sent to anyone. Deploying never
            changes this.
          </OpsNotice>
        ) : null}
        {settings.mode === "test" ? (
          <OpsNotice ok>
            Test mode: only approved test orders, and only to allowlisted
            addresses. Customer orders cannot send.
          </OpsNotice>
        ) : null}
        {settings.mode === "live" ? (
          <OpsNotice ok={false}>
            Live mode: customer orders send under the rules switched on below.
          </OpsNotice>
        ) : null}
        {!sender?.send_as_ok ? (
          <OpsNotice ok={false}>
            The care@ sender is not ready
            {sender?.send_as_problem ? `: ${sender.send_as_problem}` : "."}{" "}
            Nothing can send until it is.
          </OpsNotice>
        ) : null}
        {settings.mode !== "off" && !jobSecretSet ? (
          <OpsNotice ok={false}>
            OPS_JOB_SECRET is not set, so the hourly worker cannot run. Use “Run
            due emails now”, or finish the setup.
          </OpsNotice>
        ) : null}
        {settings.mode !== "off" && tickAge !== null && tickAge > 2 ? (
          <OpsNotice ok={false}>
            The worker last ran {Math.round(tickAge)} hours ago.
          </OpsNotice>
        ) : null}
        {lastResult?.errors?.length ? (
          <OpsNotice ok={false}>
            Last run problems: {lastResult.errors.join("; ")}
          </OpsNotice>
        ) : null}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <OpsCard>
          <OpsSectionHeading
            title="Sending controls"
            description="The global pause stops every automated email at once, in any mode."
          />
          <div className="space-y-4 p-5 text-sm">
            <Form method="post" className="flex items-center gap-3">
              <Hidden values={{ intent: "pause" }} />
              {settings.global_pause ? null : (
                <input type="hidden" name="paused" value="on" />
              )}
              <Submit variant={settings.global_pause ? "primary" : "outline"}>
                {settings.global_pause
                  ? "Lift global pause"
                  : "Pause all automated sending"}
              </Submit>
            </Form>
            <Form method="post" className="flex flex-wrap items-center gap-3">
              <Hidden values={{ intent: "run-tick" }} />
              <Submit>Run due emails now</Submit>
              <span className="text-body-subtle">
                Last run:{" "}
                {settings.last_tick_at
                  ? formatDate(settings.last_tick_at, true)
                  : "never"}
              </span>
            </Form>
            {settings.mode === "test" ? (
              <Form method="post">
                <Hidden values={{ intent: "leave-test" }} />
                <Submit>End test: clear test overrides and switch off</Submit>
              </Form>
            ) : null}
          </div>
        </OpsCard>

        <OpsCard>
          <OpsSectionHeading
            title="care@ sender"
            description="Haven's Google Workspace mailbox, sending as the care@ alias. Replies land in her Gmail."
          />
          <div className="space-y-3 p-5 text-sm">
            {sender ? (
              <p>
                Connected {formatDate(sender.connected_at, true)} ·{" "}
                {sender.send_as_ok ? (
                  <strong>care@ send-as verified</strong>
                ) : (
                  <strong>care@ send-as not verified</strong>
                )}
                {sender.send_as_checked_at
                  ? ` (checked ${formatDate(sender.send_as_checked_at, true)})`
                  : ""}
              </p>
            ) : (
              <p>Not connected.</p>
            )}
            {viewer === CARE_SENDER_EMAIL ? (
              <a
                href="/ops/auth/google?connect=care_sender"
                className={opsTextLinkClass}
              >
                {sender ? "Reconnect" : "Connect"} Haven's Gmail for sending
              </a>
            ) : (
              <p className="text-body-subtle">
                Haven connects this herself, signed in as {CARE_SENDER_EMAIL}.
              </p>
            )}
            {sender ? (
              <div className="flex flex-wrap gap-2">
                <Form method="post">
                  <Hidden values={{ intent: "check-sender" }} />
                  <Submit>Check care@ send-as</Submit>
                </Form>
                <Form method="post">
                  <Hidden values={{ intent: "disconnect-sender" }} />
                  <Submit>Disconnect</Submit>
                </Form>
              </div>
            ) : null}
          </div>
        </OpsCard>

        <OpsCard className="lg:col-span-2">
          <OpsSectionHeading
            title="Mode, rules and schedule"
            description="Live rules can only be switched on in live mode with a sending hour. Turning CARE-01 on starts intake from that moment: existing orders are never enrolled automatically."
          />
          <Form method="post" className="grid gap-4 p-5 text-sm md:grid-cols-2">
            <Hidden
              values={{
                intent: "settings",
                updatedAt: settings.updated_at ?? "",
                businessDaysPresent: "1",
                liveRulesPresent: "1",
              }}
            />
            <OpsField label="Mode">
              <select
                name="mode"
                defaultValue={settings.mode}
                className={opsInputClass}
              >
                <option value="off">Off: nothing sends</option>
                <option value="test">Test: approved test orders only</option>
                <option value="live">Live: customer orders, by rule</option>
              </select>
            </OpsField>
            <fieldset className="space-y-1">
              <legend className="mb-1">Live rules</legend>
              {CARE_TEMPLATES.map((t) => (
                <label key={t.key} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    name={`live-${t.key}`}
                    defaultChecked={Boolean(
                      (settings.live_rules as Record<string, boolean>)[t.key],
                    )}
                  />
                  {t.key} {t.label}
                </label>
              ))}
              {settings.intake_started_at ? (
                <p className="text-body-subtle text-xs">
                  Intake started {formatDate(settings.intake_started_at, true)}
                </p>
              ) : null}
            </fieldset>
            <OpsField label="Business time zone">
              <input
                name="timezone"
                defaultValue={settings.timezone}
                className={opsInputClass}
              />
            </OpsField>
            <OpsField
              label="Sending hour (0 to 23, business time)"
              hint="Haven confirms before live. Blank: test sends any time."
            >
              <input
                name="sendHour"
                type="number"
                min={0}
                max={23}
                defaultValue={settings.send_hour ?? ""}
                className={opsInputClass}
              />
            </OpsField>
            <fieldset>
              <legend className="mb-1">Business days</legend>
              <div className="flex flex-wrap gap-3">
                {WEEKDAYS.map((d, i) => (
                  <label key={d} className="flex items-center gap-1">
                    <input
                      type="checkbox"
                      name="businessDays"
                      value={String(i + 1)}
                      defaultChecked={settings.business_days.includes(i + 1)}
                    />
                    {d}
                  </label>
                ))}
              </div>
            </fieldset>
            <OpsField
              label="Holidays (YYYY-MM-DD, one per line)"
              hint="No sends on these dates; nothing is assumed."
            >
              <textarea
                name="holidays"
                rows={3}
                defaultValue={settings.holidays.join("\n")}
                className={opsInputClass}
              />
            </OpsField>
            <OpsField
              label="Test order IDs"
              hint="The number in /ops/orders/<id>, not the #order number."
            >
              <input
                name="testOrderIds"
                defaultValue={settings.test_order_ids.join(" ")}
                className={opsInputClass}
              />
            </OpsField>
            <OpsField
              label="Test recipient allowlist"
              hint="Addresses Haven controls. Test sends can go nowhere else."
            >
              <input
                name="testRecipients"
                defaultValue={settings.test_recipients.join(" ")}
                className={opsInputClass}
              />
            </OpsField>
            <OpsField label="From display name">
              <input
                name="fromName"
                defaultValue={settings.from_name}
                className={opsInputClass}
              />
            </OpsField>
            <OpsField label="Reply-To">
              <input
                name="replyTo"
                defaultValue={settings.reply_to}
                className={opsInputClass}
              />
            </OpsField>
            <OpsField
              label="Not furniture: line items containing (one per line)"
              hint="An order needs at least one other line item to be enrolled. Haven confirms before live."
            >
              <textarea
                name="excludedItemPatterns"
                rows={3}
                defaultValue={settings.excluded_item_patterns.join("\n")}
                className={opsInputClass}
              />
            </OpsField>
            <div className="md:col-span-2">
              <Submit variant="primary">Save settings</Submit>
            </div>
          </Form>
        </OpsCard>

        <OpsCard className="lg:col-span-2">
          <OpsSectionHeading
            title="Exceptions"
            description="Held, failed, uncertain and in-flight emails, and open automation tasks. Nothing here is retried automatically."
          />
          {overview.exceptions.length === 0 &&
          overview.exceptionTasks.length === 0 ? (
            <p className="p-5 text-body-subtle text-sm">No exceptions.</p>
          ) : (
            <ul className="divide-y divide-line-subtle text-sm">
              {overview.exceptions.map((m) => (
                <MessageRow key={m.id} m={m} />
              ))}
              {overview.exceptionTasks.map((t) => (
                <li key={t.id} className="px-5 py-3">
                  <Link
                    to={`/ops/communications/${t.order_id}`}
                    className={opsTextLinkClass}
                  >
                    {t.order_name}
                  </Link>{" "}
                  · task: {t.title}
                </li>
              ))}
            </ul>
          )}
        </OpsCard>

        <OpsCard className="lg:col-span-2">
          <OpsSectionHeading
            title="Approved templates"
            description="Copy is imported from Haven's finalised Google Doc and stored as versions. Editing the Doc changes nothing until a new version is imported and approved here."
          />
          <div className="space-y-4 p-5 text-sm">
            {CARE_TEMPLATES.map(({ key }) => {
              const versions = overview.templates.filter((t) => t.key === key);
              return (
                <div key={key} className="space-y-2">
                  <h3 className="font-sans">
                    {key} {careTemplateLabel(key)}
                  </h3>
                  {versions.length === 0 ? (
                    <p className="text-body-subtle">No version imported.</p>
                  ) : (
                    versions.map((t) => (
                      <TemplatePreview key={t.version} t={t} />
                    ))
                  )}
                </div>
              );
            })}
            <details className="border border-line-subtle">
              <summary className="cursor-pointer px-4 py-2">
                Import a template version
              </summary>
              <Form
                method="post"
                className="space-y-3 border-line-subtle border-t p-4"
              >
                <Hidden values={{ intent: "import-template" }} />
                <OpsField label="Template">
                  <select name="key" className={opsInputClass}>
                    {CARE_TEMPLATES.map((t) => (
                      <option key={t.key} value={t.key}>
                        {t.key} {t.label}
                      </option>
                    ))}
                  </select>
                </OpsField>
                <OpsField
                  label="Paste the whole tab from the Doc"
                  hint="Everything before “Subject:” and any Trigger / Internal section is left out. Or fill Subject and Body below instead."
                >
                  <textarea name="export" rows={8} className={opsInputClass} />
                </OpsField>
                <OpsField label="Subject (optional, overrides the paste)">
                  <input name="subject" className={opsInputClass} />
                </OpsField>
                <OpsField label="Body (optional, overrides the paste)">
                  <textarea name="body" rows={6} className={opsInputClass} />
                </OpsField>
                <OpsField
                  label="Greeting when there is no first name"
                  hint="Haven's approved wording, for example “Hello,”."
                >
                  <input name="neutralGreeting" className={opsInputClass} />
                </OpsField>
                <OpsField label="Source Doc ID">
                  <input
                    name="sourceDocId"
                    defaultValue="1tpZM6RaDAcL6Pz_fUxEF4sP8XWHZy3o0blvsPM9cI60"
                    className={opsInputClass}
                  />
                </OpsField>
                <OpsField
                  label="Source version"
                  hint="The Doc's last-edited date or version name."
                >
                  <input
                    name="sourceRevision"
                    required
                    className={opsInputClass}
                  />
                </OpsField>
                <Submit>Import (not active until approved)</Submit>
              </Form>
            </details>
          </div>
        </OpsCard>

        <OpsCard>
          <OpsSectionHeading
            title="Blank logistics PDF"
            description="Haven's existing blank MODERNCRE8VE Delivery and Logistics form, attached to CARE-01 and CARE-02. Must be 2 pages."
          />
          <div className="space-y-3 p-5 text-sm">
            {pdfs.length === 0 ? (
              <p className="text-body-subtle">No PDF uploaded.</p>
            ) : (
              <ul className="space-y-2">
                {pdfs.map((a) => (
                  <li
                    key={a.version}
                    className="flex flex-wrap items-center gap-2"
                  >
                    <a
                      href={`/ops/care/pdf/${a.version}`}
                      target="_blank"
                      rel="noreferrer"
                      className={opsTextLinkClass}
                    >
                      v{a.version} {a.filename}
                    </a>
                    <span className="text-body-subtle">
                      {a.page_count} pages · {Math.round(a.byte_size / 1024)} KB
                      · {a.sha256.slice(0, 12)}
                    </span>
                    {a.active ? (
                      <StatusBadge label="Active">Active</StatusBadge>
                    ) : (
                      <Form method="post">
                        <Hidden
                          values={{
                            intent: "activate-asset",
                            kind: a.kind,
                            version: String(a.version),
                          }}
                        />
                        <Submit>Approve after opening it</Submit>
                      </Form>
                    )}
                  </li>
                ))}
              </ul>
            )}
            <Form
              method="post"
              encType="multipart/form-data"
              className="flex flex-wrap items-end gap-2"
            >
              <Hidden values={{ intent: "upload-pdf" }} />
              <input
                type="file"
                name="file"
                accept="application/pdf"
                required
                className={opsInputClass}
              />
              <Submit>Upload</Submit>
            </Form>
          </div>
        </OpsCard>

        <OpsCard>
          <OpsSectionHeading
            title="care@ signature"
            description="Gmail does not add its signature to emails sent through the API, so the hub adds this approved one exactly once."
          />
          <div className="space-y-3 p-5 text-sm">
            {signatures.map((a) => (
              <details key={a.version} className="border border-line-subtle">
                <summary className="cursor-pointer px-4 py-2">
                  v{a.version} · {a.source}{" "}
                  {a.active ? (
                    <StatusBadge label="Active">Active</StatusBadge>
                  ) : null}
                </summary>
                <div className="space-y-2 border-line-subtle border-t p-4">
                  <pre className="whitespace-pre-wrap font-serif">
                    {a.text_content}
                  </pre>
                  {a.active ? null : (
                    <Form method="post">
                      <Hidden
                        values={{
                          intent: "activate-asset",
                          kind: a.kind,
                          version: String(a.version),
                        }}
                      />
                      <Submit>Approve this signature</Submit>
                    </Form>
                  )}
                </div>
              </details>
            ))}
            {sender ? (
              <Form method="post">
                <Hidden values={{ intent: "signature-gmail" }} />
                <Submit>Copy care@'s signature from Gmail</Submit>
              </Form>
            ) : null}
            <details className="border border-line-subtle">
              <summary className="cursor-pointer px-4 py-2">
                Or paste the approved signature
              </summary>
              <Form
                method="post"
                className="space-y-3 border-line-subtle border-t p-4"
              >
                <Hidden values={{ intent: "signature-text" }} />
                <textarea
                  name="signature"
                  rows={5}
                  required
                  className={opsInputClass}
                />
                <Submit>Save signature version</Submit>
              </Form>
            </details>
          </div>
        </OpsCard>

        <OpsCard className="lg:col-span-2">
          <OpsSectionHeading title="Queued" />
          {overview.queued.length === 0 ? (
            <p className="p-5 text-body-subtle text-sm">Nothing queued.</p>
          ) : (
            <ul className="divide-y divide-line-subtle text-sm">
              {overview.queued.map((m) => (
                <MessageRow key={m.id} m={m} />
              ))}
            </ul>
          )}
        </OpsCard>

        <OpsCard className="lg:col-span-2">
          <OpsSectionHeading
            title="Recent activity"
            description="“Accepted by Gmail” means Gmail took the message; it is not proof of inbox delivery."
          />
          {overview.recent.length === 0 ? (
            <p className="p-5 text-body-subtle text-sm">No emails yet.</p>
          ) : (
            <ul className="divide-y divide-line-subtle text-sm">
              {overview.recent.map((m) => (
                <MessageRow key={m.id} m={m} actions={false} />
              ))}
            </ul>
          )}
        </OpsCard>
      </div>
      {navigation.state === "submitting" ? (
        <p className="mt-4 text-body-subtle text-sm">Working…</p>
      ) : null}
    </>
  );
}
