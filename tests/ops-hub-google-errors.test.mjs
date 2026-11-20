import assert from "node:assert/strict";
import test from "node:test";
import { saveCareSender } from "../app/utils/ops-care.server.js";
import {
  GOOGLE_CONNECT_ERRORS,
  googleConnectErrorMessage,
  withGoogleError,
} from "../app/utils/ops-google-errors.js";
import { savePersonalConnection } from "../app/utils/ops-personal.server.js";

const GMAIL_READ = "https://www.googleapis.com/auth/gmail.readonly";
const CAL_READ = "https://www.googleapis.com/auth/calendar.events.readonly";
const GMAIL_SEND = "https://www.googleapis.com/auth/gmail.send";
const KEY = "a".repeat(64);
const rob = { email: "rob@moderncre8ve.com", role: "owner" };
const haven = { email: "haven@moderncre8ve.com", role: "owner" };

const code = (promise, expected) =>
  assert.rejects(promise, (error) => {
    assert.equal(error.googleConnectCode, expected);
    return true;
  });

test("only known reason codes produce a message", () => {
  assert.equal(
    googleConnectErrorMessage("missing_scopes"),
    GOOGLE_CONNECT_ERRORS.missing_scopes,
  );
  for (const bad of [null, "", "toString", "__proto__", "<script>"])
    assert.equal(googleConnectErrorMessage(bad), null);
});

test("withGoogleError keeps the path and existing query", () => {
  assert.equal(
    withGoogleError("/ops/daily", "no_key"),
    "/ops/daily?googleError=no_key",
  );
  assert.equal(
    withGoogleError("/ops/daily?tab=x", "expired"),
    "/ops/daily?tab=x&googleError=expired",
  );
});

test("daybook save reports which part of the grant was missing", async () => {
  const env = { OPS_CONNECTION_ENCRYPTION_KEY: KEY };
  await code(
    savePersonalConnection(env, rob, {
      refresh_token: "r",
      scope: `openid ${GMAIL_READ}`,
    }),
    "missing_scopes",
  );
  await code(
    savePersonalConnection(env, rob, { scope: `${GMAIL_READ} ${CAL_READ}` }),
    "no_refresh_token",
  );
  await code(
    savePersonalConnection({ OPS_CONNECTION_ENCRYPTION_KEY: "short" }, rob, {
      refresh_token: "r",
      scope: `${GMAIL_READ} ${CAL_READ}`,
    }),
    "no_key",
  );
});

test("care@ sender save reports account, scopes and key problems", async () => {
  const env = { OPS_CONNECTION_ENCRYPTION_KEY: KEY };
  const full = { refresh_token: "r", scope: `${GMAIL_SEND} ${GMAIL_READ}` };
  await code(saveCareSender(env, rob, full), "care_account");
  await code(
    saveCareSender(env, haven, { refresh_token: "r", scope: GMAIL_READ }),
    "care_missing_scopes",
  );
  await code(
    saveCareSender(env, haven, { scope: full.scope }),
    "no_refresh_token",
  );
  await code(saveCareSender({}, haven, full), "no_key");
});
