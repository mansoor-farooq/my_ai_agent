import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { scanDirectory, scanText } from '../secret-scan.mjs';

test('secret scanner catches provider keys and redacts their values', () => {
  const fakeCredential = ['sk', 'proj', 'abcdefghijklmnopqrstuvwxyz123456'].join('-');
  const findings = scanText(`API_KEY=${fakeCredential}`, 'config.env');
  assert.equal(findings.length, 1);
  assert.match(findings[0].redacted, /<REDACTED>/);
  assert.doesNotMatch(JSON.stringify(findings), /abcdefghijklmnopqrstuvwxyz/);
});

test('secret scanner ignores placeholders and normal public URLs', () => {
  const findings = scanText('API_KEY=YOUR_API_KEY_HERE\nURL=https://example.com/catalog', 'README.md');
  assert.equal(findings.length, 0);
});

test('workspace scan excludes Antigravity native profile logs, which are not release source', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'mansoor-secret-scan-'));
  const fakeCredential = ['sk', 'proj', 'secret-for-fixture-only-123456789'].join('-');
  await fs.mkdir(path.join(root, 'shared', 'native-profile', 'logs'), { recursive: true });
  await fs.writeFile(path.join(root, 'shared', 'native-profile', 'logs', 'private.log'), `API_KEY=${fakeCredential}`);
  try { assert.deepEqual(scanDirectory(root), []); }
  finally { await fs.rm(root, { recursive: true, force: true }); }
});

test('secret scanner does not flag a dynamically assembled local editor nonce URL', () => {
  const findings = scanText("const url = 'http://localhost:' + PORT + '/source?token=' + TOKEN;", 'skills/local-editor.js');
  assert.deepEqual(findings, []);
});
