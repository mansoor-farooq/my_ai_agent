# Agent Capability Wave Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add eight research-backed reliability, navigation, memory, evaluation, routing, verification, observability and mobile-QA capabilities around the existing Mansoor AI Team Manager without changing project business logic or provider-routing boundaries.

**Architecture:** Keep the current V2/V3/V4 utilities and manager profile as the stable control plane. Add small, local-first adapters with JSONL/JSON artifacts and explicit project/task IDs; make every new capability callable independently and testable without a live provider. Package only the new utilities and compact manager instructions.

**Tech Stack:** Node.js ESM, built-in `node:test`, PowerShell wrappers, PostgreSQL-backed existing RAG, Flutter/ADB/Patrol/Maestro hooks when installed.

**Spec:** Research synthesis from LangGraph, Temporal, OpenAI Agents SDK, Aider, LlamaIndex, SWE-bench, OpenHands, Langfuse, Flutter, Patrol and Maestro patterns.

## Global Constraints

- Existing routes, APIs, database, permissions, IDs, project layout and business logic remain unchanged.
- Manager remains the only persistent delegator; specialist fan-out is dependency-safe and bounded.
- No automatic account switching, quota bypass, secret collection or external telemetry by default.
- All writes require project identity, policy evaluation, approval where required and inspectable evidence.
- Local tests must run without provider credentials or connected devices; unavailable device/tool checks are `unverified`, not pass.

## Review Focus

- Duplicate external side effect after retry → effect-ledger test.
- Stale approval or changed payload → approval-binding test.
- Large repository context overflow → ranked repository-map test.
- Memory presented without provenance → citation/supersession test.
- Benchmark pass with regression → baseline-preservation test.
- Parallel result merge conflict → dependency-wave test.
- Verifier retry loop never terminates → bounded convergence test.
- Secret leakage through traces or UI artifacts → redaction test.

### Task 1: Idempotent effect ledger

**Files:** Create `tools/ultra-agent-v4/effects.mjs`; Test `tools/tests/ultra-agent-v4-effects.test.mjs`; Modify `agents/Antigravity/custom-agents/production-orchestrator/agent.md`.

**Interfaces:** `createEffectKey({projectId, taskId, action, target, payload})`; `claimEffect(record, store)`; `completeEffect(key, receipt)`; `readEffect(key)`.

- [ ] Write failing tests for stable keys, duplicate claim rejection, failed-claim recovery and payload hash mismatch.
- [ ] Run the focused test and confirm the expected missing-module failure.
- [ ] Implement an append-only local JSONL effect ledger with atomic claim semantics and redacted receipts.
- [ ] Add manager instructions requiring the ledger before Git, deploy, external API and destructive writes.
- [ ] Run focused and full Node tests.

### Task 2: Resumable approval work items

**Files:** Create `tools/ultra-agent-v4/approvals.mjs`; Test `tools/tests/ultra-agent-v4-approvals.test.mjs`; Modify `tools/ultra-agent-v3/policy.mjs`, manager profile.

**Interfaces:** `createApprovalRequest(input)`; `bindApproval(request, callPayload)`; `resolveApproval(request, decision)`; `canResume(request, currentPayload)`.

- [ ] Test stale payload, wrong project, duplicate decision, reject and approve/resume paths.
- [ ] Implement serialized approval records bound to call ID, payload hash, project and contract version.
- [ ] Require policy re-evaluation on resume; approval never replaces authorization.
- [ ] Add native parent-chat wording for pending approval, resume and rejection.
- [ ] Run full tests.

### Task 3: Ranked repository map

**Files:** Create `tools/repository-map.mjs`; Test `tools/tests/repository-map.test.mjs`; Modify manager profile and packer runtime file list.

**Interfaces:** `buildRepositoryMap({dir, projectId, maxSymbols})`; `rankMap(map, query)`; `writeRepositoryMap(reportPath, map)`.

- [ ] Test symbol extraction for JS/TS/Python/Dart, ignored paths, deterministic ordering and budget trimming.
- [ ] Implement a read-only lightweight map using existing text/search primitives, with fallback for unsupported syntax.
- [ ] Make manager load the ranked map before broad file reads and preserve direct search fallback.
- [ ] Run focused and full tests.

### Task 4: Provenance-aware memory records

