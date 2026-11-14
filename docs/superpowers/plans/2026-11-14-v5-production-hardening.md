# Ultra Agent V5 Production Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Harden the Mansoor Agent Hub against the highest-risk execution, upgrade, secret-leakage and observability failures while preserving existing APIs and business logic.

**Architecture:** Keep Antigravity as a host adapter, but make the repo-side trust boundary explicit: staged manifests, approval-bound promotion, capability reporting, strict verification environments, and durable local state. Add provider-free quality/evidence adapters for RAG, benchmarks and Android without claiming external capabilities that were not observed.

**Tech Stack:** Node.js ESM, built-in `node:test`, built-in `fs`, `crypto`, `child_process`, PowerShell installer scripts, existing PostgreSQL/RAG and Antigravity plugin interfaces.

**Spec:** Deep-research synthesis from official Antigravity, Microsoft, SQLite, Android, GitHub, OpenTelemetry, OpenHands, Sentence Transformers and SWE-bench documentation, captured in this task and linked in the final report.

## Global Constraints

- Do not change existing application APIs, routes, permissions or business logic.
- Do not add runtime dependencies.
- Native Antigravity hooks remain host-controlled; never claim hook-proof writes.
- Unsupported Windows isolation, missing physical devices and unavailable model/provider controls must be reported as unavailable or unknown.
- Existing custom profiles and local memory must survive upgrades byte-for-byte unless an explicit migration is applied.

## Review Focus

- A verifier must not inherit provider secrets or duplicate `PATH` variants.
- Two processes must not both claim or append the same task/effect.
- Installer interruption must leave either the old version or a fully verified new version launchable.
- A native-host bypass must not promote a staged patch without an approval receipt bound to its hashes.
- Capability reports must distinguish `available`, `enabled`, `verified-by-probe`, `unsupported` and `unknown`.

### Task 1: Verification environment isolation

**Files:**
- Modify: `tools/ultra-agent-v4/stages/verify.mjs`
- Test: `tools/tests/ultra-agent-v4-core-loop.test.mjs` and a focused new test if needed

**Interfaces:**
- Add an explicit safe environment builder and optional `envAllowlist` on checks.
- Preserve `runChecks(registry, changes, options)` output shape.

- [ ] Write failing tests proving fake secret variables are absent from spawned checks and safe toolchain variables remain available.
- [ ] Run the focused tests and observe the expected failure.
- [ ] Implement minimal environment construction with normalized Windows keys, safe defaults and explicit opt-in keys.
- [ ] Re-run focused tests, then the full suite.

### Task 2: Cross-process queue/ledger locking and idempotency

**Files:**
- Create: `tools/ultra-agent-v5/process-lock.mjs`
- Modify: `tools/ultra-agent-v4/daemon/queue.mjs`
- Modify: `tools/ultra-agent-v5/durable-ledger.mjs`
- Test: `tools/tests/ultra-agent-v5-durable-ledger.test.mjs` and `tools/tests/ultra-agent-daemon.test.mjs`

**Interfaces:**
- `withProcessLock(lockPath, fn, options)` provides bounded stale-lock recovery.
- Queue writes and ledger transitions use the lock without changing public call signatures.

- [ ] Add contention and duplicate-claim tests first.
- [ ] Implement an exclusive lock file with PID/timestamp metadata, bounded retry and stale-owner handling.
- [ ] Wrap read/validate/write sequences and ledger append in the lock.
- [ ] Verify recovery after a simulated crashed lock owner.

### Task 3: Capability and host-boundary diagnostics

**Files:**
- Create: `tools/ultra-agent-v5/capability-preflight.mjs`
- Create: `tools/ultra-agent-v5/promotion-receipt.mjs`
- Modify: `tools/ultra-agent-v4/mcp-server.mjs`
- Test: `tools/tests/ultra-agent-v5-capability-preflight.test.mjs`

**Interfaces:**
- `probeCapabilities({ platform, release, env, commandRunner })` returns explicit capability states.
- `createPromotionReceipt(manifest, approval, observedFiles)` binds approver, manifest hash and file hashes.

- [ ] Test unknown/unsupported Windows states and approval/hash drift.
- [ ] Implement read-only capability probes and fail-closed promotion validation.
- [ ] Preserve native hook behavior as diagnostics; require the managed promotion path for trusted release state.

### Task 4: Transactional installer journal and rollback

**Files:**
- Modify: `tools/build-antigravity-plugin.mjs`
- Modify: `build-agent-hub.ps1`
- Create: `tools/ultra-agent-v5/install-journal.mjs`
- Test: `tools/tests/persistent-runtime-package.test.mjs` and a new installer journal test

**Interfaces:**
- `InstallJournal` records `prepared → processes-stopped → staged → activated → verified` and rollback.
- Existing installer entry points remain compatible.

- [ ] Add journal recovery and custom-profile-preservation tests.
- [ ] Implement versioned staging, previous-version retention, phase journaling and health-check rollback.
- [ ] Detect kit-owned background workers before activation; never claim graceful closure of host-owned processes.

### Task 5: Release identity and structured local observability

**Files:**
- Create: `tools/ultra-agent-v5/release-manifest.mjs`
- Create: `tools/ultra-agent-v5/telemetry.mjs`
- Modify: `tools/agent-hub-doctor.mjs`
- Test: `tools/tests/ultra-agent-v5-release-observability.test.mjs`

**Interfaces:**
- Release manifest includes kit version, source commit, config/prompt hashes and artifact digest.
- Local telemetry is redacted, bounded and correlated by run ID.

- [ ] Test secret redaction, manifest mismatch and offline event persistence.
- [ ] Implement JSONL telemetry and SLO summary without a remote exporter.
- [ ] Add doctor checks for release identity and telemetry health.

### Task 6: Quality/evidence adapters and documentation

**Files:**
- Create: `tools/ultra-agent-v5/benchmark-manifest.mjs`
- Create: `tools/ultra-agent-v5/android-evidence.mjs`
- Modify: `benchmarks/README.md`
- Modify: `README.md`
- Modify: `ULTRA_AUTONOMOUS_AUDIT.md`

**Interfaces:**
- Benchmark manifests freeze repo commit, model identity, commands and acceptance criteria.
- Android evidence records device/build/test dimensions; missing hardware remains `not-run`.

- [ ] Add schema tests and held-out-task validation.
- [ ] Implement provider-free manifest/evidence records and retrieval metric placeholders.
- [ ] Document external dependencies and explicit non-claims.

### Verification Gate

- [ ] Run focused new tests.
- [ ] Run `npm test`.
- [ ] Run `node tools/agent-hub-doctor.mjs --format json`.
- [ ] Run secret scan and inspect `git diff --check`.
- [ ] Build the package only after tests pass; do not claim installer success without an observed install log.

## Known Non-Goals

- No guaranteed host-level interception of native Antigravity editor writes.
- No automatic model switching or quota bypass when Antigravity owns the model selector.
- No physical Android/device-matrix pass without connected hardware or configured Test Lab.
- No license choice for private/unverified third-party skills without rights-holder approval.
- No public benchmark superiority or “human-level” claim without an owner-approved corpus and paired runs.
