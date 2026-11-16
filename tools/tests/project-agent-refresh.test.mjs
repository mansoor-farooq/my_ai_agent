import assert from 'node:assert/strict';
import fs from 'node:fs';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import test from 'node:test';
import { auditProjectAgent, syncKnownProjects, syncProjectAgent } from '../project-agent-refresh.mjs';

function sourceFixture() {
  const root = mkdtempSync(path.join(os.tmpdir(), 'mansoor-refresh-'));
  const source = path.join(root, 'global-plugin');
  mkdirSync(path.join(source, 'tools', 'ultra-agent-v5'), { recursive: true });
  writeFileSync(path.join(source, 'plugin.json'), JSON.stringify({ name: 'mansoor-agent-hub', version: '2.0.0' }));
  writeFileSync(path.join(source, 'PACKAGE-CHECKSUMS.json'), 'checks-v2');
  writeFileSync(path.join(source, 'PACKAGE-SIGNATURE.json'), 'signature-v2');
  writeFileSync(path.join(source, 'tools', 'ultra-agent-v5', 'sync-antigravity-permissions.mjs'), "export const PERMISSION_POLICY_VERSION = '2026-11-16.6';\n");
  writeFileSync(path.join(source, 'agents.md'), 'new manager');
  return { root, source };
}

function projectFixture(root, source) {
  const project = path.join(root, 'project');
  mkdirSync(path.join(project, '.agents', 'plugins', 'mansoor-agent-hub'), { recursive: true });
  fs.cpSync(source, path.join(project, '.agents', 'plugins', 'mansoor-agent-hub'), { recursive: true });
  return project;
}

test('project refresh registers global inheritance and is idempotent', () => {
  const fixture = sourceFixture();
  const project = path.join(fixture.root, 'project');
  mkdirSync(project);
  try {
    const first = syncProjectAgent({ projectDir: project, sourceRoot: fixture.source, project: 'Refresh Fixture' });
    assert.equal(first.status, 'registered-global-inherited');
    const second = syncProjectAgent({ projectDir: project, sourceRoot: fixture.source, project: 'Refresh Fixture' });
    assert.equal(second.status, 'current');
    assert.equal(JSON.parse(readFileSync(path.join(project, '.agents', 'mansoor-agent-state.json'), 'utf8')).permissionPolicyVersion, '2026-11-16.6');
  } finally { rmSync(fixture.root, { recursive: true, force: true }); }
});

test('stale managed workspace plugin is atomically refreshed and app files remain untouched', () => {
  const fixture = sourceFixture();
  const project = projectFixture(fixture.root, fixture.source);
  const target = path.join(project, '.agents', 'plugins', 'mansoor-agent-hub');
  writeFileSync(path.join(target, 'plugin.json'), JSON.stringify({ name: 'mansoor-agent-hub', version: '1.0.0' }));
  writeFileSync(path.join(project, 'app.txt'), 'keep me');
  try {
    const result = syncProjectAgent({ projectDir: project, sourceRoot: fixture.source, project: 'Refresh Fixture' });
    assert.equal(result.status, 'updated');
    assert.equal(JSON.parse(readFileSync(path.join(target, 'plugin.json'), 'utf8')).version, '2.0.0');
    assert.equal(readFileSync(path.join(project, 'app.txt'), 'utf8'), 'keep me');
    assert.ok(result.rollbackPath);
    assert.equal(auditProjectAgent({ projectDir: project, sourceRoot: fixture.source }).status, 'current');
  } finally { rmSync(fixture.root, { recursive: true, force: true }); }
});

test('local workspace customization is preserved instead of overwritten', () => {
  const fixture = sourceFixture();
  const project = projectFixture(fixture.root, fixture.source);
  const target = path.join(project, '.agents', 'plugins', 'mansoor-agent-hub');
  writeFileSync(path.join(target, 'custom.local'), 'owner customization');
  writeFileSync(path.join(target, 'plugin.json'), JSON.stringify({ name: 'mansoor-agent-hub', version: '1.0.0' }));
  const stateDir = path.join(project, '.agents');
  writeFileSync(path.join(stateDir, 'mansoor-agent-state.json'), JSON.stringify({ schema: 'mansoor.project-agent-state/v1', managedFingerprint: 'sha256:previous-release' }));
  try {
    const result = syncProjectAgent({ projectDir: project, sourceRoot: fixture.source, project: 'Refresh Fixture' });
    assert.equal(result.status, 'preserved-local');
    assert.equal(readFileSync(path.join(target, 'custom.local'), 'utf8'), 'owner customization');
  } finally { rmSync(fixture.root, { recursive: true, force: true }); }
});

test('known Antigravity projects are refreshed from the bounded registry without drive scanning', () => {
  const fixture = sourceFixture();
  const first = path.join(fixture.root, 'first-project');
  const second = path.join(fixture.root, 'second-project');
  const missing = path.join(fixture.root, 'missing-project');
  mkdirSync(first);
  mkdirSync(second);
  const registry = path.join(fixture.root, 'registry');
  mkdirSync(registry);
  writeFileSync(path.join(registry, 'first.json'), JSON.stringify({ id: 'first', name: 'First', projectResources: { resources: [{ folderUri: pathToFileURL(first).href }] }, permissionGrants: { v2Migrated: true } }));
  writeFileSync(path.join(registry, 'second.json'), JSON.stringify({ id: 'second', name: 'Second', projectResources: { resources: [{ folderUri: pathToFileURL(second).href }] }, permissionGrants: { v2Migrated: true, custom: ['keep'] } }));
  writeFileSync(path.join(registry, 'missing.json'), JSON.stringify({ id: 'missing', name: 'Missing', projectResources: { resources: [{ folderUri: pathToFileURL(missing).href }] } }));
  try {
    const result = syncKnownProjects({ registryRoot: registry, sourceRoot: fixture.source, configPath: path.join(fixture.root, 'config.json') });
    assert.equal(result.policy, null);
    assert.equal(result.counts.discovered, 3);
    assert.equal(result.counts.synced, 2);
    assert.equal(result.counts.skipped, 1);
    assert.equal(result.projects.find((item) => item.projectName === 'Second').permissionMode, 'project-override-preserved');
    assert.equal(JSON.parse(readFileSync(path.join(first, '.agents', 'mansoor-agent-state.json'), 'utf8')).manager, 'Mansoor AI Team Manager');
  } finally { rmSync(fixture.root, { recursive: true, force: true }); }
});

