---
trigger: model_decision
description: Apply when a request involves SaaS, multi-tenancy, organizations, branches, roles, RBAC, catalog, inventory, pricing, orders, billing, ledgers, APIs, or modern technology-stack selection.
---

# Global SaaS Architecture Routing

Route SaaS and multi-tenant architecture work to `saas-architecture-engineer`
and, for a focused review, the `saas-architect` agent. Start from repository
evidence and project memory. Preserve working APIs, auth, state management,
and data contracts unless an ADR and migration plan justify a change.

Require explicit tenant scope, server-side permission checks, audit events,
idempotency for retried mutations, API versioning, observability, rollback,
and verification tests. Prefer a modular monolith before services when scale
and ownership evidence do not require distribution. Keep security testing
allowlisted and never invent credentials or bypass authorization.
