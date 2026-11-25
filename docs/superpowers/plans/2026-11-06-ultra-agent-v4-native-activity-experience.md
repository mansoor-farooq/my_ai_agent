# Ultra Agent V4 Native Activity Experience Implementation Plan

> **For agentic workers:** Execute this plan inline with `superpowers:executing-plans`. Use the existing source checkout and keep each task bounded. Do not use subagents to implement shared files.

**Goal:** Replace the standalone browser task dashboard with a native Antigravity-first team activity workflow, project-scoped memory, and an approval-gated research process for material features.

**Architecture:** Keep `production-orchestrator` as the only manager. It delegates through Antigravity's native `invoke_subagent`; the Antigravity App/IDE sub-agent panel is the live worker detail view, while concise manager updates make assignments, milestones, blockers, and handoffs visible in the parent conversation. Existing `.agents/memory/` remains the project-scoped continuity store. Remove the browser dashboard only after an automated native-UI acceptance run passes.

**Tech Stack:** Antigravity custom-agent Markdown profiles, existing Node.js ESM runtime and Node test suite, Antigravity native App/IDE UI driven by the existing CUA computer-use integration, PowerShell release packaging.

**Spec:** [2026-11-05-ultra-agent-v4-native-activity-experience-design.md](../specs/2026-11-05-ultra-agent-v4-native-activity-experience-design.md)

## Global Constraints

- Never restructure a user's application, change unrelated routes/APIs/data contracts, or modify the live `sales_agent` checkout during acceptance verification.
- Keep one primary manager and only invoke specialists relevant to the task; never spawn all 15 by default.
- The native Antigravity panel is the live source for sub-agent state; manager messages contain only observable status and task summaries, never hidden reasoning.
- Material feature work requires current project reconstruction and a sourced research/options brief before any product-code edits; wait for explicit user approval.
- Keep memory local to the selected project, compact, identity-checked, and free of credentials, raw chats, and hidden reasoning.
- On quota or tool failure, checkpoint and report a resumable blocker; do not rotate credentials to bypass provider limits.
- The user must not need to manually open a browser, create a test project, or run test commands for acceptance verification.
- Do not remove the existing browser dashboard from source or release packaging unless the automated native-panel acceptance check passes.

## Review Focus

- A parent chat must clearly identify actual worker assignments without overstating native UI support; test a real read-only delegated task in the installed Antigravity App.
- A missing or unavailable sub-agent panel must prevent dashboard retirement; test the acceptance gate before deleting package entries.
- Research-first policy must block feature implementation until the user approves the evidence brief; test a material-feature request in planning-only mode.
- Ordinary small fixes must remain fast and use at most one relevant specialist; test separately from the deep research path.
- Project memory identity must not leak across projects or authorize broad refactors; inspect isolated temporary project fixtures and their `.agents/` output.
- Package manifests, checksums, doctor rules, README instructions, and tests must agree that the local web dashboard is retired; verify the final signed ZIP and strict plugin validation.

---

### Task 1: Lock the manager chat activity contract

**Files:**
- Create: `tools/tests/native-agent-activity-contract.test.mjs`
- Modify: `agents/Antigravity/custom-agents/production-orchestrator/agent.md`
- Modify: `build-agent-hub.ps1`

**Interfaces:**
- Inputs: Native Antigravity tool result for `invoke_subagent`; manager-selected worker name, role, bounded task, deliverable, and observed result.
- Outputs: Short parent-chat updates at assignment, meaningful milestone, blocker, and completion; standardized handoff fields: status, findings, changed files, checks actually run, remaining work.

- [ ] **Step 1: Write contract tests first.** Add Node tests that read the orchestrator profile and assert it requires: a pre-delegation assignment summary; updates only at meaningful state changes; factual worker result summaries; final manager integration; no hidden reasoning or fabricated live status; and the one-manager/native-`invoke_subagent` boundary.
- [ ] **Step 2: Run the focused test and confirm it fails for the missing contract.**

  Run: `node --test tools/tests/native-agent-activity-contract.test.mjs`

  Expected: FAIL only for requirements not yet present in the manager profile.
