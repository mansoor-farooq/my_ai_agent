---
name: open-source-architecture-research
description: Evaluate architecture choices using official documentation and maintained open-source projects before proposing a system boundary, framework or integration pattern.
---

# Open Source Architecture Research

Use for new architecture, migrations, framework selection, integration boundaries and production-scale design.

- Start with the repository's actual stack, constraints, contracts and deployment shape.
- Search first-party documentation and maintained open-source repositories that use the candidate pattern. Prefer source code, release notes, ADRs and official examples over blog summaries.
- Compare at least two viable patterns only when the choice affects reliability, cost, security, operations or user effort. State what evidence supports each trade-off.
- Produce an architecture contract: components, ownership, data flow, failure paths, observability, security controls, migration/rollback and verification plan.
- Do not introduce a package, service or cloud resource solely because it appears in a reference project. Verify compatibility with the current repository before recommending it.
- Save a concise ADR or feature design when the decision is durable. Wait for manager/user approval before implementation when the boundary is material.
