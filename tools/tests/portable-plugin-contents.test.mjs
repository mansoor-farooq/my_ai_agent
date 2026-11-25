import test from 'node:test';
import assert from 'node:assert/strict';
import { access, mkdir, mkdtemp, readFile, rm, readdir, stat, writeFile } from 'node:fs/promises';
import { existsSync, readFileSync } from 'node:fs';
import { inflateRawSync } from 'node:zlib';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  copyPortableComponents,
  inspectPortableSource,
  requiredPortableSupportFiles,
  readAgentSkillReferences,
} from '../portable-components.mjs';
import { validateRuleRegistry } from '../rule-governance.mjs';
import { customSkillsForAgent } from '../custom-skill-wave.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

async function extractStandardZip(archive, destination) {
  const bytes = readFileSync(archive);
  let eocd = -1;
  const minOffset = Math.max(0, bytes.length - 22 - 0xffff);
  for (let offset = bytes.length - 22; offset >= minOffset; offset -= 1) {
    if (bytes.readUInt32LE(offset) === 0x06054b50) { eocd = offset; break; }
  }
  if (eocd < 0) throw new Error('ZIP end-of-directory record was not found.');
  const entries = bytes.readUInt16LE(eocd + 10);
  const directoryOffset = bytes.readUInt32LE(eocd + 16);
  if (entries === 0xffff || directoryOffset === 0xffffffff) throw new Error('ZIP64 archives are not supported by this test helper.');
  const resolvedDestination = path.resolve(destination);
  let cursor = directoryOffset;
  for (let index = 0; index < entries; index += 1) {
    if (bytes.readUInt32LE(cursor) !== 0x02014b50) throw new Error('Invalid ZIP central-directory entry.');
    const method = bytes.readUInt16LE(cursor + 10);
    const compressedSize = bytes.readUInt32LE(cursor + 20);
    const uncompressedSize = bytes.readUInt32LE(cursor + 24);
    const nameLength = bytes.readUInt16LE(cursor + 28);
    const extraLength = bytes.readUInt16LE(cursor + 30);
    const commentLength = bytes.readUInt16LE(cursor + 32);
    const localOffset = bytes.readUInt32LE(cursor + 42);
    const name = bytes.toString('utf8', cursor + 46, cursor + 46 + nameLength);
    cursor += 46 + nameLength + extraLength + commentLength;
    const destinationPath = path.resolve(resolvedDestination, name.replace(/[\\/]/g, path.sep));
    if (destinationPath !== resolvedDestination && !destinationPath.startsWith(`${resolvedDestination}${path.sep}`)) throw new Error(`Unsafe ZIP entry path: ${name}`);
    if (name.endsWith('/')) { await mkdir(destinationPath, { recursive: true }); continue; }
    if (bytes.readUInt32LE(localOffset) !== 0x04034b50) throw new Error(`Invalid ZIP local header: ${name}`);
    const localNameLength = bytes.readUInt16LE(localOffset + 26);
    const localExtraLength = bytes.readUInt16LE(localOffset + 28);
    const dataOffset = localOffset + 30 + localNameLength + localExtraLength;
    const compressed = bytes.subarray(dataOffset, dataOffset + compressedSize);
    const contents = method === 0 ? Buffer.from(compressed) : method === 8 ? inflateRawSync(compressed) : null;
    if (!contents) throw new Error(`Unsupported ZIP compression method ${method}: ${name}`);
    if (contents.length !== uncompressedSize) throw new Error(`ZIP size verification failed: ${name}`);
    await mkdir(path.dirname(destinationPath), { recursive: true });
    await writeFile(destinationPath, contents);
  }
}

