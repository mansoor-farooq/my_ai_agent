# Manager Command Approval Design

## Intent

Mansoor AI Team Manager should be able to run a narrow class of deterministic, read-only verification commands without asking the user for the same approval repeatedly. Commands that can mutate files, delete data, access secrets, use the network, or create external side effects must remain owner-reviewed.

## Goals

- Let the manager auto-approve only an explicit, auditable read-only command set.
- Keep direct destructive shell commands fail-closed and owner-reviewed.
- Reuse the existing V5 risk policy and Antigravity PreToolUse hook instead of bypassing host security.
- Make the decision visible in the hook reason and covered by tests.
- Preserve the existing managed MCP approval receipt for Tier 0/1 work.

## Non-goals

- Do not make arbitrary `run_command` calls automatically allowed.
- Do not auto-approve purge/delete commands, package installs, network calls, Git push/deploy, secrets, or production actions.
- Do not change Antigravity's UI permission choices or claim OS-level sandboxing.

## Chosen approach

Add a deterministic shell-command policy module with an exact command grammar. The hook will classify a `run_command` call before host execution:

1. `auto_approve`: known read-only probes and exact routine verification commands (`npm test`, approved lint/typecheck/analyze scripts, `flutter analyze/test`, `dotnet test`, `python -m pytest`) with no pipeline, redirection, command substitution, mutation verb, protected path, or network flag.
2. `owner_review`: maintenance, unknown, or potentially side-effecting commands; these continue to return `force_ask`.
3. `deny`: malformed or explicitly dangerous commands.

The manager profile will instruct Mansoor AI Team Manager to batch related read-only checks and route writes/maintenance through the existing managed MCP lane. The hook remains the final boundary; a prompt cannot downgrade a command's risk.

## Safety constraints

- Reject `;`, `&&`, `||`, `|`, `>`, `<`, backticks, `$(`, `Invoke-Expression`, `Start-Process`, `Remove-*`, `Clear-*`, `Set-*`, `New-*`, `Move-*`, `Copy-*`, `Rename-*`, `Stop-*`, `git push`, `npm install`, and network tooling.
- Reject `.env*`, `.git/**`, private-key paths, credential-shaped arguments, and paths outside the active workspace when a path is present.
- Auto-approved commands receive no elevated permission and no secret-bearing environment.
- The decision is logged only as a reason and command class; raw secret-shaped arguments are not persisted.

## Acceptance

- Disk-space and version probes return `allow`.
- The shown live purge command returns `force_ask` or `deny`, never `allow`.
- Pipelines, redirection, command substitution, protected paths, and unknown commands are not auto-approved.
- Existing managed MCP Tier 0/1 behavior is unchanged.
- Existing hook, doctor, and package tests remain green.
