import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fingerprintLine, scanDirectory, scanText } from '../secret-scan.mjs';

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

test('directory scan suppresses only exact fingerprinted example assignments', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'mansoor-secret-allowlist-'));
  const file = 'fixtures/password-example.md';
  const example = ['const pass', "word = '", 'fake-example-only-value', "';"].join('');
  await fs.mkdir(path.join(root, 'fixtures'), { recursive: true });
  await fs.writeFile(path.join(root, file), example);
  await fs.mkdir(path.join(root, 'tools'), { recursive: true });
  await fs.writeFile(path.join(root, 'tools', 'secret-scan-allowlist.json'), JSON.stringify({
    schema: 'mansoor.secret-scan-allowlist/v1',
    findings: [{ file, lineSha256: fingerprintLine(file, example), reason: 'Intentional documentation example.' }],
  }));
  try {
    assert.deepEqual(scanDirectory(root), []);
    await fs.writeFile(path.join(root, file), ['const pass', "word = '", 'different-unknown-value', "';"].join(''));
    assert.equal(scanDirectory(root).length, 1, 'changed examples must no longer match the exact allowlist fingerprint');
  } finally { await fs.rm(root, { recursive: true, force: true }); }
});

test('line allowlist can never suppress high-confidence provider credentials', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'mansoor-secret-high-confidence-'));
  const file = 'fixtures/key-example.md';
  const fakeCredential = ['sk', 'proj', 'abcdefghijklmnopqrstuvwxyz123456'].join('-');
  const line = ['API', '_KEY=', fakeCredential].join('');
  await fs.mkdir(path.join(root, 'fixtures'), { recursive: true });
  await fs.writeFile(path.join(root, file), line);
  await fs.mkdir(path.join(root, 'tools'), { recursive: true });
  await fs.writeFile(path.join(root, 'tools', 'secret-scan-allowlist.json'), JSON.stringify({
    schema: 'mansoor.secret-scan-allowlist/v1',
    findings: [{ file, lineSha256: fingerprintLine(file, line), reason: 'Invalid attempt to suppress a provider key.' }],
  }));
  try {
    const findings = scanDirectory(root);
    assert.equal(findings.length, 1);
    assert.equal(findings[0].type, 'provider-key');
    assert.doesNotMatch(JSON.stringify(findings), /abcdefghijklmnopqrstuvwxyz/);
  } finally { await fs.rm(root, { recursive: true, force: true }); }
});

test('secret scanner does not flag a dynamically assembled local editor nonce URL', () => {
  const findings = scanText("const url = 'http://localhost:' + PORT + '/source?token=' + TOKEN;", 'skills/local-editor.js');
  assert.deepEqual(findings, []);
});