test('portable source contains the complete owned skill and rule library', async () => {
  const inventory = await inspectPortableSource(root);

  for (const skill of ['video-editing-workflow', 'video-production-qa', 'lightweight-image-assets', 'seo-engineering-workflow']) {
    assert.ok(inventory.skills.includes(skill), `${skill} must be in the portable skill library`);
  }
  assert.equal(inventory.rules.length, 5);
  assert.deepEqual(inventory.invalidSkills, []);
  assert.deepEqual(inventory.invalidRules, []);
  assert.deepEqual(inventory.nestedSkillFiles, []);
  assert.deepEqual(inventory.unsafePaths, []);
  assert.deepEqual(inventory.brokenLocalReferences, []);
  assert.deepEqual(inventory.provenanceGaps, []);
});

test('governed rule registry is valid and matches bundled rule hashes', async () => {
  const registry = JSON.parse(await readFile(path.join(root, 'shared', 'control-plane', 'rule-registry.json'), 'utf8'));
  const result = await validateRuleRegistry(registry, { root });
  assert.equal(result.valid, true, JSON.stringify(result));
  assert.equal(registry.rules.length, 5);
});

test('portable source includes every unique Antigravity global skill', async () => {
  const inventory = await inspectPortableSource(root);
  const requiredGlobalSkills = [
    'bigquery-observability',
    'bigquery-optimization',
    'bigquery-troubleshooting',
    'cloud-databases-onboarding',
    'create-plan',
    'gcp-spark-observability',
    'gh-address-comments',
    'gh-fix-ci',
    'mansoor-ui-specialist',
    'memory',
    'omniroute-gateway',
    'stop-slop',
  ];

  assert.deepEqual(requiredGlobalSkills.filter((name) => !inventory.skills.includes(name)), []);
});

test('portable source includes the official Vercel UI skill pack', async () => {
  const inventory = await inspectPortableSource(root);
  for (const name of [
    'web-design-guidelines',
    'vercel-react-best-practices',
    'vercel-composition-patterns',
    'vercel-react-view-transitions',
    'writing-guidelines'
  ]) assert.ok(inventory.skills.includes(name), name);
});

test('imported mobile skills carry redistribution provenance', async () => {
  const inventory = await inspectPortableSource(root);
  const imported = new Set([
    'android-design',
    'flutter-ui-ux',
    'flutter-ui-ux-engineer',
    'mobile-ui-ux-designer',
  ]);

  assert.deepEqual(inventory.skillsWithoutProvenance.filter((name) => imported.has(name)), []);
});

test('every shipped agent skill reference resolves to a bundled skill body', async () => {
  const inventory = await inspectPortableSource(root);
  const references = await readAgentSkillReferences(root);
  const missing = [...new Set(references.filter((name) => !inventory.skills.includes(name)))].sort();

  assert.deepEqual(missing, []);
  assert.ok(references.length >= 200, `expected at least 200 skill references, found ${references.length}`);
});

test('UI Pro Max is a specialist with exactly twelve focused skills and alignment requirements', async () => {
  const profile = await readFile(path.join(root, 'agents', 'Antigravity', 'custom-agents', 'ui-pro-max-specialist', 'agent.md'), 'utf8');
  const references = new Set([...profile.matchAll(/^\s*-\s*skills\/([^\s]+)\s*$/gm)].map((match) => match[1]));
  const customSkills = customSkillsForAgent('ui-pro-max-specialist');
  assert.equal(customSkills.length, 12);
  assert.ok(customSkills.every((skill) => references.has(skill)));
  assert.match(profile, /mainAgent:\s*false/);
  assert.match(profile, /mansoor-ui-component-alignment/);
  assert.match(profile, /rendered page/);
});

test('premium CRM capability is present and staffed to the right specialists', async () => {
  const inventory = await inspectPortableSource(root);
  assert.ok(inventory.skills.includes('premium-crm-template'));
  for (const agent of ['production-orchestrator', 'mansoor-ui-specialist', 'saas-architect', 'enterprise-schema-architect', 'workflow-automation-specialist']) {
    const profile = await readFile(path.join(root, 'agents', 'Antigravity', 'custom-agents', agent, 'agent.md'), 'utf8');
    assert.match(profile, /skills\/premium-crm-template/);
  }
});

