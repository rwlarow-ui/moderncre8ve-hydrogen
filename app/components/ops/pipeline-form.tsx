import { Form, useNavigation } from "react-router";
import { Button } from "~/components/button";
import {
  formatDate,
  OpsField,
  opsInputClass,
} from "~/components/ops/ops-shell";
import { OPS_TASK_OWNERS } from "~/utils/ops-pipeline";

/** A date-only value, or "Unknown". */
export function Dated({ value }: { value: string | null | undefined }) {
  return value ? (
    formatDate(`${value.slice(0, 10)}T12:00:00Z`)
  ) : (
    <span className="text-body-subtle">Unknown</span>
  );
}

export function formatUsd(value: number | string | null | undefined) {
  if (value === null || value === undefined || value === "") {
    return "—";
  }
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(Number(value));
}

export const ownerName = (email: string, viewer?: string) =>
  email === viewer ? "you" : email.split("@")[0];

export function Hidden({ values }: { values: Record<string, string> }) {
  return (
    <>
      {Object.entries(values).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}
    </>
  );
}

/** A collapsed form, so a page of actions stays scannable. */
export function ActionForm({
  title,
  intent,
  updatedAt,
  hidden = {},
  submit,
  open = false,
  children,
}: {
  title: string;
  intent: string;
  updatedAt?: string;
  hidden?: Record<string, string>;
  submit: string;
  open?: boolean;
  children?: React.ReactNode;
}) {
  const navigation = useNavigation();
  return (
    <details className="border border-line-subtle" open={open}>
      <summary className="cursor-pointer px-4 py-2 text-sm">{title}</summary>
      <Form method="post" className="space-y-3 border-line-subtle border-t p-4">
        <Hidden
          values={{ intent, ...(updatedAt ? { updatedAt } : {}), ...hidden }}
        />
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

export function DateInput({
  label,
  name,
  hint = "Leave blank if you don't know the exact date.",
  defaultValue,
}: {
  label: string;
  name: string;
  hint?: string;
  defaultValue?: string | null;
}) {
  return (
    <OpsField label={label} hint={hint}>
      <input
        type="date"
        name={name}
        defaultValue={defaultValue ?? ""}
        className={opsInputClass}
      />
    </OpsField>
  );
}

export function LinkInput({
  label = "Gmail or file link",
  name = "evidenceUrl",
}: {
  label?: string;
  name?: string;
}) {
  return (
    <OpsField
      label={label}
      hint="Optional. Paste the Gmail message link or a Drive link."
    >
      <input
        type="url"
        name={name}
        placeholder="https://"
        className={opsInputClass}
      />
    </OpsField>
  );
}

export function Choice({
  label,
  name,
  options,
  defaultValue,
}: {
  label: string;
  name: string;
  options: { id: string; label: string }[];
  defaultValue?: string;
}) {
  return (
    <OpsField label={label}>
      <select name={name} defaultValue={defaultValue} className={opsInputClass}>
        {options.map((option) => (
          <option key={option.id} value={option.id}>
            {option.label}
          </option>
        ))}
      </select>
    </OpsField>
  );
}

export function OwnerChoice({
  label = "Owner",
  defaultValue,
}: {
  label?: string;
  defaultValue?: string;
}) {
  return (
    <Choice
      label={label}
      name="ownerEmail"
      defaultValue={defaultValue}
      options={OPS_TASK_OWNERS.map((email) => ({
        id: email,
        label: email.split("@")[0],
      }))}
    />
  );
}
