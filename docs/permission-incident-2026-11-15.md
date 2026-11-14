# Antigravity Permission Incident — 2026-11-15

## Summary

Repeated permission prompts were caused by a boundary between the local Mansoor runtime and Antigravity's native host actions. The runtime can auto-approve bounded, manifest-backed work and selected safe commands, but native editor writes and unclassified shell commands are still controlled by Antigravity's host permission layer.

## Applied fix

- Merged the Mansoor `auto-safe-review-critical` policy into the local Antigravity desktop configuration.
- Preserved existing user grants.
- Added narrow auto-allow rules for version probes, routine verification commands, and the managed runtime MCP tools.
- Added explicit global `read_file(*)` and `write_file(*)` grants because Windows can classify project paths as non-workspace; protected deny rules remain higher priority.
- Updated the PreToolUse hook so canonical in-workspace file mutations run as one scoped batch instead of prompting once per file.
- Kept deny rules for secrets, `.env`, `.git`, SSH keys, destructive commands, network-capable commands, and Git push/reset/clean.
- Created the host-config backup at `C:\Users\pc\.gemini\config\config.json.mansoor-backup`.

## Required operating rule

For a project such as `My inventory management`, use one manifest-backed managed run for the complete bounded change. Do not split one change into many native editor/shell calls. Restart or reload Antigravity after a policy update.

## Boundary / non-claim

The project files cannot safely override Antigravity's host-level approval UI. A blanket allow-all policy would remove protection from credentials, destructive actions and external communication, so it is intentionally not enabled. If prompts continue for ordinary in-workspace writes after reload, verify that the rebuilt plugin is installed/enabled; the updated hook allows only canonical paths inside the active workspace.

## Verification

Focused permission tests: 24 passed. One Windows symlink fixture could not be created because the sandbox returned `EPERM`; this is an environment limitation, not a policy assertion failure.
