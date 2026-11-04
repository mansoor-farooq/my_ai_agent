---
trigger: model_decision
description: Apply when planning or reviewing architecture, adding a cross-cutting feature, changing module boundaries, choosing technology, designing cloud/data flows, or making a consequential refactor.
---

# Global Architecture Governance

Use this rule for consequential design work. Start from repository evidence and
the project-context memory; do not recommend a pattern before understanding the
current stack, boundaries, ownership, constraints, and failure modes.

## Planning gate

Before implementation, state:

1. Desired outcome and what must remain unchanged.
2. Current architecture and affected modules/contracts.
3. Quality scenarios: reliability, security, performance, operability,
   accessibility, cost, and delivery speed as relevant.
4. Two or three viable options with trade-offs, reversibility, migration cost,
   and operational impact.
5. The selected option, rejected alternatives, open evidence gaps, and a
   smallest working slice.

Ask only high-value questions. If an answer is not blocking, make an explicit
assumption and record it. Do not ask again for information already verified in
project memory or source.

## Structure rules

- Follow the dominant existing pattern unless an ADR justifies a migration.
- Prefer clear module or feature boundaries and one owner for each business
  capability and writable entity.
- Keep domain/business rules independent from UI, framework details, storage,
  and transport adapters where the project complexity justifies that boundary.
- Use adapters/anti-corruption layers at external API or legacy boundaries.
- Do not introduce microservices, event buses, repositories, generic wrappers,
  or interfaces with one implementation without a measured reason.
- Keep dependencies pointed toward stable policy; avoid cycles, god modules, and
  hidden shared mutable state.
- Preserve existing API, auth, persistence, and state-management contracts
  unless the requested change explicitly includes them.

## Cloud and data decisions

For cloud or distributed flows, make authority, consistency, ordering, retries,
timeouts, idempotency, partial failure, recovery, observability, data residency,
and cost explicit. Do not invent scale or compliance requirements. Choose the
simplest deployment shape that satisfies observed scenarios, and document any
provider-specific lock-in or exit path.

## Evidence and records

- Write an ADR for technology, boundary, data ownership, auth, migration, or
  cross-cutting decisions that future work must preserve.
- Define a fitness check, test, lint rule, or observable metric for each
  significant architectural invariant.
- Label conclusions as observed, strong inference, or unverified.
- Review callers, consumers, migration paths, error paths, and rollback before
  changing a public contract.

## Delivery gate

Implement the smallest coherent slice, keep code compact without removing
validation or failure handling, and verify with focused tests plus analyzer,
build, or runtime evidence. Review the diff for accidental API, dependency,
secret, and architecture drift before reporting completion.
