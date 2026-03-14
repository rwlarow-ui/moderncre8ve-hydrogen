import type { ActionFunction, ActionFunctionArgs } from "react-router";
import { data } from "react-router";
import type { CustomerCreateMutation } from "storefront-api.generated";
import { verifyTurnstile } from "~/utils/turnstile.server";

const CUSTOMER_CREATE = `#graphql
  mutation customerCreate($input: CustomerCreateInput!) {
    customerCreate(input: $input) {
      customer {
        firstName
        lastName
        email
        phone
        acceptsMarketing
      }
      customerUserErrors {
        field
        message
        code
      }
    }
  }
` as const;

export const action: ActionFunction = async ({
  request,
  context,
}: ActionFunctionArgs) => {
  const formData = await request.formData();

  // --- Honeypot check ---
  // The "website" field is hidden from real users. If it has a value, it's a bot.
  const honeypot = formData.get("website") as string;
  if (honeypot) {
    // Silently return success to the bot (don't reveal we caught them)
    return data({ ok: true, customer: null }, { status: 201 });
  }

  // --- Turnstile verification ---
  const turnstileToken = formData.get("cf-turnstile-response") as string;
  const turnstileSecret = context.env?.TURNSTILE_SECRET_KEY;
  const clientIp = request.headers.get("CF-Connecting-IP") || undefined;

  const turnstileValid = await verifyTurnstile(
    turnstileToken,
    turnstileSecret,
    clientIp,
  );

  if (!turnstileValid) {
    return data(
      {
        errors: [{ field: "turnstile", message: "Verification failed" }],
        errorMessage:
          "Please complete the verification challenge and try again.",
        ok: false,
      },
      { status: 400 },
    );
  }

  // --- Create customer ---
  const email = formData.get("email") as string;
  const { customerCreate, errors: queryErrors } =
    await context.storefront.mutate<CustomerCreateMutation>(CUSTOMER_CREATE, {
      variables: {
        input: { email, password: crypto.randomUUID() },
      },
    });

  const customer = customerCreate?.customer;
  const customerUserErrors = customerCreate?.customerUserErrors;

  if (queryErrors?.length) {
    return data(
      {
        errors: queryErrors,
        errorMessage: "Internal server error!",
        ok: false,
      },
      { status: 500 },
    );
  }
  if (customerUserErrors?.length) {
    return data(
      {
        errors: customerUserErrors,
        errorMessage: customerUserErrors?.[0]?.message,
        ok: false,
      },
      { status: 500 },
    );
  }
  if (customer) {
    return data({ customer, ok: true }, { status: 201 });
  }
  return data(
    {
      errorMessage: "Something went wrong! Please try again later.",
      ok: false,
    },
    { status: 500 },
  );
};

export interface CustomerApiPlayLoad {
  ok: boolean;
  customer?:
    | NonNullable<CustomerCreateMutation["customerCreate"]>["customer"]
    | null;
  errors?: any[];
  errorMessage?: string;
}
