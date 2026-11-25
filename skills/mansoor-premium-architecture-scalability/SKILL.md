---
name: mansoor-premium-architecture-scalability
description: Use when planning capacity, latency, throughput, concurrency, caching, partitioning, or growth limits for a production system.
---

# Premium scalability

Start from workload shape and service-level objectives: request mix, payload size, concurrency, burst, storage growth, fan-out, hot keys, and acceptable degradation. Identify the dominant bottleneck and measure it before adding distributed complexity.

Define budgets, backpressure, cache invalidation, pagination, rate limits, and capacity thresholds. Include a graceful-degradation path for dependencies and overloaded tenants.

Stop when scale claims are tied to a repeatable benchmark or an explicit measurement plan.
