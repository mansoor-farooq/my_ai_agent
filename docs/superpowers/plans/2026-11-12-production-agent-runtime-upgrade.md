# Production Agent Runtime Upgrade Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire the existing Ultra Agent controls into one tested execution lane and add repeatable agent quality, safety, RAG, trace, and updater release gates.

**Architecture:** Add a provider-free managed executor around the existing V4 lifecycle, typed policy registry, effect ledger, trace format, and check runner. Add benchmark validation and adversarial tests, then gate the package with Windows unit/doctor checks and a separate ephemeral PostgreSQL RAG integration job.

**Tech Stack:** Node.js ESM, `node:test`, PowerShell, GitHub Actions YAML, PostgreSQL service; no new npm dependencies.

**Spec:** `docs/superpowers/specs/2026-11-12-production-agent-runtime-upgrade.md`

## Global Constraints

- Preserve the 15 packaged Antigravity profiles, internal IDs, APIs, project permissions, existing project logic, local rule customizations, and user-owned signing key.
- Keep model/provider calls outside the runtime adapter; never invent benchmark results, human approval, or cost data.
- Deny unsupported sandbox claims; Antigravity Windows 10 fallback is review-required.
- Run model-generated writes only through the managed executor; document that native host tools need Antigravity host permissions.
- Keep RAG tests isolated to `mansoor_agent_rag_test` and ephemeral test databases; never point CI at a developer database.
- No new runtime or development package dependency.

## Review Focus

- Approval receipt replay or task/payload mismatch must block before a write.
- Path aliases, junctions/symlinks, missing parents, and Windows drive forms must not bypass scope.
- Crash after a write but before receipt completion must be safe to replay without duplicate mutation.
- Tool spawn failure, timeout, invalid check ID, and required-check omission must not produce `complete`.
- A benchmark row without a pinned revision/config, owner-reviewed expected result, or unique repeat index must not count as evidence.
- RAG CI must fail if a required database-backed case is skipped or targets a non-test DB.
- Rule updates must refresh unchanged managed files and preserve local custom edits byte-for-byte.

---

### Task 1: Managed execution policy and adapter

**Files:**
- Create: `tools/ultra-agent-v4/managed-runtime.mjs`
- Modify: `tools/ultra-agent-v4/core-loop.mjs` only where an integration seam is required
- Test: `tools/tests/ultra-agent-v4-managed-runtime.test.mjs`

**Interfaces:**
- `createManagedPolicy(task, registry, approval)` returns a validated project/rule/plan-bound policy.
- `authorizeManagedAction(policy, action)` returns an allow/deny decision with stable code and no sensitive values.
- `runManagedTask(input, deps)` runs the existing lifecycle with policy-bound writes, checks, effect receipts, trace spans, and checkpoints.
- Actual command execution uses injected registry entries and `shell: false`; arbitrary commands are rejected.

- [ ] Write failing tests for missing approval, invalid registry/hash, out-of-scope/protected paths, unsupported actions, action execution, and no-side-effect denial.
- [ ] Verify the tests fail for the expected missing exports/behavior.
- [ ] Implement the adapter by composing existing core-loop, policy, effect, trace, and verifier modules; do not duplicate lifecycle state machines.
- [ ] Add replay tests proving same payload is idempotent and mismatched payload is blocked.
- [ ] Add checkpoint/trace correlation tests for before/after action and verification events.
- [ ] Run the managed-runtime test file and existing V4 tests.

### Task 2: Benchmark protocol and corpus gate

**Files:**
- Modify: `tools/benchmark-corpus.mjs`
- Modify: `tools/agent-benchmark.mjs`
- Modify: `tools/ultra-agent-v4/benchmark.mjs`
- Create: `tools/benchmark-schema.json`
- Create: `benchmarks/README.md`
- Test: `tools/tests/benchmark-corpus.test.mjs`
- Test: `tools/tests/agent-benchmark.test.mjs`

**Interfaces:**
- A record binds task/agent/profile/model/config/repository revision and repeat index.
- Human review and expected acceptance are explicit states; drafts do not count toward scores.
- Reports are grouped by agent and task domain and expose acceptance, first-pass, repair, regression, unsafe actions, p95 latency, optional observed cost, and sample count.

