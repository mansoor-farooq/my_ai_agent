import assert from 'node:assert/strict';
import test from 'node:test';
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';

const wrapper = path.join(process.cwd(), 'tools', 'antigravity-pretool-guard.ps1');
const powershell = process.platform === 'win32' ? 'powershell.exe' : null;
const powershellAvailable = (() => {
  if (!powershell || !existsSync(wrapper)) return false;
  const probe = spawnSync(powershell, ['-NoProfile', '-NonInteractive', '-Command', '$PSVersionTable.PSVersion.ToString()'], { encoding: 'utf8' });
  return !probe.error;
})();

test('PowerShell hook wrapper returns JSON and zero for an allowed native action', { skip: !powershellAvailable }, () => {
  const input = JSON.stringify({ toolCall: { name: 'run_command', args: { CommandLine: 'echo safe' } } });
  const output = execFileSync(powershell, ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', wrapper], { input, encoding: 'utf8' });
  const decision = JSON.parse(output.trim());
  assert.equal(decision.decision, 'allow');
});

test('PowerShell hook wrapper returns an intentional deny as JSON with exit code 0', { skip: !powershellAvailable }, () => {
  const input = JSON.stringify({});
  const result = spawnSync(powershell, ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', wrapper], { input, encoding: 'utf8' });
  assert.equal(result.status, 0);
  assert.equal(JSON.parse(result.stdout.trim()).decision, 'deny');
});
