# Ultra Agent v3 Local Control Plane Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extend the verified v2 Agent Hub into a local-first Ultra Agent v3 with automatic fast/premium routing, resumable task state, conflict-aware project context, evidence-gated evaluation and recovery.

**Architecture:** Add dependency-free Node.js ESM utilities under `tools/ultra-agent-v3/` and persist only project-scoped state under `.agents/ultra-v3/`. Reuse v2 preflight, memory and evidence ledgers; the manager remains the only main agent and Antigravity remains responsible for model execution and native subagent delegation.

**Tech Stack:** Node.js ESM, JSON/JSONL files, existing Antigravity agent profiles, existing v2 memory/evidence tools, Node built-in `crypto`, `fs`, `path` and `child_process` modules.

**Spec:** `docs/superpowers/specs/2026-11-05-ultra-agent-v3-design.md`

## Global Constraints

- The manager remains the only shipped `mainAgent`.
- All specialists continue using `model: inherit`.
- The portable package remains dependency-free and provider-free.
- No credentials, private keys, customer data, hidden chain-of-thought or raw private chats are stored or packaged.
- Project sync remains explicit and scoped; local memory is the default.
- Existing v2 behavior, 15-agent roster, 173 skills and 4 rules must remain valid.

## Review Focus

- A malformed or partially written state file must fail safely and remain recoverable; Task 1 tests atomic recovery behavior.
- A stale or contradictory memory record must not silently win; Task 3 tests conflict surfacing and deterministic precedence.
- A premium task must not downgrade to fast mode because a tool is unavailable; Task 2 tests risk-based mode selection and explicit blocked status.
- A completed task without observable verification must not be marked complete; Task 4 tests evaluation gating.
- A package missing one V3 runtime file must fail doctor/build checks; Task 5 tests portable contents and source integrity.

### Task 1: Durable task state and lifecycle transitions

**Files:**
- Create: `tools/ultra-agent-v3/state.mjs`
- Create: `tools/tests/ultra-agent-v3-state.test.mjs`
- Modify: `shared/ULTRA_AGENT_V2_PROTOCOL.md`

**Interfaces:**
- Consumes: project identity from v2 memory/preflight conventions.
- Produces: `node state.mjs start|transition|checkpoint|resume|show --dir <repo> --task <id> --project <name>`, with JSON output and states `INTAKE`, `PREFLIGHT`, `CONTEXT`, `MODE`, `PLAN`, `DELEGATE`, `BUILD`, `VERIFY`, `EVALUATE`, `COMPLETE`, `PAUSED`, `RECOVERABLE_FAILURE`.

- [ ] Write tests for a new task, legal transitions, rejected illegal transitions, checkpoint creation and resume after a corrupted last event.
- [ ] Run `node --test tools/tests/ultra-agent-v3-state.test.mjs`; confirm the new tests fail before implementation.
- [ ] Implement atomic JSONL event append plus a materialized state snapshot under `.agents/ultra-v3/tasks/<task-id>/` using only Node built-ins.
- [ ] Ensure every event contains task ID, project ID, timestamp, previous state, next state and safe error/evidence references; never store raw prompt or hidden reasoning.
- [ ] Run the focused test file and confirm PASS.
- [ ] Update the protocol with the state directory and transition contract.

### Task 2: Automatic fast/premium mode selection and plan envelope

**Files:**
- Create: `tools/ultra-agent-v3/mode.mjs`
- Create: `tools/ultra-agent-v3/plan.mjs`
- Create: `tools/tests/ultra-agent-v3-mode.test.mjs`

**Interfaces:**
- Consumes: normalized task metadata (`request`, `project`, `risk`, `explicitResearch`, `changedPaths`, `availableTools`).
- Produces: `selectMode(input) -> { mode, reasons, requiredChecks, blockers }` and `createPlanEnvelope(input) -> { planId, mode, phases, specialists, acceptanceEvidence }`.

- [ ] Test routine reversible work selects `fast` with one specialist maximum and no unnecessary research.
- [ ] Test architecture/security/release/ML/explicit-research work selects `premium` with required research and verification gates.
- [ ] Test missing required tools produces a blocker instead of silently downgrading a premium task.
- [ ] Implement deterministic risk signals and a JSON CLI that does not call external providers.
- [ ] Run the focused mode tests and confirm PASS.

