---
name: open-source-first-development
description: Use when starting a custom feature, app module, workflow or architecture decision where an existing public/open-source implementation may provide reusable code, data models, APIs, tests or design inspiration.
---

# Open-Source-First Development

Do not start from scratch by default. First perform bounded GitHub/public-source discovery, then make an evidence-backed decision: `reuse`, `adapt`, `inspire`, or `custom`.

## Required gate

1. Search for relevant repositories, official examples and maintained implementations. Use the user's named projects first, then broaden to adjacent repositories.
2. Record each candidate's URL, owner/name, license, default branch and commit, last meaningful activity, capabilities, source files/modules, tests, security notes and provenance obligations.
3. Read the relevant source paths deeply enough to map architecture, data models, workflows, APIs, tests and integration boundaries. Do not claim a repository was reverse-engineered from stars, README text or a shallow scan.
4. Run `tools/open-source-first-gate.mjs` or produce the same `mansoor.open-source-gate/v1` envelope. Stars/forks are discovery signals only; license, maintenance, compatibility, security and evidence have priority.
5. Choose one decision:
   - `reuse`: compatible licensed module and boundary can be used with minimal change.
   - `adapt`: strong source exists but APIs, data, UI or contracts need controlled changes.
   - `inspire`: patterns are useful but direct code reuse is not appropriate.
   - `custom`: no viable source survives the bounded search or constraints.
6. Return a capability matrix, selected source references, license/provenance obligations, adaptation gaps and a stop condition to the manager before implementation.

## Boundaries

- Public visibility is not a license. Missing, unknown or incompatible licensing blocks direct reuse and may still permit pattern-level inspiration only after the manager records the boundary.
- Never copy secrets, customer data, proprietary assets, generated credentials, incompatible licensed code or an entire repository without an approved scope.
- Preserve the target project's APIs, data ownership, security, tests and contracts. Use adapters or isolated modules when upstream assumptions differ.
- If discovery is blocked, report the exact evidence gap; do not silently pretend that scratch code is open-source-derived.

## Handoff

Return `status`, `scope`, `candidates`, `selected`, `decision`, `reverseEngineeringMap`, `licenseAndProvenance`, `changes`, `checks`, `gaps`, and `stopCondition`. The manager owns final source selection, approval, integration and verification.
