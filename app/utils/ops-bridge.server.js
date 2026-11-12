import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import {
  listContext,
  publishContext,
  withdrawContext,
} from "./ops-context.server.js";
import {
  allowedIdentity,
  hashSecret,
  opsOrigin,
  pkceChallenge,
  randomSecret,
} from "./ops-identity.server.js";
import {
  opsRpc,
  opsStore,
  privateHeaders,
  readOpsJson,
  readOpsText,
} from "./ops-store.server.js";

export const BRIDGE_SCOPES = ["context:read", "context:publish"];
export const bridgeResource = (env) => `${opsOrigin(env)}/ops/bridge/mcp`;
export function bridgeMetadata(env) {
  const origin = opsOrigin(env);
  return {
    issuer: origin,
    authorization_endpoint: `${origin}/ops/bridge/authorize`,
    token_endpoint: `${origin}/ops/bridge/token`,
    registration_endpoint: `${origin}/ops/bridge/register`,
    revocation_endpoint: `${origin}/ops/bridge/revoke`,
    response_types_supported: ["code"],
    grant_types_supported: ["authorization_code", "refresh_token"],
    code_challenge_methods_supported: ["S256"],
    token_endpoint_auth_methods_supported: ["none"],
    scopes_supported: BRIDGE_SCOPES,
  };
}
export function validRedirect(uri) {
  try {
    const url = new URL(uri);
    return (
      !url.hash &&
      !url.username &&
      !url.password &&
      (url.protocol === "https:" ||
        (url.protocol === "http:" &&
          ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)))
    );
  } catch {
    return false;
  }
}
export async function registerBridgeClient(request, env) {
  const value = await readOpsJson(request, 8000);
  const uris = value.redirect_uris;
  if (
    !Array.isArray(uris) ||
    !uris.length ||
    uris.length > 5 ||
    uris.some(
      (uri) =>
        typeof uri !== "string" || uri.length > 1000 || !validRedirect(uri),
    ) ||
    (value.token_endpoint_auth_method &&
      value.token_endpoint_auth_method !== "none")
  ) {
    return Response.json(
      { error: "invalid_client_metadata" },
      { status: 400, headers: privateHeaders },
    );
  }
  const [client] = await opsStore(env, "ops_bridge_clients", {
    method: "POST",
    body: {
      name: String(value.client_name || "Claude connector").slice(0, 120),
      redirect_uris: uris,
    },
  });
  return Response.json(
    {
      client_id: client.id,
      client_name: client.name,
      redirect_uris: uris,
      token_endpoint_auth_method: "none",
      grant_types: ["authorization_code", "refresh_token"],
      response_types: ["code"],
    },
    { status: 201, headers: privateHeaders },
  );
}
export async function validateAuthorization(env, params) {
  const clientId = params.get("client_id") || "";
  if (!/^[a-f0-9-]{36}$/i.test(clientId))
    throw new Response("Unknown client", { status: 400 });
  const [client] = await opsStore(
    env,
    `ops_bridge_clients?id=eq.${clientId}&select=id,name,redirect_uris&limit=1`,
  );
  const redirectUri = params.get("redirect_uri");
  const challenge = params.get("code_challenge") || "";
  const scopes = [
    ...new Set(
      (params.get("scope") || "context:read context:publish")
        .split(" ")
        .filter(Boolean),
    ),
  ];
  if (
    !client ||
    !client.redirect_uris.includes(redirectUri) ||
    params.get("response_type") !== "code" ||
    params.get("code_challenge_method") !== "S256" ||
    !/^[A-Za-z0-9_-]{43}$/.test(challenge) ||
    params.get("resource") !== bridgeResource(env) ||
    !scopes.length ||
    scopes.some((s) => !BRIDGE_SCOPES.includes(s))
  )
    throw new Response("Invalid authorization request", { status: 400 });
  const state = params.get("state") || "";
  if (state.length > 512)
    throw new Response("State is too long", { status: 400 });
  return {
    client: { id: client.id, name: client.name },
    redirectUri,
    challenge,
    scopes,
    state,
    resource: bridgeResource(env),
  };
}
export async function exchangeBridgeToken(request, env) {
  if (Number(request.headers.get("Content-Length")) > 8000)
    return Response.json({ error: "invalid_request" }, { status: 400 });
  const raw = await readOpsText(request, 8000);
  if (raw.length > 8000)
    return Response.json({ error: "invalid_request" }, { status: 400 });
  const form = new URLSearchParams(raw);
  const grant = form.get("grant_type");
  const clientId = form.get("client_id") || "";
  const verifier = form.get("code_verifier") || "";
  const credential =
    grant === "authorization_code"
      ? form.get("code")
      : form.get("refresh_token");
  if (
    !["authorization_code", "refresh_token"].includes(grant) ||
    !/^[a-f0-9-]{36}$/i.test(clientId) ||
    !credential ||
    credential.length > 200 ||
    form.get("resource") !== bridgeResource(env) ||
    (grant === "authorization_code" &&
      !/^[A-Za-z0-9._~-]{43,128}$/.test(verifier))
  )
    return Response.json(
      { error: "invalid_grant" },
      { status: 400, headers: privateHeaders },
    );
  try {
    const access = randomSecret();
    const refresh = randomSecret();
    const identity = await opsRpc(env, "ops_exchange_bridge_token", {
      p_grant: grant,
      p_hash: await hashSecret(credential),
      p_client_id: clientId,
      p_redirect_uri: form.get("redirect_uri") || "",
      p_challenge:
        grant === "authorization_code" ? await pkceChallenge(verifier) : "",
      p_resource: bridgeResource(env),
      p_access_hash: await hashSecret(access),
      p_refresh_hash: await hashSecret(refresh),
    });
    if (identity.error) throw new Error("Invalid grant");
    return Response.json(
      {
        access_token: access,
        refresh_token: refresh,
        token_type: "Bearer",
        expires_in: 3600,
        scope: identity.scope,
      },
      { headers: privateHeaders },
    );
  } catch {
    return Response.json(
      { error: "invalid_grant" },
      { status: 400, headers: privateHeaders },
    );
  }
}
export async function bridgeIdentity(request, env) {
  const value = request.headers
    .get("Authorization")
    ?.match(/^Bearer ([A-Za-z0-9-]{72})$/)?.[1];
  if (value) {
    const [token] = await opsStore(
      env,
      `ops_bridge_tokens?access_hash=eq.${await hashSecret(value)}&access_expires_at=gt.${encodeURIComponent(new Date().toISOString())}&select=user_email,scope,resource&limit=1`,
    );
    const user = allowedIdentity(token?.user_email);
    if (user && token.resource === bridgeResource(env))
      return { user, scopes: token.scope.split(" ") };
  }
  throw new Response("Unauthorized", {
    status: 401,
    headers: {
      ...privateHeaders,
      "WWW-Authenticate": `Bearer resource_metadata="${opsOrigin(env)}/.well-known/oauth-protected-resource/ops/bridge/mcp"`,
    },
  });
}
const sourceProperty = {
  type: "string",
  description:
    "An exact sourceId returned by list_context. Private sources are only available to their owner.",
};
export const BRIDGE_TOOLS = [
  {
    name: "list_context",
    description:
      "Read permitted context documents and their current revisions. Read before publishing. Initial summaries are dated seeds, not current full artifacts.",
    inputSchema: {
      type: "object",
      properties: {},
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true },
  },
  {
    name: "publish_context",
    description:
      "Publish an updated full text/Markdown export to its registered Ops source. Requires a current expectedRevision. Does not edit tasks, orders or send messages. Canvas edits only synchronize after this tool is called.",
    inputSchema: {
      type: "object",
      properties: {
        sourceId: sourceProperty,
        content: { type: "string", maxLength: 100000 },
        expectedRevision: { type: "integer", minimum: 0 },
        sourceUpdatedAt: { type: "string", format: "date-time" },
        status: { type: "string", enum: ["current", "draft", "historical"] },
      },
      required: ["sourceId", "content", "expectedRevision", "sourceUpdatedAt"],
      additionalProperties: false,
    },
    annotations: {
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: true,
    },
  },
  {
    name: "withdraw_context",
    description:
      "Withdraw a published document from the hub. Keeps the version history. Use when the owner asks to withdraw or remove the source.",
    inputSchema: {
      type: "object",
      properties: {
        sourceId: sourceProperty,
        expectedRevision: { type: "integer", minimum: 1 },
      },
      required: ["sourceId", "expectedRevision"],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: false, destructiveHint: true },
  },
];
export async function handleBridge(request, env) {
  const identity = await bridgeIdentity(request, env);
  const message = await readOpsJson(request);
  const server = new Server(
    { name: "ModernCre8ve Context Publisher", version: "1.0.0" },
    { capabilities: { tools: {} } },
  );
  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: BRIDGE_TOOLS.filter((tool) =>
      identity.scopes.includes(
        tool.name === "list_context" ? "context:read" : "context:publish",
      ),
    ),
  }));
  server.setRequestHandler(CallToolRequestSchema, async ({ params }) => {
    const name = params.name;
    const input = params.arguments || {};
    if (!BRIDGE_TOOLS.some((tool) => tool.name === name))
      throw new Error("Unknown tool");
    if (
      !identity.scopes.includes(
        name === "list_context" ? "context:read" : "context:publish",
      )
    )
      throw new Error("Insufficient scope");
    try {
      const result =
        name === "list_context"
          ? await listContext(env, identity.user)
          : name === "publish_context"
            ? await publishContext(env, identity.user, input)
            : await withdrawContext(env, identity.user, input);
      return { content: [{ type: "text", text: JSON.stringify(result) }] };
    } catch (caught) {
      const text =
        caught instanceof Response
          ? "Source unavailable for this account."
          : caught.message;
      return { isError: true, content: [{ type: "text", text }] };
    }
  });
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  });
  await server.connect(transport);
  const headers = new Headers(request.headers);
  headers.delete("Content-Length");
  const response = await transport.handleRequest(
    new Request(request.url, {
      method: "POST",
      headers,
      body: JSON.stringify(message),
    }),
  );
  for (const [key, value] of Object.entries(privateHeaders))
    response.headers.set(key, value);
  await server.close();
  return response;
}