### Task 3: Context packet and memory conflict detection

**Files:**
- Create: `tools/ultra-agent-v3/context.mjs`
- Create: `tools/tests/ultra-agent-v3-context.test.mjs`
- Modify: `tools/ultra-agent-v2/memory.mjs`
- Modify: `skills/memory/SKILL.md`

**Interfaces:**
- Consumes: `.agents/memory/PROJECT_MEMORY.md`, `decisions.md`, `research-ledger.jsonl`, `verification-ledger.jsonl`, current project ID and current commit.
- Produces: `buildContextPacket({ dir, project }) -> { project, verifiedFacts, decisions, openQuestions, conflicts, evidenceRefs }`.

- [ ] Test that unrelated project IDs are excluded from a context packet.
- [ ] Test that contradictory decisions or evidence with newer commits are surfaced as `conflicts`, not silently merged.
- [ ] Test that credentials and raw reasoning markers are excluded from the packet.
- [ ] Implement deterministic recency/project-ID filtering and conflict classification; preserve v2 file formats.
- [ ] Run the focused context tests and confirm PASS.
- [ ] Update the memory skill to use V3 context packets before broad scans.

### Task 4: Verification evaluator, recovery and execution trace

**Files:**
- Create: `tools/ultra-agent-v3/evaluate.mjs`
- Create: `tools/ultra-agent-v3/trace.mjs`
- Create: `tools/tests/ultra-agent-v3-evaluation.test.mjs`
- Modify: `shared/ULTRA_AGENT_V2_PROTOCOL.md`

**Interfaces:**
- Consumes: task state, plan envelope, changed paths, command results and v2 verification ledger records.
- Produces: `evaluateCompletion(input) -> { accepted, missingEvidence, warnings, nextState }` and append-only trace records under `.agents/ultra-v3/traces/<task-id>.jsonl`.

- [ ] Test that a task with no verification record is rejected from `COMPLETE`.
- [ ] Test that a passing targeted command plus changed-path summary is accepted.
- [ ] Test that a failed command creates `RECOVERABLE_FAILURE` with a resume checkpoint instead of deleting state.
- [ ] Implement evidence thresholds by mode: fast requires targeted verification; premium requires verification plus independent check for high-risk work.
- [ ] Run the focused evaluator tests and confirm PASS.
- [ ] Document trace fields and recovery behavior in the protocol.

### Task 5: Manager integration, packaging and release gates

**Files:**
- Modify: `agents/Antigravity/custom-agents/production-orchestrator/agent.md`
- Modify: `tools/build-antigravity-plugin.mjs`
- Modify: `tools/agent-hub-doctor.mjs`
- Modify: `tools/update-key-checksums.mjs`
- Modify: `build-agent-hub.ps1`
- Modify: `tools/tests/agent-hub-doctor.test.mjs`
- Modify: `tools/tests/portable-plugin-contents.test.mjs`
- Modify: `README.md`
- Modify: `package.json`

**Interfaces:**
- Consumes: Tasks 1–4 runtime commands and protocol.
- Produces: version `1.5.0`, manager instructions for automatic fast/premium routing, portable V3 runtime files, doctor checks and focused build coverage.

- [ ] Add manager routing instructions for PREFLIGHT → CONTEXT → MODE → PLAN → DELEGATE → VERIFY → EVALUATE, including the explicit no-downgrade blocker.
- [ ] Add all V3 runtime files and protocol to the signed portable runtime list and source checksum requirements.
- [ ] Add doctor checks for V3 files, manager routing and no provider/credential regression.
- [ ] Add all new focused tests to `build-agent-hub.ps1` and update portable ZIP assertions.
- [ ] Update README/package metadata with Fast Mode, Premium Mode, recovery, audit boundaries and exact optional commands.
- [ ] Run `npm run build`; expected: strict validation PASS, doctor 0 failures, all focused tests PASS, signed ZIP produced.
- [ ] Inspect the ZIP contents and hash, then commit the complete V3 foundation.
