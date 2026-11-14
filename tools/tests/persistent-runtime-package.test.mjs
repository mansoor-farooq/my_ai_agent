import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

test('portable build declares the persistent runtime and Android preview lane', async () => {
  const source = await readFile(path.join(root, 'tools', 'build-antigravity-plugin.mjs'), 'utf8');
  for (const relative of [
    'tools/agent-training-dataset.mjs',
    'tools/ultra-agent-cli.mjs',
    'tools/ultra-agent-v4/daemon/paths.mjs',
    'tools/ultra-agent-v4/daemon/events.mjs',
    'tools/ultra-agent-v4/daemon/queue.mjs',
    'tools/ultra-agent-v4/daemon/protocol.mjs',
    'tools/ultra-agent-v4/daemon/daemon.mjs',
    'tools/ultra-agent-v4/agy-session.mjs',
    'tools/ultra-agent-v4/context-bundle.mjs',
    'tools/ultra-agent-v4/android-preview.mjs',
    'shared/control-plane/default-engineering-policies.json',
  ]) assert.ok(source.includes(`'${relative}'`), relative);
});

test('portable package does not bundle scrcpy binaries or provider credentials', async () => {
  const source = await readFile(path.join(root, 'tools', 'build-antigravity-plugin.mjs'), 'utf8');
  assert.doesNotMatch(source, /scrcpy\.exe/);
  assert.doesNotMatch(source, /AIza[0-9A-Za-z_-]{20,}/);
  assert.doesNotMatch(source, /BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY/);
});
