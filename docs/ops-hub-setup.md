# Ops Hub: provider setup and activation

The code supports individual Google logins for **rob@moderncre8ve.com** and **havenmb@moderncre8ve.com**, a private Claude publishing connector, and Daily / Catalog / Marketing / Sales / Tech / Brand tabs. Both accounts have the same owner permissions across all Ops tabs and context sources. Google and Supabase must be configured before individual access can be tested. Do not paste credentials into chat or commit them.

## 1. Create the private database

1. Create a dedicated Supabase project for the Ops Hub. Choose a region appropriate for the business and review the selected plan before provisioning.
2. Run [`scripts/sql/ops-hub.sql`](../scripts/sql/ops-hub.sql) in its SQL editor. It is repeatable. It creates private tables and server-only RPC functions; anonymous and ordinary authenticated clients have no table or function access.
3. Save the project URL as `OPS_SUPABASE_URL` and its **server-side secret key** as `OPS_SUPABASE_SECRET_KEY`. A new `sb_secret_…` key or legacy service-role JWT works. Never use a publishable/anon key here, and never put the server key in a `PUBLIC_` variable.

This project stores revocable sign-in sessions, encrypted Google refresh tokens, context revisions, tasks, task history and Claude OAuth grants. Access is checked by the app and again by the document/task RPC functions. The key remains on the Oxygen server.

## 2. Create the Google web client

Use Google Cloud project `mindful-quasar-486518-r9`, or a dedicated project under the same business ownership.

1. Configure Google Auth Platform branding/audience for the business. If the project and both accounts are in the same Google Workspace, use Internal where available. Otherwise configure the consent application and test users for both approved email addresses. Follow Google's verification requirements before broader production use.
2. Create an OAuth client of type **Web application**.
3. Add this exact authorized redirect URI:
   `https://moderncre8ve.com/ops/auth/callback`
4. For local development, separately add:
   `http://localhost:3456/ops/auth/callback`
5. Save its client ID as `OPS_GOOGLE_CLIENT_ID` and secret as `OPS_GOOGLE_CLIENT_SECRET`. Set `OPS_APP_URL=https://moderncre8ve.com` in production; local development uses `http://localhost:3456`.

Sign-in requests only `openid email profile`. The server verifies Google's JWT signature, issuer, audience, nonce, expiry and verified email, and checks the two exact approved addresses. Other domain users are not admitted.

## 3. Configure Oxygen, then verify individual access

Set these variables in the Production environment, with secret values marked secret:

| Variable | Value |
| --- | --- |
| `OPS_APP_URL` | `https://moderncre8ve.com` |
| `OPS_SUPABASE_URL` | Dedicated database project URL |
| `OPS_SUPABASE_SECRET_KEY` | Server-side secret key |
| `OPS_GOOGLE_CLIENT_ID` | Google web client ID |
| `OPS_GOOGLE_CLIENT_SECRET` | Google web client secret |
| `OPS_INDIVIDUAL_LOGIN_ENABLED` | Initially `false` |

Deploy the implementation with those settings. Existing password sessions continue to support the old orders/PO routes during this transition; they cannot open any new tab, settings, private Google panel or bridge authorization page. The new tabs always require a named individual session.

Run `node --env-file=.env scripts/check-ops-hub.mjs` with the corresponding local settings. It checks storage and reports configuration readiness without printing credentials. It does not substitute for interactive sign-in.

In separate clean browser sessions:

1. Rob signs in through **Continue with Google**, then opens `/ops/daily` and `/ops/settings`.
2. Haven signs in, opens all shared sections and an order, and verifies her existing order-edit and PO approval controls.
3. Verify both accounts can open Tech and Daily, read/publish all context sources, and edit Daily tasks. Google mail/calendar connections stay scoped to the signed-in account; neither account uses the other’s OAuth token.
4. Verify private responses, including React Router `.data` requests, use `Cache-Control: private, no-store`.

After **both** logins are verified, set `OPS_INDIVIDUAL_LOGIN_ENABLED=true` and redeploy. This disables shared-password sign-in and rejects old shared-password sessions throughout Ops. Twelve-hour individual sessions are stored server-side and can be revoked in Account & connections. PO approvals record the named operator's email.

Do not enable the cutover flag before testing both accounts. A configuration-only rollback can restore the transitional order tools without making new tabs available to shared sessions.

## 4. Connect the Claude publisher

In Claude Pro/Max, add a custom remote MCP connector:

`https://moderncre8ve.com/ops/bridge/mcp`

The connector discovers OAuth metadata, registers a public client, and uses PKCE. Its browser consent page requires individual hub sign-in and displays the return address and requested permissions. Allow only the connector you intended to configure. Claude receives opaque, resource-bound context tokens; raw tokens are hashed in storage. Authorization codes are single-use; refresh tokens rotate; grants can be revoked from `/ops/settings`.

Tools:

| Tool | Purpose |
| --- | --- |
| `list_context` | Read permitted sources, full current publications and revisions. An unpublished source starts at revision `0`. |
| `publish_context` | Submit a full text/Markdown export, `sourceId`, `expectedRevision`, `sourceUpdatedAt` and optional `status` (`current`, `draft`, `historical`). |
| `withdraw_context` | Hide a publication while keeping its revision history. |

Example instruction to Claude:

