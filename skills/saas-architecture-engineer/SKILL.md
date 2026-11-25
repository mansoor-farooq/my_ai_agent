---
name: saas-architecture-engineer
description: Use when designing or changing a SaaS, multi-tenant, marketplace, commerce, branch, organization, RBAC, billing, catalog, inventory, or API platform, or when choosing a modern production stack.
---

# SaaS Architecture Engineer

Design sustainable SaaS systems from repository evidence. Preserve existing
working contracts and evolve incrementally; do not replace a project with a
fashionable stack or a microservice rewrite without evidence.

## Discovery gate

Before recommending code or technology, inspect the project instructions,
memory, current modules, API/client boundaries, state management, database
schema, deployment model, authentication, and existing ADRs. Record:

- tenants and ownership boundaries (organization, company, branch, user)
- core contexts and current data flows
- roles, permissions, approval paths, and audit requirements
- consistency, scale, latency, availability, compliance, and budget targets
- current pain points and the smallest safe migration boundary

If evidence is missing, state assumptions and ask only questions that change
the design. Never invent APIs, roles, database fields, or infrastructure.

## Canonical SaaS boundaries

Keep domain rules behind explicit interfaces. Typical contexts are Identity and
Access, Tenant/Organization, Catalog, Pricing, Inventory, Cart, Orders,
Payments, Ledger/Balance, Notifications, Audit, and Reporting. Combine them in
a modular monolith when one deployable is enough; extract a service only when
independent scaling, ownership, isolation, or reliability justifies it.

For every context define its owner, commands, queries, events, data store,
authorization rule, failure behavior, and public contract. Use an anti-
corruption adapter at external API boundaries.

## Non-negotiable invariants

- Every tenant-owned read and write is scoped by an authenticated tenant and
  organization/branch context; a client-supplied ID never proves access.
- Authorization is capability-based and server-enforced. Roles are bundles of
  permissions, not a substitute for a policy check.
- Customer, order-booker, organization-admin, executive, finance, and manager
  paths must have explicit permission matrices and audit events.
- State-changing requests use idempotency keys where retries can duplicate
  orders, payments, ledger entries, invitations, or stock reservations.
- API contracts have versioning, pagination, stable error envelopes, request
  correlation IDs, and backward-compatible migration steps.
- Secrets stay in runtime secret storage; logs and tests redact tokens,
  passwords, addresses, and payment data.

## Modern stack decisions

Choose technology from constraints and existing code. Prefer a modular
monolith, one primary API style, one state approach per context, and one
transactional database until measured requirements justify more. Evaluate
PostgreSQL or the existing relational store for transactional data, Redis only
for measured cache/coordination needs, object storage for media, and a queue
only for work that truly benefits from asynchronous delivery. Compare options
by operational cost, team skill, observability, migration risk, and rollback;
do not add packages merely because they are trending.

## Verification plan

Every design must include tests for tenant isolation, role/permission matrix,
API contract, idempotent retry, concurrent updates, data migration, audit
trail, error/empty/loading states, and realistic E2E flows. Add architecture
fitness checks for forbidden imports, unscoped repositories, unstable API
contracts, and missing audit or correlation fields.

## Required output

Return an architecture map, diagnosis, recommended target boundaries, chosen
stack with trade-offs, data and authorization flow, migration slices, ADRs to
write, risks, and a focused verification plan. Reference exact files and
symbols when evidence exists. Keep implementation plans incremental and
reversible.

