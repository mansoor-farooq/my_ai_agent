---
name: security-casebook
description: Write evidence-backed cybersecurity cases with exploit preconditions, impact, remediation and verification for application changes.
---

# Security Casebook

For each finding, record:

- affected path, symbol or boundary;
- observed behavior and evidence;
- threat actor, preconditions and reachable asset;
- impact and severity rationale;
- smallest safe fix, compensating control and migration concern;
- focused verification, negative-path check and residual risk.

Trace identity, authorization, tenant/data ownership, input validation, secrets, logging, dependency/supply-chain and failure/retry behavior. Give the implementation specialist a concrete fix contract, then re-check the denied path and regression evidence. Do not probe third-party systems, extract secrets or claim exploitability without repository evidence.
