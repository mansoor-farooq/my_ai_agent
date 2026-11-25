import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const helper = path.join(root, 'tools', 'sync-global-rules.ps1');
async function sync(source, config) {
  const output = execFileSync('powershell.exe', [
    '-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', helper,
    '-SourceRoot', source, '-ConfigRoot', config,
  ], { encoding: 'utf8', windowsHide: true });
  const reportLine = output.trim().split(/\r?\n/).at(-1);
  const parsed = JSON.parse(reportLine);
  return Array.isArray(parsed) ? parsed : [parsed];
}

test('global rule sync creates, updates manager-owned files, and preserves local edits', async () => {
  const temp = await mkdtemp(path.join(os.tmpdir(), 'mansoor-rule-sync-'));
  const source = path.join(temp, 'package-rules');
  const config = path.join(temp, 'user-config');
  const dest = path.join(config, 'rules', 'global.md');
  await mkdir(source, { recursive: true });
  await writeFile(path.join(source, 'global.md'), 'version one');
  try {
    assert.equal((await sync(source, config))[0].status, 'created');
    await writeFile(path.join(source, 'global.md'), 'version two');
    assert.equal((await sync(source, config))[0].status, 'updated');
    assert.equal(await readFile(dest, 'utf8'), 'version two');
    await writeFile(dest, 'owner custom text');
    await writeFile(path.join(source, 'global.md'), 'version three');
    assert.equal((await sync(source, config))[0].status, 'preserved-local');
    assert.equal(await readFile(dest, 'utf8'), 'owner custom text');
  } finally { await rm(temp, { recursive: true, force: true }); }
});

test('malformed rule state never authorizes overwriting an existing customization', async () => {
  const temp = await mkdtemp(path.join(os.tmpdir(), 'mansoor-rule-state-'));
  const source = path.join(temp, 'package-rules');
  const rules = path.join(temp, 'user-config', 'rules');
  await mkdir(source, { recursive: true });
  await mkdir(rules, { recursive: true });
  await writeFile(path.join(source, 'global.md'), 'new package');
  await writeFile(path.join(rules, 'global.md'), 'custom rule');
  await writeFile(path.join(rules, '.mansoor-rule-state.json'), '{bad json');
  try {
    const report = await sync(source, path.dirname(rules));
    assert.equal(report[0].status, 'preserved-local');
    assert.equal(await readFile(path.join(rules, 'global.md'), 'utf8'), 'custom rule');
    assert.equal(await readFile(path.join(rules, '.mansoor-rule-state.json'), 'utf8'), '{bad json');
  } finally { await rm(temp, { recursive: true, force: true }); }
});
