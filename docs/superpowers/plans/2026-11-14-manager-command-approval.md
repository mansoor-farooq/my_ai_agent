# Manager Command Approval Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let Mansoor AI Team Manager auto-approve deterministic read-only probes and exact routine verification commands while preserving owner review for maintenance and destructive commands.

**Architecture:** A pure V5 command-policy module classifies the command string into `auto_approve`, `owner_review`, or `deny`. The existing Antigravity PreToolUse guard calls this classifier for `run_command`; the manager profile routes writes and maintenance to the existing managed MCP approval lane.

**Tech Stack:** Node.js ESM, `node:test`, existing Antigravity hook and V5 approval broker; no new dependencies.

**Spec:** `docs/superpowers/specs/2026-11-14-manager-command-approval-design.md`

## Global Constraints

- Destructive, secret, network, Git push/deploy, install, arbitrary scripts and unknown commands must not be auto-approved.
- Existing APIs, routes, permissions and business logic remain unchanged.
- No dependency changes.
- Native host approval remains authoritative for commands outside the explicit read-only policy.

## Review Focus

- PowerShell metacharacters and command chaining must never bypass classification — test each operator.
- Read-only-looking commands targeting protected files must remain blocked — test `.env`, `.git`, and key paths.
- The storage purge command from the user screenshot must never become auto-approved — test `Remove-Item -Recurse -Force` and `Clear-RecycleBin`.
- The manager must not auto-approve an unknown executable or network command — test unknown and network examples.
- Existing managed MCP Tier 0/1 decisions must remain unchanged — run current approval and hook suites.

### Task 1: Add deterministic command policy

**Files:**
- Create: `tools/ultra-agent-v5/command-approval-policy.mjs`
- Test: `tools/tests/ultra-agent-v5-command-approval-policy.test.mjs`

**Interfaces:**
- Produces `classifyCommand({ command, workspacePaths }) -> { decision, class, reason }`.

- [ ] **Step 1: Write failing tests** for disk-space/version auto-approval, purge owner-review, metacharacter rejection, protected-path rejection, network rejection, and unknown-command handling.
- [ ] **Step 2: Run the focused test file and observe the expected module-not-found failure.**
- [ ] **Step 3: Implement the pure classifier** with exact command families, metacharacter checks, protected path checks and fail-closed defaults.
- [ ] **Step 4: Run the focused test file and verify all tests pass.**

### Task 2: Wire policy into the Antigravity hook

**Files:**
- Modify: `tools/antigravity-pretool-guard.mjs`
- Test: `tools/tests/antigravity-pretool-guard.test.mjs`

**Interfaces:**
- Consumes `classifyCommand` from Task 1 for `run_command` payloads.
- Preserves existing `{ decision, reason }` hook output.

- [ ] **Step 1: Add failing hook tests** proving safe probes return `allow`, the live purge remains `force_ask`, and unknown commands remain `force_ask`/`deny`.
- [ ] **Step 2: Run the focused hook tests and observe failure under the current unconditional `force_ask` branch.**
- [ ] **Step 3: Call the classifier only for `run_command`; allow only `auto_approve`, preserve fresh review for `owner_review`, and deny explicit dangerous payloads.
- [ ] **Step 4: Run hook and policy tests together and verify they pass.**

### Task 3: Update manager routing contract and package checks

**Files:**
- Modify: `agents/Antigravity/custom-agents/production-orchestrator/agent.md`
- Modify: `README.md`
- Modify: `tools/agent-hub-doctor.mjs` only if a new invariant is needed.
- Test: existing doctor, hook, approval and portable-package suites.

**Interfaces:**
- Documents the safe command classes and the managed MCP route for writes/maintenance.

- [ ] **Step 1: Add manager instructions** to batch read-only probes and never self-approve destructive/unknown shell commands.
- [ ] **Step 2: Update the README** with the user-facing approval behavior and limitation.
- [ ] **Step 3: Run focused hook/policy/approval tests.**
- [ ] **Step 4: Run `node tools/agent-hub-doctor.mjs --format json` and the existing portable package tests.**

### Task 4: Release verification

**Files:**
- Modify: generated checksum/package metadata only through the existing build script.

- [ ] **Step 1: Run the full Node test suite.**
- [ ] **Step 2: Run the doctor and secret scan.**
- [ ] **Step 3: Build the signed portable package with the existing command and inspect its output.**
- [ ] **Step 4: Report changed paths, tests, package hash, and the remaining host-level limitation.**
