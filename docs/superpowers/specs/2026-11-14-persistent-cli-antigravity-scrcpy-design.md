# Persistent Mansoor CLI Runtime and Automated Android Preview

**Date:** 2026-11-14  
**Status:** Proposed — awaiting owner approval  
**Owner:** Mansoor Farooq

## Intent

Mansoor AI Team should remain available as a local, continuously running CLI
runtime while still appearing in Antigravity's native workflow. A task submitted
from CLI or Antigravity must use the same project identity, queue, checkpoints,
specialist routing, evidence and approvals. Android/Flutter work must optionally
attach to a real device or emulator and automate ADB, build/install, logcat,
screenshot and `scrcpy` live mirroring without changing application business
logic.

The goal is faster perceived execution and faster feedback, not an unbounded
parallel swarm. Independent tasks may run in bounded waves; writes with overlap
remain serialized and every result still passes verification.

## Goals

- Provide a portable Windows 10/11 `mansoor-agent` CLI with `start`, `status`,
  `submit`, `events`, `resume`, `stop` and `doctor` commands.
- Keep one local daemon alive per user profile with a lock, heartbeat and
  graceful shutdown; recover resumable tasks after interruption.
- Share the existing V4/V5 runtime, effect ledger, project contract, memory and
  managed MCP rather than creating a second execution engine.
- Expose a local event stream for intake, assignment, progress, blocker, tool,
  verification, handoff and completion events.
- Let the Antigravity MCP adapter submit/read the same queue and event stream so
  CLI and parent chat never maintain divergent task state.
- Add an Android adapter that detects `adb`, devices/emulators and Flutter
  projects; runs only declared commands; records install/launch/logcat/screenshot
  evidence; and reports unsupported states as `unverified`.
- Automate `scrcpy` discovery, launch, stop and reconnect for an attached device
  or emulator. The UI mirror is an observation channel; it is never treated as
  proof that tests or business flows passed.
- Preserve existing routes, APIs, permissions, database logic, agent IDs and
  native Antigravity behavior.
- Keep the core provider-free: the daemon orchestrates local state and host
  tools; model/provider calls continue through the signed-in Antigravity/Gemini
  session unless an explicit adapter is configured.

## Non-goals and anti-goals

- No replacement of Antigravity's host UI or native sub-agent panel.
- No claim of a true OS sandbox on Windows without a host capability probe.
- No unrestricted shell, network, secret access, automatic Git push, deploy or
  account switching.
- No permanent background model generation that bypasses host quotas or user
  approval.
- No bundling of provider API keys, private project data or a proprietary
  `scrcpy` binary. The runtime may use a detected user-installed `scrcpy` or a
  separately approved official installation path.
- No broad repository restructure; additions stay under the CLI/runtime and
  existing project `.agents` state boundaries.

## Current state and constraints

- `tools/ultra-agent-v4/mcp-server.mjs` is a local stdio MCP adapter with
  inspect/prepare/run/review/promote/discard tools.
- `managed-runtime.mjs` already owns the guarded task workspace, action manifest,
  effect ledger, checks and resumable evidence path.
- `start-managed-mcp.ps1` starts the MCP server for a host request, but there is
  no standalone long-lived CLI queue/daemon or CLI event subscription.
- Antigravity native activity is host-owned. The bridge can expose local events,
  but cannot pretend to be a signed host-level activity receipt.
- Android device-hub/ADB capabilities are installed on the current machine, but
  they are not yet connected to the Mansoor runtime lifecycle.
- Windows 10/11 support is required. Commands must use argument arrays, explicit
  project roots and timeouts; no shell interpolation is allowed.

## Chosen approach

### Approach A — persistent CLI daemon + local event bus + Antigravity bridge

This is the selected approach. A small Node.js ESM daemon will supervise a
single-user local queue. It will call the existing V4/V5 runtime through an
adapter, persist only redacted metadata and hashes, and expose read/write
operations through a versioned local protocol. The MCP server will gain additive
queue/event tools and will not duplicate execution logic.

### Approach B — Antigravity-only native subagents

Rejected as the primary design. It gives a native panel quickly but does not
provide a durable CLI process, cross-session queue recovery or a shared event
log when the host is closed.

### Approach C — separate voice/streaming gateway

Deferred. It could improve voice latency, but it introduces provider credentials,
audio transport, session billing and another long-running service. It can later
consume the same event protocol without changing the core daemon.

## Proposed runtime flow

```text
CLI/Antigravity intake
  -> project identity + task contract
  -> queue admission + idempotency key
  -> dependency-safe Fast/Premium wave planner
  -> existing managed V4/V5 execution lane
  -> independent checks and evidence
  -> event stream + project memory handoff
  -> Antigravity parent-chat/MCP view
```

For Android/Flutter tasks:

