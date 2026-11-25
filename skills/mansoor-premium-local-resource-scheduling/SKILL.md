---
name: mansoor-premium-local-resource-scheduling
description: Use when scheduling local inference around CPU, RAM, GPU/VRAM, context, concurrency, and interactive latency limits.
---

# Local resource scheduling

Probe available resources and choose context, concurrency, batch, and worker limits conservatively. Keep one heavy generation active unless capacity evidence supports more. Prefer queueing and resumable work over swapping or starving the host.

Stop when the schedule has a bounded resource budget and a recovery path for overload.
