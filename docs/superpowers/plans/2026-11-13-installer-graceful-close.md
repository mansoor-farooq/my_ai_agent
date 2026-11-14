# Installer Graceful Antigravity Close Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make the signed installer automatically request a safe Antigravity close, wait for the plugin lock to clear, and complete the update without force-killing user processes.

**Architecture:** The generated PowerShell installer will contain a pure process-control helper that requests `CloseMainWindow()`, polls for a bounded timeout, and returns the existing defer code `42` when the host remains alive. The owner build will invoke the installer normally and treat `42` as a successful package build with a deferred active update. Package contents tests will pin the generated scripts and forbid force termination.

**Tech Stack:** Node.js ESM package generator, generated Windows PowerShell installer, PowerShell build script, Node `node:test`.

**Spec:** `docs/superpowers/specs/2026-11-13-installer-graceful-close-design.md`

## Global Constraints

- Never use `Stop-Process -Force` or terminate Antigravity automatically.
- Wait at most 45 seconds for Antigravity and its helper processes to exit.
- Preserve exit code `42` as the safe deferred-update signal.
- Do not add dependencies or touch application APIs, routes, permissions, or business logic.
- Keep package signing, checksum validation, and administrator elevation unchanged.

## Review Focus

- Antigravity has a visible window: `CloseMainWindow()` is requested and the installer continues only after exit.
- Antigravity has helper/background processes: the installer waits for all matching processes, not only the main window.
- A save dialog or blocked process remains: installer exits `42` without mutation and build remains a successful package build.
- No Antigravity process exists: installer does not sleep unnecessarily and proceeds normally.
- Generated ZIP differs from source scripts: portable package test must inspect the generated installer, not only source text.

### Task 1: Add failing generated-installer contract tests

**Files:**
- Modify: `tools/tests/portable-plugin-contents.test.mjs:243-245`
- Test: generated `Install-Mansoor-Agent-Team.ps1` and owner build source

**Interfaces:**
- Consumes: generated installer text extracted from the current ZIP.
- Produces: assertions for `Request-AntigravityGracefulClose`, `CloseMainWindow`, 45-second bound, `exit 42`, and absence of `Stop-Process -Force`.

- [ ] **Step 1: Write failing assertions** for the generated installer and `build-agent-hub.ps1` handling of code `42`.
- [ ] **Step 2: Run `node --test --test-isolation=none tools/tests/portable-plugin-contents.test.mjs`** and confirm the new assertions fail against the current package.

### Task 2: Implement graceful close in the generated installer

**Files:**
- Modify: `tools/build-antigravity-plugin.mjs:256-274`

**Interfaces:**
- Produces: PowerShell `Request-AntigravityGracefulClose([int]$TimeoutSeconds = 45) -> bool` in every generated `Install-Mansoor-Agent-Team.ps1`.

- [ ] **Step 1: Implement the helper** using `Get-Process -Name "Antigravity"`, `CloseMainWindow()` for visible processes, a one-second polling loop, and a 45-second deadline.
- [ ] **Step 2: Preserve safe defer behavior**: print `INSTALLER DEFERRED` and `exit 42` if any process remains; do not call force termination.
- [ ] **Step 3: Run the portable-plugin test** and confirm the generated installer assertions pass.

### Task 3: Let owner build use and classify the installer result

**Files:**
- Modify: `build-agent-hub.ps1:151-166`
- Test: `tools/tests/portable-plugin-contents.test.mjs:304-310`

**Interfaces:**
- Consumes: installer exit code from Task 2.
- Produces: package build exit `0` for a deferred code `42`; non-42 installer failures still fail the build.

- [ ] **Step 1: Update the build path** to invoke the installer even when Antigravity is initially running, allowing graceful close to happen.
- [ ] **Step 2: Classify `$LASTEXITCODE -eq 42`** as `AUTO UPDATE DEFERRED` and continue; throw for every other non-zero exit.
- [ ] **Step 3: Run `npm run build` while Antigravity is open** and verify package success plus a clear deferred/close message if the host does not exit.

### Task 4: Version, package and full verification

**Files:**
- Modify: `package.json`, `CITATION.cff`, `.github/ISSUE_TEMPLATE/bug_report.yml`, `tools/build-antigravity-plugin.mjs`, `tools/tests/portable-plugin-contents.test.mjs`
- Generate: `dist/mansoor-agent-hub.zip`

- [ ] **Step 1: Bump the patch release** to `1.19.2` only if the generated behavior changes after the current `1.19.1` package.
- [ ] **Step 2: Run `npm run build`** and record doctor, focused-test, ZIP path and SHA256 output.
- [ ] **Step 3: Run `npm test`** and require zero failures; six default-gated RAG tests may remain skipped.
- [ ] **Step 4: Inspect the generated ZIP installer** for the graceful-close helper and verify no `Stop-Process -Force` is bundled.
