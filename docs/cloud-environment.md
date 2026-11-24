# Claude Code cloud environment

How this repo runs in Claude Code cloud sessions (claude.ai/code, `claude --cloud`).
Environments can only be created and edited in the claude.ai/code web UI.
Docs: https://code.claude.com/docs/en/cloud-environments

## What carries over automatically (it is in the clone)

- `CLAUDE.md`, `.claude/settings.json` (hooks, permissions), `.claude/skills/`, `.mcp.json`
- `scripts/cloud-session-start.sh` runs as a SessionStart hook. It does nothing locally. When `CLAUDE_CODE_REMOTE=true` it writes `.env` from the environment's variables, runs `npm ci` if needed, and runs `react-router typegen`.

## What does not carry over

- `.env`: gitignored. It is rebuilt from the environment variables listed below.
- `.claude/settings.local.json` and everything in `~/.claude`.
- Plugins (`enabledPlugins`) are not installed in the cloud VM.
- Mac-only tools: Desktop Commander, computer use, Claude in Chrome, iMessage, the built-in browser.
- furniture-studio concepts live in `~/.moderncre8ve/furniture-studio` on the Mac. The MCP server starts with an empty store.
- Local-only docs, gitignored because the repo is public: `docs/xin-yean-order-memory-2026-11.md` is the full record of the first Xin Yean wholesale order (supplier contacts, payment and shipment identifiers, the supplier verification). It exists only on the owner's Mac. What a cloud session can rely on: the order is paid in full under DDP terms (costs are in `docs/xin-yean-order-cost-2026-11.md`), the supplier was verified as legitimate in November 2026, the container reached Long Beach on 2026-11-19, and door delivery is expected 2026-12-13 to 12-19. Still open: check on arrival whether the DT7258 desk and CW8137 Wishbone chair came in natural ash or walnut-stained ash. For contacts or tracking numbers, ask the owner.
- claude.ai connectors (Shopify, Google Drive, Gmail, Calendar…) can be enabled per cloud session. Their traffic goes through Anthropic, so they need no allowlist entries.

## Environment settings

**Name:** `moderncre8ve-hydrogen`

**Network access:** Limited, with "Allow package managers" on. Allowed domains:

```
moderncre8ve.myshopify.com
*.myshopify.com
shopify.com
*.shopify.com
cdn.shopify.com
moderncre8ve.com
checkout.moderncre8ve.com
*.o2.myshopify.dev
```

**Setup script.** It runs as root on Ubuntu 24.04 with Node 22 on PATH, and the result is cached for about 7 days:

```bash
#!/bin/bash
# Best effort: the SessionStart hook repeats these steps if this fails.
[ -f package.json ] && npm ci --no-audit --no-fund || true
[ -f package.json ] && npx react-router typegen || true
```

**Environment variables.** Anyone who uses the environment can read these values.

| Key | Copy? | Why |
|-----|-------|-----|
| `SESSION_SECRET` | New value | Generate a fresh one; don't reuse the local one |
| `PUBLIC_STORE_DOMAIN`, `PUBLIC_STOREFRONT_API_TOKEN`, `PUBLIC_STOREFRONT_ID`, `PUBLIC_CHECKOUT_DOMAIN`, `SHOP_ID` | Yes | Dev server / Storefront API (public-scope token) |
| `PUBLIC_CUSTOMER_ACCOUNT_API_CLIENT_ID`, `PUBLIC_CUSTOMER_ACCOUNT_API_URL` | Yes | Customer Account API (public) |
| `CUSTOM_COLLECTION_BANNER_METAFIELD` | Yes | Config, not secret |
| `OPS_ADMIN_API_TOKEN` | Yes | Scoped ops token (orders and customers only), used by the ops-dashboard MCP and ops/trade code |
| `OPS_DASHBOARD_PASSWORD` | New value, optional | Only needed for `/ops` login on the cloud dev server. Don't reuse the production password |
| `SHOPIFY_ADMIN_API_TOKEN` | **No** | Full admin write access. Keep it on the Mac only. Without it, production-PO sending (`production-po.server.js`) and admin-token scripts in `scripts/` fail in the cloud; the ops dashboard uses `OPS_ADMIN_API_TOKEN` |
| `SHOPIFY_CLI_PARTNERS_TOKEN` | **No** | Deploy access. Deploys go through Oxygen CI |
| `OPS_SUPABASE_*`, `OPS_GOOGLE_*`, `OPS_APP_URL`, `OPS_INDIVIDUAL_LOGIN_ENABLED` | **No** | Production ops hub secrets and login |
| `PUBLIC_GOOGLE_GTM_ID` | **No** | Would send dev traffic to the live GA4 property. When it's unset, the dev server simply loads no GA4 |
| `MOKKER_API_KEY`, `WEAVERSE_PROJECT_ID`, `PRIVATE_STOREFRONT_API_TOKEN` | **No** | Unused or dead |

When you add a key to the table, also add it to `KEYS` in `scripts/cloud-session-start.sh`.

### Copying the values

Run this on the Mac, from the live clone. It puts the approved keys on the clipboard with fresh cloud-only `SESSION_SECRET` and `OPS_DASHBOARD_PASSWORD` values, and no value is printed to the terminal. Paste the clipboard into the environment's variables box:

```bash
cd ~/Developer/my-hydrogen-storefront && { echo "SESSION_SECRET=$(openssl rand -hex 32)"; echo "OPS_DASHBOARD_PASSWORD=$(openssl rand -base64 18)"; grep -E '^(PUBLIC_STORE_DOMAIN|PUBLIC_STOREFRONT_API_TOKEN|PUBLIC_STOREFRONT_ID|PUBLIC_CHECKOUT_DOMAIN|PUBLIC_CUSTOMER_ACCOUNT_API_CLIENT_ID|PUBLIC_CUSTOMER_ACCOUNT_API_URL|SHOP_ID|CUSTOM_COLLECTION_BANNER_METAFIELD|OPS_ADMIN_API_TOKEN)=' .env; } | pbcopy
```

`OPS_ADMIN_API_TOKEN` is not in the local `.env` yet. Mint it first in your own terminal with `node scripts/get-admin-token.mjs --ops <client_id> <client_secret>`, which runs an OAuth flow and appends the token to `.env`. Check it with `node scripts/verify-ops-token.mjs`, then run the copy command.

## Side effects to know

- The Oxygen workflow runs on every push, so each branch a cloud session pushes builds an Oxygen preview deployment.
- The ops-dashboard MCP writes to the **live** store (notes and tags) even from the cloud.
