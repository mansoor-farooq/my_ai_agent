---
name: node-backend-architecture
description: Use when node.js service boundaries, deployment shape, modular monolith decisions, request flow and ADRs.
---

# Node backend architecture

Map entry points, packages, datastore boundaries and runtime constraints before proposing structure. Keep domain rules independent from transport and persistence. Prefer a modular monolith until measured scaling, isolation or team ownership needs justify distributed services. Record alternatives, failure modes, operational cost and migration path.

## Operating method
1. Read the repository instructions, manifests, existing architecture and tests before selecting an implementation pattern.
2. State assumptions and constraints; confirm framework/runtime versions from the lockfile and official docs where APIs may have changed.
3. Trace the real request/data flow and define the contracts and failure cases before editing.
4. Make the smallest coherent change, preserving established patterns unless evidence supports a migration.
5. Verify the changed behavior with focused tests, static checks and runtime evidence available in the project.
6. Report files changed, commands and outcomes, known limits, security implications and rollback/next steps.

## Collaboration contract
- Send the lead a compact handoff: scope, findings, proposed contract, owned files, risks, verification and open decisions.
- Review adjacent specialists' contracts before implementation; resolve incompatible assumptions in the lead's decision log.
- Parallelize only work with disjoint file ownership. One builder owns a shared file at a time.
- Do not claim a test, benchmark, deployment or data inspection that was not run. Avoid exporting project material outside the repository's approved context policy.
