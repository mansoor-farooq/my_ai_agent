import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { syncAntigravityAgentProfiles } from '../sync-antigravity-agent-profiles.mjs';

const marker = '<!-- managed-by: mansoor-agent-hub-antigravity -->';
const stateName = '.mansoor-agent-hub-antigravity-managed.json';

function profile(name, body) {
  return `---\nname: ${name}\ndescription: managed profile\n---\n${marker}\n${body}\n`;
}

function hash(value) {
  return createHash('sha256').update(value).digest('hex');
}

async function fixture() {
  const root = await mkdtemp(path.join(os.tmpdir(), 'mansoor-antigravity-profile-sync-'));
  const pluginRoot = path.join(root, 'plugin');
  const sourceRoot = path.join(pluginRoot, 'agents');
  const targetRoot = path.join(root, 'user-config', 'agents');
  const backupRoot = path.join(root, 'backups');
  await mkdir(sourceRoot, { recursive: true });
  await mkdir(targetRoot, { recursive: true });
  return { root, pluginRoot, sourceRoot, targetRoot, backupRoot };
}

async function writePackage({ pluginRoot, sourceRoot }, version, profiles) {
  await writeFile(path.join(pluginRoot, 'plugin.json'), JSON.stringify({ name: 'mansoor-agent-hub', version }));
  for (const entry of await readdir(sourceRoot)) await rm(path.join(sourceRoot, entry), { recursive: true, force: true });
  for (const [slug, contents] of Object.entries(profiles)) await writeFile(path.join(sourceRoot, `${slug}.md`), contents);
}

async function sync(context, release, targetRoots = [context.targetRoot]) {
  return syncAntigravityAgentProfiles({
    sourceRoot: context.sourceRoot,
    targetRoots,
    backupRoot: context.backupRoot,
    release,
  });
}

test('installs owned agent profiles with a hash manifest and leaves third-party profiles alone', async () => {
  const context = await fixture();
  try {
    await writePackage(context, '1.0.0', {
      'production-orchestrator': profile('Mansoor AI Team Manager', 'manager v1'),
      'qa-release-specialist': profile('qa-release-specialist', 'qa v1'),
    });
    const unrelated = path.join(context.targetRoot, 'zoho-agent');
    await mkdir(unrelated, { recursive: true });
    await writeFile(path.join(unrelated, 'agent.md'), profile('zoho-agent', 'keep external agent'));

    const result = await sync(context, '1.0.0');
    assert.equal(result.profiles, 2);
    assert.equal(result.roots[0].written, 2);
    assert.equal(await readFile(path.join(context.targetRoot, 'production-orchestrator', 'agent.md'), 'utf8'), profile('Mansoor AI Team Manager', 'manager v1'));
    const state = JSON.parse(await readFile(path.join(context.targetRoot, stateName), 'utf8'));
    assert.equal(state.schema, 'mansoor-antigravity-agent-sync/v1');
    assert.equal(state.files.length, 2);
    assert.equal(state.files[0].sha256.length, 64);
    assert.equal(await readFile(path.join(unrelated, 'agent.md'), 'utf8'), profile('zoho-agent', 'keep external agent'));
  } finally { await rm(context.root, { recursive: true, force: true }); }
});

test('backs up then replaces owned profiles and retires only unchanged manifest-owned stale profiles', async () => {
  const context = await fixture();
  try {
    await writePackage(context, '1.0.0', {
      'production-orchestrator': profile('Mansoor AI Team Manager', 'manager v1'),
      'old-managed-specialist': profile('old-managed-specialist', 'old v1'),
    });
    await sync(context, '1.0.0');

    await writePackage(context, '1.0.1', {
      'production-orchestrator': profile('Mansoor AI Team Manager', 'manager v2'),
    });
    const result = await sync(context, '1.0.1');
    assert.equal(result.roots[0].updated, 1);
    assert.equal(result.roots[0].retired, 1);
    assert.equal(await readFile(path.join(context.targetRoot, 'production-orchestrator', 'agent.md'), 'utf8'), profile('Mansoor AI Team Manager', 'manager v2'));
    await assert.rejects(readFile(path.join(context.targetRoot, 'old-managed-specialist', 'agent.md')));
    const backupFiles = [];
    async function walk(directory) {
      for (const entry of await readdir(directory, { withFileTypes: true })) {
        const file = path.join(directory, entry.name);
        if (entry.isDirectory()) await walk(file);
        else backupFiles.push(file);
      }
    }
    await walk(context.backupRoot);
    assert.equal(backupFiles.length, 2);
    assert.ok(backupFiles.some((file) => file.includes('replaced')));
    assert.ok(backupFiles.some((file) => file.includes('retired')));
  } finally { await rm(context.root, { recursive: true, force: true }); }
});

