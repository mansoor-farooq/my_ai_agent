---
name: enterprise-product-systems-review
description: Use when upgrading an existing ERP, inventory, commerce or SaaS product by mapping its real flows against proven open-source references and producing an evidence-backed gap, architecture, UI, security, documentation and acceptance plan.
---

# Product systems gap review

Use this skill for cross-domain product upgrades such as inventory and ERP systems, super-admin consoles, commerce operations and multi-tenant SaaS. The Mansoor AI Team Manager owns the task plan and final synthesis. Specialists own bounded reviews; no specialist becomes a second manager.

## 1. Reconstruct the current product first

Start read-only. Read project instructions, existing product docs and recent project memory; map the actual repository, routes/screens, APIs, entities, permissions, state transitions, integrations, migrations and tests. Trace the real user-visible flow through UI, API, persistence and downstream effects. Mark unknowns as unknown. Do not assume an inventory app is a marketplace or add modules outside the requested product boundary.

## 2. Research proven references, then adapt

For Medusa, ERPNext/Frappe and other relevant open-source systems, identify the exact repository/doc version, current maintenance state, license and the specific flow or invariant being compared. Prefer official documentation and source code. Record direct URLs and file/doc anchors. Do not infer behavior from stars, screenshots, marketing copy or an incompatible release. Treat the reference as a source of patterns, not permission to copy code. Check license and compatibility before recommending code reuse; otherwise describe the concept to adapt.

## 3. Build an actor and capability map

List actual actors and their authority separately. For an inventory/ERP/SaaS product, consider only roles supported by the request and evidence: platform super-admin, tenant/org admin, branch manager, warehouse operator, purchaser, sales/order operator, finance/auditor and customer. For each role, map allowed reads, create/update/submit/cancel/approve/export actions, tenant/branch boundaries and sensitive fields. A hidden menu is not an authorization rule.

Create a traceable matrix:

| Area / journey | Current behavior | Reference pattern | Gap / risk | Proposed behavior | Owner | Acceptance test |
|---|---|---|---|---|---|---|

Cover critical happy paths and exceptions relevant to the real scope, for example catalog/variants, stock locations, receipts, transfers, reservations, adjustments, returns, low-stock replenishment, order allocation, audit history, imports/exports and recovery. Do not mark uninspected areas as covered.

## 4. Predict failures from explicit invariants

Inspect business rules and failure boundaries, not just screen presence. Check tenant isolation; role escalation; stale/concurrent stock; negative inventory policy; duplicate/retried submissions; idempotency; reservation expiry; partial shipments/returns; immutable ledger and valuation reconciliation; timezone/currency precision; import validation and rollback; webhook ordering; audit attribution; and failed/compensated workflows. Include a failure scenario only when it follows from observed architecture, a documented requirement or a clearly labeled risk hypothesis.

For each gap record: affected actor and journey, current evidence, expected rule, failure/impact, severity and confidence, smallest safe change, dependency/owner, migration or rollback concern, and a repeatable acceptance/negative-path test. Separate confirmed defect from likely gap and future enhancement.

## 5. Propose architecture and UI as one product contract

Describe domain boundaries, state machines, APIs/events, persistence/ledger invariants, authorization policies, audit trail, integration points and migration sequence. Pair each state/action with its screen behavior: list/search/filter, detail, approvals, empty/loading/stale/denied/error/retry states, responsive admin use and keyboard/accessibility. Keep the existing stack and design system unless evidence supports a change. Give a small number of alternatives only for real unresolved choices.

## 6. Produce documentation people can execute

Create or update, when implementation is approved: product scope/non-goals; actor/permission matrix; current and proposed journey maps; domain/data contracts; state-transition and exception tables; integration/API notes; migration/rollback notes; acceptance matrix; operator/admin guide; and unresolved-decision log. Link requirements to routes/entities/actions and tests. Do not create generic documents that repeat code without adding an operational answer.

## 7. Run the manager-owned specialist review

For a requested whole e-commerce/ERP/inventory ecosystem review, staff the complete routed group: `ecommerce-ecosystem-gap-analyst`, `open-source-commerce-researcher`, `saas-architect`, `enterprise-schema-architect`, `mansoor-ui-specialist`, `application-security-reviewer`, `research-docs-specialist` and `qa-release-specialist`. The first three independent read-only reviews may run in parallel; schema/UI/security depend on the observed gap map, docs reconcile it against verified references, and QA produces the final acceptance matrix after the domain handoffs. For a narrowly scoped question, the manager can reduce the group to only the roles relevant to that scope.

One writer owns each path after the owner-approved plan. The manager reconciles conflicts and runs an independent verification pass. No autonomous production changes, real customer actions, destructive migrations, external account changes or unapproved code reuse.

## Final handoff

Return: current-state map; checked reference versions/licenses and source links; actor/permission matrix; prioritized gaps with evidence/confidence; target architecture and UI contracts; changed paths or explicit “read-only”; exact checks/results; documentation artifacts; unresolved decisions/risks; and up to three proposed next-level improvements. State what was inspected versus not inspected. Never claim the whole product is covered from a route sample or propose behavior as an existing fact.

Stop when the approved flow map and acceptance criteria are complete, evidence blockers are explicit, or an unresolved product decision is required for safe implementation.
