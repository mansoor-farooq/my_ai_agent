# Antigravity Subagent Compatibility

**Checked:** 2026-11-04

## Observed local runtime

- `agy --version` returned `1.4.12`.
- The installed `mansoor-agent-hub` package is version `1.2.0` before this compatibility rebuild; the new package is version `1.2.1`.
- The running local Antigravity IDE executable reported product version `2.29.0.0`, newer than the supplied `2.6.0` release reference.
- `agy plugin validate --strict` passed with 15 agents, 0 skills, 0 rules, 0 hooks, 0 MCP servers and 0 sidecars.
- `agy plugin list --json` reports all 15 Mansoor agents installed and enabled.
- `agy agent` lists only `production-orchestrator` as the Mansoor primary agent; specialists intentionally use `mainAgent: false` and remain manager-routed subagents.

## Upstream behavior covered

Antigravity's current custom-subagent documentation supports Markdown agents with explicit tool allowlists, `subagent: true`, `mainAgent: false` for specialists, and `invoke_subagent` delegation. The manager and specialists in this package follow that contract.

The recent Antigravity fixes relevant to this hub include automatic roster/instruction injection for agents that declare `invoke_subagent`, improved subagent status tracking, and fixes for MCP inheritance and relative configuration paths. This package intentionally ships no MCP servers or provider connectors, so those connector-specific fixes require no local configuration change.

The official IDE `v2.6.0` notes also describe faster long conversations, safer nested-subagent stopping, and more reliable custom hooks. The current package does not add hooks or nested provider workers, and its bounded native `invoke_subagent` contract remains compatible with those changes.

## Compatibility hardening

The package response contract now tells every shipped agent to use the injected roster, declared agent names and native `invoke_subagent` only. It also requires bounded handoffs with project identity and expected evidence. This prevents stale manual routing assumptions and keeps the manager as the only orchestration authority.

## Recheck after future Antigravity updates

```powershell
agy --version
agy plugin validate --strict "$env:USERPROFILE\.gemini\config\plugins\mansoor-agent-hub"
agy plugin list --json
agy agent
```

If the plugin validator reports a new frontmatter or tool-schema warning, update the source profiles and rebuild the signed package before installing it again.