test('first refresh archives only obvious Mansoor/Chester legacy profiles and preserves other custom agents', async () => {
  const context = await fixture();
  try {
    await writePackage(context, '1.0.0', {
      'production-orchestrator': profile('Mansoor AI Team Manager', 'manager'),
    });
    for (const [slug, name] of [['mansoor-old-manager', 'Mansoor IT Manager'], ['chester', 'Chester']]) {
      const directory = path.join(context.targetRoot, slug);
      await mkdir(directory);
      await writeFile(path.join(directory, 'agent.md'), `---\nname: ${name}\n---\nold profile\n`);
    }
    const customDir = path.join(context.targetRoot, 'my-custom-agent');
    await mkdir(customDir);
    await writeFile(path.join(customDir, 'agent.md'), profile('my-custom-agent', 'preserve custom'));

    const result = await sync(context, '1.0.0');
    assert.equal(result.roots[0].legacyArchived, 2);
    await assert.rejects(readFile(path.join(context.targetRoot, 'mansoor-old-manager', 'agent.md')));
    await assert.rejects(readFile(path.join(context.targetRoot, 'chester', 'agent.md')));
    assert.equal(await readFile(path.join(customDir, 'agent.md'), 'utf8'), profile('my-custom-agent', 'preserve custom'));
  } finally { await rm(context.root, { recursive: true, force: true }); }
});

test('preflights every agent root before writing and fails closed on unmanaged identity conflicts', async () => {
  const context = await fixture();
  try {
    await writePackage(context, '1.0.0', {
      'production-orchestrator': profile('Mansoor AI Team Manager', 'manager'),
      'qa-release-specialist': profile('qa-release-specialist', 'qa'),
    });
    const firstRoot = path.join(context.root, 'first', 'agents');
    const secondRoot = path.join(context.root, 'second', 'agents');
    await mkdir(secondRoot, { recursive: true });
    await mkdir(path.join(secondRoot, 'qa-release-specialist'));
    const personalProfile = '---\nname: personal-qa-agent\ndescription: my own profile\n---\nkeep me\n';
    await writeFile(path.join(secondRoot, 'qa-release-specialist', 'agent.md'), personalProfile);

    await assert.rejects(sync(context, '1.0.0', [firstRoot, secondRoot]), /Unmanaged profile conflict/);
    await assert.rejects(readFile(path.join(firstRoot, 'production-orchestrator', 'agent.md')));
    assert.equal(await readFile(path.join(secondRoot, 'qa-release-specialist', 'agent.md'), 'utf8'), personalProfile);
  } finally { await rm(context.root, { recursive: true, force: true }); }
});

test('refuses a profile target inside a plugin directory', async () => {
  const context = await fixture();
  try {
    await writePackage(context, '1.0.0', { 'production-orchestrator': profile('Mansoor AI Team Manager', 'manager') });
    await assert.rejects(sync(context, '1.0.0', [path.join(context.root, 'config', 'plugins', 'zoho', 'agents')]), /plugin directory/);
  } finally { await rm(context.root, { recursive: true, force: true }); }
});

test('retires owned legacy profiles only inside the verified Mansoor plugin and preserves other plugins', async () => {
  const context = await fixture();
  try {
    await writePackage(context, '1.0.0', {
      'production-orchestrator': profile('Mansoor AI Team Manager', 'manager'),
    });
    const ownPluginRoot = path.join(context.root, 'config', 'plugins', 'mansoor-agent-hub');
    const ownAgents = path.join(ownPluginRoot, 'agents');
    const zohoAgents = path.join(context.root, 'config', 'plugins', 'zoho', 'agents');
    await mkdir(ownAgents, { recursive: true });
    await mkdir(zohoAgents, { recursive: true });
    await writeFile(path.join(ownPluginRoot, 'plugin.json'), JSON.stringify({ name: 'mansoor-agent-hub', version: '1.0.0' }));
    await writeFile(path.join(ownAgents, 'production-orchestrator.md'), profile('Mansoor AI Team Manager', 'manager'));
    await writeFile(path.join(ownAgents, 'old-managed.md'), profile('old-managed', 'remove this owner-marked profile'));
    await writeFile(path.join(ownAgents, 'chester.md'), '---\nname: Chester\n---\nold chester profile\n');
    const unrelatedOwn = '---\nname: personal-plugin-agent\n---\nkeep custom profile\n';
    await writeFile(path.join(ownAgents, 'personal-plugin-agent.md'), unrelatedOwn);
    const zohoProfile = '---\nname: zoho-agent\n---\nkeep Zoho\n';
    await writeFile(path.join(zohoAgents, 'zoho-agent.md'), zohoProfile);

    const result = await syncAntigravityAgentProfiles({
      sourceRoot: context.sourceRoot,
      targetRoots: [context.targetRoot],
      backupRoot: context.backupRoot,
      release: '1.0.0',
      pluginRoot: ownPluginRoot,
    });

    assert.equal(result.pluginCleanup.retired, 2);
    assert.equal(result.pluginCleanup.preserved, 0);
    assert.equal(await readFile(path.join(ownAgents, 'production-orchestrator.md'), 'utf8'), profile('Mansoor AI Team Manager', 'manager'));
    assert.equal(await readFile(path.join(ownAgents, 'personal-plugin-agent.md'), 'utf8'), unrelatedOwn);
    await assert.rejects(readFile(path.join(ownAgents, 'chester.md')));
    await assert.rejects(readFile(path.join(ownAgents, 'old-managed.md')));
    assert.equal(await readFile(path.join(zohoAgents, 'zoho-agent.md'), 'utf8'), zohoProfile);
  } finally { await rm(context.root, { recursive: true, force: true }); }
});

