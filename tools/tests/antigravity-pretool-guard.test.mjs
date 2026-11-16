import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtempSync, rmSync, symlinkSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { evaluatePreToolUse, parsePreToolInput } from '../antigravity-pretool-guard.mjs';

test('native in-workspace file writes are manager-auto-approved inside the active workspace', () => {
  const workspace = mkdtempSync(path.join(os.tmpdir(), 'agy-hook-'));
  try {
    const result = evaluatePreToolUse({
      toolCall: { name: 'write_to_file', args: { TargetFile: path.join(workspace, 'src', 'new.js') } },
      workspacePaths: [workspace],
    });
    assert.equal(result.decision, 'auto_approve');
    assert.match(result.reason, /manager|workspace/i);
  } finally { rmSync(workspace, { recursive: true, force: true }); }
});

test('native non-delete shell commands are manager-auto-approved', () => {
  const result = evaluatePreToolUse({ toolCall: { name: 'run_command', args: { CommandLine: 'echo safe' } } });
  assert.equal(result.decision, 'auto_approve');
  assert.match(result.reason, /manager|plan/i);
});

test('native project build command is manager-auto-approved', () => {
  const result = evaluatePreToolUse({ toolCall: { name: 'run_command', args: { CommandLine: 'npm run build' } } });
  assert.equal(result.decision, 'auto_approve');
});

test('manager-approved read-only shell probes are allowed without a repeated host prompt', () => {
  const result = evaluatePreToolUse({
    toolCall: { name: 'run_command', args: { CommandLine: `$drive = (Get-CimInstance Win32_LogicalDisk -Filter "DeviceID='C:'").FreeSpace` } },
  });
  assert.equal(result.decision, 'allow');
  assert.match(result.reason, /manager auto-approved|read-only/i);
});

test('manager does not auto-approve a destructive storage purge', () => {
  const result = evaluatePreToolUse({
    toolCall: { name: 'run_command', args: { CommandLine: 'Clear-RecycleBin -Force; Remove-Item -Recurse -Force C:\\Windows\\Temp' } },
  });
  assert.equal(result.decision, 'force_ask');
  assert.equal(result.permissionOverrides, undefined);
  assert.match(result.reason, /delete|destructive|owner/i);
});

test('native project deletion remains an approval boundary', () => {
  const result = evaluatePreToolUse({ toolCall: { name: 'run_command', args: { CommandLine: 'Remove-Item -Recurse -Force .\\tmp' } } });
  assert.equal(result.decision, 'force_ask');
});

test('non-delete critical commands expose an exact Always Allow override', () => {
  const result = evaluatePreToolUse({ toolCall: { name: 'run_command', args: { CommandLine: 'npm install lodash' } } });
  assert.equal(result.decision, 'ask');
  assert.deepEqual(result.permissionOverrides, ['command(npm install lodash)']);
});

test('unclassified tools remain fail-closed and do not inherit a cached grant', () => {
  const result = evaluatePreToolUse({ toolCall: { name: 'mystery_workspace_tool', args: { TargetFile: 'src/a.js' } } });
  assert.equal(result.decision, 'force_ask');
});

test('native writes to protected files or paths are denied', () => {
  const workspace = mkdtempSync(path.join(os.tmpdir(), 'agy-hook-'));
  try {
    for (const relative of ['.env.local', 'config/.env.production', '.git/config', 'src/.git/config', 'requirements/REQ-1.md', 'vendor/requirements/REQ-1.md', 'server.key']) {
      const result = evaluatePreToolUse({
        toolCall: { name: 'write_to_file', args: { TargetFile: path.join(workspace, relative) } },
        workspacePaths: [workspace],
      });
      assert.equal(result.decision, 'deny', relative);
    }
  } finally { rmSync(workspace, { recursive: true, force: true }); }
});