test('Flutter specialist carries production layout QA and ERP research capability', async () => {
  const inventory = await inspectPortableSource(root);
  assert.ok(inventory.skills.includes('flutter-production-layout-qa'));
  const profile = await readFile(path.join(root, 'agents', 'Antigravity', 'custom-agents', 'flutter-mobile-specialist', 'agent.md'), 'utf8');
  for (const name of [
    'flutter-mobile-master-engineer',
    'flutter-production-layout-qa',
    'premium-crm-template',
    'enterprise-erp-reverse-engineering',
    'ui-ux-pro-max',
    'design-reference-research',
    'workflow-operator-console-ui',
    'webapp-testing',
  ]) assert.match(profile, new RegExp(`skills/${name}`));
});

test('Codex package includes the Flutter custom subagent and its safe personal installer', async () => {
  const agent = await readFile(path.join(root, '.codex', 'agents', 'flutter-mobile-specialist.toml'), 'utf8');
  assert.match(agent, /^name = "flutter-mobile-specialist"/m);
  assert.match(agent, /flutter-mobile-master-engineer/);
  const installer = await readFile(path.join(root, 'tools', 'install-codex-mobile-specialist.mjs'), 'utf8');
  assert.match(installer, /Refusing to replace an existing non-Mansoor skill/);
  assert.match(installer, /Refusing to replace an existing custom Codex agent/);
  const inventory = await inspectPortableSource(root);
  assert.ok(inventory.skills.includes('flutter-mobile-master-engineer'));
});

test('skill provenance ledger covers every bundled skill without inventing public licences', async () => {
  const manifest = JSON.parse(await readFile(path.join(root, 'SKILL-PROVENANCE.json'), 'utf8'));
  const inventory = await inspectPortableSource(root);
  assert.equal(manifest.generatedFrom, 'skills');
  assert.doesNotMatch(manifest.generatedFrom, /^[A-Za-z]:/);
  assert.equal(manifest.policy.packageDistribution, 'private-only');
  assert.equal(manifest.policy.neverInventLicenseOrProvenance, true);
  assert.equal(manifest.skills.length, inventory.skills.length);
  assert.deepEqual(manifest.skills.map((entry) => entry.name).sort(), inventory.skills);
  assert.ok(manifest.skills.every((entry) => Array.isArray(entry.sourceRoots) && entry.sourceRoots.length));
});

test('portable bundle retains important non-Antigravity skill support files', async () => {
  const output = await mkdtemp(path.join(os.tmpdir(), 'mansoor-agent-hub-support-'));
  try {
    await copyPortableComponents(root, output, /(?:AIza[0-9A-Za-z_-]{30,}|AQ\.[0-9A-Za-z_-]{32,}|-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----|gh[pousr]_[A-Za-z0-9_]{30,})/);
    await assert.doesNotReject(access(path.join(output, 'tools', 'install-gemini-cli-team.mjs')), 'GitHub installer needs the package-aware Gemini sync tool');
    for (const relative of requiredPortableSupportFiles) {
      await assert.doesNotReject(access(path.join(output, relative)), relative);
    }
  } finally {
    await rm(output, { recursive: true, force: true });
  }
});

async function latestVersionedArchive() {
  const dist = path.join(root, 'dist');
  if (!existsSync(dist)) return null;
  const candidates = (await readdir(dist)).filter((name) => /^mansoor-agent-hub-\d+\.\d+\.\d+-[a-f0-9]{8}\.zip$/i.test(name));
  const withTimes = await Promise.all(candidates.map(async (name) => ({ name, time: (await stat(path.join(dist, name))).mtimeMs })));
  withTimes.sort((left, right) => right.time - left.time);
  return withTimes[0] ? path.join(dist, withTimes[0].name) : null;
}

