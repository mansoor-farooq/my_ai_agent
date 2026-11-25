---
name: host-permission-recovery
description: Use when Antigravity or an agent repeatedly asks for host permissions, Turbo mode does not auto-approve safe commands, or a managed hook fails on Windows/WSL.
---

# Host Permission Recovery

Reduce avoidable prompts while preserving the host's security boundary. A manager approval receipt can batch a bounded set of safe project actions; it cannot override explicit host Deny, protected files, destructive commands, network/publish/push actions, or OS policy.

## Diagnose once

Record the exact tool, command, workspace path, host decision, hook exit code and whether the task is using the managed runtime. Check that the installed hook and permission sync are the same package version. Do not repeatedly retry an identical prompt or silently bypass a failed hook.

## Safe recovery

1. Reuse one approved manifest/receipt for the bounded non-destructive task instead of requesting one approval per file or command.
2. Keep project paths canonical and inside the active workspace. Use the manager-managed runtime for multi-command edits and checks.
3. On Windows, use PowerShell or `pwsh.exe`; never invoke bare `bash.exe`. If WSL is healthy, use an explicit distro through `wsl.exe -d <distro> -- bash -lc ...`.
4. If the hook fails, return `blocked` with the concrete host error and continue only with a safe alternative shell/runtime. Do not claim an action ran.

## Hard boundaries

Keep fresh review for destructive deletion/reset/format, secrets, protected paths, network uploads, deployment, Git push, and account or permission changes. “Turbo” means manager-approved safe work can be batched; it is not permission to remove these boundaries or to grant unrestricted OS access.
