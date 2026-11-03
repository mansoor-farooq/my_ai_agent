---
name: workflow-idempotency
description: Use when workflow triggers, APIs, jobs, events, callbacks, payments, imports, or retries can deliver the same operation more than once.
---

# Workflow Idempotency and Deduplication

Guarantee that repeated delivery does not silently duplicate business effects.

## Pattern

1. Choose a stable operation key from the source event/request and scope it by tenant and operation type.
2. Persist key, payload hash, status and result with a unique constraint; do not rely on an in-memory cache.
3. On duplicate delivery, distinguish exact replay from key reuse with changed content. Return the original result for replay and reject conflicting reuse.
4. Make the state change and deduplication record atomic where possible; use an outbox/inbox pattern across service boundaries.
5. Define retention based on the source's maximum redelivery window and business/legal requirements.
6. Test concurrent duplicates, crash after side effect, replay after timeout and changed payload under an old key.

Never retry a non-idempotent write merely because the response timed out; first determine whether the effect committed.