const archiveUnderTest = await latestVersionedArchive();
test('built versioned ZIP retains the support files after archive creation', { skip: !archiveUnderTest }, async () => {
  const archive = archiveUnderTest;
  await assert.doesNotReject(access(archive), 'build the ZIP before running archive assertions');
  const output = await mkdtemp(path.join(os.tmpdir(), 'mansoor-agent-hub-archive-'));
  try {
    await extractStandardZip(archive, output);

    for (const relative of requiredPortableSupportFiles) {
      await assert.doesNotReject(access(path.join(output, relative)), relative);
    }
    await assert.doesNotReject(access(path.join(output, 'tools', 'ultra-agent-v2', 'rag.mjs')), 'project-scoped PostgreSQL RAG runtime');
    await assert.doesNotReject(access(path.join(output, 'tools', 'rag-setup.mjs')), 'bounded local PostgreSQL RAG setup utility');
    for (const relative of [
      'tools/ultra-agent-v2/preflight.mjs',
      'tools/ultra-agent-v2/memory.mjs',
      'tools/ultra-agent-v2/evidence.mjs',
      'tools/ultra-agent-v2/project-identity.mjs',
      'tools/antigravity-local-context.mjs',
      'tools/antigravity-system-doctor.mjs',
      'docs/antigravity-fast-context.md',
      'docs/antigravity-system-doctor.md',
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
      'tools/rule-governance.mjs',
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
      'tools/ultra-agent-v2/project-memory.mjs',
      'tools/repository-map.mjs',
      'tools/project-context-bootstrap.mjs',
      'tools/sync-antigravity-agent-profiles.mjs',
      'tools/benchmark-corpus.mjs',
      'tools/mobile-ui-flow-gate.mjs',
      'tools/ultra-agent-v4/task-workspaces.mjs',
      'tools/ultra-agent-v4/mcp-server.mjs',
      'tools/ultra-agent-v4/managed-runtime.mjs',
      'tools/ultra-agent-v5/action-manifest.mjs',
      'tools/ultra-agent-v5/approval-broker.mjs',
      'tools/ultra-agent-v5/command-approval-policy.mjs',
      'tools/ultra-agent-v5/manager-script-registry.mjs',
      'tools/ultra-agent-v5/destructive-action.mjs',
      'tools/ultra-agent-v5/durable-ledger.mjs',
      'tools/ultra-agent-v5/readiness-gate.mjs',
      'tools/start-managed-mcp.ps1',
      'tools/run-agent-security-fixtures.mjs',
      'tools/security-agent-fixtures.json',
      'tools/antigravity-runtime-preflight.mjs',
      'tools/antigravity-pretool-guard.mjs',
      'tools/antigravity-pretool-guard.ps1',
      'tools/sync-global-rules.ps1',
      'docs/google-update-contract.md',
      'tools/benchmark-schema.json',
      'benchmarks/README.md',
    ]) {
      await assert.doesNotReject(access(path.join(output, relative)), relative);
    }
    await assert.doesNotReject(access(path.join(output, 'SKILL-PROVENANCE.json')), 'SKILL-PROVENANCE.json');
    const plugin = JSON.parse(await readFile(path.join(output, 'plugin.json'), 'utf8'));
    const packageMetadata = JSON.parse(await readFile(path.join(root, 'package.json'), 'utf8'));
    assert.equal(plugin.version, packageMetadata.version);
    const packagedManager = await readFile(path.join(output, 'agents', 'production-orchestrator.md'), 'utf8');
    assert.doesNotMatch(packagedManager, /^skills:\r?$/m, 'packaged plugin agents must avoid broken AgentBasePath-relative skill metadata');
    assert.match(packagedManager, /Bundled skill routing/);
    assert.match(packagedManager, /managed-by: mansoor-agent-hub-antigravity/);
    assert.match(packagedManager, /Command execution evidence/);
    assert.match(packagedManager, /^enable_mcp_tools: true$/m);
    assert.match(packagedManager, /already-enabled host plugins/i);
    const packagedAgents = (await readdir(path.join(output, 'agents'))).filter((name) => name.endsWith('.md'));
    assert.equal(packagedAgents.length, 27);
    for (const agentFile of packagedAgents) {
      const agent = await readFile(path.join(output, 'agents', agentFile), 'utf8');
      assert.match(agent, /^enable_mcp_tools: true$/m, `${agentFile} can use host-enabled native MCP tools`);
      assert.match(agent, /^model: inherit$/m, `${agentFile} inherits Antigravity's currently selected model`);
    }
    const mcpConfig = JSON.parse(await readFile(path.join(output, 'mcp_config.json'), 'utf8'));
    const managedMcp = mcpConfig.mcpServers.runtime;
    assert.ok(managedMcp, 'the managed runtime MCP server must be bundled with the plugin');
    for (const toolName of Object.keys(managedMcp.tools)) {
      const generatedName = `mcp_mansoor-agent-hub_runtime_${toolName}`;
      assert.ok(generatedName.length <= 64, `${generatedName} must fit Antigravity MCP tool-name limit`);
    }
    assert.equal(managedMcp.command, 'powershell.exe');
    assert.ok(managedMcp.args.some((argument) => argument.includes('${PLUGIN_ROOT}')));
    assert.ok(managedMcp.env.MANSOOR_WORKSPACE_ROOT.includes('${PLUGIN_DATA}'));
    assert.equal(managedMcp.timeoutSeconds, 900);
    assert.deepEqual(Object.keys(managedMcp.tools).sort(), ['create_web_audit_report', 'discard_task_workspace', 'get_audit_browser_inventory', 'get_review_patch', 'inspect_task_workspace', 'prepare_managed_action', 'promote_reviewed_patch', 'run_managed_task'].sort());
    assert.equal(Object.hasOwn(managedMcp, 'variables'), false, 'portable local MCP must not require per-machine credential setup');
    const packagedReadme = await readFile(path.join(output, 'README.md'), 'utf8');
    assert.match(packagedReadme, /no per-project MCP config/i);
    assert.match(packagedReadme, /Windows 10\/11/);
    assert.match(packagedReadme, /fresh host review/i);
    const hooks = JSON.parse(await readFile(path.join(output, 'hooks.json'), 'utf8'));
    const nativeHookEntry = hooks['mansoor-native-write-guard'].PreToolUse.find((entry) => entry.hooks?.some((handler) => handler.name === 'mansoor-native-write-guard'));
    const nativeHook = nativeHookEntry?.hooks?.find((handler) => handler.name === 'mansoor-native-write-guard');
    assert.ok(nativeHook, 'the native guard hook must be present');
    assert.match(nativeHookEntry.matcher, /run_command/);
    assert.doesNotMatch(nativeHookEntry.matcher, /^\*$/);
    assert.match(nativeHook.command, /\$\{extensionPath\}\/tools\/antigravity-pretool-guard\.ps1/);
    assert.equal(nativeHook.cwd, '${extensionPath}');
    assert.equal(nativeHook.timeout, 10000, 'hook timeout is milliseconds; 10ms caused intermittent host hook failures');
    await assert.doesNotReject(access(path.join(output, 'tools', 'antigravity-pretool-guard.ps1')));
    const hookWrapper = await readFile(path.join(output, 'tools', 'antigravity-pretool-guard.ps1'), 'utf8');
    assert.match(hookWrapper, /exit 2/);
    assert.match(hookWrapper, /ConvertFrom-Json/);
    const installer = await readFile(path.join(output, 'Install-Mansoor-Agent-Team.ps1'), 'utf8');
    await assert.doesNotReject(access(path.join(output, 'tools', 'install-gemini-cli-team.mjs')));
    const ruleSync = await readFile(path.join(output, 'tools', 'sync-global-rules.ps1'), 'utf8');
    assert.match(installer, /nodejs\.org\/dist\/index\.json/);
    assert.match(installer, /SHASUMS256\.txt/);
    assert.match(installer, /antigravity\.google\/cli\/install\.ps1/);
    assert.match(installer, /antigravity-plugins-official/);
    assert.match(installer, /"plugin", "list", "--json"/);
    assert.match(installer, /@google\/gemini-cli@latest/);
    assert.match(installer, /install-gemini-cli-team\.mjs/);
    assert.match(installer, /Gemini CLI team\/skills\/policy synchronization failed/);
    assert.match(installer, /--verified-sync/, `verified-sync installer must be present in ${archive}`);
    assert.match(installer, /'plugin\.json', 'mcp_config\.json', 'hooks\.json'/);
    assert.match(installer, /Already installed; leaving the active package untouched/);
    assert.match(installer, /WindowsBuiltInRole.*Administrator/);
    assert.match(installer, /per-user Antigravity installation; elevation not required/i);
    assert.doesNotMatch(installer, /Administrator permission is required\. Requesting elevation/i);
    assert.doesNotMatch(installer, /Request-AntigravityGracefulClose|Stop-AntigravityBackgroundProcesses|CloseMainWindow|Stop-Process/);
    assert.match(installer, /Antigravity UI and background workers are left running/i);
    assert.match(installer, /Start-Transcript/);
    assert.match(installer, /INSTALLER ERROR:/);
    assert.match(installer, /mansoor-agent-hub-stage-/);
    assert.match(installer, /Install-Mansoor-Agent-Team\.journal\.json/);
    assert.match(installer, /mansoor\.install-journal\/v1/);
    assert.match(installer, /Save-InstallJournal "host-left-running"/);
    const nativePreflight = installer.indexOf('$pluginInventoryOutput = & $agy.Source plugin list --json');
    const hostLockCheck = installer.indexOf('$runningAntigravity = @(Get-Process -Name');
    const geminiSync = installer.indexOf('$geminiTeamInstaller = Join-Path');
    const projectSync = installer.indexOf('$projectRefresh = Join-Path');
    assert.ok(nativePreflight >= 0 && hostLockCheck > nativePreflight, 'query the native CLI before checking the host process lock');
    assert.ok(geminiSync > hostLockCheck && projectSync > hostLockCheck, 'defer before global or known-project side effects');
    assert.match(installer, /ConvertFrom-AgyPluginListJson/, 'parse native JSON arrays as records under Windows PowerShell 5.1');
    assert.match(installer, /System\.Web\.Script\.Serialization\.JavaScriptSerializer/);
    assert.match(installer, /ConvertFrom-Json -InputObject \$Json -AsHashtable/);
    assert.match(installer, /Save-InstallJournal "deferred-host-active"/);
    assert.match(installer, /Save-InstallJournal "already-current-host-active"/);
    assert.match(installer, /exit 42/);
    assert.match(installer, /INSTALL DEFERRED \/ Antigravity is running/);
    assert.match(installer, /preserveInstallBackup/);
    assert.match(installer, /backupPath = \$installBackup/);
    assert.match(installer, /rollback-complete/);
    assert.match(installer, /UPDATE BACKUP/);
    assert.match(installer, /ROLLBACK \/ previous active package restored/);
    assert.match(installer, /Copy-Item -LiteralPath \$sourceItem/);
    assert.match(installer, /@\(.*'tools'.*'shared'.*\)/s);
    assert.match(installer, /\[MF\]\s+MANSOOR FAROOQ/);
    assert.match(installer, /ULTRA AGENT v4/);
    assert.match(installer, /VALIDATED\s+\/\s+\d+ agents, \d+ skills, 5 rules, 1 hook/);
    assert.match(installer, /Invoke-AgyCaptured -CommandArguments @\("plugin", "validate"/);
    assert.ok(installer.indexOf('function Invoke-AgyCaptured') < installer.indexOf('$validationResult = Invoke-AgyCaptured'));
    assert.ok(installer.indexOf('function Invoke-AgyCaptured') < installer.indexOf('$inventoryResult = Invoke-AgyCaptured'));
    assert.match(installer, /foreach \(\$temporaryPath in @\(\$stdoutPath, \$stderrPath\)\)/);
    assert.match(installer, /\[IO\.File\]::Delete\(\[string\]\$temporaryPath\)/);
    assert.match(installer, /PACKAGE INTEGRITY/);
    assert.match(installer, /OPTIONAL EXTENSIONS/);
    assert.match(installer, /INSTALLATION COMPLETE/);
    assert.match(installer, /"plugin", "install", \$installStage/);
    assert.match(installer, /MANSOOR_AGENT_ROOT/);
    assert.match(installer, /installed plugin config/);
    assert.match(installer, /sync-antigravity-agent-profiles\.mjs/);
    assert.match(installer, /PROFILE REFRESH/);
    assert.match(installer, /--plugin-root/);
    assert.match(installer, /Assert-PreservedExternalPluginInventory/);
    assert.match(installer, /FINAL VERIFIED/);
    assert.ok(installer.includes('Save-InstallJournal "completed"'));
    assert.match(installer, /agent-profile-backups/);
    assert.match(installer, /sync-global-rules\.ps1/);
    assert.match(installer, /UPDATE PLAN/);
    assert.match(installer, /Get-TreeDrift/);
    assert.match(installer, /ACTIVE PACKAGE/);
    assert.match(installer, /UPDATED  \/ version/);
    assert.match(installer, /function Test-InstalledPreToolGuard/);
    assert.match(installer, /\$powerShellExe = \(Get-Process -Id \$PID\)\.Path/);
    assert.ok(installer.includes('Join-Path $resolvedActivePluginPath "tools\\sync-antigravity-agent-profiles.mjs"'));
    assert.ok(installer.includes('Mansoor-Agent-Hub\\agent-profile-backups'));
    assert.doesNotMatch(installer, /toolssync-antigravity-agent-profiles/);
    assert.match(installer, /HOOK VERIFIED/);
    assert.match(installer, /hook-verified/);
    assert.match(ruleSync, /RULE PRESERVED/);
    assert.match(ruleSync, /RULE UPDATED/);
    assert.match(ruleSync, /\.mansoor-rule-state\.json/);
    const launcher = await readFile(path.join(output, 'Install-Mansoor-Agent-Team.cmd'), 'utf8');
    assert.match(launcher, /Install-Mansoor-Agent-Team\.log/);
    assert.match(launcher, /if not "%INSTALL_EXIT%"=="0" pause/i, 'double-clicked installer must keep a failed run visible for diagnostics');
    assert.match(launcher, /exit \/b %INSTALL_EXIT%/);
    assert.match(installer, /Save-InstallJournal "validating"/);
    assert.match(installer, /Save-InstallJournal "installing"/);
    assert.match(installer, /Save-InstallJournal "failed"/);
    assert.doesNotMatch(installer, /gh auth login|github\.com\/login/);
  } finally {
    await rm(output, { recursive: true, force: true });
  }
});

test('build output keeps compact routers and full skill instructions separately', async () => {
  const output = await mkdtemp(path.join(os.tmpdir(), 'mansoor-agent-hub-router-'));
  try {
    await copyPortableComponents(root, output, /(?:AIza[0-9A-Za-z_-]{30,}|AQ\.[0-9A-Za-z_-]{32,}|-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----|gh[pousr]_[A-Za-z0-9_]{30,})/);
    const router = await readFile(path.join(output, 'skills', 'software-architect', 'SKILL.md'), 'utf8');
    const full = await readFile(path.join(output, 'skill-library', 'software-architect', 'SKILL.md'), 'utf8');
    assert.match(router, /Read full instructions at \.\.\/skill-library\/software-architect\/SKILL\.md/);
    assert.match(router, /skill-library\/software-architect\/SKILL\.md/);
    assert.ok(router.length < 900, `router unexpectedly large: ${router.length}`);
    assert.ok(full.length > router.length * 10, 'full instructions were not preserved separately');
  } finally {
    await rm(output, { recursive: true, force: true });
  }
});

test('owner build detects installed global Mansoor profiles when plugin inventory omits the team', async () => {
  const buildScript = await readFile(path.join(root, 'build-agent-hub.ps1'), 'utf8');
  assert.match(buildScript, /production-orchestrator\\agent\.md/);
  assert.match(buildScript, /mansoor-ui-specialist\\agent\.md/);
  assert.match(buildScript, /flutter-mobile-specialist\\agent\.md/);
  assert.ok(buildScript.includes('internal routing id:') && buildScript.includes('production-orchestrator'));
  assert.match(buildScript, /MANSOOR_AGENT_ROOT/);
  assert.match(buildScript, /AGY_CONFIG_DIR/);
  assert.match(buildScript, /ANTIGRAVITY_CONFIG_DIR/);
  assert.match(buildScript, /GEMINI_CONFIG_DIR/);
  assert.match(buildScript, /no Mansoor plugin or installed agent-profile roots were detected/i);
  assert.match(buildScript, /Get-Process -Name 'Antigravity'/);
  assert.match(buildScript, /AUTO UPDATE DEFERRED/);
  assert.match(buildScript, /autoInstallExit -eq 42/);
  const nativePreflight = buildScript.indexOf('plugin list --json 2>&1');
  const firstGlobalSync = buildScript.indexOf('GEMINI CLI / synchronizing Mansoor AI Team Manager');
  const processLockCheck = buildScript.indexOf("Get-Process -Name 'Antigravity'");
  assert.ok(nativePreflight >= 0 && processLockCheck > nativePreflight, 'owner build must verify actual CLI inventory and host process state');
  assert.ok(firstGlobalSync > processLockCheck, 'owner build must finish native preflight before syncing global agents');
  assert.match(buildScript, /no global\/project sync or plugin write was started/i);
  assert.match(buildScript, /plugin list --json/);
  assert.match(buildScript, /ConvertFrom-AgyPluginListJson/);
  assert.match(buildScript, /System\.Web\.Script\.Serialization\.JavaScriptSerializer/);
  assert.match(buildScript, /inventoryVerified/);
  assert.match(buildScript, /the native installer never stops it/);
  assert.doesNotMatch(buildScript, /request a graceful close before updating/i);
});

test('owner build refreshes the extracted distribution folder from the signed ZIP', async () => {
  const buildScript = await readFile(path.join(root, 'build-agent-hub.ps1'), 'utf8');
  assert.match(buildScript, /VERSIONED PACKAGE REFRESHED/);
  assert.match(buildScript, /EXTRACTED PACKAGE REFRESHED/);
  assert.match(buildScript, /EXTRACTED PACKAGE REFRESH DEFERRED/);
  assert.match(buildScript, /mansoor-agent-hub-refresh-/);
  assert.match(buildScript, /Expand-Archive/);
  assert.match(buildScript, /\$extractedPackage = Join-Path \$dist 'mansoor-agent-hub'/);
  assert.match(buildScript, /mansoor-agent-hub-\$packageVersion-\$\(\$buildId\.Substring\(0, 8\)\)\.zip/);
  assert.match(buildScript, /OLD SIGNED BUILD PRESERVED/);
  assert.match(buildScript, /EXISTING VERSIONED PACKAGE PRESERVED/);
  assert.match(buildScript, /PREVIOUS DISTRIBUTION BACKUP PRESERVED/);
  assert.doesNotMatch(buildScript, /STALE SIGNED BUILD REMOVED/);
  assert.doesNotMatch(buildScript, /Remove-Item -LiteralPath \$oldPackagePath/);
  assert.doesNotMatch(buildScript, /if \(Test-Path -LiteralPath \$versionedPackage -PathType Container\) \{ Remove-Item/);
  assert.doesNotMatch(buildScript, /Remove-Item -LiteralPath \$aliasBackup/);
});
