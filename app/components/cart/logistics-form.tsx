import { CartForm } from "@shopify/hydrogen";
import { useEffect, useState } from "react";
import { useFetcher } from "react-router";
import { Button } from "~/components/button";
import {
  DWELLING_OPTIONS,
  ELEVATOR_OPTIONS,
  readLogistics,
  STAIRS_OPTIONS,
} from "~/utils/logistics";

type Attribute = { key: string; value?: string | null };

const FIELD_CLASS =
  "w-full border border-line bg-white p-3 text-[#918379] focus:border-gray-500 focus:outline-none";

function Field({
  label,
  error,
  hint,
  children,
}: {
  label: string;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="font-medium">{label}</span>
      {children}
      {hint && !error && <span className="text-[#918379] text-xs">{hint}</span>}
      {error && (
        <span role="alert" className="text-red-700 text-xs">
          {error}
        </span>
      )}
    </label>
  );
}

/**
 * Delivery & logistics details required before checkout (ADR-0001).
 * Saved server-side as cart attributes through the cart route's
 * `CustomLogisticsUpdate` action, which re-validates every field.
 */
export function LogisticsForm({ attributes }: { attributes: Attribute[] }) {
  const fetcher = useFetcher<{ fieldErrors?: Record<string, string> }>();
  const saved = readLogistics(attributes);
  const [later, setLater] = useState(saved.status === "later");
  const [stairs, setStairs] = useState(saved.value?.stairs ?? "");
  const [open, setOpen] = useState(saved.status !== "complete");

  const busy = fetcher.state !== "idle";
  const errors = fetcher.data?.fieldErrors ?? {};
  const defaults = saved.value ?? {};

  // Collapse once a successful save has come back.
  useEffect(() => {
    if (
      fetcher.state === "idle" &&
      fetcher.data &&
      !fetcher.data.fieldErrors &&
      saved.status !== "none"
    ) {
      setOpen(false);
    }
  }, [fetcher.state, fetcher.data, saved.status]);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const logistics: Record<string, string | boolean> = { later };
    if (!later) {
      for (const [key, value] of form.entries()) {
        logistics[key] = String(value);
      }
    }
    fetcher.submit(
      {
        [CartForm.INPUT_NAME]: JSON.stringify({
          action: "CustomLogisticsUpdate",
          inputs: { logistics },
        }),
      },
      { method: "POST", action: "/cart" },
    );
  }

  const status =
    saved.status === "complete"
      ? "Delivery details saved"
      : saved.status === "later"
        ? "Delivery details: to be provided after you order"
        : "Delivery details required";

  return (
    <section
      className="flex flex-col gap-4 bg-white p-6"
      aria-labelledby="logistics-heading"
      data-test="logistics-form"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 id="logistics-heading" className="font-semibold text-xl">
            Delivery details
          </h2>
          <p
            className={
              saved.status === "none" ? "text-red-700 text-sm" : "text-sm"
            }
            data-test="logistics-status"
          >
            {status}
          </p>
        </div>
        {saved.status !== "none" && (
          <button
            type="button"
            className="text-sm underline"
            aria-expanded={open}
            onClick={() => setOpen((value) => !value)}
          >
            {open ? "Hide" : "Edit"}
          </button>
        )}
      </div>

      <details className="text-sm">
        <summary className="cursor-pointer underline">Why we ask</summary>
        <p className="mt-2 text-[#918379]">
          Every piece is handcrafted to order and delivered white glove, with
          in-home assembly. Our builders and delivery team need to know about
          stairs, elevators, and the narrowest doorway and hallway to plan the
          build and make sure your piece fits through the door. Not sure yet?
          Choose “I'll provide this after I order” and we'll follow up.
        </p>
      </details>

      {open && (
        <form className="grid gap-4 sm:grid-cols-2" onSubmit={handleSubmit}>
          <label className="flex items-center gap-2 text-sm sm:col-span-2">
            <input
              type="checkbox"
              checked={later}
              onChange={(e) => setLater(e.target.checked)}
            />
            I'll provide this after I order
          </label>

          {!later && (
            <>
              <Field label="Type of home" error={errors.dwelling}>
                <select
                  name="dwelling"
                  className={FIELD_CLASS}
                  defaultValue={defaults.dwelling ?? ""}
                >
                  <option value="" disabled>
                    Select…
                  </option>
                  {DWELLING_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Phone for the delivery team" error={errors.phone}>
                <input
                  name="phone"
                  type="tel"
                  autoComplete="tel"
                  className={FIELD_CLASS}
                  defaultValue={defaults.phone ?? ""}
                />
              </Field>
              <div className="sm:col-span-2">
                <Field label="Delivery address" error={errors.address1}>
                  <input
                    name="address1"
                    autoComplete="address-line1"
                    className={FIELD_CLASS}
                    defaultValue={defaults.address1 ?? ""}
                  />
                </Field>
              </div>
              <div className="sm:col-span-2">
                <Field label="Apartment, suite, etc. (optional)">
                  <input
                    name="address2"
                    autoComplete="address-line2"
                    className={FIELD_CLASS}
                    defaultValue={defaults.address2 ?? ""}
                  />
                </Field>
              </div>
              <Field label="City" error={errors.city}>
                <input
                  name="city"
                  autoComplete="address-level2"
                  className={FIELD_CLASS}
                  defaultValue={defaults.city ?? ""}
                />
              </Field>
              <div className="grid grid-cols-2 gap-4">
                <Field label="State" error={errors.state}>
                  <input
                    name="state"
                    maxLength={2}
                    autoComplete="address-level1"
                    className={FIELD_CLASS}
                    defaultValue={defaults.state ?? ""}
                  />
                </Field>
                <Field label="ZIP" error={errors.zip}>
                  <input
                    name="zip"
                    inputMode="numeric"
                    autoComplete="postal-code"
                    className={FIELD_CLASS}
                    defaultValue={defaults.zip ?? ""}
                  />
                </Field>
              </div>
              <Field label="Stairs to the delivery room" error={errors.stairs}>
                <select
                  name="stairs"
                  className={FIELD_CLASS}
                  value={stairs}
                  onChange={(e) => setStairs(e.target.value)}
                >
                  <option value="" disabled>
                    Select…
                  </option>
                  {STAIRS_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Elevator" error={errors.elevator}>
                <select
                  name="elevator"
                  className={FIELD_CLASS}
                  defaultValue={defaults.elevator ?? ""}
                >
                  <option value="" disabled>
                    Select…
                  </option>
                  {ELEVATOR_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field
                label="Narrowest doorway (inches)"
                error={errors.doorwayWidthIn}
                hint="Measure the clear opening, door open."
              >
                <input
                  name="doorwayWidthIn"
                  inputMode="decimal"
                  className={FIELD_CLASS}
                  defaultValue={defaults.doorwayWidthIn ?? ""}
                />
              </Field>
              <Field
                label="Narrowest hallway (inches)"
                error={errors.hallwayWidthIn}
              >
                <input
                  name="hallwayWidthIn"
                  inputMode="decimal"
                  className={FIELD_CLASS}
                  defaultValue={defaults.hallwayWidthIn ?? ""}
                />
              </Field>
              {stairs && stairs !== "none" && (
                <Field
                  label="Stairwell width (inches)"
                  error={errors.stairwellWidthIn}
                >
                  <input
                    name="stairwellWidthIn"
                    inputMode="decimal"
                    className={FIELD_CLASS}
                    defaultValue={defaults.stairwellWidthIn ?? ""}
                  />
                </Field>
              )}
              <div className="sm:col-span-2">
                <Field
                  label="Anything else we should know? (optional)"
                  hint="Gate codes, tight turns, parking, pets."
                >
                  <textarea
                    name="notes"
                    rows={3}
                    maxLength={300}
                    className={FIELD_CLASS}
                    defaultValue={defaults.notes ?? ""}
                  />
                </Field>
              </div>
            </>
          )}

          <div className="sm:col-span-2">
            <Button type="submit" loading={busy} disabled={busy}>
              Save delivery details
            </Button>
          </div>
        </form>
      )}
    </section>
  );
}