- [ ] **Step 3: Add the concise activity contract to `production-orchestrator/agent.md`.** Preserve its existing specialist routing and tool permissions. Do not add chat spam, custom dashboard links, or host-specific assumptions.
- [ ] **Step 4: Add the focused test file to the existing test list in `build-agent-hub.ps1`.** Keep the release pipeline as the owner of the full test run.
- [ ] **Step 5: Re-run the focused test and confirm it passes.**

  Run: `node --test tools/tests/native-agent-activity-contract.test.mjs`

  Expected: PASS, with no product or user project touched.

### Task 2: Make project memory and research approval explicit

**Files:**
- Modify: `agents/Antigravity/custom-agents/production-orchestrator/agent.md`
- Modify: `tools/tests/native-agent-activity-contract.test.mjs`
- Modify: `shared/ULTRA_AGENT_V2_PROTOCOL.md`

**Interfaces:**
- Memory utilities: `node <hubRoot>/tools/ultra-agent-v2/memory.mjs status|init --dir <project> --project <name>` and `node <hubRoot>/tools/ultra-agent-v3/context.mjs --dir <project> --project <name>`.
- Research output: a parent-chat brief with project facts/contracts, cited current competitor evidence, 2–3 options, trade-offs, risks, recommended differentiation, and an explicit approval wait point.
- Fast-path policy: routine, bounded, reversible fixes skip market research and load only the relevant memory/specialist.

- [ ] **Step 1: Extend contract tests.** Assert that the profile selects memory from only the current project, validates project identity/freshness, stores concise evidence-backed decisions, requires feature research before edits, waits for user approval, and exempts routine fixes from market research.
- [ ] **Step 2: Run the focused contract test and confirm the new assertions fail.**

  Run: `node --test tools/tests/native-agent-activity-contract.test.mjs`

  Expected: FAIL on the missing research/memory requirements.
- [ ] **Step 3: Update the manager's workflow contract.** State exact conditions for deep research versus fast mode and define the parent-chat proposal format. Prohibit cross-project memory reuse and broad restructuring without approval.
- [ ] **Step 4: Align `ULTRA_AGENT_V2_PROTOCOL.md`.** Document that memory and research evidence remain project-scoped and are not a substitute for validating current source or obtaining user approval.
- [ ] **Step 5: Re-run the focused contract test.**

  Run: `node --test tools/tests/native-agent-activity-contract.test.mjs`

  Expected: PASS for both the activity and research/memory contracts.

### Task 3: Automate native Antigravity UI acceptance

**Files:**
- Create: `tools/acceptance/native-agent-activity-smoke.md`
- No product-project files are modified; use a generated temporary read-only fixture under the operating system temp directory.

**Interfaces:**
- Driver: Existing CUA computer-use integration; launch/focus the installed Antigravity App and operate its visible UI without asking the user to open a browser or run commands.
- Fixture: A temporary project containing only a README and a clearly bounded read-only investigation prompt.
- Evidence: Inspected parent-chat assignment/update messages plus native sub-agent panel worker states and detail conversation. Record screenshots or UI observations without saving conversation secrets or hidden reasoning.

- [ ] **Step 1: Create an isolated temporary project automatically.** Do not use `E:\sales_agent` or any user business checkout. Include a simple README question that requires one read-only research sub-agent.
- [ ] **Step 2: Launch the installed Antigravity App through CUA and select the temporary project and `production-orchestrator`.** Use the existing signed-in environment; do not change accounts or provider settings.
- [ ] **Step 3: Submit the read-only task and inspect the parent conversation and native sub-agent panel automatically.** Confirm a clear assignment announcement, worker visibility while running, a readable detail conversation, and a factual completion update. Do not inspect or expose hidden chain-of-thought.
- [ ] **Step 4: Confirm the temporary project's source files remain unchanged.** Remove only the temporary fixture created by the smoke procedure after capturing the pass/fail result.
- [x] **Step 5: Record the acceptance outcome in `tools/acceptance/native-agent-activity-smoke.md`.** Automated native UI capture remains blocked; the user explicitly approved retiring the standalone dashboard because it was not updating with the active Antigravity project.

### Task 4: Retire the standalone browser dashboard after native acceptance

**Dependency:** Native UI capture is documented as blocked, but the user explicitly approved removal of the non-live standalone panel after the root-cause check.

