import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, readdir, stat } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {
  CONTRACT_FOLDERS,
  auditContract,
  bootstrapContract,
  createRequirement,
  validateDelegationEnvelope,
  validateWriteAllowlist,
} from '../ultra-agent-v2/contract.mjs';

test('contract audit proposes six root folders without mutating an existing project', async () => {
  const fixture = await mkdtemp(path.join(os.tmpdir(), 'contract-audit-'));
  const before = await readdir(fixture);
  const report = await auditContract({ dir: fixture, project: 'Audit Fixture' });
  assert.deepEqual(report.requiredFolders, CONTRACT_FOLDERS);
  assert.deepEqual(report.missing, CONTRACT_FOLDERS);
  assert.deepEqual(await readdir(fixture), before);
  assert.equal(report.bootstrapRequired, true);
});

test('approved bootstrap creates only the six canonical contract folders', async () => {
  const fixture = await mkdtemp(path.join(os.tmpdir(), 'contract-bootstrap-'));
  const result = await bootstrapContract({ dir: fixture, project: 'Bootstrap Fixture', approved: true, approvalId: 'APP-001' });
  assert.equal(result.created.length, 6);
  assert.deepEqual(result.created, CONTRACT_FOLDERS);
  for (const folder of CONTRACT_FOLDERS) assert.equal((await stat(path.join(fixture, folder))).isDirectory(), true);
  assert.equal((await readdir(fixture)).length, 6);
});

test('accepted requirements are append-only and supersede through an owner approval', async () => {
  const fixture = await mkdtemp(path.join(os.tmpdir(), 'contract-requirement-'));
  await bootstrapContract({ dir: fixture, project: 'Requirement Fixture', approved: true, approvalId: 'APP-BOOT' });
  const first = await createRequirement({ dir: fixture, project: 'Requirement Fixture', id: 'REQ-0001', body: 'The service must preserve order totals.', owner: 'mansoor', approvalId: 'APP-REQ-1' });
  assert.equal(first.version, 1);
  await assert.rejects(() => createRequirement({ dir: fixture, project: 'Requirement Fixture', id: 'REQ-0001', body: 'Changed silently.', owner: 'mansoor', approvalId: 'APP-REQ-2' }), /append-only/i);
  const second = await createRequirement({ dir: fixture, project: 'Requirement Fixture', id: 'REQ-0001', version: 2, body: 'The service must preserve signed order totals.', owner: 'mansoor', approvalId: 'APP-REQ-3', supersedes: first.file });
  assert.equal(second.version, 2);
  assert.equal((await readFile(first.file, 'utf8')).includes('The service must preserve order totals.'), true);
  assert.match(await readFile(second.file, 'utf8'), /status: accepted/);
  assert.match(await readFile(second.file, 'utf8'), /supersedes:/);
});

test('write allowlists reject traversal, secrets, contract rewrites and undeclared paths', async () => {
  const fixture = await mkdtemp(path.join(os.tmpdir(), 'contract-policy-'));
  const envelope = validateDelegationEnvelope({
    projectId: 'prj-001',
    contractVersion: '1',
    taskId: 'TASK-001',
    role: 'implementation',
    objective: 'Implement the approved change',
    readAllowlist: ['src/**'],
    writeAllowlist: ['src/app.js', 'tests/**'],
    forbiddenPaths: ['.env*', '.git/**', 'requirements/**'],
    requiredEvidence: ['diff', 'test'],
    approvalId: 'APP-002',
  });
  assert.equal(envelope.ok, true);
  assert.equal(validateWriteAllowlist({ dir: fixture, relativePath: 'src/app.js', writeAllowlist: ['src/app.js'] }).allowed, true);
  assert.equal(validateWriteAllowlist({ dir: fixture, relativePath: '../escape.txt', writeAllowlist: ['**'] }).allowed, false);
  assert.equal(validateWriteAllowlist({ dir: fixture, relativePath: '.env', writeAllowlist: ['**'] }).allowed, false);
  assert.equal(validateWriteAllowlist({ dir: fixture, relativePath: 'requirements/REQ-0001-v001.md', writeAllowlist: ['requirements/**'] }).allowed, false);
  assert.equal(validateWriteAllowlist({ dir: fixture, relativePath: 'src/other.js', writeAllowlist: ['src/app.js'] }).allowed, false);
  assert.equal(validateDelegationEnvelope({ ...envelope, approvalId: '' }).ok, false);
});
