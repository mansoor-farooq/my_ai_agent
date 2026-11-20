import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateReference, planSkillUpdate, planSkillReference, decorateSkillSource, bumpPatchVersion, packageNeedsRebuild } from '../update-skill-references.mjs';

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

test('scheduled upstream refresh opens a review PR and validates changes before publication', () => {
  const workflow = fs.readFileSync(path.join(root, '.github/workflows/upstream-skill-refresh.yml'), 'utf8');
  assert.match(workflow, /schedule:/);
  assert.match(workflow, /node tools\/update-skill-references\.mjs --apply/);
  assert.match(workflow, /npm test/);
  assert.match(workflow, /npm run secret-scan/);
  assert.match(workflow, /gh pr create/);
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
  assert.doesNotMatch(script, /shell:\s*command === npm/);
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
