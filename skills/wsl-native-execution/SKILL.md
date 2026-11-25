---
name: wsl-native-execution
description: Use when running repository checks, Node.js or Python tooling, security audits, or Linux-native scripts from Windows through WSL.
---

# WSL Native Execution

Use WSL to run Linux-native project tooling when the distro already contains the required runtimes and dependencies. Keep the Windows repository authoritative unless the user has explicitly chosen a Linux-side checkout.

## Choose the execution path

1. Discover available distros with `wsl.exe --list --quiet`; select the configured development distro rather than assuming its name.
2. Check Node/Python versions and required package managers inside that distro before running work.
3. If the project has an intentional Linux checkout, run there. Otherwise access the Windows workspace through `/mnt/<drive>/...`; do not copy it automatically.
4. Prefer native Linux commands for tools that need Linux behavior. Use PowerShell/Windows tools for Windows-specific packaging, installers, signing, or Antigravity host operations.

## Keep execution efficient and safe

- Batch related shell work into one WSL invocation and keep output bounded.
- Use the project's existing lockfile and package manager; do not reinstall dependencies on every task.
- Avoid repeated cross-filesystem scans. For large builds or intensive file watchers, recommend a Linux-side checkout only when the user is ready to make that the maintained workspace.
- Do not expose credentials in command arguments, shell history, logs, or copied artifacts.
- Do not use `sudo`, alter distro configuration, install packages, or change mounts without explicit task scope.
- Preserve exact exit codes and capture the command and working directory for reports.

## Report

State the distro, repository location (`/mnt/...` or Linux path), runtime versions, commands actually run, and any Windows/WSL boundary that affected results. Never claim a WSL check ran unless its output was observed.
