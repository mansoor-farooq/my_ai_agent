# Persistent Mansoor CLI Runtime and Automated Android Preview Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a persistent, provider-free Mansoor CLI runtime that shares state with Antigravity and automatically manages Android/Flutter device preview through ADB and `scrcpy` without changing project business logic.

**Architecture:** A single-user Node.js daemon owns a durable queue, named-pipe protocol, checkpoints and redacted JSONL events. The existing V4/V5 managed runtime remains the only mutation engine; an Antigravity/`agy` bridge and additive MCP tools submit work to the same queue. An Android adapter handles explicit device selection, Flutter build/install/launch evidence and a marker-owned `scrcpy` session.

**Tech Stack:** Node.js ESM, built-in `node:net`, `node:child_process`, `node:fs`, `node:test`, existing V4/V5 runtime, Antigravity CLI (`agy`), ADB, Flutter CLI and host-installed `scrcpy`; no new npm dependencies.

**Spec:** `docs/superpowers/specs/2026-11-14-persistent-cli-antigravity-scrcpy-design.md`

## Global Constraints

- Preserve existing APIs, routes, permissions, database logic, agent IDs and native Antigravity behavior.
- The core remains provider-free; model calls continue through the signed-in Antigravity/Gemini session.
- CLI tasks may queue while the host is unavailable, but mutation execution waits for host-mediated approval and provider/session availability.
- Use Windows named-pipe transport with current-user ACLs; use a Unix-socket fallback only for testability.
- Enforce a hard three-worker daemon cap; overlapping writes in one project serialize through the existing effect ledger.
- `scrcpy` is observation only; it never proves a test or business flow passed.
- Never bundle credentials, private project data, hidden reasoning or a proprietary `scrcpy` binary.
- Use argument arrays and bounded timeouts; never interpolate shell commands.
- Ambiguous device selection, missing required scope/acceptance, stale approvals and unknown side-effect state fail closed.

## Review Focus

- Host disconnected while a CLI task is submitted → the task is durable `queued-host-unavailable`, never silently executed by another provider (Task 1/2 tests).
- Duplicate submit after daemon restart → the existing run is returned by idempotency key and no duplicate effect occurs (Task 1 tests).
- Project scope drift (inventory becoming store-based, extra UI/features, protected auth files) → context/policy gate blocks before `ACT` (Task 3 tests).
- Multiple Android devices or a disconnected device → explicit serial is required; `scrcpy` retries are bounded and status becomes `unverified` rather than attaching to the wrong device (Task 4 tests).
- Daemon or mirror termination during a write/preview → checkpoint/effect reconciliation resumes safely and only marker-owned `scrcpy` is stopped (Task 1/4 tests).

---

### Task 1: Persistent queue, daemon lifecycle and local protocol

**Files:**
- Create: `tools/ultra-agent-v4/daemon/paths.mjs`
- Create: `tools/ultra-agent-v4/daemon/events.mjs`
- Create: `tools/ultra-agent-v4/daemon/queue.mjs`
- Create: `tools/ultra-agent-v4/daemon/protocol.mjs`
- Create: `tools/ultra-agent-v4/daemon/daemon.mjs`
- Create: `tools/ultra-agent-cli.mjs`
- Test: `tools/tests/ultra-agent-daemon.test.mjs`

**Interfaces:**
- `runtimePaths({ env, platform, homeDir }) -> { root, runsDir, lockFile, socketName }`
- `createRunId() -> string`
- `enqueueRun(input) -> RunRecord`
- `getRun(runId) -> RunRecord|null`
- `appendRuntimeEvent(event) -> EventRecord`
- `readRuntimeEvents(runId, { after, limit }) -> EventRecord[]`
- `startDaemon(options) -> { close, address, status }`
- `connectRuntimeClient(options) -> { request, close }`
- `handleProtocolRequest(request, deps) -> Promise<ProtocolResponse>`

