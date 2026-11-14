import { createHash } from 'node:crypto';
import { mkdir, readdir, readFile, writeFile, stat, copyFile } from 'node:fs/promises';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  defaultOwnerKeyPath,
  publicKeyPemFromPrivate,
  signPackageManifest
} from './package-signing.mjs';
import { copyPortableComponents } from './portable-components.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const target = resolve(process.argv[2] || '');
if (!process.argv[2]) throw new Error('Usage: node tools/build-antigravity-plugin.mjs <empty-output-folder>');
const dist = join(root, 'dist');
if (target !== dist && !target.startsWith(`${dist}${process.platform === 'win32' ? '\\' : '/'}`)) {
  throw new Error('Choose an output folder inside the agent hub dist directory.');
}
await mkdir(target, { recursive: true });
if ((await readdir(target)).length) throw new Error(`Output folder must be empty: ${target}`);

const excludedAgentFolders = new Set(['live-web-auditor', 'omniroute-gateway-operator']);
const secretPattern = /(?:AIza[0-9A-Za-z_-]{30,}|AQ\.[0-9A-Za-z_-]{32,}|-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----|gh[pousr]_[A-Za-z0-9_]{30,})/;
const sourceAgents = join(root, 'agents', 'Antigravity', 'custom-agents');
const responsePolicy = `\n\n## Response quality contract\n\nLead with the result. Use plain language and short paragraphs, match the user's language, separate evidence from assumptions, give concise rationale without hidden chain-of-thought, and report only verification actually run. For implementation handoffs include changed paths, behavior, checks and limitations. Never invent metrics, citations, records or tool results.\n\n## Antigravity subagent contract\n\nWhen Antigravity injects the available subagent roster, use only the declared agent names and the native invoke_subagent tool. Do not invent agent IDs, silently create provider bridges or route work outside the manager. Keep each handoff bounded, include the project identity and expected evidence, and return the worker result to the manager before continuing.\n`;
const packageManifestName = 'PACKAGE-CHECKSUMS.json';
const packageSignatureName = 'PACKAGE-SIGNATURE.json';
const packageVersion = '1.19.5';
const signingKeyPath = resolve(process.env.MANSOOR_AGENT_SIGNING_KEY || defaultOwnerKeyPath());
let ownerPrivateKeyPem;
try {
  ownerPrivateKeyPem = await readFile(signingKeyPath, 'utf8');
} catch {
  throw new Error(`Owner signing key not found at ${signingKeyPath}. Run: node tools/create-owner-signing-key.mjs, then rebuild.`);
}
const ownerPublicKeyPem = publicKeyPemFromPrivate(ownerPrivateKeyPem);
let agentCount = 0;

for (const entry of await readdir(sourceAgents, { withFileTypes: true })) {
  if (!entry.isDirectory() || excludedAgentFolders.has(entry.name)) continue;
  const source = join(sourceAgents, entry.name, 'agent.md');
  let text;
  try { text = await readFile(source, 'utf8'); } catch { continue; }
  if (secretPattern.test(text)) throw new Error(`Credential-like value detected in agent profile: ${entry.name}`);

  const skillRefs = [...text.matchAll(/^\s+-\s+skills\/([^\s]+)\s*$/gm)].map((match) => match[1]);
  // Antigravity 2.32.x can discover plugin skills globally, but its plugin
  // agent loader currently emits `AgentBasePath is not set` for agent-level
  // `skills:` paths. Keep the source profiles authoritative while shipping a
  // host-safe profile that routes to the same names on demand.
  const packagedText = text
    .replace(/^skills:\r?\n(?:[ \t]+-[^\r\n]*\r?\n?)+/m, '')
    + `\n\n## Bundled skill routing\n\nThis profile uses the plugin's namespaced skills on demand. Relevant bundled skill names: ${skillRefs.join(', ')}. Do not invent a provider bridge or copy skill bodies into the prompt.\n`;

  // Keep bundled agents as direct files. Antigravity supports both layouts,
  // but the flat form gives the host an unambiguous agent base path when it
  // resolves the agent's `skills:` entries on Windows.
  const destination = join(target, 'agents', `${entry.name}.md`);
  await mkdir(dirname(destination), { recursive: true });
  await writeFile(destination, packagedText + responsePolicy);
  agentCount += 1;
}

const { skillCount, ruleCount } = await copyPortableComponents(root, target, secretPattern);
const portableRuntimeFiles = [
  'tools/agent-training-dataset.mjs',
  'tools/ultra-agent-cli.mjs',
  'tools/ultra-agent-v4/daemon/paths.mjs',
  'tools/ultra-agent-v4/daemon/events.mjs',
  'tools/ultra-agent-v4/daemon/queue.mjs',
  'tools/ultra-agent-v4/daemon/protocol.mjs',
  'tools/ultra-agent-v4/daemon/daemon.mjs',
  'tools/ultra-agent-v4/agy-session.mjs',
  'tools/ultra-agent-v4/context-bundle.mjs',
  'tools/ultra-agent-v4/android-preview.mjs',
  'shared/control-plane/default-engineering-policies.json',
  'tools/ultra-agent-v2/preflight.mjs',
  'tools/ultra-agent-v2/memory.mjs',
  'tools/ultra-agent-v2/evidence.mjs',
  'tools/ultra-agent-v2/project-identity.mjs',
  'tools/ultra-agent-v2/rag.mjs',
  'tools/sync-knowledge-bank.mjs',
  'tools/validate-capability-manifest.mjs',
  'shared/knowledge/PROJECT_MEMORY_SCHEMA.md',
  'shared/control-plane/agent-capability-manifest.json',
  'shared/ULTRA_AGENT_V2_PROTOCOL.md',
  'tools/ultra-agent-v3/state.mjs',
  'tools/ultra-agent-v3/mode.mjs',
  'tools/ultra-agent-v3/plan.mjs',
  'tools/ultra-agent-v3/context.mjs',
  'tools/ultra-agent-v3/evaluate.mjs',
  'tools/ultra-agent-v3/trace.mjs',
  'tools/ultra-agent-v3/delegation.mjs',
  'tools/ultra-agent-v3/policy.mjs',
  'tools/rule-governance.mjs',
  'tools/content-hash.mjs',
  'shared/control-plane/rule-registry.json',
  'tools/ultra-agent-v3/activity.mjs',
  'tools/ultra-agent-v4/benchmark.mjs',
  'tools/ultra-agent-v4/recovery.mjs',
  'tools/ultra-agent-v4/effects.mjs',
  'tools/ultra-agent-v4/approvals.mjs',
  'tools/ultra-agent-v4/core-loop.mjs',
  'tools/ultra-agent-v4/stages/context.mjs',
  'tools/ultra-agent-v4/stages/plan.mjs',
  'tools/ultra-agent-v4/stages/reference.mjs',
  'tools/ultra-agent-v4/stages/act.mjs',
  'tools/ultra-agent-v4/stages/verify.mjs',
  'tools/ultra-agent-v4/stages/repair.mjs',
  'tools/ultra-agent-v4/stages/answer.mjs',
  'tools/ultra-agent-v4/stages/remember.mjs',
  'tools/ultra-agent-v2/memory-provenance.mjs',
  'tools/repository-map.mjs',
  'tools/benchmark-corpus.mjs',
  'tools/mobile-ui-flow-gate.mjs',
  'tools/ultra-agent-v4/task-workspaces.mjs',
  'tools/ultra-agent-v4/mcp-server.mjs',
  'tools/ultra-agent-v4/managed-runtime.mjs',
  'tools/ultra-agent-v5/action-manifest.mjs',
  'tools/ultra-agent-v5/durable-ledger.mjs',
  'tools/image-asset-workflow.mjs',
  'tools/start-managed-mcp.ps1',
  'tools/run-agent-security-fixtures.mjs',
  'tools/security-agent-fixtures.json',
  'tools/antigravity-runtime-preflight.mjs',
  'tools/antigravity-pretool-guard.mjs',
  'tools/antigravity-pretool-guard.ps1',
  'tools/sync-global-rules.ps1',
  'tools/benchmark-schema.json',
  'benchmarks/README.md',
];
for (const relativePath of portableRuntimeFiles) {
  const source = join(root, relativePath);
  const destination = join(target, relativePath);
  await mkdir(dirname(destination), { recursive: true });
  await copyFile(source, destination);
}
const provenancePath = join(root, 'SKILL-PROVENANCE.json');
const provenanceText = await readFile(provenancePath, 'utf8');
const provenance = JSON.parse(provenanceText);
if (!Array.isArray(provenance.skills) || provenance.skills.length !== skillCount) {
  throw new Error(`Skill provenance ledger must cover all ${skillCount} bundled skills.`);
}
const provenanceNames = provenance.skills.map((entry) => entry?.name);
if (new Set(provenanceNames).size !== provenanceNames.length || provenanceNames.some((name) => typeof name !== 'string')) {
  throw new Error('Skill provenance ledger has duplicate or invalid skill names.');
}
await writeFile(join(target, 'SKILL-PROVENANCE.json'), provenanceText);