- [ ] Add failing tests for missing provenance, duplicate repetitions, draft labels, missing reviewer result, and nullable cost.
- [ ] Implement schema validation and deterministic aggregation, including minimum sample/coverage warnings.
- [ ] Keep synthetic fixtures marked `fixture`; do not ship them as live agent benchmark results.
- [ ] Add guidance for 10–20 owner-reviewed tasks per profile, three pinned repeats, paired solo-Gemini baseline, and held-out cases.
- [ ] Run focused benchmark tests.

### Task 3: Adversarial runtime and recovery corpus

**Files:**
- Create: `tools/security-agent-fixtures.json`
- Create: `tools/run-agent-security-fixtures.mjs`
- Test: `tools/tests/agent-security-fixtures.test.mjs`
- Modify: `tools/ultra-agent-v4/effects.mjs` only if cross-process locking or replay evidence is required

**Interfaces:**
- Every fixture has a case ID, attack category, expected policy decision, and side-effect assertion.
- Fixture input never contains real credentials or performs real network/deploy/push actions.
- Categories include injection, secret path, traversal, symlink/junction, unauthorized delegation, scope bypass, duplicate effect, checkpoint interruption, and missing verifier.

- [ ] Write failing fixture-engine tests first.
- [ ] Implement deterministic fixtures that exercise the same policy and executor used by Task 1.
- [ ] Add replay/concurrency tests for effect receipts; use a lock or fail closed if the local ledger cannot prove a safe claim.
- [ ] Run all security fixture tests and relevant V4 tests.

### Task 4: RAG and repository quality CI

**Files:**
- Create: `.github/workflows/quality.yml`
- Modify: `package.json`
- Modify: `tools/rag-ci-gate.mjs`
- Test: `tools/tests/rag-ci-gate.test.mjs`

**Interfaces:**
- Windows job runs full Node tests, doctor, and secret scan.
- Linux PostgreSQL job uses an ephemeral `mansoor_agent_rag_test` service and runs the integration suite with required tests enabled.
- CI fails on RAG skips, wrong DB name, missing password, or missing PostgreSQL CLI.
- GitHub workflow permissions are read-only; external actions use immutable commit SHAs.

- [ ] Add failing tests for skip detection and dedicated database enforcement.
- [ ] Implement the gate and workflow with pinned Node versions and action revisions.
- [ ] Validate workflow YAML and commands locally where available; report that hosted GitHub Actions execution itself is not observed locally.
- [ ] Run local Windows tests; run the RAG gate only against an isolated temporary/test database.

### Task 5: Update-path and host capability verification

**Files:**
- Modify: `tools/build-antigravity-plugin.mjs`
- Modify: `tools/agent-hub-doctor.mjs`
- Modify: `tools/tests/portable-plugin-contents.test.mjs`
- Create: `tools/antigravity-runtime-preflight.mjs`
- Test: `tools/tests/antigravity-runtime-preflight.test.mjs`

**Interfaces:**
- Preflight reports OS/sandbox availability as `available`, `review-required`, or `unknown`; no Turbo/full-access assumptions.
- Installer tests exercise first install, same-version install, managed update, local customization preservation, malformed manifest, and rollback/report consistency.
- No host `settings.json` is silently changed.

- [ ] Add failing tests for supported and unsupported sandbox environments and update-state combinations.
- [ ] Implement preflight and strengthen installer state/report tests without overwriting user-edited rules.
- [ ] Verify packaging includes new runtime, benchmark schema, red-team fixtures, and docs.
- [ ] Run install/update tests and doctor.

### Task 6: Manager wiring, documentation, and release verification

**Files:**
- Modify: `agents/Antigravity/custom-agents/production-orchestrator/agent.md`
- Modify: `README.md`
- Modify: `docs/architecture.md`
- Modify: `docs/quickstart.md`
- Modify: `tools/agent-hub-doctor.mjs`

- [ ] Add the managed execution path, approval contract, benchmark discipline, and native host permission limitation to the manager profile.
- [ ] Document official research sources and precise Windows 10 sandbox fallback; update stale test counts and remove claims of an existing corpus until approved cases exist.
- [ ] Add doctor checks for managed runtime integration and release-gate files.
- [ ] Run `npm test`, RAG gate when test DB is available, doctor, secret scan, packaging validation, and focused installer checks.
- [ ] Review final diff for unintended changes and report any unsupported host-level behavior as unverified.

## Execution Notes

- The user asked for research first and then implementation, so execute this plan inline without waiting for another plan approval.
- Do not commit, push, install into the live Antigravity profile, or publish a release unless separately requested in this turn.
- A successful unit/doctor run does not prove live Gemini quality or a GitHub-hosted workflow run.
