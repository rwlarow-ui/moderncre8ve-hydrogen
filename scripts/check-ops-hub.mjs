#!/usr/bin/env node
import { googleConfigured } from "../app/utils/ops-identity.server.js";
import { hasOpsStore, opsRpc } from "../app/utils/ops-store.server.js";

const env = process.env;
const keys = [
  "OPS_GOOGLE_CLIENT_ID",
  "OPS_GOOGLE_CLIENT_SECRET",
  "OPS_SUPABASE_URL",
  "OPS_SUPABASE_SECRET_KEY",
];
for (const key of keys)
  console.log(`${key}: ${env[key] ? "configured" : "missing"}`);
if (!hasOpsStore(env)) {
  console.log("Database setup is required. See docs/ops-hub-setup.md.");
  process.exitCode = 1;
} else {
  try {
    await opsRpc(env, "ops_read_artifacts", {
      p_email: "havenmb@moderncre8ve.com",
      p_ids: ["catalog-todos"],
    });
    await opsRpc(env, "ops_read_tasks", {
      p_email: "rob@moderncre8ve.com",
      p_section: "daily",
    });
    console.log("Database and Ops RPCs: reachable");
  } catch {
    console.log(
      "Database check failed. Verify the project URL, secret key and SQL migration.",
    );
    process.exitCode = 1;
  }
}
console.log(
  `Individual login configuration: ${googleConfigured(env) ? "present; real Google sign-in must still be tested" : "incomplete"}`,
);
console.log(
  `Shared-password cutover: ${env.OPS_INDIVIDUAL_LOGIN_ENABLED === "true" ? "enabled" : "not enabled"}`,
);
console.log(
  `Private Google encryption: ${/^[a-f0-9]{64}$/i.test(env.OPS_CONNECTION_ENCRYPTION_KEY || "") ? "configured" : "not configured"}`,
);
