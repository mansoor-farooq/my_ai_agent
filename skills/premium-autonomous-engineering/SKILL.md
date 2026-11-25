---
name: premium-autonomous-engineering
description: Use for complex, cross-domain, production-sensitive, or explicitly premium agent work that needs adaptive routing, bounded parallel workers, current code, isolated verification, and evidence-backed recovery.
---

# Premium Autonomous Engineering

Use the smallest execution profile that can satisfy the task. Premium means stronger coordination and verification, not an unrestricted model, provider switch, or removal of host permissions.

## Capability pack

- Reconstruct project identity, current toolchain/lockfiles, memory and relevant source before planning.
- Build a dependency graph and dispatch ready independent work concurrently, capped by the host scheduler. Keep one writer per path.
- Use WSL-native tooling when its distro and dependencies are healthy; fall back to explicit PowerShell/Windows commands when they are not. Never use a bare Windows `bash.exe` relay.
- Recommend a managed isolated worktree only when parallel conflict, long checks, risk, or an explicit testing branch makes it faster or safer. Keep reversible localized fixes on the fast path.
- For browser work, use the provider ladder and run Lighthouse last after the requested scenarios; a blocked provider remains a gap.
- Route GitHub Actions failures through authenticated `gh` inspection and a bounded fix plan. Keep external CI providers out of scope.
- Route media through draft/proxy, real output inspection, provenance and playback/visual QA. Never claim a render from an unobserved command.
- Converge all worker results through the shared result contract, deduplicate evidence-backed findings, preserve conflicts, and run an independent read-only verifier.
- For complex work, use `premium-three-lane-execution`: start one fast builder and one independent read-only quality/research critic from a shared context digest, then let the manager join and verify both before promotion. The manager lane is a phase owned by the main manager, not a second dispatcher.
- Load `specialist-excellence-loop` for domain workers that need the stronger inner loop: scoped contract, bounded chunks, exact checks, adversarial self-review and machine-mergeable handoff.
- For custom features or architecture, load `open-source-first-development` before implementation. Require the gate envelope and a `reuse`, `adapt`, `inspire`, or `custom` decision; do not let popularity substitute for license, compatibility, security or source evidence.

## Recovery and current code

Use at most two targeted repair attempts for a failed verification. Stop on repeated signatures, security/permission/quota failures, or scope expansion. Prefer current supported APIs and the repository's declared versions. Remove legacy code only when unused behavior is proven, compatibility impact is understood, and the change is in scope.

## Premium handoff

Return the selected mode, worker waves, isolation decision, changed paths, observed checks/artifacts, verifier outcome, remaining gaps and rollback/promotion state. Never report a speedup, browser session, CI result, media output, or bug-free status without fresh evidence.
