import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { PGlite } from "@electric-sql/pglite";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import {
  exchangeBridgeToken,
  handleBridge,
  registerBridgeClient,
  validateAuthorization,
} from "../app/utils/ops-bridge.server.js";
import {
  listContext,
  publishContext,
  saveOpsTask,
  withdrawContext,
} from "../app/utils/ops-context.server.js";
import {
  allowedIdentity,
  createIndividualSession,
  currentOpsUser,
  hashSecret,
  pkceChallenge,
  randomSecret,
  requireOpsUser,
  revokeIndividualSession,
} from "../app/utils/ops-identity.server.js";

test("private Postgres storage and OAuth publishing work end to end", async (t) => {
  const db = new PGlite();
  t.after(() => db.close());
  await db.exec(
    "create role anon; create role authenticated; create role service_role bypassrls;",
  );
  const migration = readFileSync(
    new URL("../scripts/sql/ops-hub.sql", import.meta.url),
    "utf8",
  );
  await db.exec(migration);
  await db.exec(migration); // Reapplying setup must preserve records and permissions.
  const rob = allowedIdentity("rob@moderncre8ve.com");
  const haven = allowedIdentity("havenmb@moderncre8ve.com");
  const env = {
    OPS_SUPABASE_URL: "https://database.example.test",
    OPS_SUPABASE_SECRET_KEY: "sb_secret_test",
    OPS_APP_URL: "https://moderncre8ve.com",
  };
  // Exercise the actual server adapters against a real Postgres engine. Only HTTP is replaced.
  t.mock.method(globalThis, "fetch", async (input, init) => {
    const url = new URL(input);
    assert.equal(url.origin, env.OPS_SUPABASE_URL);
    assert.equal(init.headers.apikey, env.OPS_SUPABASE_SECRET_KEY);
    const path = url.pathname.replace("/rest/v1/", "");
    const body = init.body ? JSON.parse(init.body) : undefined;
    try {
      if (path.startsWith("rpc/")) {
        const fn = path.slice(4);
        assert.match(fn, /^ops_[a-z_]+$/);
        const args = Object.entries(body);
        const params = args.map(([key], i) => `${key} => $${i + 1}`).join(",");
        const values = args.map(([, value]) => value);
        if (["ops_read_artifacts", "ops_read_tasks"].includes(fn)) {
          const result = await db.query(
            `select * from ${fn}(${params})`,
            values,
          );
          return Response.json(result.rows);
        }
        const result = await db.query(
          `select ${fn}(${params}) as value`,
          values,
        );
        return Response.json(result.rows[0].value);
      }
      assert.ok(
        ["ops_sessions", "ops_bridge_tokens", "ops_bridge_clients"].includes(
          path,
        ),
      );
      if (init.method === "POST") {
        const args = Object.entries(body);
        const cols = args.map(([key]) => key).join(",");
        const values = args.map(([, value]) =>
          typeof value === "object" ? JSON.stringify(value) : value,
        );
        const result = await db.query(
          `insert into ${path}(${cols}) values (${args.map((_, i) => `$${i + 1}`).join(",")}) returning *`,
          values,
        );
        return Response.json(result.rows);
      }
      const where = [],
        values = [];
      for (const [key, value] of url.searchParams) {
        if (["select", "limit", "order"].includes(key)) continue;
        assert.match(key, /^[a-z_]+$/);
        const separator = value.indexOf(".");
        const op = value.slice(0, separator);
        assert.ok(["eq", "gt"].includes(op));
        values.push(value.slice(separator + 1));
        where.push(`${key} ${op === "eq" ? "=" : ">"} $${values.length}`);
      }
      const result = await db.query(
        `${init.method === "DELETE" ? "delete from" : "select * from"} ${path} where ${where.length ? where.join(" and ") : "true"}${init.method === "DELETE" ? " returning *" : ""}`,
        values,
      );
      return Response.json(result.rows);
    } catch (error) {
      return Response.json(
        { error: error.message },
        { status: error.code === "40001" ? 409 : 400 },
      );
    }
  });
  const call = async (name, values) =>
    (
      await db.query(
        `select ${name}(${values.map((_, i) => `$${i + 1}`).join(",")}) as result`,
        values,
      )
    ).rows[0].result;
  const publication = {
    sourceId: "catalog-todos",
    content: "Full catalog context",
    sourceUpdatedAt: "2026-11-12T12:00:00Z",
    expectedRevision: 0,
  };
  await t.test(
    "publish is atomic, idempotent and revision checked",
    async () => {
      const first = await publishContext(env, rob, publication);
      assert.equal(first.revision, 1);
      assert.equal((await publishContext(env, rob, publication)).revision, 1);
      await assert.rejects(() =>
        publishContext(env, haven, { ...publication, content: "Stale write" }),
      );
      const next = await publishContext(env, haven, {
        ...publication,
        content: "Revised catalog",
        expectedRevision: 1,
      });
      assert.equal(next.revision, 2);
      assert.equal(next.published_by, haven.email);
      assert.equal(
        (
          await db.query(
            "select count(*)::int as n from ops_artifact_revisions",
          )
        ).rows[0].n,
        2,
      );
    },
  );
  await t.test(
    "private documents are excluded in application and database reads",
    async () => {
      await publishContext(env, rob, {
        ...publication,
        sourceId: "daybook",
        content: "ROB_ONLY_PRIVATE_CANARY",
      });
      assert.ok(
        JSON.stringify(await listContext(env, rob)).includes(
          "ROB_ONLY_PRIVATE_CANARY",
        ),
      );
      assert.ok(
        !JSON.stringify(await listContext(env, haven)).includes(
          "ROB_ONLY_PRIVATE_CANARY",
        ),
      );
      await assert.rejects(() =>
        call("ops_read_artifacts", [haven.email, ["daybook"]]),
      );
      await assert.rejects(() =>
        call("ops_read_artifacts", [null, ["daybook"]]),
      );
    },
  );
  await t.test(
    "database anonymous and normal authenticated roles cannot read or execute",
    async () => {
      for (const role of ["anon", "authenticated"]) {
        await db.exec(`set role ${role}`);
        await assert.rejects(() => db.query("select * from ops_artifacts"));
        await assert.rejects(() =>
          call("ops_read_artifacts", [rob.email, ["daybook"]]),
        );
        await db.exec("reset role");
      }
    },
  );
  await t.test(
    "server role can call RPCs but cannot bypass source ownership through them",
    async () => {
      await db.exec("set role service_role");
      try {
        assert.equal(
          (
            await db.query("select * from ops_read_artifacts($1,$2)", [
              rob.email,
              ["daybook"],
            ])
          ).rows.length,
          1,
        );
        await assert.rejects(() =>
          call("ops_read_artifacts", [haven.email, ["daybook"]]),
        );
      } finally {
        await db.exec("reset role");
      }
    },
  );
  await t.test(
    "withdrawal keeps history and removes displayed content",
    async () => {
      const result = await withdrawContext(env, rob, {
        sourceId: "daybook",
        expectedRevision: 1,
      });
      assert.equal(result.withdrawn, true);
      assert.equal(result.content, "");
      assert.equal(result.revision, 2);
    },
  );
  await t.test(
    "task completion needs evidence and conflicting edits cannot overwrite it",
    async () => {
      const task = await saveOpsTask(env, haven, {
        section: "catalog",
        title: "Verify Warwick request",
        status: "todo",
        dueDate: "2026-11-16",
      });
      await assert.rejects(() =>
        saveOpsTask(env, haven, {
          section: "catalog",
          id: task.id,
          title: task.title,
          status: "done",
          updatedAt: task.updated_at,
        }),
      );
      const done = await saveOpsTask(env, haven, {
        section: "catalog",
        id: task.id,
        title: task.title,
        status: "done",
        updatedAt: task.updated_at,
        evidence: "Request verified against test receipt.",
      });
      assert.equal(done.status, "done");
      await assert.rejects(() =>
        saveOpsTask(env, rob, {
          section: "catalog",
          id: task.id,
          title: task.title,
          status: "todo",
          updatedAt: task.updated_at,
        }),
      );
      await publishContext(env, rob, {
        ...publication,
        expectedRevision: 2,
        content: "Context changed after task completion",
      });
      assert.equal(
        (await db.query("select status from ops_tasks where id=$1", [task.id]))
          .rows[0].status,
        "done",
      );
    },
  );
  await t.test(
    "individual sessions rotate, expire and revoke server-side",
    async () => {
      const store = new Map([["opsAuthenticated", true]]);
      const context = {
        env,
        session: {
          get: (key) => store.get(key),
          set: (key, value) => store.set(key, value),
          unset: (key) => store.delete(key),
        },
      };
      await createIndividualSession(context, rob.email);
      const first = store.get("opsSession");
      assert.equal(store.has("opsAuthenticated"), false);
      assert.equal((await currentOpsUser(context)).email, rob.email);
      await createIndividualSession(context, rob.email);
      assert.notEqual(store.get("opsSession"), first);
      assert.equal(
        (await db.query("select count(*)::int as n from ops_sessions")).rows[0]
          .n,
        1,
      );
      await revokeIndividualSession(context);
      assert.equal(await currentOpsUser(context), null);
      await createIndividualSession(context, haven.email);
      await assert.rejects(
        () =>
          requireOpsUser(
            new Request("https://moderncre8ve.com/ops/daily"),
            context,
            { owner: true },
          ),
        (r) => r.status === 403,
      );
      await db.exec(
        "update ops_sessions set expires_at=now()-interval '1 hour'",
      );
      assert.equal(await currentOpsUser(context), null);
    },
  );
  await t.test(
    "OAuth code replay, PKCE failure, refresh rotation and scope isolation",
    async () => {
      const registration = await registerBridgeClient(
        new Request("https://moderncre8ve.com/ops/bridge/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            client_name: "Claude",
            redirect_uris: ["https://claude.ai/callback"],
          }),
        }),
        env,
      );
      const client = await registration.json();
      assert.equal(registration.status, 201);
      const verifier = randomSecret();
      const challenge = await pkceChallenge(verifier);
      const resource = "https://moderncre8ve.com/ops/bridge/mcp";
      const params = new URLSearchParams({
        client_id: client.client_id,
        redirect_uri: "https://claude.ai/callback",
        response_type: "code",
        code_challenge: challenge,
        code_challenge_method: "S256",
        scope: "context:read",
        resource,
      });
      assert.equal(
        (await validateAuthorization(env, params)).client.id,
        client.client_id,
      );
      await assert.rejects(() =>
        validateAuthorization(
          env,
          new URLSearchParams({
            ...Object.fromEntries(params),
            redirect_uri: "https://evil.test",
          }),
        ),
      );
      const code = randomSecret();
      await db.query(
        "insert into ops_bridge_codes values($1,$2,$3,$4,$5,$6,$7,now()+interval '1 minute')",
        [
          await hashSecret(code),
          client.client_id,
          haven.email,
          "https://claude.ai/callback",
          challenge,
          resource,
          "context:read",
        ],
      );
      const exchange = (extra = {}) =>
        exchangeBridgeToken(
          new Request("https://moderncre8ve.com/ops/bridge/token", {
            method: "POST",
            body: new URLSearchParams({
              grant_type: "authorization_code",
              client_id: client.client_id,
              redirect_uri: "https://claude.ai/callback",
              code,
              code_verifier: verifier,
              resource,
              ...extra,
            }),
          }),
          env,
        );
      assert.equal(
        (await exchange({ code_verifier: randomSecret() })).status,
        400,
      );
      const issued = await exchange();
      assert.equal(issued.status, 200);
      const tokens = await issued.json();
      assert.equal((await exchange()).status, 400);
      const rpc = (access, name, args = {}) =>
        handleBridge(
          new Request(resource, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${access}`,
              Accept: "application/json, text/event-stream",
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              jsonrpc: "2.0",
              id: 1,
              method: "tools/call",
              params: { name, arguments: args },
            }),
          }),
          env,
        );
      const context = await (
        await rpc(tokens.access_token, "list_context")
      ).json();
      assert.ok(!JSON.stringify(context).includes("daybook"));
      const denied = await (
        await rpc(tokens.access_token, "publish_context", publication)
      ).json();
      assert.equal(denied.error.message, "Insufficient scope");
      const refresh = () =>
        exchangeBridgeToken(
          new Request("https://moderncre8ve.com/ops/bridge/token", {
            method: "POST",
            body: new URLSearchParams({
              grant_type: "refresh_token",
              client_id: client.client_id,
              refresh_token: tokens.refresh_token,
              resource,
            }),
          }),
          env,
        );
      const rotated = await refresh();
      assert.equal(rotated.status, 200);
      await assert.rejects(
        () => rpc(tokens.access_token, "list_context"),
        (r) => r.status === 401,
      );
      const next = await rotated.json();
      assert.equal((await rpc(next.access_token, "list_context")).status, 200);
      const sdkClient = new Client({
        name: "Ops integration test",
        version: "1.0.0",
      });
      const transport = new StreamableHTTPClientTransport(new URL(resource), {
        requestInit: {
          headers: { Authorization: `Bearer ${next.access_token}` },
        },
        fetch: async (input, init) => {
          const request = new Request(input, init);
          if (request.method !== "POST")
            return new Response(null, { status: 405 });
          return handleBridge(request, env);
        },
      });
      await sdkClient.connect(transport);
      assert.deepEqual(
        (await sdkClient.listTools()).tools.map((tool) => tool.name),
        ["list_context"],
      );
      const viewed = await sdkClient.callTool({
        name: "list_context",
        arguments: {},
      });
      assert.ok(!JSON.stringify(viewed).includes("daybook"));
      await sdkClient.close();
      assert.equal((await refresh()).status, 400);
      await assert.rejects(
        () => rpc(next.access_token, "list_context"),
        (r) => r.status === 401,
      );
    },
  );
});