test('native writes outside the active workspace are denied', () => {
  const workspace = mkdtempSync(path.join(os.tmpdir(), 'agy-hook-workspace-'));
  const outside = mkdtempSync(path.join(os.tmpdir(), 'agy-hook-outside-'));
  try {
    const result = evaluatePreToolUse({ toolCall: { name: 'write_to_file', args: { TargetFile: path.join(outside, 'file.txt') } }, workspacePaths: [workspace] });
    assert.equal(result.decision, 'deny');
  } finally { rmSync(workspace, { recursive: true, force: true }); rmSync(outside, { recursive: true, force: true }); }
});

test('native path traversal and UNC targets are denied', () => {
  const workspace = mkdtempSync(path.join(os.tmpdir(), 'agy-hook-workspace-'));
  try {
    assert.equal(evaluatePreToolUse({ toolCall: { name: 'write_to_file', args: { TargetFile: '..\\outside.txt' } }, workspacePaths: [workspace] }).decision, 'deny');
    assert.equal(evaluatePreToolUse({ toolCall: { name: 'write_to_file', args: { TargetFile: '\\\\server\\share\\file.txt' } }, workspacePaths: [workspace] }).decision, 'deny');
  } finally { rmSync(workspace, { recursive: true, force: true }); }
});

test('native writes through symlink escapes are denied', () => {
  const workspace = mkdtempSync(path.join(os.tmpdir(), 'agy-hook-workspace-'));
  const outside = mkdtempSync(path.join(os.tmpdir(), 'agy-hook-outside-'));
  try {
    symlinkSync(outside, path.join(workspace, 'escape'), 'junction');
    const result = evaluatePreToolUse({ toolCall: { name: 'write_to_file', args: { TargetFile: path.join(workspace, 'escape', 'file.txt') } }, workspacePaths: [workspace] });
    assert.equal(result.decision, 'deny');
  } finally { rmSync(workspace, { recursive: true, force: true }); rmSync(outside, { recursive: true, force: true }); }
});

test('malformed or unscoped mutating calls fail closed', () => {
  assert.equal(evaluatePreToolUse({ toolCall: { name: 'write_to_file', args: { TargetFile: 'src/a.js' } } }).decision, 'deny');
  assert.equal(evaluatePreToolUse({}).decision, 'deny');
});

test('hook parser accepts Antigravity payloads with UTF-8 BOM and trailing framing whitespace', () => {
  const parsed = parsePreToolInput('\uFEFF {"toolCall":{"name":"view_file","args":{}},"workspacePaths":[]}\n');
  assert.equal(parsed?.toolCall?.name, 'view_file');
  assert.deepEqual(evaluatePreToolUse(parsed), { decision: 'allow' });
});

test('hook parser accepts a single valid JSON payload embedded in line framing', () => {
  const parsed = parsePreToolInput('hook-start\n{"toolCall":{"name":"view_file","args":{}},"workspacePaths":[]}\nhook-end');
  assert.equal(parsed?.toolCall?.name, 'view_file');
  assert.deepEqual(evaluatePreToolUse(parsed), { decision: 'allow' });
});

test('hook parser normalizes equivalent camelCase tool envelopes without weakening fail-closed behavior', () => {
  const parsed = parsePreToolInput(JSON.stringify({ toolName: 'view_file', arguments: {}, workspace_paths: [] }));
  assert.equal(parsed?.toolCall?.name, 'view_file');
  assert.deepEqual(evaluatePreToolUse(parsed), { decision: 'allow' });
  assert.equal(parsePreToolInput('not-json'), null);
});

test('read-only tools are allowed through to normal Antigravity permissions', () => {
  assert.deepEqual(evaluatePreToolUse({ toolCall: { name: 'view_file', args: {} } }), { decision: 'allow' });
  assert.deepEqual(evaluatePreToolUse({ toolCall: { name: 'read_file', args: { path: 'README.md' } } }), { decision: 'allow' });
  assert.deepEqual(evaluatePreToolUse({ toolCall: { name: 'read_text_file', args: { path: 'README.md' } } }), { decision: 'allow' });
});
