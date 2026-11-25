---
name: mansoor-premium-architecture-migration-seams
description: Use when evolving an existing codebase, schema, runtime, or integration without a risky all-at-once rewrite.
---

# Premium migration seams

Split the change into compatibility-preserving steps: observe, introduce seam, dual-read or dual-write only when justified, backfill, verify, switch, and remove. Define ownership, data reconciliation, rollback window, feature flag behavior, and cleanup evidence.

Preserve stable IDs and external contracts. Never leave shadow paths or dual writes without a retirement condition and monitoring.

Stop when each migration step is independently deployable and reversible within its stated window.
