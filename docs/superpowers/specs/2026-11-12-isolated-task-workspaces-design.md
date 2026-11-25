# Isolated Task Workspaces and Safe Promotion

## Intent

Give every managed Ultra Agent task a durable, isolated Git worktree so model writes, failed attempts, and process restarts cannot directly alter the owner's primary checkout. After checks pass, the manager produces a reviewable patch. Applying that patch to the primary checkout requires a separate, payload-bound owner approval.

## Goals

- Bind every task run to a clean repository root and pinned base commit.
- Create or resume the same task worktree under a stable user-local workspace directory.
- Run model writes and registered checks inside that worktree.
- Preserve existing policy, effect-ledger, checkpoint, and trace controls.
- Produce a deterministic patch and changed-path list after verification.
- Promote only when the base checkout is still clean and unchanged and the owner approves the exact patch hash.
- Allow explicit discard of only a workspace proven to belong to this manager.
- Keep the existing V4 public runtime entrypoint and avoid dependencies, provider changes, or changes to project APIs/business logic.

## Delivery and promotion boundary

Managed changes execute in a detached Git worktree pinned to the reviewed base commit. The primary checkout stays untouched during implementation and verification. A successful run creates a review patch and SHA-256 identifier. Promotion requires a trusted owner approval carrying that exact hash, confirms the base checkout is unchanged and clean, revalidates paths, then applies and stages the patch. It does not commit, push, deploy, or discard automatically. A later workspace mutation invalidates promotion.

Workspace state and patches live under the user's local workspace root, outside the project. Resume is allowed only for the same project identity, task ID, base revision, approved plan hash, and path scope. A stale local task lock may be reclaimed only when its recorded process is confirmed absent; malformed or live locks fail closed.

This is a managed-runtime capability, not a claim that Antigravity's native editor writes are automatically routed through it. A trusted host adapter must invoke it and provide owner approval. The existing PreToolUse hook remains a separate host boundary.

The portable release bundles that host adapter as the `mansoor-managed-runtime` stdio MCP server in plugin-root `mcp_config.json`. Antigravity resolves the launcher from `PLUGIN_ROOT`; persistent state is stored in `PLUGIN_DATA`. The user installs/enables the plugin once per machine, not once per project. The project path is supplied to each tool call. The current launcher targets Windows 10/11 and uses either Node.js on PATH or the installer-managed user runtime. MCP mutating tools require a fresh Antigravity PreToolUse approval; direct native editor writes remain governed by the separate host hook.

## Non-goals

- No automatic commit, push, deployment, or merge commit.
- No silent fallback to in-place writes when Git is missing, the repository is dirty, or workspace validation fails.
- No claim that resubmitting a task restores provider-side conversational context. Resume reuses the persisted workspace and effect/checkpoint state supplied by the caller.
- No replacement of the existing RAG store, benchmark schema, or Antigravity native activity surface.

## Constraints

- Preserve the 15 agent profiles, internal IDs, API behavior, project permissions, business logic, and local rule customizations.
- Use Node.js ESM, `node:test`, and Git CLI arguments without shell interpolation; add no packages.
- Keep task state and traces under the original project root; keep worktrees outside the primary checkout under a stable user-local directory.
- Reject dirty base checkouts, path escapes, repository identity mismatch, stale base commits, corrupt manifests, changed approval payloads, and failed checks.
- Promote only by applying the recorded patch to a clean primary checkout with a matching base revision; leave changes staged for user review and do not commit.

## Approaches

1. **Direct writes with a backup copy.** Rejected because writes still touch the live project and copying a large repository is slow and can miss Git metadata or ignored files.
2. **Git worktree per task with explicit patch promotion.** Selected because Git already exists in the supported coding workflow; it gives a pinned commit, separate working directory/index, small disk overhead, durable task isolation, and a normal diff the owner can inspect. The tradeoff is that the project must be a clean Git checkout.
3. **External container/VM sandbox.** Deferred because it adds host setup, filesystem/OS compatibility work, and runtime dependencies before the current local workflow is measured.

## Design calls

- Each workspace is keyed by canonical Git root, project ID, and task ID. Re-running the same task resumes that workspace only if its manifest, base revision, and approved plan hash match.
- Workspace creation happens only after plan approval; the approved payload includes the expected base revision and workspace identity.
- A failed or interrupted task leaves its worktree intact for recovery. Replaying the same task is idempotent through the current effect ledger; conflicting changes block.
- Successful verification returns task status `complete` with `delivery.status: "review-required"`, a patch path/hash, changed paths, and base revision. This explicitly distinguishes verified work from changes applied to the owner's checkout.
- Promotion requires `approved: true`, a non-empty owner identity, and the exact patch hash. It stages changes with `git apply --index`; it never commits or pushes.
- Discard requires explicit approval and validates the managed path before removing it. No age-based auto-pruning is allowed.
- If the base checkout becomes dirty or advances, promotion is blocked. The user can create a new task from the new revision.

## Verification and acceptance

- Creating an isolated run leaves the primary checkout byte-for-byte unchanged.
- Restart/replay with the same task and plan resumes the same workspace and does not duplicate writes.
- A different task, project, repository root, base revision, or approved plan cannot attach to another task's workspace.
- Managed writes and check commands operate in the isolated checkout.
- Dirty, stale, malformed, escaped, or unapproved promotion attempts leave the primary checkout unchanged.
- A matching approved patch stages only its approved changes; no commit or push occurs.
- Explicit discard removes only the validated manager-owned worktree and refuses mismatched roots.
- Existing unit, RAG, security, doctor, package, and installer behavior remains green.

## Implementation scope

Add a provider-free worktree manager and tests, wire it into `runManagedTask`, add owner-approved review/promotion and discard APIs, update portable packaging and the manager's run instructions, then run focused tests, full local tests, doctor, security fixtures, secret scan, and signed package build. No live install, commit, push, or publication is part of this implementation turn.
