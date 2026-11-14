import assert from 'node:assert/strict';
import test from 'node:test';
import { classifyCommand } from '../ultra-agent-v5/command-approval-policy.mjs';

test('auto-approves an exact disk-space probe', () => {
  const result = classifyCommand({ command: `$drive = (Get-CimInstance Win32_LogicalDisk -Filter "DeviceID='C:'").FreeSpace` });
  assert.equal(result.decision, 'auto_approve');
  assert.equal(result.class, 'read-only-probe');
});

test('auto-approves a tool version probe', () => {
  const result = classifyCommand({ command: 'node --version' });
  assert.equal(result.decision, 'auto_approve');
});

test('auto-approves exact routine verification commands', () => {
  for (const command of ['npm test', 'npm run lint', 'flutter analyze', 'flutter test', 'dotnet test', 'python -m pytest']) {
    const result = classifyCommand({ command });
    assert.equal(result.decision, 'auto_approve', command);
    assert.equal(result.class, 'routine-verification', command);
  }
});

test('does not auto-approve arbitrary package scripts or builds', () => {
  for (const command of ['npm run build', 'npm run clean', 'powershell -File cleanup.ps1']) {
    assert.notEqual(classifyCommand({ command }).decision, 'auto_approve', command);
  }
});

test('requires owner review for live storage purge', () => {
  const result = classifyCommand({ command: 'Clear-RecycleBin -Force; Remove-Item -Recurse -Force C:\\Windows\\Temp' });
  assert.equal(result.decision, 'owner_review');
  assert.match(result.reason, /destructive|chaining|review/i);
});

test('requires owner review for command chaining and redirection', () => {
  for (const command of ['node --version | Out-File version.txt', 'node --version > version.txt', 'node --version && npm --version']) {
    assert.equal(classifyCommand({ command }).decision, 'owner_review', command);
  }
});

test('requires owner review for network or install commands', () => {
  for (const command of ['Invoke-WebRequest https://example.com', 'npm install lodash', 'git push origin main']) {
    assert.equal(classifyCommand({ command }).decision, 'owner_review', command);
  }
});

test('requires owner review for unknown commands and protected paths', () => {
  assert.equal(classifyCommand({ command: 'some-unknown-tool --check' }).decision, 'owner_review');
  assert.equal(classifyCommand({ command: 'Get-Item .env.local' }).decision, 'owner_review');
});

test('malformed command is denied', () => {
  assert.equal(classifyCommand({ command: '' }).decision, 'deny');
  assert.equal(classifyCommand({}).decision, 'deny');
});
