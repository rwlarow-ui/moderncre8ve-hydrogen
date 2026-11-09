import type { MoneyV2 } from "@shopify/hydrogen/storefront-api-types";
import clsx from "clsx";
import { type RefObject, useId, useState } from "react";
import { useFetcher, useRouteLoaderData } from "react-router";
import { Button } from "~/components/button";
import { HoneypotField, TurnstileWidget } from "~/components/turnstile-widget";
import type { RootLoader } from "~/root";
import type { PieceRequestApiPayload } from "~/routes/($locale).api.piece-request";

const inputClass = "h-12 w-full border border-line bg-white px-3 leading-tight";

function formatPrice(price?: MoneyV2 | null) {
  if (!price?.amount) {
    return "";
  }
  const amount = Number(price.amount);
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: price.currencyCode || "USD",
      maximumFractionDigits: amount % 1 === 0 ? 0 : 2,
    }).format(amount);
  } catch {
    return `${price.amount} ${price.currencyCode ?? ""}`.trim();
  }
}

/**
 * "Request this piece" in place of Add to Cart, for products tagged
 * `request-only`. The selected configuration travels with the request, which
 * becomes a Shopify customer tagged `piece-request` plus an owner email
 * (`/api/piece-request`). Nothing is charged or reserved.
 */
export function PieceRequest({
  product,
  variant,
  containerRef,
  buttonText = "Request this piece",
}: {
  product: { handle: string; title: string };
  variant?: { id?: string; title?: string; price?: MoneyV2 | null } | null;
  containerRef?: RefObject<HTMLDivElement | null>;
  buttonText?: string;
}) {
  const fetcher = useFetcher();
  const data = fetcher.data as PieceRequestApiPayload | undefined;
  const rootData = useRouteLoaderData<RootLoader>("root");
  const turnstileSiteKey = rootData?.turnstileSiteKey || "";
  const [turnstileToken, setTurnstileToken] = useState("");
  const [open, setOpen] = useState(false);
  const formId = useId();
  const submitted = fetcher.state === "idle" && data?.ok;
  const configuration =
    variant?.title && variant.title !== "Default Title" ? variant.title : "";

  return (
    <div ref={containerRef} id="piece-request" className="space-y-3 py-3">
      {submitted ? (
        <output className="block border border-line-subtle px-4 py-3 font-medium text-green-700">
          Thank you. We've received your request and will be in touch within two
          business days to confirm details and pricing.
        </output>
      ) : (
        <>
          <Button
            type="button"
            className="h-[54px] w-full uppercase"
            aria-expanded={open}
            aria-controls={formId}
            data-test="request-piece"
            onClick={() => setOpen((v) => !v)}
          >
            {buttonText}
          </Button>
          <p className="text-body-subtle text-sm">
            This piece is built on request. Send us your configuration and we'll
            confirm price, timing and delivery before anything is charged.
          </p>
          {open && (
            <fetcher.Form
              id={formId}
              method="POST"
              action="/api/piece-request"
              className="grid gap-3 sm:grid-cols-2"
            >
              <HoneypotField />
              <input
                type="hidden"
                name="cf-turnstile-response"
                value={turnstileToken}
              />
              <input
                type="hidden"
                name="productHandle"
                value={product.handle}
              />
              <input type="hidden" name="productTitle" value={product.title} />
              <input type="hidden" name="variantTitle" value={configuration} />
              <input
                type="hidden"
                name="variantPrice"
                value={formatPrice(variant?.price)}
              />
              {configuration && (
                <p className="text-sm sm:col-span-2">
                  <span className="font-semibold">Your selection:</span>{" "}
                  {configuration}
                </p>
              )}
              <input
                name="firstName"
                required
                autoComplete="given-name"
                placeholder="First name"
                aria-label="First name"
                className={inputClass}
              />
              <input
                name="lastName"
                required
                autoComplete="family-name"
                placeholder="Last name"
                aria-label="Last name"
                className={inputClass}
              />
              <input
                name="email"
                type="email"
                required
                autoComplete="email"
                placeholder="Email"
                aria-label="Email"
                className={inputClass}
              />
              <input
                name="phone"
                type="tel"
                autoComplete="tel"
                placeholder="Phone (optional)"
                aria-label="Phone (optional)"
                className={inputClass}
              />
              <input
                name="zip"
                autoComplete="postal-code"
                placeholder="Delivery ZIP code"
                aria-label="Delivery ZIP code"
                className={clsx(inputClass, "sm:col-span-2")}
              />
              <textarea
                name="details"
                rows={3}
                placeholder="Anything else? Finish, timing, room size…"
                aria-label="Notes"
                className={clsx(inputClass, "h-auto py-3 sm:col-span-2")}
              />
              {turnstileSiteKey && (
                <TurnstileWidget
                  siteKey={turnstileSiteKey}
                  onVerify={setTurnstileToken}
                  onExpire={() => setTurnstileToken("")}
                  size="compact"
                  appearance="interaction-only"
                  className="sm:col-span-2"
                />
              )}
              <Button
                type="submit"
                className="h-[54px] uppercase sm:col-span-2"
                loading={fetcher.state === "submitting"}
              >
                Send request
              </Button>
              {fetcher.state === "idle" && data && !data.ok && (
                <div className="font-medium text-red-700 sm:col-span-2">
                  {data.errorMessage ||
                    "Something went wrong. Please try again."}
                </div>
              )}
            </fetcher.Form>
          )}
        </>
      )}
    </div>
  );
}
