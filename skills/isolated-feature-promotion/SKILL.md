---
name: isolated-feature-promotion
description: Use when a feature, agent task, or test change must run in an isolated worktree or testing branch and reach the primary checkout only after verification and exact patch review.
---

# Isolated Feature Promotion

Keep the primary checkout untouched while a worker or test branch changes code. Use the managed task-workspace runtime when available; it creates a pinned worktree, records the base revision and approved path scope, and produces a hash-bound patch.

## Lifecycle

1. Confirm the primary checkout is a clean Git root and capture its base revision.
2. Create or resume an isolated workspace with a stable project/task id, plan hash, allowed paths, forbidden paths, and optional testing branch name. Never silently use a dirty primary checkout.
3. Run the worker implementation and all scoped checks in the isolated workspace. Keep generated reports and temporary files inside approved paths.
4. Prepare review: validate changed paths, produce the binary patch and record its SHA-256 hash. A worker success message is not enough.
5. Run an independent read-only verifier against the isolated workspace and the acceptance checks. Mandatory failures block promotion.
6. Promote only the exact owner-reviewed patch hash to the primary checkout. Promotion stages the patch against the same clean base; it does not commit or push. The owner can then inspect, commit, merge, or discard through the normal Git workflow.
7. If the primary checkout advanced or became dirty, stop and create a fresh review from the new base. Never force-apply or overwrite owner changes.

## Quality and rollback

Use the shared agent result contract. Record branch/worktree path, base revision, changed paths, check commands, artifacts, verifier result and remaining gaps. Discard an unapproved workspace safely. A “passed” result requires the isolated checks and verifier evidence; it does not claim bug-free behavior outside the tested scope.
