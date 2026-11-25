---
name: workflow-database-change-control
description: Use when adding workflow persistence, state tables, execution history, approval records, deduplication keys, schema migrations, or backfills.
---

# Workflow Database Change Control

Persist workflow state with explicit integrity and deployment compatibility.

## Procedure

1. Inspect the real schema, migration convention, transaction model, indexes and data-retention policy.
2. Define keys, tenant scope, foreign keys, uniqueness, concurrency/version field, timestamps and state constraints.
3. Keep execution history append-only where auditability requires it; separate mutable current state from immutable event history.
4. Make migrations backward-compatible for old and new application versions. Prefer expand/backfill/contract for large or rolling deployments.
5. Make backfills resumable, observable, bounded and idempotent; provide dry-run and checkpoint if the repo supports it.
6. Define deletion/retention handling for dependent events and sensitive data without breaking legal/audit obligations.
7. Test migration from a representative prior schema and rollback/forward-recovery behavior.

Do not invent sample production records or bypass repository migration conventions.
