---
name: mansoor-premium-backend-idempotency
description: Use when implementing retries, webhooks, queues, payments, imports, scheduled work, or any operation that may execute more than once.
---
# Premium Backend Idempotency
Define a stable operation key, deduplicate before side effects, persist outcome state and make retries safe across process restarts. Model duplicate, timeout-after-commit, partial failure and out-of-order delivery cases. Never use an in-memory flag as the only guard.

Stop condition: repeated delivery produces one durable effect and a verifiable result.

