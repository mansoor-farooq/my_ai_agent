# Contributing to Mansoor AI Team Manager

Thanks for helping improve this Antigravity-first, Gemini CLI-compatible agent hub. Contributions should keep the native parent chat and sub-agent panel as the user surface; do not add a separate dashboard or provider bridge.

## Before opening a pull request

1. Use Node.js 20 or newer and work from a clean clone.
2. Read the relevant agent profile and skill contract before changing routing.
3. Prefer an open-source-first investigation. Record the source URL, license, revision and what was reused, adapted, inspired or custom-built. Stars are discovery evidence, not a license.
4. Keep one owner per path. Preserve existing routes, third-party plugins, host permissions and provider selection unless a change is explicitly scoped.
5. Add a focused test and run `npm test`, the secret scan and the smallest relevant doctor/package check.
6. Never commit credentials, private keys, customer data, raw conversations or hidden reasoning. Do not claim a browser, live backend or package installation was verified unless the command returned evidence.

## Reliability rules

- Antigravity upgrades must use genuine `agy plugin list --json` evidence and must defer safely when the host is running.
- The System Doctor is read-only and must remain bounded; it may report a blocker but must not kill host processes or silently change Turbo/approval policy.
- Local context must use a revision-keyed cache, secret/dependency exclusions and a hard latency budget. A timeout is an explicit result, not a reason to start an unbounded second scan.
- PostgreSQL RAG is optional. Do not make routine Antigravity work depend on a database or credentials.
- Preserve stable compatibility paths unless tests and the approved scope prove they are unused.

## Pull request checklist

- [ ] Scope and owned paths are stated.
- [ ] Tests and exact observed commands are listed.
- [ ] Source/license provenance is included for external inspiration or code.
- [ ] No secrets, private data or unsupported claims are present.
- [ ] Existing routes and third-party plugin preservation are unchanged or explicitly justified.