> Read the current Ops context registry. Publish the full updated Catalog to-dos artifact to `catalog-todos` using the current expected revision and its actual update timestamp. Keep draft material marked draft. Do not change task statuses or publish unrelated sources.

Publishing occurs only when this tool is called. Direct canvas edits, source deletion in Claude, and artifact renames do not automatically reach the hub. Ask Claude to publish after edits or withdraw the corresponding source after removal. A revision conflict requires rereading the source before retrying. Successful duplicate submissions do not create extra revisions.

Open workspace tabs revalidate every minute while visible. Refresh pauses while an action form is open or focused, preserving editing state. Source age is based on its actual update timestamp, not merely the time it was copied into the hub.

The connector has **no** tools for Gmail, Calendar, Shopify writes, PO actions, social publication or sending messages. Both owners' grants can read/publish all registered context sources. Text is rendered as escaped React text; imported HTML or JavaScript does not execute.

### Initial content import

All 12 supplied artifact URLs are registered. Current panels contain dated supplied summaries; Marketing also has the dated December calendar draft found locally. They are labeled accordingly and do not claim full artifact synchronization. Publish each full artifact through the connector to replace its initial context. The two dated briefs remain historical.

## 5. Optional live connections

### Each owner's mail and calendar

Enable the Gmail API and Google Calendar API in the OAuth client's project. Configure the consent scopes for `gmail.readonly` and `calendar.events.readonly` in addition to basic identity scopes, following Google's audience/verification requirements. Generate 32 random bytes as a 64-character hex string with a secure generator and store it as the secret `OPS_CONNECTION_ENCRYPTION_KEY` in Oxygen. Redeploy.

Rob or Haven selects **Connect Google** on Daily or Account & connections. Both requested read-only grants and a refresh token are required. That token is encrypted with A256GCM before storage. It is never placed in a session cookie or returned to the browser. Each account connects and reads its own Google mail/calendar. Tokens are selected by the signed-in email. An unavailable source is shown as unavailable, not as an empty inbox/calendar.

The daybook reads up to 10 unread Primary messages and up to 50 primary-calendar events in the next seven days. No email is sent or marked read. Disconnecting removes the hub's token; the grant can additionally be revoked in Google Account security. Rotating the encryption key requires reconnecting Google.

### Shopify panels

Daily reuses the current-order reader and independently loads fully paid, non-cancelled order value since Monday 00:00 America/New_York. This is current order value including tax/shipping, not a net-sales or payout metric. Currencies remain separate. A 1,000-order scan cap is disclosed if reached. Catalog reads current Shopify statuses for the 64-product rollout scope and compares them with the deployed register; missing products are unavailable, not assumed Draft.

The active Admin token needs `read_products` for the Catalog panel, in addition to existing order/customer access. PO operations also require the existing metaobject-entry permissions. Do not rotate or remove the active token until the replacement has been verified for both order and PO operations.

### GitHub and SEO

For live repository issues and latest-main workflow status, add optional `OPS_GITHUB_READ_TOKEN`: a fine-grained, read-only token restricted to `rwlarow-ui/moderncre8ve-hydrogen`, with Issues and Actions read access. Redeploy. The repository debt register is an explicitly dated/deployed snapshot.

SEO context can be published from Claude immediately after connector setup. Scheduled numerical SEO ingestion from the separate truth-layer pipeline is **not wired in this release**; no charts imply that a pipeline or GA4 source has been connected. The live pipeline remains in `rwlarow-ui/moderncre8ve-seo-truth-layer`.

## Verification and upkeep

- `npm run test:ops-hub`: authentication/privacy tests, official MCP client/server integration, Postgres migration/permission/transaction tests, live-reader fixtures and existing PO/send regression tests.
- `npm run typecheck`, `npm run build` and targeted Biome checks.
- Verify the real Google login, consent and initial artifact publication after setup; tests use local cryptographic fixtures and Postgres, not live provider credentials.
- Review connector grants in Account & connections. Expired database rows can be periodically deleted by an administrator; they are rejected by expiry checks even before cleanup. Retain artifact/task history according to the business's retention policy.

Provider references: [Google OpenID Connect](https://developers.google.com/identity/openid-connect/openid-connect), [Supabase server secret keys](https://supabase.com/docs/guides/api/api-keys), [Claude custom remote MCP connectors](https://support.claude.com/en/articles/11175166-get-started-with-custom-connectors-using-remote-mcp).

## Existing deployments: equal owner access

Run `scripts/sql/ops-hub-owner-parity.sql` in the existing Supabase SQL editor **before** deploying the app role change. This repeatable transaction updates only the existing access-checking functions; it preserves sessions, publications, tasks, connection tokens, and server-only grants. Fresh projects use the updated `ops-hub.sql`.

Haven (`havenmb@moderncre8ve.com`) now has the same `owner` role as Rob. This includes all four formerly Rob-only context sources and Daily task read/write access. It does not share Rob’s live Gmail/Calendar token: each owner still connects their own Google account.

After deployment, refresh an existing individual session to pick up the role; the role is resolved from the approved account registry on every request. If Tech redirects to individual sign-in, sign in with the approved ModernCre8ve Google account. Legacy shared-password sessions only cover the transitional order/PO tools. Verify Tech with Haven’s actual account before treating her reported access failure as resolved.