const manifest = {
  $schema: 'https://antigravity.google/schemas/v1/plugin.json',
  name: 'mansoor-agent-hub',
  displayName: 'Mansoor Gemini Agent Team',
  version: packageVersion,
  description: 'A private, owner-signed Antigravity engineering product with a lead manager, focused specialists, portable skills and governed delivery.',
  logo: 'assets/logo.svg',
  suggestedPrompts: [
    'Inspect this repository and route the task to one matching domain expert.',
    'Ask the specialist to make a bounded change and report local verification evidence.',
    'Request a focused security or release review for this diff.'
  ],
  author: { name: 'Mansoor Farooq' }
};
await writeFile(join(target, 'plugin.json'), `${JSON.stringify(manifest, null, 2)}\n`);
await writeFile(join(target, 'mcp_config.json'), `${JSON.stringify({
  mcpServers: {
    // Keep the generated Antigravity tool namespace below its 64-character
    // limit: mcp_<plugin>_<server>_<tool>.
    runtime: {
      command: 'powershell.exe',
      args: ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', '\${PLUGIN_ROOT}/tools/start-managed-mcp.ps1'],
      env: { MANSOOR_WORKSPACE_ROOT: '\${PLUGIN_DATA}/workspaces' },
      timeoutSeconds: 900,
      tools: {
        inspect_task_workspace: { eager: true },
        prepare_managed_action: { eager: true },
        run_managed_task: { eager: true },
        get_review_patch: { eager: true },
        promote_reviewed_patch: { eager: true },
        discard_task_workspace: { eager: true },
      },
    },
  },
}, null, 2)}\n`);
await writeFile(join(target, 'hooks.json'), `${JSON.stringify({
  'mansoor-native-write-guard': {
    enabled: true,
    PreToolUse: [{ matcher: '*', hooks: [{ type: 'command', command: 'powershell.exe -NoProfile -NonInteractive -ExecutionPolicy Bypass -File ./tools/antigravity-pretool-guard.ps1', timeout: 10 }] }],
  },
}, null, 2)}\n`);
await mkdir(join(target, 'assets'), { recursive: true });
await writeFile(join(target, 'assets', 'logo.svg'), '<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128"><rect width="128" height="128" rx="28" fill="#123B35"/><path d="M28 91V37h14l22 29 22-29h14v54H85V61L64 88 43 61v30z" fill="#F1F5E9"/><circle cx="100" cy="99" r="8" fill="#24B47E"/></svg>\n');
await writeFile(join(target, 'README.md'), `# MANSOOR FAROOQ | GEMINI AGENT TEAM\n\nA private, portable expert-agent system for Antigravity. One lead manager routes work to focused specialists, preserves project context and returns evidence-backed engineering decisions.\n\n## Install\n\n1. Install Antigravity and sign in with the target user's Gemini account.\n2. Extract this ZIP.\n3. Double-click \`Install-Mansoor-Agent-Team.cmd\`.\n\nThe installer verifies package integrity, validates the Antigravity plugin and installs or updates it. No GitHub sign-in is required.\n\n## Integrity and ownership\n\nThis package is published by Mansoor Farooq. Every package file is recorded in \`PACKAGE-CHECKSUMS.json\`. If a file is changed after packaging, the installer stops with an integrity error before installation. This is tamper detection and fail-closed installation; it is not a claim that a person with filesystem access cannot inspect or replace files. Stronger protection requires a privately held signing key, access control or encryption.\n\n## Team model\n\n\`production-orchestrator\` is the only manager. It selects one domain specialist and the smallest relevant host skill set. The package ships 15 agent profiles and compact skill routers plus an on-demand skill library, one local managed-runtime MCP server. It does not bundle remote/provider MCP connectors, OAuth configuration or API keys.\n\n## Isolated managed task lane

The plugin bundles a local managed-runtime MCP server (configuration key: \`runtime\`) and its Windows launcher. The short key keeps Antigravity's generated MCP tool names within its 64-character limit. Once this plugin is installed and enabled in Antigravity, the host loads that MCP configuration automatically; there is no per-project MCP config to create or maintain, and no separate MCP credentials to enter. The currently open project is passed to the managed tool when a task starts. Work runs in a detached Git worktree under Antigravity plugin data (workspace separation, not an OS security sandbox), returns a hash-bound patch for review, and reaches the project checkout only after fresh host review of that exact patch. This lane requires a clean Git checkout and an installed Node.js runtime; the installer prepares Node.js when needed. Windows 10/11 is the supported host for this bundled launcher.

## Fast and professional responses\n\nUse \`Gemini 3.8 Flash\` with \`Low\` thinking for quick fixes. Use \`Medium\` or \`High\` for architecture, security, migration, ML or explicit research. All agents follow a Claude-style response contract: result first, concise rationale, clear evidence and assumptions, professional handoffs, Roman Urdu when appropriate and no invented tool results or hidden chain-of-thought.\n\n## Model and keys\n\nWithout API keys, all agents use the signed-in Antigravity/Gemini session through \`model: inherit\`. Optional integration keys belong in a local ignored \`.env\`; this portable package does not route them automatically.\n\n## Security boundary\n\nThe package does not collect project files, private chats, customer data, credentials or hidden reasoning. Research and image tools are bounded by the target Antigravity runtime.\n\n— Mansoor Farooq\n`);
await writeFile(join(target, '.env.example'), `# Optional local integration settings.\n# Leave blank when using the Antigravity account session.\n# The portable plugin does not read these automatically; only an explicitly\n# configured project/provider integration may use its matching variable.\n\n# OPENAI_API_KEY=\n# GEMINI_API_KEY=\n# DEEPSEEK_API_KEY=\n# GITHUB_TOKEN=\n`);
const generatedReadmePath = join(target, 'README.md');
const generatedReadme = await readFile(generatedReadmePath, 'utf8');
await writeFile(generatedReadmePath, generatedReadme.replace('`production-orchestrator` is the only manager.', '**Mansoor AI Team Manager** (`production-orchestrator` internal id) is the only manager.'));
const verifierSource = [
  "import { createHash, verify } from 'node:crypto';",
  "import { readFile } from 'node:fs/promises';",
  "const trustedOwner = 'mansoor-farooq';",
  "const trustedRepository = 'https://github.com/mansoor-farooq/my_ai_agent';",
  "const trustedAlgorithm = 'Ed25519';",
  `const trustedPublicKeyPem = ${JSON.stringify(ownerPublicKeyPem)};`,
  `const manifestBytes = await readFile(new URL('./${packageManifestName}', import.meta.url));`,
  `const signature = JSON.parse(await readFile(new URL('./${packageSignatureName}', import.meta.url), 'utf8'));`,
  "const digest = createHash('sha256').update(manifestBytes).digest('hex').toUpperCase();",
  "const normalize = (value) => String(value).replace(/\\r\\n/g, '\\n').trim();",
  "if (signature.version !== 1 || signature.algorithm !== trustedAlgorithm) throw new Error('Unsupported package signature format.');",
  "if (signature.owner !== trustedOwner) throw new Error('Package owner verification failed.');",
  "if (signature.repository !== trustedRepository) throw new Error('Package repository verification failed.');",
  "if (normalize(signature.publicKeyPem) !== normalize(trustedPublicKeyPem)) throw new Error('Package public-key trust verification failed.');",
  "if (signature.manifestSHA256 !== digest) throw new Error('Package manifest digest verification failed.');",
  "const valid = verify(null, manifestBytes, trustedPublicKeyPem, Buffer.from(signature.signatureBase64, 'base64'));",
  "if (!valid) throw new Error('Package Ed25519 signature verification failed.');",
  "console.log('Owner-signed package signature verified.');"
].join('\n') + '\n';
await writeFile(join(target, 'verify-package-signature.mjs'), verifierSource);
await writeFile(join(target, 'Install-Mansoor-Agent-Team.ps1'), `param()\n$ErrorActionPreference = 'Stop'\n$pluginRoot = Split-Path -Parent $MyInvocation.MyCommand.Path\n$manifestPath = Join-Path $pluginRoot '${packageManifestName}'\nif (-not (Test-Path -LiteralPath $manifestPath)) { throw 'Package integrity manifest is missing. Installation stopped.' }\n$records = @(Get-Content -LiteralPath $manifestPath -Raw | ConvertFrom-Json)\n$rootPath = [IO.Path]::GetFullPath($pluginRoot).TrimEnd([IO.Path]::DirectorySeparatorChar) + [IO.Path]::DirectorySeparatorChar\nforeach ($record in $records) {\n  $relative = ([string]$record.Path).Replace('/', [IO.Path]::DirectorySeparatorChar)\n  $file = [IO.Path]::GetFullPath((Join-Path $pluginRoot $relative))\n  if (-not $file.StartsWith($rootPath, [StringComparison]::OrdinalIgnoreCase) -or -not (Test-Path -LiteralPath $file -PathType Leaf)) { throw \"Package integrity check failed: $($record.Path)\" }\n  $hash = (Get-FileHash -LiteralPath $file -Algorithm SHA256).Hash\n  $bytes = (Get-Item -LiteralPath $file).Length\n  if ($hash -ne $record.SHA256 -or $bytes -ne $record.Bytes) { throw \"Package integrity check failed: $($record.Path)\" }\n}\n$agy = Get-Command agy -ErrorAction SilentlyContinue\nif (-not $agy) { throw 'Antigravity CLI (agy) was not found. Install Antigravity first, then run this installer again.' }\n& $agy.Source plugin validate --strict $pluginRoot\nif ($LASTEXITCODE -ne 0) { throw 'Antigravity plugin validation failed.' }\n& $agy.Source plugin install $pluginRoot\nif ($LASTEXITCODE -ne 0) { throw 'Antigravity plugin installation failed.' }\nWrite-Host 'Mansoor Gemini Agent Team installed successfully.'\nWrite-Host 'Restart Antigravity, or reload its skills/agents if the app is already open.'\n`);
await writeFile(join(target, 'Install-Mansoor-Agent-Team.cmd'), `@echo off\nsetlocal\nset "LOGFILE=%~dp0Install-Mansoor-Agent-Team.log"\necho Installer log: "%LOGFILE%"\necho.\npowershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0Install-Mansoor-Agent-Team.ps1"\nset "INSTALL_EXIT=%ERRORLEVEL%"\necho.\nif not "%INSTALL_EXIT%"=="0" echo Installer exited with code %INSTALL_EXIT%.\necho Full output is saved in: "%LOGFILE%"\necho.\nexit /b %INSTALL_EXIT%\n`);
const premiumPackageReadme = [
  '# MANSOOR FAROOQ | PRIVATE GEMINI AGENT TEAM',
  '',
  'Premium private engineering release for Antigravity: one lead manager, focused specialists, evidence-led research, clean delivery and an owner-signed release gate.',
  '',
  '## Install',
  '',
  '1. Install Antigravity and sign in with the target user\'s Gemini account.',
  '2. Download the release from https://github.com/mansoor-farooq/my_ai_agent.',
  '3. Extract the ZIP and run Install-Mansoor-Agent-Team.cmd.',
  '',
  'The installer verifies the owner signature and every packaged file, installs the Agent Hub, then attempts the selected official Antigravity plugins. No GitHub login is required on the target machine.',
  '',
  '## Recipient setup',
  '',
  'Install Antigravity and sign in once, extract this ZIP, then double-click Install-Mansoor-Agent-Team.cmd. If Node.js or the Antigravity CLI is missing, the installer downloads them from their official sources and verifies the Node.js archive checksum. It then installs the Agent Hub and tries the included official plugin set. If a plugin needs account consent or provider configuration, its original Antigravity message is shown; finish that setup in Antigravity and rerun the same installer. A failure in one plugin does not stop the others.',
  '',
  '## Owner build setup',
  '',
  'On the owner PC, keep the source at E:\\Agents and run npm run build, or double-click Build-Agent-Hub.cmd. The automated build reuses or creates the signing key, builds the package, runs the doctor and focused tests, then automatically updates an existing local Mansoor Agent Hub installation with the bundled installer and hash verification. If no local installation is detected, it only creates the ZIP and tells you to run the installer once. Use npm run build:package for a package-only build.',
  '',
  'Share only the ZIP. Never share the private key, .env files or the full source folder.',
  '',
  '## Ultra Agent v2 runtime',
  '',
  'This release includes the V2 memory/evidence foundation plus the V3 local control plane: automatic Fast/Premium routing, resumable state, conflict-aware context, evidence-gated evaluation, recovery checkpoints and append-only execution traces. The manager reports observed evidence only; local memory stays in the target repository and Git sync remains opt-in.',
  '',
  'For a repository task, the manager resolves the enabled `mansoor-agent-hub` plugin path with `agy plugin list --json`, then runs bundled utilities from that installed path while passing the actual project with `--dir`. V3 task state remains available for resumable execution and evidence; live worker activity is shown in Antigravity parent chat and its native sub-agent panel. See `shared/ULTRA_AGENT_V2_PROTOCOL.md` for the runtime contract.',
  '',
  '## Isolated managed task lane',
  '',
  'The plugin bundles a local managed-runtime MCP server (configuration key `runtime`) and its Windows launcher. The short key keeps Antigravity generated tool names below its 64-character limit. Once installed and enabled in Antigravity, the host loads that MCP configuration automatically; there is no per-project MCP config or separate MCP credential to enter. Managed work runs in a detached Git worktree (workspace separation, not an OS sandbox) and returns a hash-bound patch. A project-local ignored V5 ledger at `.agents/ultra-v4/managed-runs/<taskId>/` records manifest approval, effect hashes, verification and promotion; interrupted exact writes can be reconciled without repeating changed payloads. The local receipt proves only that the local runtime recorded the grant; Antigravity does not expose a signed human-identity receipt, and its published hook contract does not guarantee fail-closed behavior for every hook failure. Native editor writes stay outside this managed ledger. The patch reaches the checkout only through fresh host review of the exact patch hash using the separate patch-review tool. This lane requires a clean Git checkout and Node.js; the installer prepares Node.js when needed. Windows 10/11 is the supported host for this bundled launcher.',
  '',
  'The installer opens with a branded Mansoor Farooq Agent Team / Ultra Agent v4 safe-build banner, records a local installer log and stages the complete runtime before Antigravity validation.',
  '',
  '## Persistent CLI and Android preview',
  '',
  'The portable runtime includes `tools/ultra-agent-cli.mjs` and the lock-protected daemon under `tools/ultra-agent-v4/daemon/`. Run `node tools/ultra-agent-cli.mjs start` to keep one local queue alive, then use `submit`, `status`, `events`, `resume`, `stop` and `doctor` from another terminal. The queue shares project context and redacted activity with the Antigravity MCP lane, reports `queued-host-unavailable` when the host is closed, and never switches providers or bypasses the signed-in Gemini session.',
  '',
  'The Android preview adapter detects `adb` and optional `scrcpy`, requires an explicit serial when multiple devices are online, starts only a Mansoor-owned mirror window and emits fail-closed `mansoor.android-preview/v1` evidence. `scrcpy` is a host prerequisite and is not bundled, downloaded or treated as proof that build/tests passed. Missing devices, mirrors or checks remain `unverified`.',
  '',
  '## Ready-to-use local-LLM datasets',
  '',
  'Run `node tools/agent-training-dataset.mjs export --dir <project> --out <folder>` after approved work. The pack writes owner-approved SFT examples, all-observation evaluation records, hard cases, sanitized research/verification evidence and a hash manifest. Credentials, absolute local paths, raw chats and hidden reasoning are excluded. The exporter prepares data only; it never uploads or silently trains a model.',
  '',
  '## Private ownership',
  '',
  'Designed and maintained by Mansoor Farooq. This is a private owner-controlled release, not a public redistribution licence. The private signing key stays outside Git and the ZIP. Future public publishing requires a deliberate licence and release review.',
  '',
  '## Custom Antigravity configuration',
  '',
  'The installer syncs profiles to the installed plugin config root and the standard `%USERPROFILE%\\.gemini\\config\\agents` folder. It also detects `AGY_CONFIG_DIR`, `ANTIGRAVITY_CONFIG_DIR`, `GEMINI_CONFIG_DIR`, `GEMINI_HOME`, and `MANSOOR_AGENT_ROOT` when they are set. `MANSOOR_AGENT_ROOT` is a direct agents folder; the other variables can point to a config folder. Existing legacy `%USERPROFILE%\\.geminiconfigagents` profiles are synchronized too. Every detected target is printed and each copied profile hash is verified.',
  '',
  '## Security boundary',
  '',
  `The package contains ${agentCount} agent profiles, ${skillCount} portable skills, ${ruleCount} governed rules, a PreToolUse security hook and one local managed-runtime MCP server. The hook denies protected/out-of-workspace writes and requests fresh review for in-workspace writes, shell commands and managed task execution/promotion. Antigravity may ignore hook errors, so the hook is not an OS sandbox or guaranteed fail-closed boundary. It does not include remote/provider MCP connectors, sidecars, provider credentials, private chats or native-profile data.`,
  '',
  'The package does not collect project files, private chats, customer data, credentials or hidden reasoning. Signature verification detects ordinary unauthorized changes and fails closed. It is not unbreakable DRM against a local administrator; stronger secrecy requires a signed runtime or private hosted execution.',
  '',
  '— Mansoor Farooq',
  ''
].join('\n');
await writeFile(join(target, 'README.md'), premiumPackageReadme);

