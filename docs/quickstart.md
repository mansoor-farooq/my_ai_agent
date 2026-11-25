# Ultra Agent v4.4 Quickstart

This guide covers three supported paths: URL bootstrap installation, signed package installation and owner release builds.

## URL bootstrap install

After an approved signed GitHub release exists, run the repository bootstrap with the repository URL:

```cmd
Install-Ultra-Agent.cmd https://github.com/mansoor-farooq/my_ai_agent
```

The bootstrap reads the latest GitHub release, downloads `mansoor-agent-hub.zip`, verifies an optional detached SHA-256 file, then runs the package's signed installer. Windows shows one administrator approval prompt when elevation is required. A repository without a signed release asset stops safely; it never executes arbitrary source or builds a package from an untrusted checkout.

## Recipient install

1. Install Antigravity. The signed installer prepares Gemini CLI; sign in to Gemini CLI on first use.
2. Obtain the approved signed `mansoor-agent-hub.zip` from Mansoor Farooq's owner distribution. The [releases page](https://github.com/mansoor-farooq/my_ai_agent/releases) is the future public-artifact location, not a promise that an artifact is published today.
3. Extract the ZIP to a local folder.
4. Double-click `Install-Mansoor-Agent-Team.cmd`.
5. Restart Antigravity or reload its skills and agents.
6. Open a project and use **Mansoor AI Team Manager** as the main agent. `production-orchestrator` remains an Antigravity compatibility key, not the user-facing identity.

The installer checks the trusted owner signature, verifies package checksums, runs strict Antigravity validation and stops on an integrity failure. It installs Gemini CLI if missing (or updates it if npm manages it), then syncs the manager, all packaged specialists, the complete bundled skill library, governed policies and one Antigravity-native orchestration policy into the user's global Gemini CLI profile. It does not copy account credentials; sign in to Gemini CLI yourself on first use. The recipient does not need the source repository, GitHub login, private signing key or build tools.

Before troubleshooting a second machine, run the read-only System Doctor once:

```powershell
node <hubRoot>/tools/antigravity-system-doctor.mjs --json
```

It reports the exact PATH/runtime, native `agy` inventory, active-host lock, CI interactivity and optional WSL conditions. It does not kill Antigravity or remove third-party plugins. If the host is open, the signed installer defers safely; close Antigravity normally and rerun the same package. Use `npm run antigravity:doctor` from the hub checkout for the same check.

Governed global rules are synchronized into the detected Antigravity `config/rules` directory. Unchanged managed rules update automatically; locally edited rules are preserved and reported with their local and package hashes. Gemini CLI receives the four domain policies and Antigravity-native orchestration policy as namespaced on-demand skills. The orchestration rule explicitly leaves the active host's permissions and approval settings unchanged. Rule precedence, scope, required evidence and verification checks are recorded in `shared/control-plane/rule-registry.json`.

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
- syncs the manager, all packaged specialists, the bundled skill library and governed policies into the owner's global Gemini CLI profile;
- prints the exact ZIP path and SHA256 hash; and
- automatically runs the signed installer when an existing local Mansoor Agent Hub installation is detected. The installer prints `UPDATE PLAN`, `UPDATED`, the synchronized profile roots and hash verification. If no local installation exists, it leaves the ZIP ready for the first manual install.

For a package-only build that must not touch the local Antigravity or Gemini CLI installation, run `npm run build:package`. The GitHub bootstrap uses the latest **published signed release** when invoked; a normal Git push alone does not publish or install a release.

### Refresh referenced skills

The owner can check the explicitly registered GitHub skill references in `skills-lock.json` without changing installed files:

```powershell
npm run skills:update
```

The updater only reads the explicitly listed `SKILL.md` references, validates frontmatter and credential patterns, preserves local edits, pins each source URL to its resolved commit, and bumps the package patch version when skill content changes. To update all supported local installs in one go, run `npm run agents:refresh`. It applies declared references, regenerates provenance/checksums, builds and verifies the bundle, syncs Gemini CLI and the Codex Flutter specialist, then installs the Antigravity plugin. It does not sync or change host permission settings.

To keep this PC's installed agent skills current automatically, run `npm run agents:auto-update:install` once from the hub root. This installs a current-user Windows Task Scheduler job that checks the approved skill references daily at 9:00 AM local time and at user logon, and runs missed checks when the PC becomes available. Before syncing, it fetches the configured Git upstream and fast-forwards only a clean, non-diverged checkout; dirty or diverged work is logged and left untouched. The preflight reads `agy plugin list --json`, so a missing Mansoor plugin, agent, skill, rule, hook, or runtime MCP server triggers repair even when the version number did not change. If Antigravity is open and the plugin is locked, the refresh defers before the expensive validation gates and retries on the next logon, daily run, or explicit manual command; it never force-kills the host or overwrites an active installation. When the bundle needs an update, the task runs the full test suite, agent security fixtures, and secret scan before syncing Antigravity, Gemini CLI, and Codex. It records the synchronized version only after every provider succeeds, so a failed or partial sync is retried. A no-change check leaves installed agents alone. Logs are written to `%LOCALAPPDATA%\MansoorAITeamManager\logs\skill-auto-update.log`. Remove the schedule with `npm run agents:auto-update:remove`. The refresh updates skills already declared in `skills-lock.json`; it does not discover or install arbitrary new skill names.

