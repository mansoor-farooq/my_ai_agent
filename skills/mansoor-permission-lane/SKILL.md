---
name: mansoor-permission-lane
description: Use when work needs shell, filesystem, browser, network, WSL, host, or destructive capabilities.
---
# Mansoor Permission Lane
Choose the smallest execution lane: read-only, bounded in-workspace manager-auto, isolated worktree, or host-reviewed. Prefer WSL on Linux-capable hosts and the Windows adapter otherwise. Never bypass host controls or assume Turbo grants system-wide authority. Explain the exact capability gap when a lane is unavailable.

Stop condition: the selected lane is authorized and observable, or the action is safely blocked.

