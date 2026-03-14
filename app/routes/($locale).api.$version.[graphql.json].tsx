import type { LoaderFunctionArgs } from "react-router";

const ALLOWED_VERSIONS = new Set([
  "2024-01",
  "2024-04",
  "2024-07",
  "2024-10",
  "2025-01",
  "2025-04",
  "unstable",
]);

export async function action({ params, context, request }: LoaderFunctionArgs) {
  // Validate API version to prevent URL manipulation
  if (!params.version || !ALLOWED_VERSIONS.has(params.version)) {
    return new Response("Invalid API version", { status: 400 });
  }

  // Only allow same-origin requests
  const origin = request.headers.get("Origin");
  const url = new URL(request.url);
  if (origin && origin !== url.origin) {
    return new Response("Forbidden", { status: 403 });
  }

  // Forward only safe headers
  const forwardHeaders = new Headers();
  const safeHeaders = ["content-type", "accept", "accept-language"];
  for (const name of safeHeaders) {
    const value = request.headers.get(name);
    if (value) {
      forwardHeaders.set(name, value);
    }
  }

  const response = await fetch(
    `https://${context.env.PUBLIC_CHECKOUT_DOMAIN}/api/${params.version}/graphql.json`,
    {
      method: "POST",
      body: request.body,
      headers: forwardHeaders,
    },
  );

  return new Response(response.body, {
    headers: new Headers(response.headers),
  });
}
