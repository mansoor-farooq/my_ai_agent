# Ultra Agent V4.3 Adaptive Runtime Design

## Status

Approved for implementation by the user on 2026-11-06.

## Intent

Improve measurable accuracy, latency, project memory, retrieval quality, safe delegation, recovery, security, and native activity consistency without restructuring user projects or adding provider/API-key dependencies.

## Architecture

- Keep `production-orchestrator` as the only delegating manager.
- Add small provider-free runtime modules under `tools/ultra-agent-v4/` for metrics and targeted recovery, and under `tools/ultra-agent-v3/` for delegation, activity, and policy enforcement.
- Canonicalize project identity across memory, evidence, context, state, and RAG.
- Upgrade PostgreSQL RAG to deterministic local hybrid ranking: full-text score, local signed-hash subword vector similarity, and path score. This is a provider-free vector reranker, not neural semantic understanding.
- Keep evidence and memory append-only. Compaction writes a validated snapshot and never deletes raw ledgers.
- Parallelize only dependency-safe work with disjoint write ownership; cap concurrency at three.
- Retry only reversible verification/recovery work. Repeated, destructive, permission, quota, or security failures stop with a blocker.
- Standardize project-local activity events while treating Antigravity's native panel as host-controlled.

## Observable contracts

1. Benchmarks report acceptance-check pass rate, verification rate, latency percentiles, and classified failures; they never use model self-rating as accuracy.
2. Mode selection remains backward compatible and adds an execution profile plus bounded escalation policy.
3. Delegation produces deterministic waves and blocks cycles, missing dependencies, and overlapping concurrent writers.
4. RAG status reports `missing`, `stale`, or `ready`; hybrid query preserves existing result fields and adds lexical/vector/path component scores.
5. Evidence records branch, commit, subject, supersession, and validity. Unversioned or contradictory evidence is excluded from verified facts.
6. Memory maintenance writes `context-snapshot.json` atomically with bounded current facts, conflicts, stale counts, and source hashes; raw ledgers remain untouched.
7. Recovery stops after two targeted attempts or a repeated failure signature and never performs automatic destructive rollback.
8. Policy decisions block destructive/external actions without approval and restrict sub-agent delegation to the manager.
9. Activity events are redacted, project-scoped, append-only, and formatted into concise assignment/milestone/blocker/handoff/completion updates.

## Non-goals

- No account/token rotation, quota bypass, hidden provider switch, remote telemetry, or standalone dashboard.
- No automatic `git reset`, checkout, deletion, or source rollback.
- No neural embedding service or downloaded model in this release.
- No claim that local activity files control or mirror Antigravity's native live panel.

## Safety and compatibility

- Existing CLI commands and returned fields remain valid; new fields/commands are additive.
- Secrets, raw prompts, hidden reasoning, customer data, and credential-bearing URLs are never persisted.
- Existing project routes, APIs, schemas, business behavior, and repository layout remain outside this hub-runtime change.
- One-time RAG rebuild is acceptable when canonical identity/vector schema is first applied.

