---
name: omniroute-gateway
description: Safely operate the local OmniRoute AI gateway and connect Antigravity through its supported MITM/bridge path without exposing credentials or changing application code.
---

# OmniRoute Gateway Skill

Use this skill when the user asks to install, configure, test, or integrate OmniRoute with Antigravity or another coding agent.

## Scope

OmniRoute is a local AI gateway. It can expose an OpenAI-compatible endpoint at \`http://127.0.0.1:20128/v1\`, route across configured providers, apply quota-aware fallback, and expose memory/skills/agent bridges. It is an infrastructure tool, not a dependency of the Mansoor Farooq application.

## Mandatory safety rules

1. Do not put provider API keys, OAuth blobs, JWTs, cookies, database URLs, or decrypted credentials in repository files, prompts, logs, screenshots, or progress notes.
2. Keep the gateway on loopback (\`OMNIROUTE_SERVER_HOST=127.0.0.1\`) unless the user explicitly requests a remote deployment with authentication, TLS, firewall and scoped tokens.
3. Treat free-tier/token claims as provider-dependent estimates. Never promise free capacity or bypass provider terms.
4. Do not use OmniRoute to evade provider restrictions, rate limits, paid-plan controls, or terms of service.
5. Prefer the published npm version that matches the registry. A GitHub release tag may not be published to npm; record the actual installed version.
6. Preserve and back up existing \`%USERPROFILE%\\.omniroute\` data before repairing an unreadable store. Never delete it silently.
7. Keep OmniRoute config outside the application repository. Only commit non-secret setup docs, skill instructions, and sanitized health evidence.
8. Verify with \`omniroute --version\`, \`omniroute health --json\`, loopback TCP check, and a safe \`/v1/models\` request only after a provider/key is configured.
9. Antigravity has no ordinary custom base URL path in the OmniRoute catalog. Use the supported Antigravity MITM/bridge flow or OAuth helper; do not invent an editor config.
10. OAuth is user-consent work. The agent may start the helper and show the URL, but the user must complete Google sign-in/consent.

## Supported local flow

\`\`\`text
Antigravity IDE/CLI
  -> OmniRoute Antigravity MITM/bridge
  -> local /v1/antigravity translation route
  -> configured Antigravity/provider connection
\`\`\`

For standard OpenAI-compatible clients use \`http://127.0.0.1:20128/v1\`. For Antigravity use the repository's MITM/bridge settings and its \`omniroute login antigravity\` helper.

## Project integration contract

The project agent may use OmniRoute for:

- architecture/discovery discussion,
- code review and verification planning,
- prompt compression/context routing,
- optional local model/provider fallback.

It must not automatically send project source, customer data, secrets, or production database contents to an external provider. Use repository-local docs and redacted context by default.

Before changing a gateway setting, record:

- installed version,
- config location (without secret values),
- bind address and port,
- provider count/health,
- whether API-key auth is enabled,
- Antigravity integration mode,
- rollback command,
- evidence label.

