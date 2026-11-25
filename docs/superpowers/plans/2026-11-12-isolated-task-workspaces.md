# Isolated Task Workspaces Implementation Plan

> Execute inline as requested. Preserve the existing project APIs, business logic, and release surface.

**Goal:** Make managed Ultra Agent work isolated and recoverable by default, then give the owner a reviewable, explicitly approved promotion path.

**Architecture:** Compose a local Git worktree manager with the current managed runtime, action policy, effect ledger, checkpoints, traces, and check runner. Keep execution state in the original project, execute code and checks in the task worktree, and promote a hash-bound patch into the original tree only after fresh owner approval.

**Spec:** `docs/superpowers/specs/2026-11-12-isolated-task-workspaces-design.md`

**Constraints:** Node.js ESM; no dependencies; no provider/API changes; no automatic commit/push/deploy; no in-place fallback; no install or publish.

**Portable host integration:** Bundle a local Antigravity stdio MCP server in the plugin package, resolve paths with `PLUGIN_ROOT`/`PLUGIN_DATA`, and avoid per-project MCP setup. The owner installs/enables the plugin once per host. This release's launcher supports Windows 10/11.

## Review focus

- Repository path, workspace path, branch/root changes, task/project reuse, and approval payload mismatch must fail closed.
- Base checkout must remain unchanged until owner-approved promotion.
- Worktree resume must retain same root/commit/plan and use effect-ledger replay; a failure must not delete evidence/work.
- Patch generation must include untracked files without staging model edits in the owner's main index.
- Promotion may stage only a patch with exact recorded hash and a clean unchanged base checkout; failed apply must not partially mutate the checkout.
- Discard must reject arbitrary paths and require explicit owner approval.
- Windows path handling and Git spawn must use argument arrays and no interpolated shell command.

### Task 1: Worktree lifecycle library

**Files:** Create `tools/ultra-agent-v4/task-workspaces.mjs`; create `tools/tests/ultra-agent-v4-task-workspaces.test.mjs`.

- [x] Add tests for clean Git detection, dirty checkout block, pinned creation, resume identity, stale base block, and path validation.
- [x] Implement safe argument-array Git helpers, user-local stable workspace roots, content-hashed manifests, create/resume and explicit discard.
- [x] Add tests for patch generation with modified and untracked files, approval/hash mismatch, dirty main tree, promotion hash, and staged delivery.
- [x] Implement review patch export and owner-approved promotion with no commit/push; reject worktree mutation after review.
- [x] Run the focused task-workspace test file.

### Task 2: Managed-runtime integration

**Files:** Modify `tools/ultra-agent-v4/managed-runtime.mjs`; extend `tools/tests/ultra-agent-v4-managed-runtime.test.mjs`.

- [x] Add regression tests proving the main checkout remains untouched while managed writes and checks run in the worktree.
- [x] Add tests for same-task resume/idempotent replay, plan mismatch rejection, and review-required delivery output.
- [x] Bind expected base revision/workspace ID into owner plan approval and validate it before writing.
- [x] Route policy root, file writes, and verification cwd to the task worktree while keeping locks, traces, state, and effect ledger under the original project.
- [x] Recover only confirmed-stale locks; preserve active locks and fail closed on malformed locks.
- [x] Run managed-runtime and V4 focused tests.

### Task 3: Product wiring and release quality

**Files:** Modify manager profile, `tools/agent-hub-doctor.mjs`, `tools/build-antigravity-plugin.mjs`, `build-agent-hub.ps1`, `tools/update-key-checksums.mjs`, portable-content tests, and the relevant runtime docs.

- [x] Bundle a local stdio MCP adapter and launcher; teach the manager to use the isolated lane and report unavailable rather than claiming native editor isolation if the adapter/hook is absent.
- [x] Package the workspace runtime and require it from the doctor.
- [x] Add release acceptance tests for isolation, resume, approval binding, policy denial, and promotion behavior.
- [x] Run focused release tests, full `npm test`, doctor, source checksums, and signed package build. Six PostgreSQL integration cases remain skipped without the dedicated test database.
- [x] Do not install, commit, push, or publish in this turn.

## Acceptance

- Existing quality suite remains green.
- New worktree tests prove main-checkout isolation, resume and deterministic patch promotion.
- Doctor reports the task workspace runtime as present and manager-routable.
- Package validation confirms the new runtime/tests are represented in the signed portable package where appropriate.
- Report any host/device or model behavior not exercised as unverified.

## Remaining integration boundary

The trusted Antigravity host adapter that invokes `runManagedTask` is not present in this repository, so native IDE edits are not automatically redirected to isolated worktrees. The package exposes the capability and the manager is instructed to be explicit about adapter availability. PostgreSQL RAG integration cases also require the dedicated test database and credentials; six remain skipped in local runs.
