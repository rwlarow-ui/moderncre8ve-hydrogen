# ADR-0006: Welcome AI answer engines in robots.txt

**Status:** Proposed
**Date:** 2026-11-04
**Deciders:** Rob (moderncre8ve.com)
**Related:** `app/routes/[robots.txt].tsx`, `app/utils/llms.server.ts` (llms.txt / llms-full.txt), `docs/seo-snapshot-2026-10-27.md`, `docs/ai-search-visibility-battlecard-2026-11.md`, SEO plan Priority 4 (agentic-search readiness)

## Context

`llms.txt` and `llms-full.txt` already ship canonical brand and product facts for AI shopping agents. But `robots.txt` named only `AhrefsBot`, `Nutch`, `MJ12bot`, and `Pinterest`. Reputable AI crawlers were allowed only implicitly, by falling under `User-agent: *` — there was no explicit, auditable policy, and some answer engines look for their named user-agent before crawling.

A competitive AI-search-visibility scan (see the battlecard) found that answer engines (ChatGPT, Perplexity, Google AI Overviews, Claude) cite a trusted corpus — editorial roundups, review aggregators, and well-structured brand facts. Today that corpus favors Article and Design Within Reach for broad queries and Carl Hansen & Søn for Wishbone provenance. ModernCre8ve's realistic lane is the handcrafted / made-to-order / solid-wood / US positioning that Medley already owns, which is winnable because it rewards citable facts over ad budget. Making our own facts reachable and quotable is step one.

## Decision

Explicitly welcome reputable AI answer and search crawlers in `robots.txt`, grouped under one shared ruleset:

- OpenAI — `OAI-SearchBot`, `ChatGPT-User`, `GPTBot`
- Anthropic — `ClaudeBot`, `Claude-Web`, `anthropic-ai`
- Perplexity — `PerplexityBot`, `Perplexity-User`
- Google AI — `Google-Extended`
- Apple AI — `Applebot-Extended`

They receive the same `generalDisallowRules` as search engines, so `/checkout`, `/cart`, `/account`, `/admin`, `/ops` and preview/filter URLs stay private, and no `Crawl-delay` is applied. A comment points them to `/llms.txt`.

## Consequences

- **Easier:** The policy is explicit and auditable; AI crawlers reach product and collection pages plus the llms facts; intent is documented rather than implied.
- **Harder:** The agent list needs occasional maintenance as new crawlers appear.
- **Revisit:** Add or remove agents per policy; measure AI-engine referrals in GA4 (via Supermetrics) and AI-answer share (Local Falcon) once those are connected, per SEO plan Priority 4.

## Alternatives considered

- **Block AI crawlers** — rejected; the goal is AI-search visibility, not exclusion.
- **Do nothing, rely on `User-agent: *`** — rejected; the allowance was implicit and some engines key on an explicit named user-agent.