```text
detect project -> detect adb/device -> build -> install -> launch
-> capture logcat/screenshot -> optionally start scrcpy -> verify
-> publish device evidence and stop/reconnect mirror
```

## CLI and daemon contract

The public CLI is additive and provider-free:

```text
mansoor-agent start [--foreground]
mansoor-agent status [--json]
mansoor-agent submit --project <dir> --objective <text> [--mode fast|premium]
mansoor-agent events --run <id> [--follow]
mansoor-agent resume --run <id>
mansoor-agent stop [--run <id>]
mansoor-agent doctor [--json]
```

The daemon state lives under the per-user Mansoor data directory, not inside
the source repository. Project-scoped task state remains under the existing
`.agents` boundary. A lock prevents duplicate daemons; a heartbeat and PID
record make stale-lock recovery explicit. Every submitted task gets a stable
`run_id`, `project_id`, `task_id`, `contract_version` and idempotency key.

## Event and Antigravity bridge

Events are append-only JSONL records with:

```json
{
  "schema": "mansoor.runtime-event/v1",
  "run_id": "RUN-001",
  "project_id": "PRJ-001",
  "agent": "flutter-mobile-specialist",
  "kind": "progress",
  "status": "running",
  "message": "Flutter analyze completed",
  "evidence_ids": [],
  "created_at": "..."
}
```

Secrets, raw prompts, hidden reasoning and customer data are redacted. The MCP
adapter exposes `submit_task`, `get_run_status`, `follow_run_events` and
`stop_run` as additive tools. The parent chat receives concise event summaries;
the detailed trace remains local and inspectable.

## Automated Android and scrcpy adapter

- Detect `adb` and `scrcpy` from PATH, known per-user locations and the Android
  SDK; record executable version and path without leaking environment secrets.
- List devices/emulators and select by explicit serial; never silently attach to
  an unrelated device.
- Use allowlisted commands for `flutter`, `dart`, `adb`, `scrcpy` and project
  test/build tools with bounded timeouts.
- Start `scrcpy` only after an explicit run/device request. Use a generated
  session label and a per-run log path; do not treat the mirror window as a
  security boundary.
- Reconnect when the device temporarily disconnects, with bounded retries; on
  repeated failure, publish `unverified` and preserve diagnostics.
- Capture screenshots and logcat slices as evidence, redact tokens/PII, and
  attach them to the run rather than embedding binary data in chat.
- Stop the mirror on `stop`, task completion or stale heartbeat. A user-opened
  `scrcpy` process is not killed unless it carries the daemon's session marker.

## Speed strategy

- Keep the daemon hot so Node startup, project identity and repository-map work
  are reused.
- Cache only verified project facts and repository maps keyed by revision.
- Use Fast mode for one focused specialist and targeted checks; use Premium mode
  for architecture/security/research/migration or explicit multi-agent work.
- Run independent read/review tasks in waves capped at three workers; serialize
  overlapping writes.
- Stream progress immediately instead of waiting for a final transcript.
- Enforce per-stage timeouts and a stop/escalate rule; no endless retries.

## Safety and recovery

- Reuse the existing action manifest, approval receipt, path guard, effect ledger
  and independent verifier.
- Queue admission rejects missing objective/scope/acceptance and unsafe paths.
- Daemon restart resumes from the last checkpoint; an in-flight effect is
  reconciled by idempotency key and content hash before retry.
- Native editor writes remain host-governed and are reported separately from
  managed-runtime effects.
- `scrcpy`/ADB failures never mark the code task as passed; they block only the
  device-evidence requirement.

## Product contract and default engineering policy

The persistent runtime will create a compact, project-scoped context envelope
before routing work. Agents do not need to know or declare a memory-file path;
the manager resolves the envelope automatically from the canonical project
identity, current revision, approved requirements, rules, repository map and
verified evidence.

The envelope contains:

- product name, domain and canonical terminology;
- objective, in-scope features and explicit non-goals;
- approved user journeys and acceptance criteria;
- API/data contracts, auth/session invariants and affected paths;
- current status, decisions, blockers, evidence citations and stale/conflicting
  facts;
- the specialist's capability contract, forbidden scope and required checks.

Two memory tiers are always distinguished:

1. **Team memory:** immutable Mansoor rules, specialist capability contracts and
   reusable engineering patterns. Agents may read it by default; only owner-
   approved versioned changes can modify it.
2. **Project memory:** requirements, architecture decisions, flow/status records,
   repository map, RAG chunks and verification evidence for the selected project.
   It is automatically loaded by project identity and never crosses into another
   project or tenant.

Similarity retrieval is context, not authority. Every promoted fact needs source
path/revision, timestamp, content hash, confidence and supersession state. A
missing or conflicting fact becomes `unverified` and blocks a completion claim.

### Scope-drift and architecture gates