**Files:** Modify `tools/ultra-agent-v2/memory.mjs`; Test `tools/tests/ultra-agent-v2-memory-provenance.test.mjs`; Modify `shared/knowledge/PROJECT_MEMORY_SCHEMA.md`, manager profile.

**Interfaces:** `appendMemoryFact({projectId, sourceRefs, revision, confidence, status})`; `supersedeMemoryFact(oldId, newFact)`; `formatMemoryCitation(fact)`.

- [ ] Test missing source rejection, project isolation, supersession and citation formatting.
- [ ] Add source hashes, repository revision, actor, confidence, review status and supersedes links without breaking existing memory files.
- [ ] Require memory citations in plans and verification reports.
- [ ] Run focused and full tests.

### Task 5: Manager benchmark and regression corpus

**Files:** Modify `tools/agent-benchmark.mjs`; Create `tools/benchmark-corpus.mjs`; Test `tools/tests/benchmark-corpus.test.mjs`; Modify README and manager profile.

**Interfaces:** `loadBenchmarkCase(file)`; `evaluateBenchmarkCase(result, expected)`; `summarizeBenchmark(records)`.

- [ ] Test acceptance, regression, unsafe-action, latency-p95 and baseline-preservation scoring.
- [ ] Add a private local corpus manifest format for UI, Flutter, Android, backend, schema, security, QA and workflow tasks; no secrets or customer data.
- [ ] Add release command/docs for replaying corpus snapshots.
- [ ] Run focused and full tests.

### Task 6: Structured routing and bounded convergence

**Files:** Modify `tools/ultra-agent-v3/delegation.mjs`, `tools/ultra-agent-v4/recovery.mjs`; Test `tools/tests/ultra-agent-v4-convergence.test.mjs`; Modify manager profile.

**Interfaces:** `planIndependentWaves(tasks)`; `mergeWaveResults(results)`; `runConvergence({checks, maxAttempts, repair})`.

- [ ] Test dependency-safe waves, deterministic merge, max-attempt stop and escalation on permission/security failure.
- [ ] Implement typed wave envelopes and verifier-driven targeted retry only.
- [ ] Keep provider quotas and existing manager-only delegation policy intact.
- [ ] Run focused and full tests.

### Task 7: Local trace and redaction adapter

**Files:** Modify `tools/ultra-agent-v3/trace.mjs`; Create `tools/trace-report.mjs`; Test `tools/tests/trace-redaction.test.mjs`; Modify manager profile.

**Interfaces:** `startTrace(context)`; `recordSpan(traceId, span)`; `finishTrace(traceId)`; `redactTrace(value)`.

- [ ] Test secret, token, credential, prompt and source-content redaction while retaining timing and IDs.
- [ ] Add task/agent/tool/RAG/approval spans to the existing local trace format; no external exporter by default.
- [ ] Add optional exporter interface with explicit opt-in only.
- [ ] Run focused and full tests.

### Task 8: Flutter/Android QA adapter pack

**Files:** Modify `tools/flutter-release-gate.mjs`, `tools/android-runtime-smoke.mjs`, `tools/device-matrix.mjs`; Create `tools/mobile-ui-flow-gate.mjs`; Test `tools/tests/mobile-ui-flow-gate.test.mjs`; Modify Flutter specialist profile and README.

**Interfaces:** `detectUiTestTools()`; `runMobileUiFlowGate({projectDir, flows})`; `summarizeDeviceEvidence(reports)`.

- [ ] Test missing-tool/unverified behavior, semantic-id requirement, screenshot/log artifact paths and device coverage aggregation.
- [ ] Add optional Patrol/Maestro command adapters and Flutter integration-test discovery; never fail as pass when tools/devices are absent.
- [ ] Preserve current ADB smoke, release APK, capability and matrix gates.
- [ ] Run focused and full tests; run live checks only where a device/tool is present.

### Final packaging and verification

- [ ] Update `tools/build-antigravity-plugin.mjs` portable runtime files and manager instructions.
- [ ] Run `npm test`, `node tools/agent-hub-doctor.mjs --format json`, secret scan and package build.
- [ ] Validate the rebuilt package with Antigravity strict validation and verify the signed ZIP hash.
- [ ] Report implemented capabilities separately from unverified device/provider-dependent checks.