- [ ] **Step 1: Write failing queue/protocol tests**
  - Assert required `objective`, `scope` and `acceptance` are enforced.
  - Assert project root is normalized and task IDs/run IDs are safe.
  - Assert duplicate idempotency keys return the original run.
  - Assert event records redact tokens/passwords and include schema, run, project,
    agent, kind, status and timestamp.
  - Assert malformed requests and unknown run IDs return typed blocked errors.

- [ ] **Step 2: Run queue tests and verify the expected failures**
  - Run: `node --test tools/tests/ultra-agent-daemon.test.mjs`
  - Expected: FAIL because daemon modules do not yet exist.

- [ ] **Step 3: Implement runtime paths and atomic JSONL state**
  - Use `%LOCALAPPDATA%\Mansoor-Agent-Hub\runtime` on Windows and a user-data
    fallback elsewhere.
  - Keep project-scoped state under the existing `.agents` boundary.
  - Store a PID/heartbeat lock with stale-lock recovery only when the PID is dead.
  - Write records via temp-file + rename and append events with a per-run lock.

- [ ] **Step 4: Implement the named-pipe protocol and daemon lifecycle**
  - Use `\\.\pipe\mansoor-agent-v1` on Windows and a temporary Unix socket in tests.
  - Implement `start`, `status`, `submit`, `events`, `resume`, `stop` and `doctor`.
  - `stop` cancels queued work and requests cooperative cancellation for active work;
    uncertain effects stay blocked for reconciliation.
  - Cap active workers at three and emit queue/worker/heartbeat events.

- [ ] **Step 5: Implement the `mansoor-agent` CLI**
  - Parse repeated `--scope` and `--acceptance` flags or a JSON task file.
  - Do not infer broad project scope or accept a `--force` mutation bypass.
  - Print concise human output by default and stable JSON with `--json`.

- [ ] **Step 6: Run the queue/daemon tests**
  - Run: `node --test tools/tests/ultra-agent-daemon.test.mjs`
  - Expected: all queue, lock, idempotency, event-redaction and protocol tests pass.

- [ ] **Step 7: Commit the self-contained daemon slice**
  - Run: `git add tools/ultra-agent-v4/daemon tools/ultra-agent-cli.mjs tools/tests/ultra-agent-daemon.test.mjs && git commit -m "feat: add persistent Mansoor CLI runtime"`

### Task 2: Antigravity CLI/ACP bridge and shared MCP event surface

**Files:**
- Create: `tools/ultra-agent-v4/agy-session.mjs`
- Create: `tools/tests/ultra-agent-agy-session.test.mjs`
- Modify: `tools/ultra-agent-v4/mcp-server.mjs`
- Modify: `tools/antigravity-pretool-guard.mjs`
- Modify: `tools/tests/ultra-agent-v4-managed-mcp.test.mjs`

**Interfaces:**
- `resolveAgy({ env, command }) -> { executable, version }`
- `buildAgyArgs({ agent, projectDir, mode, outputFormat }) -> string[]`
- `startAgySession(options) -> { send, events, close }`
- `submitHostRun(input, deps) -> HostSessionResult`
- Add MCP tools: `submit_task`, `get_run_status`, `follow_run_events`, `stop_run`.

- [ ] **Step 1: Write failing session/bridge tests**
  - Assert `agy` command resolution and argument-array construction for
    `--agent "Mansoor AI Team Manager"`, `--project`, `--output-format stream-json`
    and Fast/Premium effort.
  - Assert missing `agy` produces a queued host-unavailable result, not a provider
    fallback.
  - Assert MCP queue tools share the daemon run/event records and do not alter the
    existing inspect/prepare/run/review/promote/discard tool contracts.
  - Assert stop and resume preserve the same run ID and approval boundary.

- [ ] **Step 2: Run bridge tests to verify failures**
  - Run: `node --test tools/tests/ultra-agent-agy-session.test.mjs tools/tests/ultra-agent-v4-managed-mcp.test.mjs`
  - Expected: new bridge tests fail while existing managed-MCP tests remain green.

