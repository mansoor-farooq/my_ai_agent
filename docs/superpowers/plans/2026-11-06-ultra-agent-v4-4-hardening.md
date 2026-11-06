# Ultra Agent V4.4 Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Ship V4.4 lifecycle telemetry, checkpoint drift verification, memory health and native activity summaries without changing existing V4.3 contracts.

**Architecture:** Extend existing V3/V4 ESM utilities with pure helpers and additive CLI actions. Keep evaluation/benchmark, state/checkpoint, memory and activity responsibilities separate; use hashes and redacted metadata only.

**Tech Stack:** Node.js 24 ESM, built-in `node:test`, local JSONL/JSON state, existing PostgreSQL RAG unchanged.

**Spec:** `docs/superpowers/specs/2026-11-06-ultra-agent-v4-4-hardening-design.md`

## Global Constraints

- No provider, connector, network dependency or account rotation.
- No automatic Git reset or destructive rollback.
- Preserve project identity, manager-only delegation, native activity and existing CLI fields.
- Record hashes/metadata only; never persist source contents, secrets or hidden reasoning.

## Review Focus

- Evaluation with missing timestamps or secret-bearing failure details must return a bounded redacted metric envelope.
- Checkpoint paths outside the repository or unreadable files must be reported as drift/error, never followed or copied.
- Deleted, modified and unchanged owned files must be distinguished by checkpoint verification.
- Memory ledgers containing malformed, stale, unversioned and conflicting records must yield stable health counts.
- Activity summaries with blocked, handoff and completed workers must preserve event order and concise parent wording.

### Task 1: Evaluation telemetry envelope

**Files:**
- Modify: `tools/ultra-agent-v3/evaluate.mjs`
- Test: `tools/tests/ultra-agent-v4-control.test.mjs`

**Interfaces:**
- Produces additive `benchmarkMetric` on `evaluateCompletion()` output with sanitized task/project/mode/outcome/duration/acceptance checks.

- [ ] Write a failing test for metric output on a passing evaluation and secret redaction on a failed command.
- [ ] Run the focused test and observe failure because `benchmarkMetric` is absent.
- [ ] Implement the minimal metric envelope without changing acceptance decisions.
- [ ] Run the focused control test and then the full suite.
- [ ] Commit `Add evaluation benchmark envelopes`.

### Task 2: Checkpoint hash manifest and drift verification

**Files:**
- Modify: `tools/ultra-agent-v3/state.mjs`
- Test: `tools/tests/ultra-agent-v3-state.test.mjs`

**Interfaces:**
- `checkpoint --owned-paths a,b` stores path metadata and SHA-256 hashes.
- `verify-checkpoint --checkpoint <file>` returns `unchanged`, `modified`, `deleted`, `missing` and `outside-root` classifications without editing files.

- [ ] Write failing tests for modified/deleted paths and outside-root rejection.
- [ ] Run state tests and observe the missing verification action/manifest.
- [ ] Implement bounded path normalization, file hashing and read-only verification.
- [ ] Run state tests and then the full suite.
- [ ] Commit `Add checkpoint drift verification`.

### Task 3: Memory health status

**Files:**
- Modify: `tools/ultra-agent-v2/memory.mjs`
- Test: `tools/tests/ultra-agent-v2.test.mjs`

**Interfaces:**
- `memory.mjs status` keeps existing `files` and adds bounded `health` counts: records, current, stale, unversioned, conflicts, malformed.

- [ ] Write a failing test with mixed ledger records and assert health counts.
- [ ] Run the memory test and observe missing `health` output.
- [ ] Implement local ledger health calculation with project identity filtering.
- [ ] Run memory tests and then the full suite.
- [ ] Commit `Add memory health diagnostics`.

### Task 4: Native activity summary

**Files:**
- Modify: `tools/ultra-agent-v3/activity.mjs`
- Modify: `tools/tests/ultra-agent-v3-policy-activity.test.mjs`
- Modify: `agents/Antigravity/custom-agents/production-orchestrator/agent.md`
- Modify: `tools/build-antigravity-plugin.mjs`, `tools/agent-hub-doctor.mjs`, `tools/tests/agent-hub-doctor.test.mjs`

**Interfaces:**
- `summarizeActivity({dir, project, taskId})` returns ordered worker summaries, latest state, blockers, changed paths, checks and a concise `parentUpdate`.
- CLI adds `activity.mjs summary --dir ... --project ... --task ...`.

- [ ] Write a failing test for a multi-worker assignment/blocker/completion summary.
- [ ] Run the activity test and observe missing summary behavior.
- [ ] Implement deterministic summary and manager routing/doctor checks.
- [ ] Run focused activity/doctor tests and then the full suite.
- [ ] Commit `Add native activity summaries`.

### Task 5: Package, version and release verification

**Files:**
- Modify: `package.json`, `tools/build-antigravity-plugin.mjs`, `tools/update-key-checksums.mjs`, `build-agent-hub.ps1`, `tools/tests/portable-plugin-contents.test.mjs`, `shared/ULTRA_AGENT_V2_PROTOCOL.md`
- Test: existing package/doctor/full suites

- [ ] Bump package version to `1.9.0` and assert new runtime files/commands are portable.
- [ ] Refresh checksums and build the signed ZIP.
- [ ] Run doctor, focused build suite, full `npm test`, RAG status and hybrid query smoke.
- [ ] Commit release wiring and push `mansoor-development`.
