import { createHash } from 'node:crypto';
import { mkdir, readdir, readFile, writeFile, stat } from 'node:fs/promises';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  defaultOwnerKeyPath,
  publicKeyPemFromPrivate,
  signPackageManifest
} from './package-signing.mjs';

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
const packageVersion = '1.2.1';
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

  // Keep Antigravity's host-owned skill library as the source; ship only a compact name map.
  let skills = [];
  text = text.replace(/^skills:\r?\n((?:[ \t]+-[^\r\n]*\r?\n)+)/m, (_block, entries) => {
    skills = [...entries.matchAll(/^\s+-\s+(.+?)\s*$/gm)].map((match) => match[1].replace(/^skills\//, ''));
    return '';
  });
  if (skills.length) {
    const frontMatterEnd = text.indexOf('---', 4) + 3;
    const skillNote = `\n\n## Relevant host skills\n\nWhen these skills exist in Antigravity's installed catalog, load only the few needed for the assigned task:\n${skills.map((name) => `- ${name}`).join('\n')}\n`;
    text = `${text.slice(0, frontMatterEnd)}${skillNote}${text.slice(frontMatterEnd)}`;
  }
  text += responsePolicy;

  const destination = join(target, 'agents', entry.name);
  await mkdir(destination, { recursive: true });
  await writeFile(join(destination, 'agent.md'), text);
  agentCount += 1;
}

const manifest = {
  $schema: 'https://antigravity.google/schemas/v1/plugin.json',
  name: 'mansoor-agent-hub',
  displayName: 'Mansoor Gemini Agent Team',
  version: packageVersion,
  description: 'A private, owner-signed Gemini agent team with focused specialists, bounded research and production-minded delivery.',
  logo: 'assets/logo.svg',
  suggestedPrompts: [
    'Inspect this repository and route the task to one matching domain expert.',
    'Ask the specialist to make a bounded change and report local verification evidence.',
    'Request a focused security or release review for this diff.'
  ],
  author: { name: 'Mansoor Farooq' }
};
await writeFile(join(target, 'plugin.json'), `${JSON.stringify(manifest, null, 2)}\n`);
await mkdir(join(target, 'assets'), { recursive: true });
await writeFile(join(target, 'assets', 'logo.svg'), '<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128"><rect width="128" height="128" rx="28" fill="#123B35"/><path d="M28 91V37h14l22 29 22-29h14v54H85V61L64 88 43 61v30z" fill="#F1F5E9"/><circle cx="100" cy="99" r="8" fill="#24B47E"/></svg>\n');
await writeFile(join(target, 'README.md'), `# MANSOOR FAROOQ | GEMINI AGENT TEAM\n\nA private, portable expert-agent system for Antigravity. One lead manager routes work to focused specialists, preserves project context and returns evidence-backed engineering decisions.\n\n## Install\n\n1. Install Antigravity and sign in with the target user's Gemini account.\n2. Extract this ZIP.\n3. Double-click \`Install-Mansoor-Agent-Team.cmd\`.\n\nThe installer verifies package integrity, validates the Antigravity plugin and installs or updates it. No GitHub sign-in is required.\n\n## Integrity and ownership\n\nThis package is published by Mansoor Farooq. Every package file is recorded in \`PACKAGE-CHECKSUMS.json\`. If a file is changed after packaging, the installer stops with an integrity error before installation. This is tamper detection and fail-closed installation; it is not a claim that a person with filesystem access cannot inspect or replace files. Stronger protection requires a privately held signing key, access control or encryption.\n\n## Team model\n\n\`production-orchestrator\` is the only manager. It selects one domain specialist and the smallest relevant host skill set. The package ships 15 agent profiles and no duplicate skill bodies, MCP servers, provider bridges, OAuth configuration or API keys.\n\n## Fast and professional responses\n\nUse \`Gemini 3.8 Flash\` with \`Low\` thinking for quick fixes. Use \`Medium\` or \`High\` for architecture, security, migration, ML or explicit research. All agents follow a Claude-style response contract: result first, concise rationale, clear evidence and assumptions, professional handoffs, Roman Urdu when appropriate and no invented tool results or hidden chain-of-thought.\n\n## Model and keys\n\nWithout API keys, all agents use the signed-in Antigravity/Gemini session through \`model: inherit\`. Optional integration keys belong in a local ignored \`.env\`; this portable package does not route them automatically.\n\n## Security boundary\n\nThe package does not collect project files, private chats, customer data, credentials or hidden reasoning. Research and image tools are bounded by the target Antigravity runtime.\n\n— Mansoor Farooq\n`);
await writeFile(join(target, '.env.example'), `# Optional local integration settings.\n# Leave blank when using the Antigravity account session.\n# The portable plugin does not read these automatically; only an explicitly\n# configured project/provider integration may use its matching variable.\n\n# OPENAI_API_KEY=\n# GEMINI_API_KEY=\n# DEEPSEEK_API_KEY=\n# GITHUB_TOKEN=\n`);
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
await writeFile(join(target, 'Install-Mansoor-Agent-Team.cmd'), `@echo off\nsetlocal\npowershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0Install-Mansoor-Agent-Team.ps1"\nif errorlevel 1 (\n  echo.\n  echo Installation failed. Read the message above.\n  pause\n  exit /b 1\n)\necho.\npause\n`);
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
  'The installer verifies the owner signature and every packaged file before Antigravity validation. No GitHub login is required on the target machine.',
  '',
  '## Recipient setup',
  '',
  'Install Antigravity, extract this ZIP, and double-click Install-Mansoor-Agent-Team.cmd. The recipient does not need the source repository, signing key, GitHub login or build tools.',
  '',
  '## Owner build setup',
  '',
  'On the owner PC, keep the source at E:\\Agents and run npm run build, or double-click Build-Agent-Hub.cmd. The automated build reuses or creates the signing key, builds the package, runs the doctor and focused tests, then writes E:\\Agents\\dist\\mansoor-agent-hub.zip.',
  '',
  'Share only the ZIP. Never share the private key, .env files or the full source folder.',
  '',
  '## Private ownership',
  '',
  'Designed and maintained by Mansoor Farooq. This is a private owner-controlled release, not a public redistribution licence. The private signing key stays outside Git and the ZIP. Future public publishing requires a deliberate licence and release review.',
  '',
  '## Security boundary',
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
  '  $hash = (Get-FileHash -LiteralPath $file -Algorithm SHA256).Hash',
  '  $bytes = (Get-Item -LiteralPath $file).Length',
  '  if ($hash -ne $record.SHA256 -or $bytes -ne $record.Bytes) { throw "Package integrity check failed: $($record.Path)" }',
  '}',
  '$node = Get-Command node -ErrorAction SilentlyContinue',
  "if (-not $node) { throw 'Node.js is required to verify the owner-signed package. Install Node.js, then run this installer again.' }",
  "$verifier = Join-Path $pluginRoot 'verify-package-signature.mjs'",
  '& $node.Source $verifier',
  "if ($LASTEXITCODE -ne 0) { throw 'Owner package signature verification failed. Installation stopped.' }",
  '$agy = Get-Command agy -ErrorAction SilentlyContinue',
  "if (-not $agy) { throw 'Antigravity CLI (agy) was not found. Install Antigravity first, then run this installer again.' }",
  '& $agy.Source plugin validate --strict $pluginRoot',
  "if ($LASTEXITCODE -ne 0) { throw 'Antigravity plugin validation failed.' }",
  '& $agy.Source plugin install $pluginRoot',
  "if ($LASTEXITCODE -ne 0) { throw 'Antigravity plugin installation failed.' }",
  "Write-Host 'Mansoor Gemini Agent Team installed successfully.'",
  "Write-Host 'Restart Antigravity, or reload its skills/agents if the app is already open.'",
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
console.log(`Built owner-signed Gemini expert agent plugin at ${target} (${agentCount} agents; zero bundled provider connectors or skill bodies).`);