- [ ] **Step 3: Implement the host session adapter**
  - Use the installed `agy` CLI; do not hard-code account IDs or provider keys.
  - Prefer the documented stream/ACP session with the selected agent and project.
  - Convert host output to redacted runtime events; do not persist raw hidden
    reasoning or credentials.
  - If the host session is absent/disconnected, leave the run in
    `queued-host-unavailable` and emit a reconnect event.

- [ ] **Step 4: Add additive MCP queue/event tools**
  - Route all mutation requests to the existing daemon and managed runtime.
  - Require host-mediated approval before implementation writes.
  - Keep tool names under Antigravity's 64-character limit and preserve the
    existing `runtime` MCP configuration key.

- [ ] **Step 5: Run bridge and regression tests**
  - Run: `node --test tools/tests/ultra-agent-agy-session.test.mjs tools/tests/ultra-agent-v4-managed-mcp.test.mjs`
  - Expected: all new and existing tests pass.

- [ ] **Step 6: Commit the Antigravity bridge slice**
  - Run: `git add tools/ultra-agent-v4/agy-session.mjs tools/ultra-agent-v4/mcp-server.mjs tools/antigravity-pretool-guard.mjs tools/tests/ultra-agent-agy-session.test.mjs tools/tests/ultra-agent-v4-managed-mcp.test.mjs && git commit -m "feat: bridge CLI runs into Antigravity"`

### Task 3: Default project context, memory envelope and strict architecture/security policies

**Files:**
- Create: `shared/control-plane/default-engineering-policies.json`
- Create: `tools/ultra-agent-v4/context-bundle.mjs`
- Create: `tools/tests/context-bundle.test.mjs`
- Modify: `agents/Antigravity/custom-agents/production-orchestrator/agent.md`
- Modify: `agents/Antigravity/custom-agents/enterprise-schema-architect/agent.md`
- Modify: `agents/Antigravity/custom-agents/dotnet-backend-specialist/agent.md`
- Modify: `agents/Antigravity/custom-agents/node-backend-specialist/agent.md`
- Modify: `agents/Antigravity/custom-agents/python-backend-specialist/agent.md`
- Modify: `shared/control-plane/agent-capability-manifest.json`

**Interfaces:**
- `buildContextEnvelope({ projectDir, task, mode, policyRegistry }) -> ContextEnvelope`
- `resolveDefaultPolicies({ projectType, detectedAuth, domain }) -> PolicySet`
- `validateScopeContract({ task, envelope, proposedChanges }) -> PolicyDecision`
- `validateAuthInvariant({ request, session, policy }) -> AuthDecision`

- [ ] **Step 1: Write failing context/policy tests**
  - Assert project memory and RAG context are selected by canonical project identity,
    revision and provenance without requiring agents to name a memory file.
  - Assert global team rules and project rules remain separate and immutable.
  - Assert an inventory task rejects a store-based domain drift and unrequested UI
    or feature paths.
  - Assert expired/mismatched session, user ID or tenant ID is denied before the
    protected API call; matching session is allowed.
  - Assert JWT policy is not applied when the project declares another approved
    auth mechanism.

- [ ] **Step 2: Run context tests and verify failures**
  - Run: `node --test tools/tests/context-bundle.test.mjs`
  - Expected: FAIL until the envelope/policy modules exist.

- [ ] **Step 3: Add versioned default policy templates**
  - Include inventory terminology/scope lock, API contract preservation, UI state
    requirements, JWT/session/tenant invariants and required negative tests.
  - Bind each policy to applicable project types/agents, forbidden scope and
    required evidence; do not make JWT universal.

- [ ] **Step 4: Implement the context envelope**
  - Compose existing V2 project identity, V3 context/memory, contract audit,
    repository map and RAG evidence into a bounded packet.
  - Include requirements, non-goals, glossary, current status, decisions,
    conflicts, source hashes and stale/unverified markers.
  - Provide only verified facts as authoritative context; similarity alone cannot
    authorize a write or close a task.

