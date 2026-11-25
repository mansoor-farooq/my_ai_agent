---
name: mansoor-premium-architecture-reliability
description: Use when designing failure handling, recovery, availability, disaster recovery, or operational resilience into an application architecture.
---

# Premium reliability

Create a failure matrix for dependencies, storage, queues, deploys, credentials, regions, and operator mistakes. Define timeout, retry, circuit-breaker, fallback, durability, recovery point, recovery time, and runbook expectations for each critical path.

Prefer one controlled retry and explicit terminal errors over retry storms. Verify that health signals distinguish dependency failure from application failure.

Stop when the highest-risk failures have tested recovery evidence and a named owner.
