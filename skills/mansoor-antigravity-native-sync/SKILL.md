---
name: mansoor-antigravity-native-sync
description: Use when building, installing, updating, recovering or verifying the native Antigravity plugin, host agents or project sync.
---

# Mansoor Antigravity Native Sync

Use the genuine Antigravity CLI as the source of truth. The native CLI is `agy`; never infer installation success from files, a running process, a build result or profile sync alone.

## Safe preflight

1. Verify package signature and checksums before host changes.
2. Resolve the real `agy` executable and read `agy plugin list --json`. Require a zero exit code and valid JSON with the `mansoor-agent-hub` name, version and absolute plugin path when an installation exists. On Windows PowerShell 5.1, parse top-level JSON arrays with `System.Web.Script.Serialization.JavaScriptSerializer`; `ConvertFrom-Json -InputObject` can collapse the CLI list into one wrapper object and falsely report a bad inventory. If output is missing, malformed or contradictory, journal `deferred-cli-unverified` and defer with exit code 42 before changing global profiles, permissions or project copies.
3. Compare the package's declared version with the CLI-reported installed version and path. Process state is a lock signal, not proof of installed state.
4. If Antigravity is running and the CLI shows that an install or update is needed, journal `deferred-host-active` with the observed installed version, target version, process count and next action. Exit with code 42 before global/profile/project sync. Ask the user to close Antigravity normally and rerun the same package. Never stop Antigravity, kill a worker, force-rename a locked directory or mutate the active plugin by copying over it.
5. If the CLI confirms the exact target version is already active, leave that plugin untouched. Continue only independent sync steps that are safe for an active host; do not claim the plugin was updated.

## Install and verify

- Stage the signed package outside the active plugin directory and run `agy plugin validate --strict <stage>` before installation.
- Install only through `agy plugin install <stage>`. Preserve a verified backup before activation where supported.
- Re-read `agy plugin list --json` after install. Require the expected version, resolved plugin path and expected files/hashes before reporting success.
- If install reports an in-use, rename, sharing-violation or access-denied lock, preserve the old active package and journal the defer state. Do not repeat the same write attempt in a loop.
- Keep logs and journals concise. Do not include prompts, tokens, credentials or hidden reasoning.

## Stop condition

Stop when the active plugin is verified at the requested version, or when the journal records a specific safe defer/failure state and a clear next action. Never report a defer as successful installation.
