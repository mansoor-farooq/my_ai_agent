import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateReference, planSkillUpdate, planSkillReference, decorateSkillSource, bumpPatchVersion, packageNeedsRebuild } from '../update-skill-references.mjs';
import { readInstalledVersion, readLastSyncedVersion, shouldSyncInstalledAgents, writeSyncState } from '../auto-refresh-agent-skills.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

test('accepts only pinned GitHub repository references and safe skill paths', () => {
  assert.doesNotThrow(() => validateReference({
    source: 'vercel-labs/agent-skills',
    sourceType: 'github',
    skillPath: 'skills/composition-patterns/SKILL.md',
    ref: 'main',
  }));
  for (const entry of [
    { source: 'example.com/acme/repo', skillPath: 'skills/x/SKILL.md', ref: 'main' },
    { source: 'vercel-labs/agent-skills', sourceType: 'github', skillPath: '../secrets', ref: 'main' },
    { source: 'vercel-labs/agent-skills', sourceType: 'github', skillPath: 'skills/x/SKILL.md', ref: 'main;rm -rf /' },
  ]) assert.throws(() => validateReference(entry));
});

test('plans an update only when the installed skill still matches its lock hash', () => {
  const entry = { computedHash: 'a'.repeat(64), resolvedCommit: 'old' };
  assert.deepEqual(planSkillUpdate({ entry, installedHash: 'a'.repeat(64), latestHash: 'b'.repeat(64), commit: 'new' }), {
    status: 'update-available', commit: 'new', hash: 'b'.repeat(64),
  });
  assert.equal(planSkillUpdate({ entry, installedHash: 'c'.repeat(64), latestHash: 'b'.repeat(64), commit: 'new' }).status, 'local-change');
  assert.equal(planSkillUpdate({ entry, installedHash: 'a'.repeat(64), latestHash: 'a'.repeat(64), commit: 'new' }).status, 'current');
  assert.equal(planSkillUpdate({ entry: { ...entry, upstreamHash: 'b'.repeat(64) }, installedHash: 'a'.repeat(64), latestHash: 'b'.repeat(64), commit: 'new' }).status, 'current');
  assert.equal(planSkillUpdate({ entry: { ...entry, upstreamHash: 'b'.repeat(64) }, installedHash: 'a'.repeat(64), latestHash: 'c'.repeat(64), commit: 'new' }).status, 'update-available');
});

test('preserves locally edited skills even when the pinned upstream commit is unchanged', () => {
  const entry = { computedHash: 'a'.repeat(64), upstreamHash: 'b'.repeat(64), resolvedCommit: 'same-commit' };
  assert.equal(planSkillReference({ entry, installedHash: 'local-edit', latestHash: 'b'.repeat(64), commit: 'same-commit' }).status, 'local-change');
  assert.equal(planSkillReference({ entry, installedHash: 'a'.repeat(64), latestHash: 'b'.repeat(64), commit: 'same-commit' }).status, 'current');
});

