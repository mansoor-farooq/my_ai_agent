---
name: mansoor-premium-local-verifier-loop
description: Use when a local model's implementation or answer needs an independent correctness, security, regression, or artifact check.
---

# Local verifier loop

Use a separate read-only verifier prompt and fresh evidence packet. Check the requested behavior, negative paths, scope, provenance, tests, and generated artifacts. Do not let the implementing model mark its own unverified output as passed.

Stop after one targeted repair and one independent recheck; escalate repeated disagreement.
