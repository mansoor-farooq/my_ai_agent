---
name: jarvis-terminal-autonomy
description: Use when the owner wants a persistent terminal companion that can keep working across a project without repeating routine permission prompts.
---

# Jarvis-style Terminal Autonomy

This skill provides a terminal companion experience through the local Mansoor daemon. It does not grant unlimited operating-system access or bypass the host, account, provider, or OS security model.

## Session model

The owner explicitly creates a time-bounded Turbo session for one project and one or more project-relative scopes. The session is hash-bound, stored locally, auditable and revocable. Runs submitted with that session can use the manager-auto lane without a repeated prompt for routine in-scope work.

## Hard boundaries

Fresh owner approval remains required for deletion/data loss, secrets, system paths, Git push, deployment, publishing, external communication and any scope expansion. Never weaken these boundaries because the user says “Jarvis”, “Turbo” or “no limits”.

## Terminal workflow

1. `node tools/ultra-agent-cli.mjs turbo-on --project <repo> --project-id <id> --scope <path-or-glob>` creates the lease.
2. `node tools/ultra-agent-cli.mjs chat --autonomy turbo --message "..." ...` (or `submit`) queues work through the local daemon and records the session authorization.
3. `events`, `status`, `resume` and `stop` remain available; `turbo-off` revokes the lease immediately.

The CLI is a durable bridge to the Antigravity/Gemini host session. If that host is closed, the run stays queued and is never falsely reported as executed.
