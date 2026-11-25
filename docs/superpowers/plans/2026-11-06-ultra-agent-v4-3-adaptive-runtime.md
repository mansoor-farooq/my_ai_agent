# Ultra Agent V4.3 Adaptive Runtime Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a measurable, provider-free, safer and faster V4.3 runtime covering benchmarks, bounded parallel delegation, hybrid RAG, memory lifecycle, targeted recovery, adaptive routing, security policy and consistent native activity updates.

**Architecture:** Preserve the current V2/V3 interfaces and add focused modules. Canonical project identity and append-only evidence connect the modules; deterministic tests prove each behavior before implementation.

**Tech Stack:** Node.js ESM, PostgreSQL 17, built-in `node:test`, PowerShell packaging.

**Spec:** `docs/superpowers/specs/2026-11-06-ultra-agent-v4-3-adaptive-runtime-design.md`

## Global Constraints

- No external provider, API key, model download, remote telemetry, or standalone dashboard.
- Keep `production-orchestrator` as the only delegating manager.
- Preserve existing CLI fields and current user-project structure/contracts.
- Maximum parallel worker count is three; concurrent writers require disjoint owned paths.
- Metrics and memory never store secrets, raw prompts, hidden reasoning, or customer data.
- Recovery never performs an automatic destructive rollback.

## Review Focus

- Dirty repositories: checkpoint/rollback planning must report drift without overwriting unrelated work.
- Repeated identical failures: recovery stops instead of looping or broadening scope.
- Conflicting/unversioned evidence: it must not become a verified fact.
- Hybrid RAG with empty/short queries: stable empty result and deterministic project isolation.
- Parallel work with overlapping paths or dependency cycles: planning blocks or serializes safely.

---

### Task 1: Canonical identity and evidence lifecycle

**Files:** Create `tools/ultra-agent-v2/project-identity.mjs`; modify `memory.mjs`, `evidence.mjs`, `context.mjs`; update V2/context tests.

**Interfaces:** Produces `projectIdentity({dir, project})`, versioned evidence, `memory.mjs compact`, bounded conflict-aware context.

- [ ] Write failing identity/evidence/compaction tests and observe expected failures.
- [ ] Implement canonical sanitized identity, append-only supersession, freshness/conflict filtering, and atomic snapshot compaction.
- [ ] Run focused V2/context tests green.

### Task 2: Hybrid RAG and freshness

**Files:** Modify `rag.mjs`; update `project-rag.test.mjs`.

**Interfaces:** Produces `missing|stale|ready` status and `query --ranking lexical|hybrid` with component scores.

- [ ] Write failing incremental-refresh, stale-status, identity and hybrid-ranking tests.
- [ ] Fix hash comparison, add revision/fingerprint metadata, local signed-hash vectors and deterministic reranking.
- [ ] Run focused RAG tests green against local PostgreSQL.

### Task 3: Benchmarks, routing and targeted recovery

**Files:** Create `tools/ultra-agent-v4/benchmark.mjs`, `recovery.mjs`; modify `mode.mjs`, `evaluate.mjs`; add tests.

**Interfaces:** Produces metrics record/summary, additive execution profile/escalation policy, and bounded recovery plan.

- [ ] Write failing benchmark/routing/recovery behavior tests.
- [ ] Implement project-local redacted metrics, deterministic percentiles/failure taxonomy, adaptive profile, and two-attempt targeted recovery.
- [ ] Run focused tests green.

### Task 4: Safe parallel delegation

**Files:** Create `tools/ultra-agent-v3/delegation.mjs`; modify `plan.mjs` and router; add tests.

**Interfaces:** Produces dependency-safe waves with max parallelism three while retaining flat specialist fields.

- [ ] Write failing tests for disjoint writers, overlaps, missing/cyclic dependencies, reviewers and cap.
- [ ] Implement deterministic scheduler and plan-envelope integration.
- [ ] Run focused routing/delegation tests green.

### Task 5: Runtime policy and activity contract

**Files:** Create `policy.mjs`, `activity.mjs`; update manager/specialist profiles, doctor and activity tests.

**Interfaces:** Produces policy decisions and validated/redacted activity events plus parent-update formatter.

- [ ] Write failing policy, activity redaction/schema/concurrency, and single-manager delegation tests.
- [ ] Implement modules; remove nested delegation from specialists and image generation from manager.
- [ ] Run focused security/activity/doctor tests green.

### Task 6: Packaging, docs, memory and release

**Files:** Update package/build/checksum/portable assertions, protocol, project memory, version and release artifacts.

**Interfaces:** Portable signed V4.3 package containing every new runtime module and current documentation.

- [ ] Update packaging assertions and bump release version.
- [ ] Run full build, doctor, test suite, live local RAG smoke and diff check.
- [ ] Record project memory and final verification evidence; obtain fresh whole-branch review and address Critical/Important findings with RED→GREEN tests.

