---
name: pre-implementation-evidence-gate
description: Require repository reconstruction, targeted web/reference research, risk review and an evidence-backed implementation brief before material feature work.
---

# Pre-Implementation Evidence Gate

Use this gate before implementing every new feature, integration, architecture change, security-sensitive change, migration, UI direction or dependency/framework decision. A tiny typo or one-line mechanical fix can use a short local-only note; it must still state why external research is not material.

## Required sequence

1. **Scope and success** — record intent, user, non-goals, anti-goals, acceptance evidence and the files that may change.
2. **Repository reconstruction** — read project instructions and memory, inspect manifests/lockfiles, trace entrypoint → state → service/API/database → output, and record contracts, permissions, failure paths and current tests.
3. **Current reference research** — use `search_web` and `read_url_content` before implementation. Prefer official documentation, standards and maintained open-source projects. Use exact technology/domain queries, open primary sources, and verify high-impact claims with a second source.
4. **Evidence ledger** — save source title, publisher, direct URL, access date, exact claim, product implication and confidence. Separate Observed repository facts, external evidence, Strong inference and Unverified unknowns.
5. **Risk and fit review** — check security/authorization, privacy/secrets, data/schema/API contracts, accessibility/responsive behavior, performance, observability, dependency/license compatibility, migration/rollback, cost/quota and test coverage as relevant.
6. **Decision brief** — compare alternatives only when the choice is material, recommend one, show affected paths, implementation boundaries, verification commands and rollback. For UI, include a compact wireframe/tokens and wait for user approval of a material visual direction.
7. **Implementation handoff** — only after the gate is complete, delegate a bounded change to the domain specialist. The specialist updates the feature document and project memory with evidence and reports what was actually verified.

## Stop conditions

- Stop before code when repository contracts, permissions, a data boundary or a material UI direction is unresolved.
- If research is blocked, say so and keep the task in discovery/approval; do not present remembered patterns as current facts.
- Never send secrets, private project files, customer data or hidden reasoning to research/image tools.
- Never copy protected source or layouts from references; extract principles and cite the source.

## Minimum artifact

`research/` or the repository's established decision location should contain a compact ledger/brief for material work. It must link to the feature document, plan/progress entry and verification evidence. Do not create duplicate docs when the project already has the correct location.
