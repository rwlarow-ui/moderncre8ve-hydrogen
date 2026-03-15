# Customer Service Pipeline Deployment & Repository Integration Plan

## Goal
Deploy a custom customer service pipeline and integrate it cleanly with this frontend repository (`options-wall-scanner-next`) and the existing Netlify backend (`hunnysgogojuice.netlify.app`).

## Current Constraints
- The source SOP file referenced in IDE context (`/Volumes/Naboo/Moderncre8ve_Customer_Service_SOP.md`) was not available in this environment at planning time.
- This plan is deployment-ready as a framework and includes explicit mapping checkpoints where SOP details should be injected before execution.

## Success Criteria
- A production-grade customer service pipeline is callable from the frontend via authenticated API endpoints.
- Pipeline runs are observable (logs, metrics, alerts) and auditable.
- Failure modes have retry/backoff, dead-letter handling, and operator runbooks.
- Rollout is phased with canary + rollback controls.

## Architecture Fit (This Repo + Existing Stack)
- **Frontend app** (this repo): Next.js SPA on Netlify.
- **Backend execution layer**: Netlify Functions / Background Functions in the backend repo.
- **Data flow**: Frontend triggers/status checks → backend orchestrator → task workers/integrations → persisted outcomes + notifications.
- **Contract first**: Extend `docs/API-CONTRACT.md` and keep frontend/backend in lockstep.

---

## Phase 0 — Discovery, SOP Mapping, and Scope Lock (Day 0-1)
1. Parse the Moderncre8ve SOP into a machine-actionable pipeline map:
   - Intake channels
   - Classification/routing rules
   - SLA targets
   - Escalation tree
   - Response templates
   - Compliance requirements (PII, retention)
2. Define "must-have v1" vs "post-v1" capabilities.
3. Produce a single source of truth artifact:
   - `docs/CUSTOMER-SERVICE-PIPELINE-SPEC.md`
4. Create a RACI matrix (Owner, Backup, On-call).

**Deliverables**
- Pipeline spec doc
- SLA matrix
- Escalation matrix
- Acceptance test list

---

## Phase 1 — API & Data Contract Design (Day 1-2)
1. Define backend endpoints (example surface):
   - `POST /customer-service/intake`
   - `POST /customer-service/classify`
   - `POST /customer-service/respond`
   - `POST /customer-service/escalate`
   - `GET /customer-service/cases`
   - `GET /customer-service/cases/:id`
   - `POST /customer-service/cases/:id/retry`
2. Add request/response schemas with validation (zod/json schema).
3. Update cross-repo API contract documentation and version the change.
4. Define idempotency keys for intake/processing endpoints.

**Deliverables**
- Contract update in `docs/API-CONTRACT.md`
- Endpoint inventory + auth requirements
- Error code matrix and retry semantics

---

## Phase 2 — Backend Pipeline Implementation (Day 2-5)
1. Build orchestrator function for intake + routing.
2. Build queue/background workers for long-running tasks.
3. Implement deterministic state model for cases:
   - `NEW -> TRIAGED -> IN_PROGRESS -> RESOLVED | ESCALATED | FAILED`
4. Add persistence for:
   - case records
   - timeline events
   - retries and terminal failures
5. Integrate outbound channels (email/slack/helpdesk) via adapters.
6. Add rate limiting and abuse controls on intake endpoints.

**Deliverables**
- Deployable backend functions
- Case state persistence
- Retry + dead-letter handling

---

## Phase 3 — Frontend Integration in This Repository (Day 4-6)
1. Add service client methods in `src/lib/api.js` wrappers (or dedicated module).
2. Add SWR hooks for case list/detail and status polling where needed.
3. Add operator UI surfaces:
   - case queue view
   - case detail timeline
   - escalation + retry controls
4. Add role/permission gates to prevent unauthorized actions.
5. Add UX for async states (loading, empty, soft-fail, hard-fail).

**Deliverables**
- Console or panel integrated into existing dashboard pattern
- Typed payload handling + user-friendly error states

---

## Phase 4 — Observability, SLOs, and Runbooks (Day 5-6)
1. Structured logs with correlation IDs per case.
2. Metrics:
   - intake volume
   - first response time
   - resolution time
   - failure/retry rates
   - escalation rate
3. Alerting thresholds aligned to SLA breaches.
4. Create runbooks:
   - pipeline degraded
   - downstream outage
   - queue backlog spike
   - false-positive classifier routing

**Deliverables**
- Dashboards + alerts
- `docs/CUSTOMER-SERVICE-RUNBOOK.md`

---

## Phase 5 — Security, Compliance, and Hardening (Day 6-7)
1. Data classification for all payload fields.
2. PII masking/redaction in logs.
3. Retention and deletion policy implementation.
4. JWT and role enforcement for all operator endpoints.
5. Add replay protection/idempotency for write paths.
6. Validate CORS behavior and header requirements across frontend/backend.

**Deliverables**
- Security checklist signed off
- Compliance checklist signed off

---

## Phase 6 — QA, Staging Rehearsal, and Production Rollout (Day 7-8)
1. Test strategy:
   - unit tests (classification, routing)
   - integration tests (API + persistence)
   - end-to-end smoke tests (intake to resolution)
2. Staging rehearsal using realistic synthetic tickets.
3. Canary rollout (10% traffic / selected internal users).
4. Monitor for 24-48h; then full rollout.
5. Keep rollback switch for routing back to legacy/manual handling.

**Deliverables**
- Test evidence bundle
- Go-live decision record
- Rollback verification log

---

## Repository Change Plan (Concrete Tasks)
1. **Docs**
   - Add pipeline spec + runbook docs under `docs/`.
   - Update `docs/API-CONTRACT.md` with endpoint schemas.
2. **Frontend**
   - Add customer-service API calls and hooks.
   - Add operator console module using existing dynamic console conventions.
3. **Config**
   - Add environment variables for service endpoints/feature flags.
4. **Quality gates**
   - Add tests and a deployment checklist script.
5. **Release**
   - Tag release notes and changelog entry for pipeline launch.

## Risks & Mitigations
- **SOP ambiguity** → mitigation: formal mapping workshop and sign-off before coding.
- **Third-party channel outages** → mitigation: queue + retry + dead-letter + fallback channel.
- **Misrouting by classifier** → mitigation: confidence thresholds + human override queue.
- **Silent failures** → mitigation: correlation IDs + alerting on lag/error budget burn.

## Decision Log Needed Before Build Starts
- Canonical case datastore (where case timelines live)
- Priority/severity scoring model
- Escalation ownership by time window
- Human-in-the-loop requirements
- Definition of "resolved" per ticket class

## Suggested 8-Day Timeline Snapshot
- Day 0-1: SOP mapping + spec lock
- Day 1-2: API contract + schema
- Day 2-5: backend pipeline implementation
- Day 4-6: frontend integration
- Day 5-6: observability/runbooks
- Day 6-7: security/compliance hardening
- Day 7-8: staging rehearsal + canary + production

## Immediate Next Action
Open the SOP file and complete the mapping table (SOP step → endpoint/function → owner → SLA → escalation rule). Once mapped, begin Phase 1 contract implementation.
