/** Server-only persistence. No database credentials are returned to the browser. */
export function hasOpsStore(env) {
  return Boolean(env.OPS_SUPABASE_URL && env.OPS_SUPABASE_SECRET_KEY);
}

/** @param {any} env @param {string} path @param {{method?: string, body?: any}} options @returns {Promise<any>} */
export async function opsStore(env, path, { method = "GET", body } = {}) {
  if (!hasOpsStore(env))
    throw new Error("The Ops database is not connected yet.");
  const base = new URL(env.OPS_SUPABASE_URL);
  if (base.protocol !== "https:")
    throw new Error("The Ops database requires HTTPS.");
  const response = await fetch(new URL(`/rest/v1/${path}`, base), {
    method,
    headers: {
      apikey: env.OPS_SUPABASE_SECRET_KEY,
      // The new Supabase secret key is opaque, not a JWT.
      ...(env.OPS_SUPABASE_SECRET_KEY.startsWith("eyJ")
        ? { Authorization: `Bearer ${env.OPS_SUPABASE_SECRET_KEY}` }
        : {}),
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    cache: "no-store",
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) {
    // Database error bodies can contain private document content.
    throw new Error(
      response.status === 409
        ? "This record changed. Read the current revision and retry."
        : `Ops storage request failed (${response.status}).`,
    );
  }
  return response.status === 204 ? null : response.json();
}

export const opsRpc = (env, name, body) =>
  opsStore(env, `rpc/${name}`, { method: "POST", body });

export const privateHeaders = {
  "Cache-Control": "private, no-store",
  "X-Robots-Tag": "noindex, nofollow",
};

export async function readOpsJson(request, maxBytes = 200_000) {
  if (!request.headers.get("Content-Type")?.startsWith("application/json")) {
    throw new Response("Expected application/json", { status: 415 });
  }
  const text = await readOpsText(request, maxBytes);
  try {
    return JSON.parse(text);
  } catch {
    throw new Response("Invalid JSON", { status: 400 });
  }
}
export async function readOpsText(request, maxBytes = 8000) {
  const reader = request.body?.getReader();
  if (!reader) throw new Response("Missing request body", { status: 400 });
  const chunks = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.length;
    if (total > maxBytes) {
      await reader.cancel();
      throw new Response("Request is too large", { status: 413 });
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.length;
  }
  return new TextDecoder().decode(bytes);
}
