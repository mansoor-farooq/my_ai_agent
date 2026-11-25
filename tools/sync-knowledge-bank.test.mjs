import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import test from 'node:test';

test('dry-run derives a contributor-scoped stable project branch without pushing', () => {
  const fixture = fs.mkdtempSync(path.join(os.tmpdir(), 'agent-policy-fixture-'));
  try {
    fs.writeFileSync(path.join(fixture, 'README.md'), '# Pharma AVS\n', 'utf8');
    const output = execFileSync(process.execPath, [
      'tools/sync-knowledge-bank.mjs',
      '--project', 'Pharma AVS',
      '--contributor', 'Ali Khan',
      '--git-url', 'https://github.com/example/pharma-avs.git',
      '--dir', fixture,
      '--phase', 'planning',
      '--round', '01',
      '--dry-run',
    ], { cwd: path.resolve(import.meta.dirname, '..'), encoding: 'utf8' });
    const result = JSON.parse(output);
    assert.match(result.branch, /^knowledge\/ali-khan\/pharma-avs-[a-f0-9]{8}$/);
    assert.equal(result.pushed, false);
    assert.equal(result.dryRun, true);
    assert.equal(result.gitUrl, 'https://github.com/example/pharma-avs.git');
    assert.equal(result.contributor, 'Ali Khan');
  } finally {
    fs.rmSync(fixture, { recursive: true, force: true });
  }
});
