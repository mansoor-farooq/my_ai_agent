---
name: mansoor-platform-adapter
description: Use when the same task must work on WSL/Linux and native Windows or when runtime tools differ across hosts.
---
# Mansoor Platform Adapter
Detect the host and available tools rather than guessing. Prefer Linux/WSL paths for reproducible CLI work, then use the Windows PowerShell adapter as a first-class fallback. Keep commands path-safe, avoid shell-specific quoting, and report which platform actually produced evidence.

Stop condition: one supported platform path is verified, or the missing prerequisite is explicit.

