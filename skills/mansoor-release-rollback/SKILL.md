---
name: mansoor-release-rollback
description: Use when designing release strategies, canary or blue-green rollouts, database migrations, rollback criteria, or post-deploy verification.
---

# Mansoor Release and Rollback

Design releases so that failure detection, stop conditions and recovery are concrete before traffic changes.

- Choose the rollout shape that the detected platform actually supports; do not prescribe canary, blue-green or automatic rollback by default.
- Define baseline and post-release health signals, sampling window, thresholds, owner and stop action.
- For schema changes, check expand/contract compatibility, backfill progress, old/new application overlap and whether rollback remains safe after writes.
- Define rollback target and mechanism, data-loss limits, backup/restore evidence and the point after which rollback becomes unsafe.
- Separate rollback plan from rollback proof. A plan is not a successful rollback; only observed output and recovered health prove execution.
- Define smoke checks for critical user journeys and monitoring signals after rollout.

## Stop condition

The rollout has measurable gates and a safe recovery path for both application and data state, or is explicitly blocked with missing evidence listed.
