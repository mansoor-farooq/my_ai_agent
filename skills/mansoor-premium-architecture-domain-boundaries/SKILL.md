---
name: mansoor-premium-architecture-domain-boundaries
description: Use when defining bounded contexts, module ownership, dependency direction, or business capability boundaries for a growing project.
---

# Premium domain boundaries

Derive boundaries from business invariants, ownership, data lifecycle, change frequency, and failure isolation—not folder names alone. Define commands, queries, events, public contracts, internal details, and forbidden dependencies for each boundary.

Prefer a modular monolith seam when independent deployment is not justified. Record boundary violations as explicit risks and propose the smallest enforceable dependency rule.

Stop when each critical capability has one owner, one source of truth, and a testable dependency direction.
