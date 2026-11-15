import clsx from "clsx";
import { type RefObject, useId, useState } from "react";
import { useFetcher, useRouteLoaderData } from "react-router";
import { Button } from "~/components/button";
import type { SectionProps } from "~/components/section";
import { Section, sectionSettings } from "~/components/section";
import { HoneypotField, TurnstileWidget } from "~/components/turnstile-widget";
import { createSchema } from "~/page-builder";
import type { RootLoader } from "~/root";
import type { ContactApiPayload } from "~/routes/($locale).api.contact";
import { CONTACT_TOPICS } from "~/utils/contact-topics";

type ContactFormProps = SectionProps & {
  heading: string;
  intro: string;
  buttonText: string;
  successText: string;
};

const inputClass = "h-12 w-full border border-line bg-white px-3 leading-tight";
const labelClass = "mb-1 block text-sm font-medium";

const ContactForm = ({
  ref,
  heading = "Send Us a Message",
  intro = "Questions about a piece, a custom order or a delivery? Send us a note and we'll reply within one business day.",
  buttonText = "Send Message",
  successText = "Thank you. We've received your message and will be in touch shortly.",
  children: _children,
  ...rest
}: ContactFormProps & { ref?: RefObject<HTMLElement | null> }) => {
  const fetcher = useFetcher();
  const data = fetcher.data as ContactApiPayload | undefined;
  const rootData = useRouteLoaderData<RootLoader>("root");
  const turnstileSiteKey = rootData?.turnstileSiteKey || "";
  const [turnstileToken, setTurnstileToken] = useState("");
  const id = useId();
  const submitted = fetcher.state === "idle" && data?.ok;
  // With a site key configured, hold the submit until the challenge has passed.
  const awaitingVerification = Boolean(turnstileSiteKey) && !turnstileToken;

  return (
    <Section ref={ref} {...rest}>
      <div className="mx-auto w-full max-w-[720px]">
        <h2 className="mb-3 text-center">{heading}</h2>
        <p className="mb-8 text-center text-body-subtle">{intro}</p>
        {submitted ? (
          <div role="status" className="text-center font-medium text-green-700">
            {successText}
          </div>
        ) : (
          <fetcher.Form
            method="POST"
            action="/api/contact"
            className="grid gap-4 sm:grid-cols-2"
          >
            <HoneypotField />
            <input
              type="hidden"
              name="cf-turnstile-response"
              value={turnstileToken}
            />
            <div>
              <label htmlFor={`${id}-first`} className={labelClass}>
                First name
              </label>
              <input
                id={`${id}-first`}
                name="firstName"
                required
                maxLength={80}
                autoComplete="given-name"
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor={`${id}-last`} className={labelClass}>
                Last name
              </label>
              <input
                id={`${id}-last`}
                name="lastName"
                required
                maxLength={80}
                autoComplete="family-name"
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor={`${id}-email`} className={labelClass}>
                Email
              </label>
              <input
                id={`${id}-email`}
                name="email"
                type="email"
                required
                maxLength={254}
                autoComplete="email"
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor={`${id}-phone`} className={labelClass}>
                Phone (optional)
              </label>
              <input
                id={`${id}-phone`}
                name="phone"
                type="tel"
                maxLength={40}
                autoComplete="tel"
                className={inputClass}
              />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor={`${id}-topic`} className={labelClass}>
                What can we help with?
              </label>
              <select
                id={`${id}-topic`}
                name="topic"
                defaultValue={CONTACT_TOPICS[0]}
                className={inputClass}
              >
                {CONTACT_TOPICS.map((topic) => (
                  <option key={topic} value={topic}>
                    {topic}
                  </option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label htmlFor={`${id}-message`} className={labelClass}>
                Message
              </label>
              <textarea
                id={`${id}-message`}
                name="message"
                required
                minLength={10}
                maxLength={4000}
                rows={6}
                className={clsx(inputClass, "h-auto py-3")}
              />
            </div>
            {turnstileSiteKey && (
              <TurnstileWidget
                siteKey={turnstileSiteKey}
                onVerify={setTurnstileToken}
                onExpire={() => setTurnstileToken("")}
                onError={() => setTurnstileToken("")}
                appearance="always"
                className="sm:col-span-2"
              />
            )}
            <Button
              type="submit"
              className="h-[54px] sm:col-span-2"
              loading={fetcher.state === "submitting"}
              disabled={awaitingVerification || fetcher.state !== "idle"}
            >
              {buttonText}
            </Button>
            {fetcher.state === "idle" && data && !data.ok && (
              <div
                role="alert"
                className="text-center font-medium text-red-700 sm:col-span-2"
              >
                {data.errorMessage || "Something went wrong. Please try again."}
              </div>
            )}
          </fetcher.Form>
        )}
      </div>
    </Section>
  );
};

export default ContactForm;

export const schema = createSchema({
  type: "contact-form",
  title: "Contact form",
  settings: [
    ...sectionSettings,
    {
      group: "Form",
      inputs: [
        {
          type: "text",
          name: "heading",
          label: "Heading",
          defaultValue: "Send Us a Message",
        },
        {
          type: "textarea",
          name: "intro",
          label: "Intro",
          defaultValue:
            "Questions about a piece, a custom order or a delivery? Send us a note and we'll reply within one business day.",
        },
        {
          type: "text",
          name: "buttonText",
          label: "Button text",
          defaultValue: "Send Message",
        },
        {
          type: "text",
          name: "successText",
          label: "Success message",
          defaultValue:
            "Thank you. We've received your message and will be in touch shortly.",
        },
      ],
    },
  ],
});
