---
name: mansoor-premium-architecture-verification
description: Use when independently reviewing an architecture proposal for completeness, contradictions, operability, security, performance, and migration risk.
---

# Premium architecture verification

Review the proposal against observed repository evidence, requirements, critical journeys, contracts, threat model, failure matrix, capacity budgets, deployment topology, and rollback plan. Look for hidden coupling, unowned data, impossible states, unverifiable claims, and scope drift.

Return blocking findings first, then bounded improvements. Verify that the design can be implemented incrementally and tested without relying on a future platform that does not exist.

Stop only after one independent pass and an explicit list of unresolved assumptions.
