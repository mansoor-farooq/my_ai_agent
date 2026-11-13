# Ultra Agent v4.4 Quickstart

This guide covers three supported paths: URL bootstrap installation, signed package installation and owner release builds.

## URL bootstrap install

After an approved signed GitHub release exists, run the repository bootstrap with the repository URL:

```cmd
Install-Ultra-Agent.cmd https://github.com/mansoor-farooq/my_ai_agent
```

The bootstrap reads the latest GitHub release, downloads `mansoor-agent-hub.zip`, verifies an optional detached SHA-256 file, then runs the package's signed installer. Windows shows one administrator approval prompt when elevation is required. A repository without a signed release asset stops safely; it never executes arbitrary source or builds a package from an untrusted checkout.

## Recipient install

1. Install Antigravity and sign in with the target user's Gemini account.
2. Obtain the approved signed `mansoor-agent-hub.zip` from Mansoor Farooq's owner distribution. The [releases page](https://github.com/mansoor-farooq/my_ai_agent/releases) is the future public-artifact location, not a promise that an artifact is published today.
3. Extract the ZIP to a local folder.
4. Double-click `Install-Mansoor-Agent-Team.cmd`.
5. Restart Antigravity or reload its skills and agents.
6. Open a project, select `production-orchestrator`, and give it a bounded task in chat.

The installer checks the trusted owner signature, verifies package checksums, runs strict Antigravity validation and stops on an integrity failure. The recipient does not need the source repository, GitHub login, private signing key or build tools.

Governed global rules are synchronized into the detected Antigravity `config/rules` directory. Unchanged managed rules update automatically; locally edited rules are preserved and reported with their local and package hashes. Rule precedence, scope, required evidence and verification checks are recorded in `shared/control-plane/rule-registry.json`.

## First task

Use a task with a clear outcome and project scope, for example:

> Inspect the checkout flow in this repository, explain the current data path, identify the smallest safe fix for the validation bug, and run the relevant tests before changing code.

The manager should show the selected project, route to the relevant specialist, report progress in the parent chat and return changed paths plus verification evidence.

## Owner build and release

Run this only on the owner machine from `E:\Agents`:

```cmd
cd /d E:\Agents
npm run build
```

The build:

- refreshes owner source checksums;
- builds and signs the portable ZIP;
- validates the Antigravity plugin;
- runs the agent-hub doctor;
- runs the focused test suite;
- prints the exact ZIP path and SHA256 hash; and
- automatically runs the signed installer when an existing local Mansoor Agent Hub installation is detected. The installer prints `UPDATE PLAN`, `UPDATED`, the synchronized profile roots and hash verification. If no local installation exists, it leaves the ZIP ready for the first manual install.

For a package-only build that must not touch the local installation, run `npm run build:package`.

Share only `E:\Agents\dist\mansoor-agent-hub.zip`. Keep `.env` files, the private signing key and the full source folder private.

## Local project runtime

Inside a target repository, initialize the project-scoped control plane:

```powershell
node <hubRoot>/tools/ultra-agent-v2/preflight.mjs --dir . --project my-project
node <hubRoot>/tools/ultra-agent-v2/memory.mjs init --dir . --project my-project
node <hubRoot>/tools/ultra-agent-v2/memory.mjs status --dir . --project my-project
```

The local runtime stores project memory under `.agents/memory/` and V3 task state under `.agents/ultra-v3/`. It never needs to export credentials or raw conversations.

## Fast vs Premium

- **Fast:** routine, reversible work with cached context, one relevant specialist and targeted verification.
- **Premium:** architecture, security, migration, release, payment, ML, research or uncertain work with planning, evidence, independent checks and bounded recovery.

Premium mode does not silently downgrade when a required tool or evidence gate is missing.

## Troubleshooting

- If a task appears stale, check project identity and refresh the local RAG index before trusting retrieved evidence.
- If a worker is blocked, read the parent-chat blocker summary before retrying; do not start a second untracked worker.
- If package validation fails, stop and rebuild from the owner source rather than bypassing signature or checksum checks.
- If a feature request changes product behavior, ask the manager for a research-and-approval brief before implementation.
