---
name: mansoor-premium-architecture-event-consistency
description: Use when a system uses events, queues, webhooks, retries, projections, or asynchronous workflows with consistency and ordering concerns.
---

# Premium event consistency

Model command, event, state transition, delivery guarantee, ordering key, deduplication key, retry policy, dead-letter path, replay behavior, and compensating action. Make temporal assumptions explicit and keep external side effects idempotent.

Test duplicate, delayed, reordered, partial, and replayed messages. Prefer an outbox or equivalent durable handoff when database state and event publication must move together.

Stop when every asynchronous path has a recovery owner and observable terminal state.
