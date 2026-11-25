import test from 'node:test';
import assert from 'node:assert/strict';
import { collectSystemDoctor, resolveSystemSettingsPath } from '../antigravity-system-doctor.mjs';

test('system doctor is read-only, redacts environment values, and identifies a healthy native install', () => {
  const outputs = new Map([
    ['node --version', 'v24.21.0'], ['agy --version', '1.23.20'], ['gemini --version', '0.18.0'],
    ['npm --version', '11.6.2'], ['git --version', 'git version 2.51.0'], ['wsl --status', 'Default Distribution: Ubuntu'],
    ['tasklist /FI IMAGENAME eq Antigravity.exe /FO CSV /NH', '"Antigravity.exe","1234","Console","1","123,456 K"'],
    ['agy plugin list --json', '[{"name":"mansoor-agent-hub","version":"1.23.20","path":"C:\\\\Users\\\\tester\\\\plugin","enabled":true},{"name":"other-plugin","version":"1.0.0","path":"C:\\\\other"}]'],
  ]);
  const resolver = (name) => name === 'tasklist' ? 'tasklist' : name;
  const runner = (command, args) => {
    const key = `${command} ${args.join(' ')}`;
    return outputs.has(key) ? { ok: true, output: outputs.get(key), exitCode: 0, error: null } : { ok: false, output: '', exitCode: 1, error: 'missing' };
  };
  const result = collectSystemDoctor({ platform: 'win32', resolver, runner, env: { CI: 'true', GOOGLE_CLOUD_PROJECT: 'private-project', SECRET_TOKEN: 'do-not-print' } });
  assert.equal(result.status, 'attention');
  assert.equal(result.inventory.thirdPartyCount, 1);
  assert.ok(result.checks.some((check) => check.id === 'antigravity-plugin' && check.status === 'pass'));
  assert.ok(result.checks.some((check) => check.id === 'host-processes' && check.status === 'warn'));
  assert.ok(result.checks.some((check) => check.id === 'interactive-environment' && check.status === 'warn'));
  assert.doesNotMatch(JSON.stringify(result), /private-project|do-not-print/);
});

test('system doctor fails closed when agy inventory cannot be verified', () => {
  const result = collectSystemDoctor({
    platform: 'linux',
    resolver: (name) => name === 'agy' || name === 'node' ? name : null,
    runner: (command, args) => command === 'node' ? { ok: true, output: 'v22.0.0', exitCode: 0 } : command === 'agy' && args.join(' ') === 'plugin list --json' ? { ok: true, output: 'not-json', exitCode: 0 } : { ok: false, output: '', exitCode: 1 },
    env: {},
  });
  assert.equal(result.status, 'blocked');
  assert.equal(result.checks.find((check) => check.id === 'antigravity-plugin')?.status, 'fail');
  assert.equal(result.policy.readOnly, true);
});

test('system doctor reports Google system-settings precedence without editing it', () => {
  const settingsPath = resolveSystemSettingsPath({ platform: 'win32', env: { ProgramData: 'C:\\ProgramData' } });
  assert.match(settingsPath, /gemini-cli[\\/]settings\.json$/i);
  const result = collectSystemDoctor({
    platform: 'win32',
    env: { ProgramData: 'C:\\ProgramData' },
    resolver: (name) => name === 'tasklist' ? 'tasklist.exe' : null,
    runner: () => ({ ok: false, output: '', error: 'not-found' }),
    fileSystem: { existsSync: () => true, readFileSync: () => '{"permissions":{"allow":["command(*)"]}}' },
  });
  assert.equal(result.policy.readOnly, true);
  assert.equal(result.policy.doesNotChangeProviders, true);
  const systemSettings = result.checks.find((check) => check.id === 'gemini-system-settings');
  assert.equal(systemSettings.status, 'warn');
  assert.deepEqual(systemSettings.overrideKeys, ['permissions']);
});
