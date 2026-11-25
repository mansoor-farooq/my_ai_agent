---
name: mansoor-premium-local-structured-output
description: Use when a local model must return plans, patches, findings, tool calls, or handoffs that another agent can validate deterministically.
---

# Local structured output

Use a small schema with objective, assumptions, evidence, actions, changed paths, checks, blockers, and stop condition. Reject malformed or scope-expanding output before execution. Keep prose as a human summary beside—not instead of—the machine envelope.

Stop when the envelope validates and no hidden action is implied by free text.
