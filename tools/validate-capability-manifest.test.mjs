import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import test from 'node:test';

const root = path.resolve(import.meta.dirname, '..');
const manifest = path.join(root, 'shared', 'control-plane', 'agent-capability-manifest.json');

test('accepts the checked-in least-privilege capability manifest', () => {
  const output = execFileSync(process.execPath, ['tools/validate-capability-manifest.mjs', '--file', manifest], { cwd: root, encoding: 'utf8' });
  assert.match(output, /valid/);
});

test('rejects a manifest that grants forbidden hidden capabilities', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'capability-manifest-'));
  const invalid = path.join(dir, 'invalid.json');
  try {
    const value = JSON.parse(fs.readFileSync(manifest, 'utf8'));
    value.capabilities.allow.push('credentials.read');
    fs.writeFileSync(invalid, JSON.stringify(value), 'utf8');
    assert.throws(() => execFileSync(process.execPath, ['tools/validate-capability-manifest.mjs', '--file', invalid], { cwd: root, encoding: 'utf8', stdio: 'pipe' }), /status|forbidden|credentials/i);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