A weekly GitHub Actions job checks the same allowlisted references, runs tests and the secret scan, then opens or refreshes a review PR. It never pushes skill content directly to the default branch. The scheduled job becomes active after this workflow is merged into the repository's default branch. The PR must be reviewed and merged before it becomes the published source used by later installs. This updater never discovers or installs arbitrary skills from a repository.

Share only the versioned ZIP path printed by the build, for example `E:\Agents\dist\mansoor-agent-hub-1.23.4-a1b2c3d4.zip`. For an approved GitHub release, publish it under the documented release asset name `mansoor-agent-hub.zip`. Keep `.env` files, the private signing key and the full source folder private.

## Local project runtime

Inside a target repository, initialize the project-scoped control plane:

```powershell
node <hubRoot>/tools/ultra-agent-v2/preflight.mjs --dir . --project my-project
node <hubRoot>/tools/ultra-agent-v2/memory.mjs init --dir . --project my-project
node <hubRoot>/tools/ultra-agent-v2/memory.mjs status --dir . --project my-project
```

The local runtime stores project memory under `.agents/memory/` and V3 task state under `.agents/ultra-v3/`. It never needs to export credentials or raw conversations.

## Persistent CLI runtime

From the hub root, start the local daemon in a dedicated terminal:

```powershell
node tools/ultra-agent-cli.mjs start
```

In another terminal, submit a bounded task. Repeat `--scope` and `--acceptance` for each path/criterion:

```powershell
node tools/ultra-agent-cli.mjs submit `
  --project D:\Work\Youngs_bazar `
  --project-id youngs-bazar `
  --objective "Inspect the catalog image loading path and report the smallest safe fix" `
  --scope lib `
  --scope test `
  --acceptance "No API contract changes" `
  --acceptance "Run the focused Flutter checks" `
  --mode fast
```

Use `node tools/ultra-agent-cli.mjs events --run <run-id>` for activity, `resume` after interruption, `stop` to request a stop, and `doctor` to inspect the local runtime. If Antigravity is closed, the run remains queued instead of silently using another provider.

## Android live preview

Install `adb` and `scrcpy` separately on the target Windows machine. The lane detects them automatically; it does not ship either binary. With one online device, the selected serial is automatic. With multiple devices, pass the serial explicitly through the mobile task so the agent never mirrors the wrong phone. The evidence report is written to the project `.agents` area by the host integration and remains `unverified` until a real device and required checks are present.

## Export a local-LLM dataset pack

Managed task runs automatically append a sanitized task metric and refresh the pack with the manager and assigned agent IDs. On Windows, datasets default to `D:\Mansoor AI Team Manager\Agent Knowledge Datasets\<project-id>\Mansoor AI Team Manager`; agent-specific packs are in that folder's `agents\<agent-id>` subfolders. Set `MANSOOR_AGENT_DATASET_ROOT` to override the data root on any platform. For direct benchmark records, pass `--agent-id <specialist-id>` to attribute the work. To export manually, run:

```powershell
node tools/agent-training-dataset.mjs export `
  --dir D:\Work\Youngs_bazar `
  --project-id youngs-bazar
```

Each agent's files are under `agents/<agent-id>/`. Review a passing task before including it in SFT: `node tools/ultra-agent-v4/benchmark.mjs review --dir <project> --task <task-id> --status approved --approved-by <owner>`. Approval is stored as an append-only review event; unreviewed or failed work remains evaluation/hard-case data. Keep those held-out files separate from training. The manifests include provenance hashes. The exporter prepares local data only; it does not train or upload a model.

## Fast vs Premium

- **Fast:** routine, reversible work with cached context, one relevant specialist and targeted verification.
- **Premium:** architecture, security, migration, release, payment, ML, research or uncertain work with planning, evidence, independent checks and bounded recovery.

Premium mode does not silently downgrade when a required tool or evidence gate is missing.

## Troubleshooting

- If a task appears stale, check project identity and refresh the local RAG index before trusting retrieved evidence.
- If a worker is blocked, read the parent-chat blocker summary before retrying; do not start a second untracked worker.
- If package validation fails, stop and rebuild from the owner source rather than bypassing signature or checksum checks.
- If a feature request changes product behavior, ask the manager for a research-and-approval brief before implementation.