**Files:**
- Delete: `tools/ultra-agent-v4-control-panel/server.mjs`
- Delete: `tools/ultra-agent-v4-control-panel/public/index.html`
- Delete: `tools/ultra-agent-v4-control-panel/public/styles.css`
- Delete: `tools/ultra-agent-v4-control-panel/public/app.js`
- Delete: `Open-Ultra-Agent-Control-Panel.cmd`
- Modify: `package.json`
- Modify: `tools/build-antigravity-plugin.mjs`
- Modify: `tools/agent-hub-doctor.mjs`
- Modify: `tools/update-key-checksums.mjs`
- Modify: `tools/tests/portable-plugin-contents.test.mjs`
- Modify: `README.md`
- Modify: `docs/superpowers/specs/2026-11-05-ultra-agent-v4-control-panel-design.md`
- Modify: `docs/superpowers/plans/2026-11-05-ultra-agent-v4-control-panel.md`
- Regenerate: `KEY-CHECKSUMS.json`

**Interfaces:**
- Remove `npm run control-panel`; retain V2 memory and V3 state/context/trace utilities only where they support project continuity, recovery, or evidence.
- Update the doctor from a local-panel-presence check to a native-agent-activity contract check.
- The next owner-signed package version is `1.7.1`.

- [x] **Step 1: Add packaging assertions before removing files.** The package test continues to require native activity/research text and the generated archive is checked for the remaining runtime only.
- [x] **Step 2: Run focused package/doctor tests and confirm they fail against the current panel-inclusive package.**
- [x] **Step 3: Remove panel source/launcher and all build, doctor, checksum, README, and package-script references.** Old dashboard docs are marked superseded; no user-project data was touched.
- [x] **Step 4: Bump source and plugin package versions to `1.7.1`.** Existing signing key behavior, signer and plugin identity remain unchanged.
- [x] **Step 5: Refresh checksums and run focused packaging/doctor tests.**

  Run: `node tools/update-key-checksums.mjs`

  Run: `node --test tools/tests/native-agent-activity-contract.test.mjs tools/tests/portable-plugin-contents.test.mjs tools/tests/agent-hub-doctor.test.mjs`

  Expected: PASS; no packaged dashboard assets or launcher remain.

### Task 5: Build and verify the replacement release

**Files:**
- Modify only release-generated artifacts as required: `dist/mansoor-agent-hub.zip`, `dist/mansoor-agent-hub/`.
- Source verification: `tools/agent-hub-doctor.mjs`, release tests, signature manifest.

**Interfaces:**
- Owner release command: `npm run build` from `E:\Agents`.
- Native UI verification: Task 3 CUA report remains the acceptance evidence for the new interaction contract.

- [x] **Step 1: Run `npm run build`.** It must regenerate checksums, build/sign the portable ZIP, pass `agy plugin validate --strict` when available, pass the doctor, and pass the full existing focused test suite.
- [x] **Step 2: Inspect the generated ZIP manifest and inventory.** Confirm version `1.7.0`, valid signature/checksums, manager prompt and skills present, no standalone panel/launcher, no API keys or provider connectors.
- [x] **Step 3: Review `git diff --check` and the final source diff.** Confirm no business-application repository was changed and no unrelated cleanup or restructure slipped in.
- [x] **Step 4: Report exact pass/fail evidence and limitations.** Automated native UI behavior remains unverified; no claim is made that the user's active task was backfilled.

## Rollout boundary

The implementation produces a signed package only. Do not install it into Antigravity or interrupt an active conversation until the user explicitly asks to install/restart; installation remains a separate, reviewable operational action.

## Execution status (2026-11-06)

- Tasks 1 and 2 implemented; focused contract tests pass (2/2), including a mutation check for project-memory isolation.
- Task 3 automated native UI acceptance is BLOCKED because Antigravity window capture timed out twice. No active conversation was interrupted.
- Task 4 and Task 5 are complete after explicit user approval: browser dashboard source/launcher retired and package 1.7.1 rebuilt. Package is not installed.

- Context-load fix: 1.6.3 packages compact 60-character skill routers under skills/ and preserves full bodies under skill-library/; router regression is covered by the portable package test.