Architecture work follows `discover -> contract -> plan -> approve -> implement
-> verify -> converge`. The manager must reject a plan that changes the product
domain, introduces an unrequested feature, invents a new top-level folder,
changes an API contract or edits outside the approved path list. For example,
an inventory-management requirement cannot silently become store-management
work. Any proposed domain change becomes a new owner-review item rather than an
automatic rewrite.

UI work must include loading, empty, error, permission, offline and long-content
states in its acceptance criteria. Fixed-height text clipping, invented screens,
placeholder data and unverified “looks correct” claims are release blockers.

### Secure backend defaults

The runtime ships a versioned security-policy template, applied only when the
project's auth capability matches it (JWT/session/tenant/RBAC). The policy is
enforced by middleware/tests, not prose alone:

- authenticate before protected handlers or downstream API calls;
- bind the authenticated subject to the requested user/session/tenant scope;
- reject expired, malformed, revoked or mismatched tokens with the project's
  documented 401/403 behavior;
- never trust a client-supplied user ID, role, tenant ID or price for authorization;
- preserve refresh/logout/revocation semantics already present in the project;
- add negative tests proving an unauthenticated or expired session cannot reach
  protected business logic.

The manager detects the existing auth contract first; it does not force JWT onto
a project that uses a different approved mechanism. A migration or auth change
requires an explicit plan, security review and owner approval.

### Chunking and speed

The daemon keeps Node/runtime state warm, caches a revision-keyed repository map
and sends concise progress events as each chunk completes. Chunk boundaries are
based on dependency/ownership edges, not arbitrary file counts. A maximum of
three workers is used for independent read/review work; writes are serialized by
path ownership and the existing effect ledger. This reduces startup/context wait
without promising that provider-side model latency or account quotas disappear.

## Verification and rollout

Phase 1 (CLI foundation): daemon lifecycle, lock/heartbeat, queue, event schema,
status/stop/resume and tests for restart/idempotency.

Phase 2 (Antigravity bridge): additive MCP queue/event tools, parent-chat event
summaries and compatibility tests with the existing managed MCP tools.

Phase 3 (Android lane): ADB/device detection, Flutter build/install/logcat/
screenshot evidence, `scrcpy` discovery/start/stop/reconnect and a small device
smoke matrix.

Phase 4 (performance): repository-map cache, Fast/Premium scheduling metrics,
latency/queue telemetry and bounded parallel waves.

Release gates: `npm test`, doctor zero failures, CLI contract tests, MCP backward
compatibility tests, path/secret tests, simulated daemon restart, mocked ADB /
scrcpy tests, and one real device smoke run when a device is available.

## Open implementation calls

- The builder should choose the lightest Windows background mechanism that keeps
  a user-session daemon alive (foreground first; optional Startup/Task Scheduler
  integration only after explicit opt-in).
- The builder should prefer a host-installed `scrcpy`; automatic installation
  must be opt-in and verify the official package checksum before execution.
- Exact Antigravity parent-chat presentation is constrained by the host MCP/UI
  contract; the bridge must report what is actually observed, not promise a
  native panel feature it cannot control.

## Resolved builder questions and safe defaults

- The implementation will land incrementally in the four phases above. Phase 1
  and the additive bridge are the first release slice; Android/scrcpy and
  performance metrics follow without changing the queue contract.
- CLI submission is accepted and persisted while Antigravity is closed, but
  provider/model execution waits in `queued-host-unavailable` until the signed-in
  host session reconnects. The daemon never invents a provider or bypasses plan
  quotas.
- CLI-originated mutations use the same host-mediated approval receipt as MCP.
  Without a connected host approval, the run remains queued; a local `--force`
  bypass is intentionally not supported.
- `submit` requires repeated `--scope` and `--acceptance` values (or a JSON task
  file). Missing values block admission; no broad project scope is inferred.
- The Android request schema is explicit: project root, device serial (or an
  unambiguous single-device selection), Flutter target/flavor, declared build /
  install / launch commands, capture flags and `scrcpy` options. Ambiguous
  device selection is `blocked`, not auto-selected.
- The local transport uses a Windows named pipe with the current-user ACL; only
  the Mansoor CLI and installed Antigravity plugin may submit/stop runs. Read-only
  status/events are also available to the owner profile.
- Project identity is the normalized real repository root plus project ID. The
  idempotency key covers project, task objective hash, contract version and
  declared scope. A duplicate key returns the existing run instead of creating
  another side effect.
- The three-worker cap is hard per daemon. Separate projects may occupy separate
  slots, but overlapping writes within one project are serialized by the
  existing managed runtime and effect ledger.
- `stop` marks a queued run cancelled, requests cooperative cancellation for an
  active run, and leaves any uncertain side effect blocked for reconciliation.
  `resume` is allowed only from queued/paused/recoverable states with the same
  task identity, manifest and approval boundary. A stopped device mirror is
  never silently restarted without a new device request.
