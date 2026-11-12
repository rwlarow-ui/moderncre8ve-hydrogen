# ADR-0008: Individual Ops identities and a Claude context publisher

**Status:** Implementation prepared; provider setup and production acceptance pending.
**Date:** 2026-11-12
**Decider:** Rob LaRow

## Decision

Keep the workspace inside the existing Hydrogen `/ops` area. Add Google OIDC for the two exact approved accounts, backed by revocable twelve-hour database sessions. Both retain order-edit and PO approval/send access. Rob's personal documents, Google mail and calendar are owner-only. Shared-password sessions remain limited to existing orders/POs during an explicit transition; the cutover flag rejects them throughout Ops.

Use a dedicated private Supabase/Postgres store for context revisions, independent action records, browser sessions, encrypted Google refresh tokens and context-only OAuth grants. No browser or artifact receives database secrets. Private-source authorization exists at the server boundary and in the document/task RPCs. Anonymous/authenticated database roles cannot access the tables/functions. OAuth tokens are opaque and hashed at rest; personal Google refresh tokens are encrypted using a separate server key.

Claude Pro/Max uses an authenticated remote MCP publishing connector with PKCE, an individual consent page, single-use codes, rotating refresh tokens and revocation. Use the official SDK's Web Standards transport for Oxygen. Its only tools list, publish and withdraw registered context. Artifact edits require a publish-to-hub step; no automated canvas scraping or undocumented private API is used. HTML/scripts from artifacts are displayed as text, never executed.

Publishing uses expected revisions and an atomic Postgres transaction. Identical retries are idempotent; conflicting updates require a fresh read. Task state, owner, deadline and completion evidence are stored independently so a new narrative cannot reset verified work. Publishing/withdrawing is attributed and versioned.

## Scope and limitations

Six new tabs contain the twelve registered artifact sources, with clear initial/synchronized/draft/historical states. Daily has live Shopify readers and an optional private Google daybook; Catalog compares live status with rollout records; Marketing includes the dated local December draft; Tech has a deployed debt snapshot and optional GitHub read integration; Brand reads current theme settings. Production stages have no actual tracking source. Sales context plus action records do not constitute automated quote management or outreach.

The Google app/database and connector must be configured and tested with both accounts before cutover. The separate SEO pipeline is not migrated or automatically ingested here. No social scheduling, automatic messages or PO-send automation is introduced. Setup/acceptance is documented in [`docs/ops-hub-setup.md`](../ops-hub-setup.md).
