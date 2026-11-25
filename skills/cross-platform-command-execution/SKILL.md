---
name: cross-platform-command-execution
description: Use when an Antigravity run_command task must work on Windows and Ubuntu/WSL without bash relay failures, repeated permission prompts, or ambiguous shell selection.
---

# Cross-Platform Command Execution

Choose the shell explicitly. Never call bare `bash.exe` on Windows: legacy WSL relay errors can report `execvpe(/bin/bash) failed` even when Windows has a `bash.exe` shim. Use PowerShell on Windows, or invoke a verified distro explicitly through `wsl.exe -d <distro> -- bash -lc <command>`.

## Preflight

1. Detect host OS and project root.
2. On Windows, probe `wsl.exe --status` and `wsl.exe --list --verbose`. Treat access denied, no distro, no default distro, or missing `/bin/bash` as WSL unavailable; use native PowerShell without retry loops.
3. If WSL is healthy, select the configured Ubuntu distro and use the existing Linux project path. If the project is on `/mnt/<drive>`, batch commands and avoid repeated cross-filesystem scans. Do not copy or migrate the project automatically.
4. Record shell, distro, repo path, runtime versions and the exact fallback reason.

## Permissions and Turbo

Use the manager-managed batch lane for a bounded plan so related non-destructive commands share one host approval receipt. The hook may auto-approve safe in-workspace commands, but it cannot override explicit host Deny, protected paths, network/publish/push actions, destructive commands, or OS-level failures. Do not weaken those controls or loop on the same prompt. If Turbo still asks for a safe command, capture the exact command, tool name, workspace path and host decision, then fall back to the manager-managed runtime or Windows/WSL alternative.

## Failure recovery

- `/bin/bash` missing: stop using the relay; run PowerShell on Windows or explicit `wsl.exe -d Ubuntu` after a successful probe.
- WSL enumeration access denied: report WSL unavailable for this process and continue on Windows.
- Hook process failure: return a structured blocked status; do not silently bypass the hook or claim the command ran.
- Permission prompt repeats: batch the remaining approved actions into one manifest and request one review, rather than prompting per file/command.
