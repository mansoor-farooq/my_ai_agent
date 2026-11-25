# Release Quality Wave Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add repeatable runtime, device, performance, security, API-contract, RAG and specialist-benchmark gates without changing product business logic.

**Architecture:** Keep the agent hub as the orchestrator. Add small read-only Node/PowerShell gates under `tools/`, keep app-specific fixtures in the Flutter test suite, and emit machine-readable reports under each project's `.agents/` folder. Existing APIs, routes, IDs and database behavior remain unchanged.

**Tech Stack:** Node.js test runner, PowerShell, ADB, Flutter CLI, PostgreSQL RAG runtime, existing Dart widget tests.

**Spec:** `docs/superpowers/specs/2026-11-10-secure-release-and-youngs-catalog-design.md` plus the requested release-quality improvements.

## Global Constraints

- Read-only probes must never install APKs, grant permissions, mutate app data or edit product source.
- Missing device/database evidence must fail closed as `unverified`, never as `pass`.
- Existing Flutter business logic, API contracts, routes, IDs, permissions and security boundaries are preserved.
- Secret scans redact values and return file/line evidence without printing secret contents.
- RAG CI uses a dedicated database and cleanup; credentials come from environment/pgpass, never source files.

## Review Focus

- No connected device: release gate blocks instead of claiming runtime support.
- Manifest permission drift: capability scope changes require a new report.
- APK launch/API failure/offline navigation: smoke report records each state.
- Leaked API keys/private keys: scanner blocks release without printing values.
- RAG database unavailable or cross-project evidence: CI reports an actionable failure and preserves isolation.

### Task 1: Runtime device and release gates

**Files:**
- Create: `tools/android-runtime-smoke.mjs`
- Create: `tools/flutter-release-gate.ps1`
- Create: `tools/tests/android-runtime-smoke.test.mjs`
- Create: `tools/tests/flutter-release-gate.test.mjs`

- [x] Add failing tests for device-required behavior, launch/package checks, offline evidence and APK-size/startup report shape.
- [x] Implement read-only ADB smoke and Flutter analyze/test/release-build/size report commands.
- [x] Verify on the connected Samsung device and record JSON artifacts; offline/API-failure remain explicit until an app-owned hook exists.

### Task 2: Manifest drift, API fixtures and security scan

**Files:**
- Create: `tools/secret-scan.mjs`
- Create: `tools/tests/secret-scan.test.mjs`
- Modify: `D:/Work/Youngs_bazar/test/widget_test.dart`
- Create: `D:/Work/Youngs_bazar/test/fixtures/catalog_contract_fixture.dart`

- [x] Add failing scanner tests for API keys, private keys and safe placeholders.
- [x] Implement redacted secret scan and manifest permission drift check using the existing capability report.
- [x] Add fixtures covering nested categories, active/inactive products, price, stock, thumbnails and ordering.

### Task 3: RAG CI gate and specialist benchmark harness

**Files:**
- Create: `tools/rag-ci-gate.mjs`
- Create: `tools/agent-benchmark.mjs`
- Create: `tools/tests/rag-ci-gate.test.mjs`
- Create: `tools/tests/agent-benchmark.test.mjs`

- [x] Add failing tests for dedicated database enforcement, cleanup and benchmark metric output.
- [x] Implement RAG gate that refuses skipped PostgreSQL tests in CI and benchmark reports accuracy/acceptance/latency/p95/regression/unsafe-action scores.
- [x] Keep local developer runs informative while CI/release runs fail on missing RAG evidence.

### Task 4: Package, document and verify

**Files:**
- Modify: `package.json`
- Modify: `agents/Antigravity/custom-agents/flutter-mobile-specialist/agent.md`
- Modify: `skills/mobile-ui-ux-designer/SKILL.md`
- Modify: `README.md`

- [x] Add scripts/docs for each gate and the recommended device matrix (Samsung, Pixel, Xiaomi; Android 13/14/16).
- [x] Refresh checksums, run full tests, run doctor, build the signed ZIP and report all remaining intentional skips.