- [ ] **Step 5: Tighten manager and specialist contracts**
  - Require discover → contract → plan → approve → implement → verify → converge.
  - Require exact affected paths, acceptance criteria, API/auth invariants and
    explicit “no extra feature” handling before implementation.
  - Keep all agent IDs and existing routing behavior unchanged.

- [ ] **Step 6: Run policy, routing and regression tests**
  - Run: `node --test tools/tests/context-bundle.test.mjs tools/tests/native-agent-activity-contract.test.mjs tools/tests/ultra-agent-v3-mode.test.mjs`
  - Expected: all context, policy and existing routing tests pass.

- [ ] **Step 7: Commit the context/policy slice**
  - Run: `git add shared/control-plane/default-engineering-policies.json shared/control-plane/agent-capability-manifest.json tools/ultra-agent-v4/context-bundle.mjs tools/tests/context-bundle.test.mjs agents/Antigravity/custom-agents/production-orchestrator/agent.md agents/Antigravity/custom-agents/enterprise-schema-architect/agent.md agents/Antigravity/custom-agents/dotnet-backend-specialist/agent.md agents/Antigravity/custom-agents/node-backend-specialist/agent.md agents/Antigravity/custom-agents/python-backend-specialist/agent.md && git commit -m "feat: enforce project context and engineering policies"`

### Task 4: Android/Flutter device lane and automated scrcpy lifecycle

**Files:**
- Create: `tools/ultra-agent-v4/android-preview.mjs`
- Create: `tools/tests/android-preview.test.mjs`
- Modify: `tools/device-matrix.mjs`
- Modify: `tools/flutter-release-gate.mjs`

**Interfaces:**
- `detectAndroidTools({ env, pathEntries }) -> ToolProbe`
- `listAndroidDevices({ adbPath, execute }) -> Device[]`
- `selectAndroidDevice({ devices, serial }) -> DeviceSelection`
- `runAndroidEvidence(request, deps) -> AndroidEvidenceReport`
- `startScrcpySession({ scrcpyPath, serial, runId, options, spawn }) -> ScrcpySession`
- `stopScrcpySession(session, deps) -> StopResult`

- [ ] **Step 1: Write failing Android/scrcpy tests**
  - Assert `adb`/`scrcpy` discovery reports exact paths and versions without secrets.
  - Assert zero devices, multiple devices without serial and disconnected devices
    return blocked/unverified states; never attach to the first device silently.
  - Assert Flutter build/install/launch/logcat/screenshot commands use argument
    arrays, timeouts and explicit project cwd.
  - Assert `scrcpy` receives the selected serial and a unique Mansoor session
    marker; reconnect is capped and unknown processes are not killed.
  - Assert preview failure cannot turn code verification into `pass`.

- [ ] **Step 2: Run Android tests to verify failures**
  - Run: `node --test tools/tests/android-preview.test.mjs`
  - Expected: FAIL until the adapter exists.

- [ ] **Step 3: Implement safe tool/device discovery**
  - Probe PATH, Android SDK locations and the user runtime; record an
    `unverified` capability when tools are absent.
  - Require an explicit serial when more than one device is online.

- [ ] **Step 4: Implement evidence commands and redaction**
  - Run allowlisted Flutter/ADB commands with bounded timeouts.
  - Capture install, launch, logcat and screenshot evidence under the run's local
    evidence directory; redact tokens and PII.

- [ ] **Step 5: Implement marker-owned scrcpy sessions**
  - Start `scrcpy` only on a requested run/device, with serial, session title and
    per-run logs.
  - Reconnect only while the daemon heartbeat is alive; stop on completion/stop or
    stale heartbeat, and never terminate a user-owned process.

- [ ] **Step 6: Integrate device evidence with release gates**
  - Attach the report to the existing device matrix and Flutter release gate.
  - Keep missing physical-device coverage `unverified`; do not fake OEM evidence.

