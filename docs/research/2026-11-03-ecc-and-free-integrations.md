# ECC-inspired capability audit and free/no-login policy

Date: 2026-11-03
Scope: inspect ECC's public repository and compare its reusable workflow patterns with this agent hub. This note records design inspiration, not ECC instructions or a request to install ECC wholesale.

## Observed ECC patterns

- ECC separates reusable skills/rules/hooks from harness-specific adapters and exposes selective install/setup paths. Its repository supports several agent harnesses, while documenting that parity varies by adapter.
- ECC has a local skill-generation path that analyzes repository Git history without an external service.
- ECC includes an `ecc doctor` lifecycle and MCP inventory. Its current README says only Chrome DevTools is a default connector; other MCPs are opt-in. It also warns that MCP descriptions consume context and that enabling every connector is undesirable.
- ECC's connector catalog is mixed: examples include GitHub/Jira/Firecrawl/Exa entries that require credentials, alongside an anonymous Parallel Search endpoint and local/process-launched tools. ECC Pro's hosted GitHub App is a separate paid/authenticated offering. Therefore “ECC is open source” does not mean every integration is free, anonymous, or private.
- Free/keyless remote search still sends query text to an external service and can have limits. No-login is not the same as local-only or unlimited.

Sources checked on 2026-11-03:

- [ECC README and install/mcp policy](https://github.com/affaan-m/ECC)
- [ECC MCP server catalog](https://github.com/affaan-m/ECC/blob/main/mcp-configs/mcp-servers.json)
- [ECC Codex plugin manifest](https://github.com/affaan-m/ECC/blob/main/.codex-plugin/plugin.json)
- [ECC cross-harness architecture](https://github.com/affaan-m/ECC/blob/main/docs/architecture/cross-harness.md)

## Existing hub fit

This hub already has a single `production-orchestrator`, task-scoped specialists, selected skills, local capability-manifest validation, project-scoped knowledge sync, native research tools, the DSH account route and a separately gated public free-model route. Adding duplicate MCP search servers by default would increase tool/context surface without filling a current gap.

## Decision: zero-login local-first defaults

1. Keep account/API-key integrations off by default. Add them only after a user selects the service and provides its supported credential through the service's own secure setup.
2. Prefer existing local tools and harness-native search over duplicate connectors.
3. Offer public keyless search only as an optional adapter when native search is unavailable; disclose the external query/data path and upstream limits.
4. Add a read-only local `agent-hub-doctor` inspired by ECC's doctor. It checks source and installed profile alignment, account/free-pool routing gates, checksum integrity and known credential-artifact paths. It does not read credential contents, scan unrelated user data, call APIs or repair files.
5. Any future local connector (for example Chrome DevTools) stays optional and is added only after checking the active harness already supplies equivalent browser control.

## Verification boundary

The ECC repository was inspected through its public GitHub pages on the date above. No ECC package was installed and no ECC code was copied. No provider APIs or sign-in flows were called. The local doctor is expected to emit only check names/status/counts and never file contents of credential-like artifacts.
