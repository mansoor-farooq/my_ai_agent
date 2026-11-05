# Ultra Agent v3 Local-First Control Plane

## Intent

Upgrade the verified Ultra Agent v2 foundation into a faster-feeling, premium-response local control plane for Antigravity. The system should automatically choose a fast or premium execution path, preserve project-scoped state, resume interrupted work, coordinate bounded specialists and return evidence-backed results.

## Goals

- Make routine work quick without loading unnecessary research, skills or agents.
- Make architecture, security, release, ML and explicit research work follow a premium multi-stage path.
- Persist task state, checkpoints, decisions and observable evidence per project.
- Detect stale or conflicting memory before it influences a decision.
- Give the manager a deterministic lifecycle and recovery contract.
- Keep the portable package dependency-free and compatible with the current Antigravity model inheritance.

## Non-goals

- No provider bridge, cloud gateway, API-key routing or hosted database in this release.
- No hidden monitoring, private-chat export, raw chain-of-thought, credentials or customer-data collection.
- No replacement of the existing manager/specialist roster or project knowledge-bank consent boundary.

## Approved direction

Use an incremental local-first control plane over the existing v2 utilities. Node.js ESM utilities own state and evidence files; the manager owns model decisions and native subagent delegation. The runtime records concise decisions, checkpoints and proof—not private reasoning.

## Modes

- **Fast:** low-complexity/reversible task, one relevant specialist at most, cached project context, no deep research unless a gate triggers it, concise result-first response.
- **Premium:** architecture/security/release/ML/payment/explicit research or high-risk task, staged plan, bounded research, specialist work, verification/evaluation, recovery checkpoint and detailed handoff.

## Lifecycle

`INTAKE → PREFLIGHT → CONTEXT → MODE → PLAN → DELEGATE → BUILD → VERIFY → EVALUATE → COMPLETE | PAUSED | RECOVERABLE_FAILURE`

Every transition is persisted with a project ID, task ID, timestamp, actor, status, evidence references and safe error summary.

## Acceptance

V3 is ready when the portable ZIP contains the runtime, manager contract and protocol; fast/premium selection is automatic and tested; interrupted runs can resume from a checkpoint; stale/conflicting memory is surfaced; evaluation rejects missing verification evidence; all current v2 checks remain green; and the build is owner-signed.