- [ ] **Step 7: Run Android tests and commit**
  - Run: `node --test tools/tests/android-preview.test.mjs tools/tests/device-matrix.test.mjs tools/tests/flutter-release-gate.test.mjs`
  - Expected: all mocked adapter and existing release-gate tests pass.
  - Commit: `git add tools/ultra-agent-v4/android-preview.mjs tools/tests/android-preview.test.mjs tools/device-matrix.mjs tools/flutter-release-gate.mjs && git commit -m "feat: automate Android preview and scrcpy"`

### Task 5: Package, installer, documentation and end-to-end release verification

**Files:**
- Modify: `tools/build-antigravity-plugin.mjs`
- Modify: `tools/update-key-checksums.mjs`
- Modify: `README.md`
- Modify: `docs/architecture.md`
- Modify: `docs/quickstart.md`
- Create: `tools/tests/persistent-runtime-package.test.mjs`

**Interfaces:**
- Package the CLI, daemon, context and Android modules under the installed plugin.
- Add `mansoor-agent` launcher registration without removing existing commands.
- Document `mansoor-agent start`, `submit`, `events`, `resume`, `stop`, `doctor`
  and automated `scrcpy` prerequisites/limitations.

- [ ] **Step 1: Write packaging/installer tests**
  - Assert new runtime files are included, checksummed and strict plugin validation
    still reports 15 agents, 179 skills, 4 rules and one managed MCP server.
  - Assert installer update preserves existing user profiles/rules and reports
    exact changed runtime files.
  - Assert no credentials or proprietary binaries enter the ZIP.

- [ ] **Step 2: Implement additive packaging**
  - Copy runtime/CLI modules and launcher into the plugin package.
  - Keep generated MCP names under 64 characters and preserve the `runtime` key.
  - Do not bundle `scrcpy`; include discovery and approved-install instructions.

- [ ] **Step 3: Update documentation and checksums**
  - Explain CLI/Antigravity shared state, host-session dependency, memory tiers,
    policy gates, ADB device selection and automatic scrcpy lifecycle.
  - Refresh `KEY-CHECKSUMS.json` through the existing checksum utility.

- [ ] **Step 4: Run full verification**
  - Run: `node --test tools/tests/persistent-runtime-package.test.mjs`
  - Run: `node tools/agent-hub-doctor.mjs --format json`
  - Run: `npm test`
  - Run: `npm run build:package`
  - Expected: doctor zero failures/warnings, focused tests green, no dependency
    changes, strict package validation pass.

- [ ] **Step 5: Run local acceptance smoke**
  - Start the daemon in foreground and submit a read-only task with explicit
    scope/acceptance.
  - Restart the daemon and verify the same run resumes without duplication.
  - Install the package locally, select Mansoor AI Team Manager in Antigravity,
    submit a task and verify parent-chat/MCP events match CLI events.
  - If a device is available, run one Flutter/ADB/scrcpy smoke and inspect the
    captured evidence; otherwise record the preview lane as `unverified`.

- [ ] **Step 6: Commit the release slice**
  - Run: `git add tools/build-antigravity-plugin.mjs tools/update-key-checksums.mjs README.md docs/architecture.md docs/quickstart.md tools/tests/persistent-runtime-package.test.mjs && git commit -m "release: package persistent CLI and Android preview lane"`

## Spec Coverage Check

- Persistent CLI lifecycle, queue, heartbeat, checkpoints and recovery: Task 1.
- Antigravity/CLI linkage and native event visibility: Task 2.
- Automatic project memory, indexing context and strict architecture/auth rules:
  Task 3.
- ADB, Flutter evidence, automated `scrcpy`, reconnect and device matrix: Task 4.
- Portability, installer, docs, checksums and release verification: Task 5.
- No provider bypass, no credentials, no business-logic rewrite and no sandbox
  overclaim are covered by global constraints and package/security tests.
