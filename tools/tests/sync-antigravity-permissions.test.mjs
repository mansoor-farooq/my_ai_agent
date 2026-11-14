import test from 'node:test';
import assert from 'node:assert/strict';
import { mergeCliSettings, mergeDesktopConfig, PROTECTED_DENY_RULES, SAFE_ALLOW_RULES } from '../ultra-agent-v5/sync-antigravity-permissions.mjs';

test('CLI permission merge preserves user settings and is idempotent', () => {
  const initial = { colorScheme: 'tokyo night', trustedWorkspaces: ['C:\\repo'], permissions: { allow: ['command(git)'], ask: ['command(*)'] } };
  const first = mergeCliSettings(initial);
  const second = mergeCliSettings(first);
  assert.equal(first.colorScheme, 'tokyo night');
  assert.deepEqual(second, first);
  for (const rule of SAFE_ALLOW_RULES) assert.ok(first.permissions.allow.includes(rule));
  for (const rule of PROTECTED_DENY_RULES) assert.ok(first.permissions.deny.includes(rule));
  assert.equal(first.agentMode, 'auto');
});

test('desktop permission merge adds deny precedence without deleting custom grants', () => {
  const initial = { userSettings: { artifactReviewMode: 'ARTIFACT_REVIEW_MODE_TURBO', globalPermissionGrants: { allow: ['mcp(custom/tool)'] } } };
  const next = mergeDesktopConfig(initial);
  assert.equal(next.userSettings.artifactReviewMode, 'ARTIFACT_REVIEW_MODE_TURBO');
  assert.ok(next.userSettings.globalPermissionGrants.allow.includes('mcp(custom/tool)'));
  assert.ok(next.userSettings.globalPermissionGrants.deny.includes('read_file(.env*)'));
  assert.equal(next.userSettings.mansoorPermissionPolicy.approvalScope, 'exact-project-session-manifest');
});

test('permission merge never adds a blanket command allow', () => {
  const result = mergeCliSettings({});
  assert.ok(!result.permissions.allow.includes('command(*)'));
});