const signedInstaller = [
  'param()',
  "$ErrorActionPreference = 'Stop'",
  '$pluginRoot = Split-Path -Parent $MyInvocation.MyCommand.Path',
  "$logPath = Join-Path $pluginRoot 'Install-Mansoor-Agent-Team.log'",
  '$currentIdentity = [Security.Principal.WindowsIdentity]::GetCurrent()',
  '$principal = New-Object Security.Principal.WindowsPrincipal($currentIdentity)',
  'if (-not $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {',
  '  Write-Host "Administrator permission is required. Requesting elevation..." -ForegroundColor Yellow',
  '  $powershell = Join-Path $env:SystemRoot "System32\\WindowsPowerShell\\v1.0\\powershell.exe"',
  '  $elevated = Start-Process -FilePath $powershell -Verb RunAs -Wait -PassThru -ArgumentList @("-NoProfile", "-ExecutionPolicy", "Bypass", "-File", $MyInvocation.MyCommand.Path)',
  '  exit $elevated.ExitCode',
  '}',
  'function Get-AntigravityUiProcesses {',
  '  $all = @(Get-Process -Name "Antigravity" -ErrorAction SilentlyContinue)',
  '  if ($all.Count -eq 0) { return @() }',
  '  $commandLines = @{}',
  '  try {',
  "    foreach (\$record in @(Get-CimInstance Win32_Process -Filter \"Name='Antigravity.exe'\" -ErrorAction Stop)) {",
  '      $commandLines[[int]$record.ProcessId] = [string]$record.CommandLine',
  '    }',
  '  } catch { Write-Host ("INSTALLER / process metadata unavailable; treating windowless Antigravity workers as background worker processes: " + $_.Exception.Message) -ForegroundColor DarkYellow }',
  '  $ui = @()',
  '  $workerCount = 0',
  '  foreach ($process in $all) {',
  '    $commandLine = [string]$commandLines[[int]$process.Id]',
  '    $hasWindow = $process.MainWindowHandle -ne 0',
  "    \$isBackgroundWorker = (-not \$hasWindow) -and ([string]::IsNullOrWhiteSpace(\$commandLine) -or \$commandLine -match '--import=.*sidecar_sdk')",
  '    if ($isBackgroundWorker) { $workerCount++; continue }',
  '    $ui += $process',
  '  }',
  '  if ($workerCount -gt 0) { Write-Host ("INSTALLER / ignoring " + $workerCount + " background worker process(es); only the Antigravity UI is closeable.") -ForegroundColor DarkGray }',
  '  return @($ui)',
  '}',
  'function Request-AntigravityGracefulClose([int]$TimeoutSeconds = 45) {',
  '  $running = @(Get-AntigravityUiProcesses)',
  '  if ($running.Count -eq 0) { return $true }',
  '  Write-Host ("INSTALLER / requesting graceful Antigravity UI close (" + $running.Count + " process(es)); waiting up to " + $TimeoutSeconds + " seconds...") -ForegroundColor Yellow',
  '  foreach ($process in $running) {',
  '    try { if ($process.MainWindowHandle -ne 0) { [void]$process.CloseMainWindow() } } catch { Write-Host ("INSTALLER / close request skipped for process " + $process.Id + ": " + $_.Exception.Message) -ForegroundColor DarkYellow }',
  '  }',
  '  $deadline = (Get-Date).AddSeconds($TimeoutSeconds)',
  '  do {',
  '    Start-Sleep -Seconds 1',
  '    $remaining = @(Get-AntigravityUiProcesses)',
  '    if ($remaining.Count -eq 0) { return $true }',
  '  } while ((Get-Date) -lt $deadline)',
  '  Write-Host ("INSTALLER DEFERRED / Antigravity UI still has " + $remaining.Count + " closeable process(es). Save work, close Antigravity completely, then rerun this installer.") -ForegroundColor Yellow',
  '  return $false',
  '}',
  'if (-not (Request-AntigravityGracefulClose)) { exit 42 }',
  'function Get-Sha256Hash([string]$Path) {',
  '  $sha = [Security.Cryptography.SHA256]::Create()',
  "  try { return (-join (\$sha.ComputeHash([IO.File]::ReadAllBytes(\$Path)) | ForEach-Object { \$_.ToString('X2') })) } finally { \$sha.Dispose() }",
  '}',
  "function Write-BrandLine([string]$Text, [ConsoleColor]$Color = [ConsoleColor]::Gray) { Write-Host ('  ' + $Text.PadRight(54)) -ForegroundColor $Color }",
  "function Write-BrandRule { Write-Host '  +--------------------------------------------------------+' -ForegroundColor DarkCyan }",
  "function Write-Stage([string]$Number, [string]$Title, [string]$Detail) { Write-Host ''; Write-Host ('  [' + $Number + '] ' + $Title) -ForegroundColor Cyan; Write-Host ('      ' + $Detail) -ForegroundColor DarkGray }",
  "Write-Host ''",
  "Write-BrandRule",
  "Write-Host '  [MF]  MANSOOR FAROOQ' -ForegroundColor Cyan",
  "Write-Host '        AGENT TEAM  /  ULTRA AGENT v4' -ForegroundColor White",
  "Write-BrandRule",
  "Write-BrandLine 'PRIVATE ENGINEERING EDITION  /  WINDOWS' DarkGray",
  "Write-Host ''",
  "Write-Stage '01/04' 'PACKAGE INTEGRITY' 'Checking signed release files'",
  'try { Start-Transcript -Path $logPath -Append | Out-Null } catch { Write-Host "Could not start installer log: $($_.Exception.Message)" -ForegroundColor Yellow }',
  'try {',
  `$manifestPath = Join-Path $pluginRoot '${packageManifestName}'`,
  "if (-not (Test-Path -LiteralPath $manifestPath)) { throw 'Package integrity manifest is missing. Installation stopped.' }",
  '$manifestJson = Get-Content -LiteralPath $manifestPath -Raw',
  '$parsedManifest = ConvertFrom-Json -InputObject $manifestJson',
  '$records = @()',
  'if ($parsedManifest -is [System.Array]) { $records = @($parsedManifest) } else { for ($index = 0; $index -lt @($parsedManifest.Path).Count; $index++) { $records += [pscustomobject]@{ Path = $parsedManifest.Path[$index]; SHA256 = $parsedManifest.SHA256[$index]; Bytes = $parsedManifest.Bytes[$index] } } }',
  '$rootPath = [IO.Path]::GetFullPath($pluginRoot).TrimEnd([IO.Path]::DirectorySeparatorChar) + [IO.Path]::DirectorySeparatorChar',
  'foreach ($record in $records) {',
  "  $relative = ([string]$record.Path).Replace('/', [IO.Path]::DirectorySeparatorChar)",
  '  $file = [IO.Path]::GetFullPath((Join-Path $pluginRoot $relative))',
  '  if (-not $file.StartsWith($rootPath, [StringComparison]::OrdinalIgnoreCase) -or -not (Test-Path -LiteralPath $file -PathType Leaf)) { throw "Package integrity check failed: $($record.Path)" }',
  '  $hash = Get-Sha256Hash $file',
  '  $bytes = (Get-Item -LiteralPath $file).Length',
  '  if ($hash -ne $record.SHA256 -or $bytes -ne $record.Bytes) { throw "Package integrity check failed: $($record.Path)" }',
  '}',
  "Write-Host '      VERIFIED  /  package files match the release manifest' -ForegroundColor Green",
  "Write-Stage '02/04' 'RUNTIME' 'Preparing required local tools'",
  '$node = Get-Command node -ErrorAction SilentlyContinue',
  'if (-not $node) {',
  "  if (-not [Environment]::Is64BitOperatingSystem) { throw 'Automatic Node.js setup requires 64-bit Windows.' }",
  "  Write-Host 'Node.js is missing. Downloading the latest LTS runtime from nodejs.org...' -ForegroundColor Cyan",
  '  $nodeRoot = Join-Path $env:LOCALAPPDATA "Mansoor-Agent-Hub\\runtime"',
  '  $runtimeInfo = Invoke-RestMethod -Uri "https://nodejs.org/dist/index.json"',
  '  $nodeRelease = $runtimeInfo | Where-Object { $_.lts } | Select-Object -First 1',
  "  if (-not $nodeRelease -or $nodeRelease.version -notmatch '^v\\d+\\.\\d+\\.\\d+$') { throw 'Could not identify the latest Node.js LTS release.' }",
  '  $archiveName = "node-$($nodeRelease.version)-win-x64.zip"',
  '  $releaseUrl = "https://nodejs.org/dist/$($nodeRelease.version)"',
  '  $downloadRoot = Join-Path $env:TEMP ("Mansoor-Agent-Node-" + [guid]::NewGuid().ToString("N"))',
  '  New-Item -ItemType Directory -Path $downloadRoot | Out-Null',
  '  try {',
  '    Invoke-WebRequest -Uri "$releaseUrl/$archiveName" -OutFile (Join-Path $downloadRoot $archiveName)',
  '    $checksumsPath = Join-Path $downloadRoot "SHASUMS256.txt"',
  '    Invoke-WebRequest -Uri "$releaseUrl/SHASUMS256.txt" -OutFile $checksumsPath',
  '    $checksumLine = Select-String -Path $checksumsPath -Pattern ("^([0-9a-fA-F]{64})\\s+\\*?" + [regex]::Escape($archiveName) + "\\s*$") | Select-Object -First 1',
  "    if (-not $checksumLine) { throw 'Official Node.js checksum entry was not found.' }",
  '    $expectedHash = [regex]::Match($checksumLine.Line, "^([0-9a-fA-F]{64})").Groups[1].Value.ToUpperInvariant()',
  '    $actualHash = Get-Sha256Hash (Join-Path $downloadRoot $archiveName)',
  "    if ($actualHash -ne $expectedHash) { throw 'Node.js archive checksum mismatch; installation stopped.' }",
  '    Expand-Archive -LiteralPath (Join-Path $downloadRoot $archiveName) -DestinationPath $downloadRoot',
  '    $nodeDestination = Join-Path $nodeRoot $nodeRelease.version',
  '    if (-not (Test-Path -LiteralPath (Join-Path $nodeDestination "node.exe") -PathType Leaf)) {',
  '      if (Test-Path -LiteralPath $nodeDestination) { throw "Incomplete Node.js runtime folder exists: $nodeDestination" }',
  '      New-Item -ItemType Directory -Path $nodeRoot -Force | Out-Null',
  '      Move-Item -LiteralPath (Join-Path $downloadRoot ($archiveName -replace "\\.zip$", "")) -Destination $nodeDestination',
  '    }',
  '    $nodePath = Join-Path $nodeDestination "node.exe"',
  '    if (-not (Test-Path -LiteralPath $nodePath -PathType Leaf)) { throw "Node.js installation did not produce node.exe: $nodePath" }',
  '  } finally { if (Test-Path -LiteralPath $downloadRoot) { Remove-Item -LiteralPath $downloadRoot -Recurse -Force } }',
  '  $node = [pscustomobject]@{ Source = $nodePath }',
  '}',
  "$verifier = Join-Path $pluginRoot 'verify-package-signature.mjs'",
  '& $node.Source $verifier',
  "if ($LASTEXITCODE -ne 0) { throw 'Owner package signature verification failed. Installation stopped.' }",
  '$agy = Get-Command agy -ErrorAction SilentlyContinue',
  'if (-not $agy) {',
  "  $agyPath = Join-Path $env:LOCALAPPDATA 'agy\\bin\\agy.exe'",
  '  if (-not (Test-Path -LiteralPath $agyPath -PathType Leaf)) {',
  "    Write-Host 'Antigravity CLI is missing. Installing it from the official Google installer...' -ForegroundColor Cyan",
  '    $bootstrapScript = Join-Path ([IO.Path]::GetTempPath()) (\"agy-install-\" + [guid]::NewGuid().ToString(\"N\") + ".ps1")',
  '    try {',
  "      Invoke-WebRequest -Uri 'https://antigravity.google/cli/install.ps1' -OutFile $bootstrapScript",
  '      & (Join-Path $PSHOME \'powershell.exe\') -NoProfile -ExecutionPolicy Bypass -File $bootstrapScript',
  "      if ($LASTEXITCODE -ne 0) { throw 'Official Antigravity CLI installation failed.' }",
  '    } finally { if (Test-Path -LiteralPath $bootstrapScript) { Remove-Item -LiteralPath $bootstrapScript -Force } }',
  '  }',
  '  if (Test-Path -LiteralPath $agyPath -PathType Leaf) { $agy = [pscustomobject]@{ Source = $agyPath } } else { $agy = Get-Command agy -ErrorAction SilentlyContinue }',
  '}',
  "if (-not $agy) { throw 'Antigravity CLI installation did not produce agy.exe. Check network access, then run this installer again.' }",
  "Write-Host '      READY  /  Antigravity command line is available' -ForegroundColor Green",
  "Write-Stage '03/04' 'AGENT TEAM' 'Validating and installing the signed team'",
  'function Invoke-AgyCaptured {',
  '  param([string[]]$CommandArguments)',
  '  $captureId = [guid]::NewGuid().ToString("N")',
  '  $stdoutPath = Join-Path $env:TEMP ("agy-stdout-" + $captureId + ".txt")',
  '  $stderrPath = Join-Path $env:TEMP ("agy-stderr-" + $captureId + ".txt")',
  '  try {',
  '    $process = Start-Process -FilePath $agy.Source -ArgumentList $CommandArguments -Wait -PassThru -NoNewWindow -RedirectStandardOutput $stdoutPath -RedirectStandardError $stderrPath',
  '    $stdout = if (Test-Path -LiteralPath $stdoutPath) { Get-Content -LiteralPath $stdoutPath -Raw } else { "" }',
  '    $stderr = if (Test-Path -LiteralPath $stderrPath) { Get-Content -LiteralPath $stderrPath -Raw } else { "" }',
  '    return [pscustomobject]@{ ExitCode = $process.ExitCode; StdOut = $stdout; StdErr = $stderr }',
  '  } finally { Remove-Item -LiteralPath $stdoutPath, $stderrPath -Force -ErrorAction SilentlyContinue }',
  '}',
  '$installStage = Join-Path ([IO.Path]::GetTempPath()) ("mansoor-agent-hub-stage-" + [guid]::NewGuid().ToString("N"))',
  'New-Item -ItemType Directory -Path $installStage | Out-Null',
  'try {',
  "  foreach ($item in @('plugin.json', 'mcp_config.json', 'hooks.json', 'README.md', 'assets', 'agents', 'skills', 'rules', 'tools', 'shared')) {",
  '    $sourceItem = Join-Path $pluginRoot $item',
  '    if (Test-Path -LiteralPath $sourceItem) { Copy-Item -LiteralPath $sourceItem -Destination $installStage -Recurse -Force }',
  '  }',
  '  $packageManifest = Get-Content -LiteralPath (Join-Path $installStage "plugin.json") -Raw | ConvertFrom-Json',
  '  $packageVersion = [string]$packageManifest.version',
  '  $inventoryBefore = Invoke-AgyCaptured -CommandArguments @("plugin", "list", "--json")',
  '  $existingPluginPath = $null',
  '  if ($inventoryBefore.ExitCode -eq 0) {',
  '    try { $existingPluginPath = [string](@((ConvertFrom-Json -InputObject $inventoryBefore.StdOut) | Where-Object { $_.name -eq "mansoor-agent-hub" } | Select-Object -First 1).path) } catch { Write-Host ("      UPDATE DISCOVERY / plugin inventory parse skipped: " + $_.Exception.Message) -ForegroundColor Yellow }',
  '  }',
  '  function Get-TreeDrift([string]$SourceRoot, [string]$DestinationRoot) {',
  '    $sourceFiles = @(Get-ChildItem -LiteralPath $SourceRoot -Recurse -File)',
  '    $changed = 0',
  '    foreach ($sourceFile in $sourceFiles) {',
  '      $relative = $sourceFile.FullName.Substring($SourceRoot.TrimEnd([IO.Path]::DirectorySeparatorChar).Length + 1)',
  '      $destination = Join-Path $DestinationRoot $relative',
  '      if (-not (Test-Path -LiteralPath $destination -PathType Leaf)) { $changed++; continue }',
  '      $sourceHash = Get-Sha256Hash $sourceFile.FullName',
  '      $destinationHash = Get-Sha256Hash $destination',
  '      if ($sourceHash -ne $destinationHash) { $changed++ }',
  '    }',
  '    return [pscustomobject]@{ SourceCount = $sourceFiles.Count; Changed = $changed }',
  '  }',
  '  $preInstallDrift = if ($existingPluginPath -and (Test-Path -LiteralPath $existingPluginPath -PathType Container)) { Get-TreeDrift $installStage $existingPluginPath } else { [pscustomobject]@{ SourceCount = @(Get-ChildItem -LiteralPath $installStage -Recurse -File).Count; Changed = @(Get-ChildItem -LiteralPath $installStage -Recurse -File).Count } }',
  '  Write-Host ("      UPDATE PLAN / version " + $packageVersion + " / " + $preInstallDrift.Changed + " files require refresh") -ForegroundColor Cyan',
  '  $validationResult = Invoke-AgyCaptured -CommandArguments @("plugin", "validate", "--strict", $installStage)',
  '  if ($validationResult.ExitCode -ne 0) { if ($validationResult.StdOut) { Write-Host $validationResult.StdOut.TrimEnd() -ForegroundColor Yellow }; if ($validationResult.StdErr) { Write-Host $validationResult.StdErr.TrimEnd() -ForegroundColor Yellow }; throw "Antigravity plugin validation failed (exit $($validationResult.ExitCode)). See installer log." }',
  `  Write-Host '      VALIDATED  /  ${agentCount} agents, ${skillCount} skills, ${ruleCount} rules, 1 hook' -ForegroundColor Green`,
  '  $installResult = Invoke-AgyCaptured -CommandArguments @("plugin", "install", $installStage)',
  '  if ($installResult.ExitCode -ne 0) { if ($installResult.StdOut) { Write-Host $installResult.StdOut.TrimEnd() -ForegroundColor Yellow }; if ($installResult.StdErr) { Write-Host $installResult.StdErr.TrimEnd() -ForegroundColor Yellow }; throw "Mansoor Agent Hub installation failed (exit $($installResult.ExitCode)). See installer log." }',
  '  $inventoryAfter = Invoke-AgyCaptured -CommandArguments @("plugin", "list", "--json")',
  '  $activePluginPath = $existingPluginPath',
  '  if ($inventoryAfter.ExitCode -eq 0) {',
  '    try { $activePluginPath = [string](@((ConvertFrom-Json -InputObject $inventoryAfter.StdOut) | Where-Object { $_.name -eq "mansoor-agent-hub" } | Select-Object -First 1).path) } catch { Write-Host ("      UPDATE VERIFY / plugin inventory parse skipped: " + $_.Exception.Message) -ForegroundColor Yellow }',
  '  }',
  '  if ([string]::IsNullOrWhiteSpace($activePluginPath) -or -not (Test-Path -LiteralPath $activePluginPath -PathType Container)) { throw "Active Mansoor Agent Hub path could not be located after plugin install." }',
  '  $resolvedActivePluginPath = [IO.Path]::GetFullPath($activePluginPath).TrimEnd([IO.Path]::DirectorySeparatorChar)',
  '  if ((Split-Path -Leaf $resolvedActivePluginPath) -ne "mansoor-agent-hub" -or (Split-Path -Leaf (Split-Path -Parent $resolvedActivePluginPath)) -ne "plugins") { throw "Refusing to synchronize an unexpected active plugin path: $resolvedActivePluginPath" }',
  '  $postInstallDrift = Get-TreeDrift $installStage $resolvedActivePluginPath',
  '  if ($postInstallDrift.Changed -gt 0) {',
  '    Write-Host ("      ACTIVE PACKAGE / plugin install left " + $postInstallDrift.Changed + " stale files; synchronizing staged release") -ForegroundColor Yellow',
  '    foreach ($sourceItem in @(Get-ChildItem -LiteralPath $installStage -Force)) { Copy-Item -LiteralPath $sourceItem.FullName -Destination $resolvedActivePluginPath -Recurse -Force }',
  '    $postInstallDrift = Get-TreeDrift $installStage $resolvedActivePluginPath',
  '  }',
  '  if ($postInstallDrift.Changed -gt 0) { throw "Active Mansoor Agent Hub update incomplete: $($postInstallDrift.Changed) files still differ after synchronization." }',
  '  Write-Host ("      UPDATED  / version " + $packageVersion + " / " + $preInstallDrift.Changed + " files refreshed and verified") -ForegroundColor Green',
  '  $agentRoots = [System.Collections.Generic.List[string]]::new()',
  '  function Add-AgentRoot([string]$Path, [string]$Reason, [bool]$IsAgentRoot = $false) {',
  '    if ([string]::IsNullOrWhiteSpace($Path)) { return }',
  '    $expanded = [Environment]::ExpandEnvironmentVariables($Path.Trim())',
  '    if (-not [IO.Path]::IsPathRooted($expanded)) { return }',
  '    $resolved = [IO.Path]::GetFullPath($expanded).TrimEnd([IO.Path]::DirectorySeparatorChar)',
  '    if (-not $IsAgentRoot -and $resolved -notmatch \'[\\\\/]agents$\') { $resolved = Join-Path $resolved "agents" }',
  '    if (-not ($agentRoots | Where-Object { $_ -ieq $resolved })) {',
  '      $agentRoots.Add($resolved)',
  '      Write-Host ("      PROFILE TARGET / " + $resolved + " (" + $Reason + ")") -ForegroundColor DarkGray',
  '    }',
  '  }',
  '  Add-AgentRoot (Join-Path $env:USERPROFILE ".gemini\\config\\agents") "default Antigravity config"',
  '  foreach ($name in @("MANSOOR_AGENT_ROOT", "AGY_CONFIG_DIR", "ANTIGRAVITY_CONFIG_DIR", "GEMINI_CONFIG_DIR")) {',
  '    $value = [Environment]::GetEnvironmentVariable($name)',
  '    if ($value) { Add-AgentRoot $value ("environment: " + $name) ($name -eq "MANSOOR_AGENT_ROOT") }',
  '  }',
  '  $geminiHome = [Environment]::GetEnvironmentVariable("GEMINI_HOME")',
  '  if ($geminiHome) { Add-AgentRoot (Join-Path $geminiHome "config") "environment: GEMINI_HOME" }',
  '  $inventoryResult = Invoke-AgyCaptured -CommandArguments @("plugin", "list", "--json")',
  '  if ($inventoryResult.ExitCode -eq 0) {',
  '    try {',
  '      $installedHub = @((ConvertFrom-Json -InputObject $inventoryResult.StdOut) | Where-Object { $_.name -eq "mansoor-agent-hub" } | Select-Object -First 1)',
  '      if ($installedHub -and $installedHub.path) { $pluginConfigRoot = Split-Path -Parent (Split-Path -Parent ([string]$installedHub.path)); Add-AgentRoot (Join-Path $pluginConfigRoot "agents") "installed plugin config" }',
  '    } catch { Write-Host ("      PROFILE DISCOVERY / plugin inventory parse skipped: " + $_.Exception.Message) -ForegroundColor Yellow }',
  '  }',
  '  $legacyRoot = Join-Path $env:USERPROFILE ".geminiconfigagents"',
  '  if (Test-Path -LiteralPath $legacyRoot -PathType Container) { Add-AgentRoot $legacyRoot "legacy profile root" $true }',
  '  $agentSourceRoot = Join-Path $pluginRoot "agents"',
  '  $agentSources = @()',
  '  foreach ($file in @(Get-ChildItem -LiteralPath $agentSourceRoot -File -Filter "*.md")) { $agentSources += [pscustomobject]@{ Name = $file.BaseName; File = $file.FullName } }',
  '  foreach ($folder in @(Get-ChildItem -LiteralPath $agentSourceRoot -Directory)) { $file = Join-Path $folder.FullName "agent.md"; if (Test-Path -LiteralPath $file -PathType Leaf) { $agentSources += [pscustomobject]@{ Name = $folder.Name; File = $file } } }',
  '  foreach ($userAgentRoot in $agentRoots) {',
  '    New-Item -ItemType Directory -Path $userAgentRoot -Force | Out-Null',
  '    foreach ($agentSource in $agentSources) {',
  '      $agentDestination = Join-Path $userAgentRoot $agentSource.Name',
  '      New-Item -ItemType Directory -Path $agentDestination -Force | Out-Null',
  '      Copy-Item -LiteralPath $agentSource.File -Destination (Join-Path $agentDestination "agent.md") -Force',
  '      $expected = Get-Sha256Hash $agentSource.File',
  '      $actual = Get-Sha256Hash (Join-Path $agentDestination "agent.md")',
  '      if ($expected -ne $actual) { throw "Agent profile verification failed: $($agentDestination)" }',
  '    }',
  '  }',
  '  foreach ($agentRoot in $agentRoots) {',
  '    if ((Split-Path -Leaf $agentRoot) -ne "agents" -or (Split-Path -Leaf (Split-Path -Parent $agentRoot)) -ne "config") { continue }',
  '    $configRoot = Split-Path -Parent $agentRoot',
  '    & (Join-Path $pluginRoot "tools\\sync-global-rules.ps1") -SourceRoot (Join-Path $pluginRoot "rules") -ConfigRoot $configRoot',
  '  }',
  '  Write-Host ("      INSTALLED  /  " + $agentSources.Count + " profiles synchronized to " + $agentRoots.Count + " config root(s)") -ForegroundColor Green',
  '} finally { if (Test-Path -LiteralPath $installStage) { Remove-Item -LiteralPath $installStage -Recurse -Force -ErrorAction SilentlyContinue } }',
  "Write-Stage '04/04' 'OPTIONAL EXTENSIONS' 'Checking official Antigravity plugins'",
  '$officialPlugins = @(',
  "  'android-cli-plugin', 'chrome-devtools-plugin', 'data-agent-kit-plugin', 'flutter',",
  "  'gemini-api', 'google-antigravity-sdk', 'google-cloud-developer', 'google-developer-knowledge',",
  "  'google_maps_platform', 'modern-web-guidance-plugin', 'gcalendar', 'gdocs', 'gdrive',",
  "  'gsheets', 'gslides', 'science'",
  ')',
  '$failedPlugins = @()',
  '$installedPluginNames = @()',
  '$inventoryResult = Invoke-AgyCaptured -CommandArguments @("plugin", "list", "--json")',
  'if ($inventoryResult.ExitCode -eq 0) {',
  '  try { $installedPluginNames = @((ConvertFrom-Json -InputObject $inventoryResult.StdOut) | ForEach-Object { [string]$_.name }) } catch { Write-Host "Could not parse installed plugin list; will attempt plugin installs individually." -ForegroundColor Yellow }',
  '} else { Write-Host "Could not read installed plugin list; will attempt plugin installs individually." -ForegroundColor Yellow; if ($inventoryResult.StdErr) { Write-Host $inventoryResult.StdErr -ForegroundColor Yellow } }',
  'foreach ($plugin in $officialPlugins) {',
  '  $target = "$plugin@antigravity-plugins-official"',
  '  if ($installedPluginNames -contains $plugin) { Write-Host "[$plugin] Already installed; leaving the active package untouched." -ForegroundColor Green; continue }',
  '  Write-Host "`n[$plugin] Installing..." -ForegroundColor Cyan',
  '  $pluginResult = Invoke-AgyCaptured -CommandArguments @("plugin", "install", $target)',
  '  if ($pluginResult.ExitCode -eq 0) { Write-Host ("      INSTALLED  /  " + $plugin) -ForegroundColor Green } else {',
  '    if ((($pluginResult.StdOut + $pluginResult.StdErr) -match "plugin is in use|failed to move existing plugin|Access is denied")) { Write-Host "[$plugin] Another Antigravity process holds this plugin; it was not forcibly stopped." -ForegroundColor Yellow }',
  '    Write-Host ("      NEEDS SETUP  /  " + $plugin + " (exit " + $pluginResult.ExitCode + ")") -ForegroundColor Yellow',
  '    $failedPlugins += $plugin',
  '  }',
  '}',
  "Write-Host ''",
  "Write-BrandRule",
  "Write-BrandLine 'INSTALLATION COMPLETE' Green",
  "Write-BrandLine 'Mansoor Farooq Agent Team  /  Ultra Agent v4' Cyan",
  "Write-BrandRule",
  'if ($failedPlugins.Count -gt 0) {',
  '  Write-Host ("Plugins needing attention: " + ($failedPlugins -join ", ")) -ForegroundColor Yellow',
  "  Write-Host 'Open Antigravity and finish any requested account consent or plugin setup, then rerun this same installer.' -ForegroundColor Yellow",
  "  Write-Host 'Some plugins require their own provider account/API setup; Antigravity will show the required setup when enabled.' -ForegroundColor Yellow",
  "} else { Write-Host 'All selected official plugins installed.' -ForegroundColor Green }",
  "Write-Host 'Restart Antigravity, or reload its skills/agents if the app is already open.'",
  '} catch {',
  "  Write-Host ('INSTALLER ERROR: ' + $_.Exception.Message) -ForegroundColor Red",
  '  if ($_.ScriptStackTrace) { Write-Host $_.ScriptStackTrace -ForegroundColor DarkRed }',
  '  exit 1',
  '} finally { try { Stop-Transcript | Out-Null } catch { } }',
  ''
].join('\n');
await writeFile(join(target, 'Install-Mansoor-Agent-Team.ps1'), signedInstaller);

const packageFiles = [];
async function collectFiles(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const full = join(directory, entry.name);
    if (entry.isDirectory()) await collectFiles(full);
    else if (entry.name !== packageManifestName && entry.name !== packageSignatureName) packageFiles.push(full);
  }
}
await collectFiles(target);
const packageRecords = [];
for (const file of packageFiles.sort()) {
  const bytes = await readFile(file);
  packageRecords.push({
    Path: relative(target, file).replaceAll('\\', '/'),
    SHA256: createHash('sha256').update(bytes).digest('hex').toUpperCase(),
    Bytes: bytes.length
  });
}
const manifestBytes = Buffer.from(`${JSON.stringify(packageRecords, null, 2)}\n`);
await writeFile(join(target, packageManifestName), manifestBytes);
const packageSignature = signPackageManifest(manifestBytes, {
  privateKeyPem: ownerPrivateKeyPem,
  publicKeyPem: ownerPublicKeyPem,
  version: packageVersion
});
await writeFile(join(target, packageSignatureName), `${JSON.stringify(packageSignature, null, 2)}\n`);
console.log(`Built owner-signed Antigravity agent product at ${target} (${agentCount} agents, ${skillCount} skills, ${ruleCount} rules; zero provider connectors).`);
