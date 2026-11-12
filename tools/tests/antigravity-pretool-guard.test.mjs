import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtempSync, rmSync, symlinkSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { evaluatePreToolUse } from '../antigravity-pretool-guard.mjs';

test('native in-workspace file writes always require a fresh owner review', () => {
  const workspace = mkdtempSync(path.join(os.tmpdir(), 'agy-hook-'));
  try {
    const result = evaluatePreToolUse({
      toolCall: { name: 'write_to_file', args: { TargetFile: path.join(workspace, 'src', 'new.js') } },
      workspacePaths: [workspace],
    });
    assert.equal(result.decision, 'force_ask');
  } finally { rmSync(workspace, { recursive: true, force: true }); }
});

test('native shell commands always require fresh owner review', () => {
  const result = evaluatePreToolUse({ toolCall: { name: 'run_command', args: { CommandLine: 'echo safe' } } });
  assert.equal(result.decision, 'force_ask');
});

test('native writes to protected files or paths are denied', () => {
  const workspace = mkdtempSync(path.join(os.tmpdir(), 'agy-hook-'));
  try {
    for (const relative of ['.env.local', '.git/config', 'requirements/REQ-1.md', 'server.key']) {
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

test('read-only tools are allowed through to normal Antigravity permissions', () => {
  assert.deepEqual(evaluatePreToolUse({ toolCall: { name: 'view_file', args: {} } }), { decision: 'allow' });
});
