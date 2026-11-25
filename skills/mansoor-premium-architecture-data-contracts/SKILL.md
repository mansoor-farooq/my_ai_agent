---
name: mansoor-premium-architecture-data-contracts
description: Use when designing APIs, events, DTOs, schemas, file formats, or cross-module contracts that must evolve safely.
---

# Premium data contracts

Define canonical fields, identity, ownership, nullability, units, validation, ordering, idempotency keys, error envelopes, compatibility policy, and versioning. Trace each contract to a consumer and a verification case. Separate transport models from domain invariants.

Prefer additive evolution, explicit deprecation, and contract tests. Never hide a breaking change behind a renamed field or an undocumented fallback.

Stop when producer and consumer expectations are executable and rollback behavior is documented.
