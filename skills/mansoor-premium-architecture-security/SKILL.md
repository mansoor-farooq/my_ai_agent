---
name: mansoor-premium-architecture-security
description: Use when architecture decisions affect identity, authorization, tenant isolation, secrets, trust boundaries, or sensitive data flows.
---

# Premium security architecture

Draw trust boundaries and data-flow threats before selecting components. Define identity propagation, authorization decisions, tenant scope, secret lifecycle, encryption boundaries, audit events, abuse limits, and fail-closed behavior.

Challenge confused-deputy paths, implicit trust from internal networks, client-controlled ownership fields, and logs that expose sensitive data. Keep security controls testable at the boundary where they matter.

Stop when high-risk negative paths have an owner, an executable check, and a recovery response.