test('pins source_url to the fetched immutable commit without duplicating license metadata', () => {
  const source = [
    '---', 'name: example-skill', 'description: Example.', 'license: MIT',
    'source_url: https://github.com/acme/repo/blob/old/skills/x/SKILL.md', '---', '', '# Example', '',
  ].join('\n');
  const result = decorateSkillSource(source, {
    license: 'MIT',
    sourceUrl: 'https://github.com/acme/repo/blob/newcommit/skills/x/SKILL.md',
  });
  assert.match(result, /license: MIT/g);
  assert.equal((result.match(/^license:/gm) || []).length, 1);
  assert.match(result, /source_url: https:\/\/github\.com\/acme\/repo\/blob\/newcommit\//);
  assert.doesNotMatch(result, /blob\/old\//);
  assert.throws(() => decorateSkillSource(source, { license: 'Apache-2.0', sourceUrl: 'https://example.test/source' }), /license changed/);
});

test('bumps only stable package patch versions when upstream skill content changes', () => {
  assert.equal(bumpPatchVersion('1.23.2'), '1.23.3');
  assert.throws(() => bumpPatchVersion('1.23.2-beta.1'), /non-stable/);
  assert.equal(packageNeedsRebuild('1.23.3', '1.23.2'), true);
  assert.equal(packageNeedsRebuild('1.23.3', '1.23.3'), false);
});

test('scheduled upstream refresh validates changes and publishes a review link without requiring PR permissions', () => {
  const workflow = fs.readFileSync(path.join(root, '.github/workflows/upstream-skill-refresh.yml'), 'utf8');
  assert.match(workflow, /schedule:/);
  assert.match(workflow, /node tools\/update-skill-references\.mjs --apply/);
  assert.match(workflow, /npm test/);
  assert.match(workflow, /npm run secret-scan/);
  assert.match(workflow, /Publish validated update branch and review link/);
  assert.match(workflow, /GITHUB_STEP_SUMMARY/);
  assert.match(workflow, /compareUrl/);
  assert.doesNotMatch(workflow, /gh pr create/);
  assert.doesNotMatch(workflow, /git push origin HEAD:refs\/heads\/(main|mansoor-development)/);
});

test('all-agent refresh command syncs the existing provider installers after validated updates', () => {
  const script = fs.readFileSync(path.join(root, 'tools/refresh-agent-skills.mjs'), 'utf8');
  for (const marker of [
    'update-skill-references.mjs',
    'generate-skill-provenance.mjs',
    'agents:install:gemini',
    'agents:install:codex',
    'build:package',
    'agy',
    'plugin',
    'install',
    'packageNeedsRebuild',
  ]) assert.ok(script.includes(marker), `missing sync step: ${marker}`);
  assert.doesNotMatch(script, /sync-antigravity-permissions/);
  assert.match(script, /process\.env\.npm_execpath/);
  assert.match(script, /MANSOOR_AGENT_REFRESH_SKIP_UPSTREAM/);
  assert.doesNotMatch(script, /process\.argv\.slice\(2\)/);
  assert.doesNotMatch(script, /shell:\s*command === npm/);
});

test('local auto-refresh only reinstalls agents when the bundled skill version changed', () => {
  assert.equal(shouldSyncInstalledAgents('1.23.4', '1.23.4', '1.23.4', '1.23.4'), false);
  assert.equal(shouldSyncInstalledAgents('1.23.4', '1.23.5', '1.23.4', '1.23.4'), true);
  assert.equal(shouldSyncInstalledAgents('1.23.4', '1.23.4', '1.23.2', '1.23.4'), true);
  assert.equal(shouldSyncInstalledAgents('1.23.4', '1.23.4', '1.23.4', ''), true);
});

test('local auto-refresh records completion only after every provider sync succeeds', async () => {
  const directory = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'mansoor-skill-refresh-test-'));
  const stateFile = path.join(directory, 'state.json');
  try {
    writeSyncState(stateFile, '1.23.5', new Date('2026-11-20T04:00:00.000Z'));
    const state = JSON.parse(fs.readFileSync(stateFile, 'utf8'));
    assert.equal(state.schema, 'mansoor.agent-skill-auto-update-state/v1');
    assert.equal(state.lastSyncedVersion, '1.23.5');
    assert.equal(shouldSyncInstalledAgents('1.23.5', '1.23.5', '1.23.5', state.lastSyncedVersion), false);
    writeSyncState(stateFile, '1.23.6', new Date('2026-11-21T04:00:00.000Z'));
    assert.equal(JSON.parse(fs.readFileSync(stateFile, 'utf8')).lastSyncedVersion, '1.23.6');
    fs.writeFileSync(stateFile, '{incomplete-json');
    assert.equal(readLastSyncedVersion(stateFile), '');
  } finally { await fs.promises.rm(directory, { recursive: true, force: true }); }
});

