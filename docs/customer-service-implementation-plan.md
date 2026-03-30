# Customer Questions + Service SOP Implementation Plan

Owner: **Parrish** (<parrish@Moderncre8ve.com>)
Date: 2026-03-16
Status: Draft for execution

## Objective
Implement the updates from:
- `Moderncre8ve_Top_10_Customer_Questions.md`
- `Moderncre8ve_Customer_Service_SOP.md`

And operationalize them across storefront content, internal workflows, and measurement.

## Assumptions
- The two source documents are the single source of truth for exact copy and policy language.
- Existing storefront architecture remains unchanged (Hydrogen + Weaverse).
- Changes should prioritize speed-to-launch and low regression risk.

## Workstreams

### 1) Content Mapping + Canonical Answers
**Goal:** Convert the Top 10 customer questions into approved, reusable answer blocks.

**Tasks (Parrish):**
1. Create a canonical Q&A matrix in Google Sheet/Notion with these columns:
   - Question
   - Approved answer
   - Confidence/risk tier (Low/Medium/High)
   - Page/placement target (PDP, Collection FAQ, Shipping page, etc.)
   - Last reviewed date
2. Reconcile answer language with SOP policy terms (returns, delivery windows, lead times, exceptions).
3. Mark questions needing legal/ops confirmation.

**Deliverable:** Approved Q&A matrix ready for website + support scripts.
**Target:** 2 business days.

---

### 2) Storefront Implementation (Hydrogen/Weaverse)
**Goal:** Publish the approved Q&A content in high-intent locations.

**Tasks (Parrish):**
1. Prioritize placement order:
   - Product page FAQ module
   - Collection FAQ sections
   - Shipping/Delivery policy content
   - Contact / customer service page snippets
2. Provide final copy per placement with character limits and CTA link targets.
3. Confirm tone/brand alignment (Jost/Spectral brand voice, premium handcrafted positioning).
4. Open implementation tickets in project tracker with:
   - exact copy
   - target URL(s)
   - acceptance criteria

**Engineering subtasks (to assign by Parrish):**
- Update `app/utils/collection-faqs.ts` for collection-level FAQs.
- Update relevant Weaverse page JSON fallbacks under `weaverse-pages/` where needed.
- Update section settings/content in relevant `app/sections/*` components if schema fields are required.

**Deliverable:** Staged storefront FAQ/policy content updates.
**Target:** 3–4 business days after Workstream 1 sign-off.

---

### 3) Customer Service SOP Operational Rollout
**Goal:** Translate SOP into repeatable day-to-day support handling.

**Tasks (Parrish):**
1. Define ticket taxonomy/tags (e.g., lead-time, white-glove, returns, damages, finish options).
2. Build macros/templates for top question categories:
   - first response
   - follow-up response
   - escalation response
3. Create escalation matrix:
   - Tier 1: standard FAQ answer
   - Tier 2: order-specific exception review
   - Tier 3: founder/ops escalation
4. Set SLA targets by category (first response and resolution targets).
5. Run team calibration session and approve final SOP playbook.

**Deliverable:** Live SOP playbook + macro library + escalation matrix.
**Target:** 5 business days.

---

### 4) QA + Compliance Validation
**Goal:** Ensure policy accuracy and consistency across all channels.

**Tasks (Parrish):**
1. QA checklist across website, support macros, and SOP docs:
   - lead-time consistency (furniture vs wax products)
   - delivery language consistency (white glove)
   - return/cancellation language consistency
2. Review edge-case scripts (damaged item, delayed production, address change requests).
3. Execute sign-off checklist with ops + support lead.

**Deliverable:** Signed QA checklist and release approval.
**Target:** 1–2 business days.

---

### 5) Launch + Measurement
**Goal:** Measure whether updates reduce friction and increase conversion confidence.

**Tasks (Parrish):**
1. Define KPIs:
   - % reduction in repetitive pre-purchase support questions
   - conversion rate lift on PDPs with updated FAQs
   - first response time / resolution time trend
2. Coordinate with analytics owner for event tracking if new FAQ interactions are added.
3. Publish 30-day post-launch readout with recommendations.

**Deliverable:** KPI dashboard + 30-day readout.
**Target:** 30 days post-launch.

## Tasking Plan for Parrish

### Immediate Assignment Email/Brief
**Assignee:** parrish@Moderncre8ve.com

**Subject:** Action Plan — Top 10 Customer Questions + Customer Service SOP Rollout

**Message:**
Please execute the 5-workstream implementation plan in this order:
1. Content mapping and canonical answers
2. Storefront content deployment requirements
3. SOP operational rollout
4. QA/compliance validation
5. Launch measurement

Please provide:
- Day 2: Canonical Q&A matrix draft
- Day 5: Storefront implementation ticket pack + SOP macro draft
- Day 7: QA sign-off checklist
- Day 30: KPI performance readout

Escalate any unresolved policy conflicts within 24 hours.

## RACI (Lightweight)
- **Responsible:** Parrish
- **Accountable:** Store owner/leadership
- **Consulted:** Engineering, Ops/Delivery, Customer Support
- **Informed:** Marketing/SEO

## Risks + Mitigations
- **Risk:** SOP and website copy diverge.
  - **Mitigation:** Single canonical Q&A matrix as source for both channels.
- **Risk:** Ambiguous policy scenarios create inconsistent support answers.
  - **Mitigation:** Mandatory escalation matrix and edge-case scripts.
- **Risk:** Content shipped without performance insight.
  - **Mitigation:** Define KPIs before launch and run 30-day readout.

## Definition of Done
- Top 10 questions have approved canonical answers.
- All high-intent storefront touchpoints show updated, consistent policy content.
- SOP macros and escalation paths are in use by support.
- QA checklist signed off.
- KPI readout completed after 30 days.
