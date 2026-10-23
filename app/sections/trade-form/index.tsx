import clsx from "clsx";
import { type RefObject, useState } from "react";
import { useFetcher, useRouteLoaderData } from "react-router";
import { Button } from "~/components/button";
import type { SectionProps } from "~/components/section";
import { Section, sectionSettings } from "~/components/section";
import { HoneypotField, TurnstileWidget } from "~/components/turnstile-widget";
import { createSchema } from "~/page-builder";
import type { RootLoader } from "~/root";
import type { TradeApiPayload } from "~/routes/($locale).api.trade";

type TradeFormProps = SectionProps & {
  heading: string;
  intro: string;
  buttonText: string;
  successText: string;
};

const inputClass = "h-12 w-full border border-line bg-white px-3 leading-tight";

const TradeForm = ({
  ref,
  heading = "Apply for Trade Pricing",
  intro = "Interior designers, architects and hospitality buyers receive trade pricing on custom tables and volume seating. Tell us about your studio and we'll be in touch within two business days.",
  buttonText = "Submit Application",
  successText = "Thank you. We've received your application and will be in touch shortly.",
  children: _children,
  ...rest
}: TradeFormProps & { ref?: RefObject<HTMLElement | null> }) => {
  const fetcher = useFetcher();
  const data = fetcher.data as TradeApiPayload | undefined;
  const rootData = useRouteLoaderData<RootLoader>("root");
  const turnstileSiteKey = rootData?.turnstileSiteKey || "";
  const [turnstileToken, setTurnstileToken] = useState("");
  const submitted = fetcher.state === "idle" && data?.ok;

  return (
    <Section ref={ref} {...rest}>
      <div className="mx-auto w-full max-w-[720px]">
        <h2 className="mb-3 text-center">{heading}</h2>
        <p className="mb-8 text-center text-body-subtle">{intro}</p>
        {submitted ? (
          <div className="text-center font-medium text-green-700">
            {successText}
          </div>
        ) : (
          <fetcher.Form
            method="POST"
            action="/api/trade"
            className="grid gap-4 sm:grid-cols-2"
          >
            <HoneypotField />
            <input
              type="hidden"
              name="cf-turnstile-response"
              value={turnstileToken}
            />
            <input
              name="firstName"
              required
              autoComplete="given-name"
              placeholder="First name"
              className={inputClass}
            />
            <input
              name="lastName"
              required
              autoComplete="family-name"
              placeholder="Last name"
              className={inputClass}
            />
            <input
              name="email"
              type="email"
              required
              autoComplete="email"
              placeholder="Email"
              className={inputClass}
            />
            <input
              name="phone"
              type="tel"
              autoComplete="tel"
              placeholder="Phone (optional)"
              className={inputClass}
            />
            <input
              name="business"
              required
              autoComplete="organization"
              placeholder="Studio or business name"
              className={inputClass}
            />
            <input
              name="role"
              placeholder="Your role (e.g. interior designer)"
              className={inputClass}
            />
            <input
              name="website"
              type="url"
              placeholder="Website or portfolio (optional)"
              className={clsx(inputClass, "sm:col-span-2")}
            />
            <textarea
              name="details"
              rows={4}
              placeholder="Tell us about your projects"
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
              className="h-[54px] sm:col-span-2"
              loading={fetcher.state === "submitting"}
            >
              {buttonText}
            </Button>
            {fetcher.state === "idle" && data && !data.ok && (
              <div className="text-center font-medium text-red-700 sm:col-span-2">
                {data.errorMessage || "Something went wrong. Please try again."}
              </div>
            )}
          </fetcher.Form>
        )}
      </div>
    </Section>
  );
};

export default TradeForm;

export const schema = createSchema({
  type: "trade-form",
  title: "Trade application form",
  settings: [
    ...sectionSettings,
    {
      group: "Form",
      inputs: [
        {
          type: "text",
          name: "heading",
          label: "Heading",
          defaultValue: "Apply for Trade Pricing",
        },
        {
          type: "textarea",
          name: "intro",
          label: "Intro",
          defaultValue:
            "Interior designers, architects and hospitality buyers receive trade pricing on custom tables and volume seating. Tell us about your studio and we'll be in touch within two business days.",
        },
        {
          type: "text",
          name: "buttonText",
          label: "Button text",
          defaultValue: "Submit Application",
        },
        {
          type: "text",
          name: "successText",
          label: "Success message",
          defaultValue:
            "Thank you. We've received your application and will be in touch shortly.",
        },
      ],
    },
  ],
});
