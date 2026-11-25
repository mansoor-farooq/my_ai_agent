---
name: mansoor-premium-backend-migration-safety
description: Use when applying database migrations, backfills, data repairs, destructive changes, or production release transformations.
---
# Premium Backend Migration Safety
Make migrations idempotent, bounded and observable. Separate schema change from backfill, estimate lock/row impact, preserve a backup or rollback path and dry-run on representative data. Require explicit owner approval for destructive or irreversible operations.

Stop condition: migration rehearsal, rollback evidence and production guardrails are recorded.