test('local auto-refresh repairs an absent or malformed bundle manifest', async () => {
  const directory = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'mansoor-skill-bundle-test-'));
  const manifestPath = path.join(directory, 'plugin.json');
  try {
    assert.equal(readInstalledVersion(manifestPath), '');
    fs.writeFileSync(manifestPath, '{incomplete-json');
    assert.equal(readInstalledVersion(manifestPath), '');
  } finally { await fs.promises.rm(directory, { recursive: true, force: true }); }
});

test('local auto-update installs a daily missed-run scheduled task without elevation', () => {
  const installer = fs.readFileSync(path.join(root, 'tools/install-agent-skill-auto-update.ps1'), 'utf8');
  const runner = fs.readFileSync(path.join(root, 'tools/run-agent-skill-auto-update.ps1'), 'utf8');
  assert.match(installer, /New-ScheduledTaskTrigger -Daily -At \$DailyAt/);
  assert.match(installer, /New-ScheduledTaskTrigger -AtLogOn -User \$userId/);
  assert.match(installer, /-StartWhenAvailable/);
  assert.match(installer, /-RunLevel Limited/);
  assert.match(installer, /Register-ScheduledTask/);
  assert.match(installer, /Start-ScheduledTask/);
  assert.match(runner, /npm\.cmd run agents:auto-update:run/);
  assert.match(runner, /skill-auto-update\.log/);
  assert.match(runner, /git fetch --quiet origin/);
  assert.match(runner, /git merge --ff-only \$upstream/);
  assert.match(runner, /uncommitted changes/);
  assert.match(runner, /diverged from/);
  assert.doesNotMatch(installer, /-RunLevel Highest|Credential|Password/);
});

test('local auto-update is available as an explicit installable provider sync', () => {
  const packageJson = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
  assert.match(packageJson.scripts['agents:auto-update:install'], /install-agent-skill-auto-update\.ps1 -RunNow/);
  assert.match(packageJson.scripts['agents:auto-update:remove'], /install-agent-skill-auto-update\.ps1 -Uninstall/);
  const script = fs.readFileSync(path.join(root, 'tools/auto-refresh-agent-skills.mjs'), 'utf8');
  assert.match(script, /tools\/update-skill-references\.mjs/);
  assert.match(script, /agents:refresh/);
  assert.match(script, /MANSOOR_AGENT_REFRESH_SKIP_UPSTREAM/);
  assert.match(script, /dist.*mansoor-agent-hub.*plugin\.json/);
  const testsGate = "runNpm(['test'], 'Validate agent behavior, policies, and contracts')";
  const fixturesGate = "run(process.execPath, ['tools/run-agent-security-fixtures.mjs']";
  const secretsGate = "runNpm(['run', 'secret-scan'], 'Validate skill and source secret hygiene')";
  const syncStep = "runNpm(['run', 'agents:refresh']";
  for (const gate of [testsGate, fixturesGate, secretsGate]) assert.ok(script.includes(gate), `missing mandatory update gate: ${gate}`);
  assert.ok(script.indexOf(testsGate) < script.indexOf(syncStep), 'full agent behavior tests must run before provider sync');
  assert.ok(script.indexOf(fixturesGate) < script.indexOf(syncStep), 'security fixtures must run before provider sync');
  assert.ok(script.indexOf(secretsGate) < script.indexOf(syncStep), 'secret scan must run before provider sync');
});

test('portable bundle version is sourced from package.json', () => {
  const buildScript = fs.readFileSync(path.join(root, 'tools/build-antigravity-plugin.mjs'), 'utf8');
  assert.match(buildScript, /packageManifest\.version/);
  assert.doesNotMatch(buildScript, /const packageVersion = ['"]\d+\.\d+\.\d+/);
  const installer = fs.readFileSync(path.join(root, 'install-antigravity-portable.ps1'), 'utf8');
  assert.match(installer, /\[IO\.File\]::Replace\(\$archiveTemp, \$archive, \$archiveBackup\)/);
  const releaseScript = fs.readFileSync(path.join(root, 'build-agent-hub.ps1'), 'utf8');
  assert.match(releaseScript, /mansoor-agent-hub-\$packageVersion-\$\(\$buildId\.Substring\(0, 8\)\)\.zip/);
});
