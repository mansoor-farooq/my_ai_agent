# Open-Source-First Development Gate Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans (native implementation in this session) task-by-task.

**Goal:** Make open-source discovery, inspiration, reverse engineering, licensing and reuse decisions a mandatory evidence gate before scratch custom implementation.

**Architecture:** A deterministic local gate ranks manager-provided GitHub candidates and emits a versioned decision envelope. The premium router adds an OSS research work item for matching requests, while the manager skill defines the external discovery and provenance workflow. No automatic cloning or copying is introduced.

**Tech Stack:** Node.js ESM, Markdown skills, existing V3 premium router and doctor/provenance packaging.

**Spec:** `docs/superpowers/specs/2026-11-23-open-source-first-development-gate-design.md`

## Global Constraints

- Open-source-first is mandatory for custom work unless the owner explicitly requests scratch-first implementation.
- Stars are a discovery signal only; license, maintenance, compatibility, security and evidence outrank popularity.
- No repository is cloned, vendored or copied automatically by the gate.
- The manager remains the only dispatcher and approval owner.
- Missing license, source references, compatibility evidence or reverse-engineering scope blocks reuse and falls back to `inspire` or `custom`.

## Review Focus

- Missing or incompatible licenses must not produce a `reuse` decision — covered by gate tests.
- A high-star but stale or weakly matched repository must lose to a maintained compatible candidate — covered by ranking tests.
- No candidates must produce an explicit `custom` decision with a bounded stop condition — covered by fallback tests.
- The router must add OSS research only when the request actually needs it — covered by routing tests.
- Portable packaging must include the skill/tool and preserve provenance — covered by doctor/package tests.

### Task 1: Open-Source-First Skill Contract

**Files:**
- Create: `skills/open-source-first-development/SKILL.md`
- Modify: `skills/premium-autonomous-engineering/SKILL.md`
- Modify: `agents/Antigravity/custom-agents/production-orchestrator/agent.md`

**Interfaces:**
- Produces the manager-readable gate workflow and the `reuse/adapt/inspire/custom` decision contract.

- [ ] **Step 1: Write the skill and manager routing contract** with explicit GitHub discovery, license, activity, reverse-engineering, provenance, adaptation and stop-condition rules.
- [ ] **Step 2: Verify frontmatter and references** with the skill validator and `rg` checks for all four decisions.

### Task 2: Deterministic Gate Tool

**Files:**
- Create: `tools/open-source-first-gate.mjs`
- Test: `tools/tests/open-source-first-gate.test.mjs`

**Interfaces:**
- `rankOpenSourceCandidates({ request, candidates, scratchFirst = false }) -> gateEnvelope`
- Candidate fields: `url`, `name`, `license`, `stars`, `forks`, `lastActivity`, `defaultBranch`, `commit`, `capabilities`, `sourceRefs`, `securityNotes`, `maintenanceStatus`.
- Envelope schema: `mansoor.open-source-gate/v1`.

- [ ] **Step 1: Write failing tests** for compatible selection, incompatible-license rejection, popularity-vs-maintenance ranking, no-candidate custom fallback and explicit scratch-first bypass.
- [ ] **Step 2: Run the focused test** and observe the expected missing-module failure.
- [ ] **Step 3: Implement deterministic scoring and decisions**; license/evidence/security gaps must block `reuse` and `adapt` unless the candidate is marked inspiration-only.
- [ ] **Step 4: Add a JSON CLI** accepting `--request`, `--candidates-json` and `--scratch-first`.
- [ ] **Step 5: Run the focused test and direct CLI smoke check**; expect all decision cases to pass.

### Task 3: Premium Router Integration

**Files:**
- Modify: `tools/premium-agent-router.mjs`
- Test: `tools/tests/premium-agent-router.test.mjs` or the existing router test file.

**Interfaces:**
- OSS requests match `open-source`/`github`/`reuse`/`reverse engineer`/`inspiration` terms.
- Recommended specialist: `research-docs-specialist`; required capabilities include `oss-discovery`, `license-provenance`, `reverse-engineering`, and `source-map`.

- [ ] **Step 1: Add route tests** proving OSS requests receive an OSS research work item and unrelated requests do not.
- [ ] **Step 2: Add the route and read-only work item** with source references, license evidence and a bounded stop condition.
- [ ] **Step 3: Run router tests and planner smoke checks**.

### Task 4: Packaging and Quality Verification

**Files:**
- Modify: `tools/build-antigravity-plugin.mjs`
- Modify: `tools/agent-hub-doctor.mjs` only if a new shipped profile/reference requires inventory updates.
- Modify: `SKILL-PROVENANCE.json` through `tools/generate-skill-provenance.mjs`.
- Modify: `KEY-CHECKSUMS.json` through `tools/update-key-checksums.mjs`.

**Interfaces:**
- Portable package must include the new skill and gate tool; no external connector or credential is introduced.

- [ ] **Step 1: Add the gate tool to portable runtime files.**
- [ ] **Step 2: Refresh provenance and checksums.**
- [ ] **Step 3: Run doctor, syntax checks, focused gate/router tests and package validation.**
- [ ] **Step 4: Run `npm run build:package` and record the observed package path, doctor result, focused test result and any environment-only gaps.**
