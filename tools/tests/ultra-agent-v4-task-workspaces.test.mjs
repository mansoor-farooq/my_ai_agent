import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import {
  createOrResumeTaskWorkspace,
  discardTaskWorkspace,
  inspectTaskWorkspace,
  promoteTaskWorkspace,
  prepareTaskWorkspaceReview,
} from '../ultra-agent-v4/task-workspaces.mjs';

function runGit(cwd, args) {
  const result = spawnSync('git', ['-C', cwd, ...args], { encoding: 'utf8', windowsHide: true });
  if (result.status !== 0) throw new Error(`git ${args.join(' ')} failed: ${result.stderr || result.stdout}`);
  return result.stdout.trim();
}

function fixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'mansoor-task-workspace-'));
  const projectDir = path.join(root, 'project');
  const workspaceRoot = path.join(root, 'local-workspaces');
  fs.mkdirSync(projectDir, { recursive: true });
  runGit(projectDir, ['init', '-q']);
  runGit(projectDir, ['config', 'user.name', 'Workspace Test']);
  runGit(projectDir, ['config', 'user.email', 'workspace-test@example.invalid']);
  runGit(projectDir, ['config', 'core.autocrlf', 'false']);
  fs.mkdirSync(path.join(projectDir, 'src'), { recursive: true });
  fs.writeFileSync(path.join(projectDir, 'src', 'base.txt'), 'base\n');
  runGit(projectDir, ['add', 'src/base.txt']);
  runGit(projectDir, ['commit', '-qm', 'base']);
  return { root, projectDir, workspaceRoot, planHash: 'sha256:approved-plan-v1' };
}

function cleanup(f) {
  try { fs.rmSync(f.root, { recursive: true, force: true }); } catch {}
}

function create(f, overrides = {}) {
  return createOrResumeTaskWorkspace({
    projectDir: f.projectDir,
    projectId: 'project-a',
    taskId: 'task-001',
    planHash: f.planHash,
    allowedPaths: ['src/**'],
    workspaceRoot: f.workspaceRoot,
    ...overrides,
  });
}

test('creates a pinned isolated worktree and leaves the primary checkout untouched', () => {
  const f = fixture();
  try {
    const before = runGit(f.projectDir, ['rev-parse', 'HEAD']);
    const workspace = create(f);
    assert.equal(workspace.status, 'created');
    assert.equal(workspace.baseRevision, before);
    assert.equal(runGit(workspace.repoRoot, ['rev-parse', '--show-toplevel']), runGit(f.projectDir, ['rev-parse', '--show-toplevel']));
    assert.notEqual(fs.realpathSync(workspace.workspaceDir), fs.realpathSync(f.projectDir));
    assert.equal(runGit(f.projectDir, ['status', '--porcelain']), '');
    assert.equal(runGit(workspace.workspaceDir, ['rev-parse', 'HEAD']), before);
  } finally { cleanup(f); }
});

test('refuses a dirty primary checkout without creating a worktree', () => {
  const f = fixture();
  try {
    fs.writeFileSync(path.join(f.projectDir, 'src', 'base.txt'), 'owner change\n');
    assert.throws(() => create(f), (error) => error.code === 'project-working-tree-dirty');
    assert.equal(fs.existsSync(f.workspaceRoot), false);
  } finally { cleanup(f); }
});

test('resumes only the same task, project, base revision and approved plan', () => {
  const f = fixture();
  try {
    const first = create(f);
    fs.writeFileSync(path.join(first.workspaceDir, 'src', 'work.txt'), 'preserved\n');
    const resumed = create(f);
    assert.equal(resumed.status, 'resumed');
    assert.equal(resumed.workspaceId, first.workspaceId);
    assert.equal(fs.readFileSync(path.join(resumed.workspaceDir, 'src', 'work.txt'), 'utf8'), 'preserved\n');
    assert.throws(() => create(f, { planHash: 'sha256:different-plan' }), (error) => error.code === 'workspace-plan-mismatch');
    assert.throws(() => create(f, { expectedBaseRevision: '0'.repeat(40) }), (error) => error.code === 'workspace-base-mismatch');
  } finally { cleanup(f); }
});

test('inspection reports the exact clean base revision before plan approval', () => {
  const f = fixture();
  try {
    const inspected = inspectTaskWorkspace({ projectDir: f.projectDir, projectId: 'project-a', taskId: 'task-001', workspaceRoot: f.workspaceRoot });
    assert.equal(inspected.ok, true, JSON.stringify({ reason: inspected.reason, error: inspected.error?.message }));
    assert.equal(inspected.dirty, false);
    assert.match(inspected.baseRevision, /^[a-f0-9]{40,64}$/i);
    assert.ok(inspected.workspaceId);
  } finally { cleanup(f); }
});

test('review patch includes tracked and untracked work without changing the base checkout', () => {
  const f = fixture();
  try {
    const workspace = create(f);
    fs.writeFileSync(path.join(workspace.workspaceDir, 'src', 'base.txt'), 'changed\n');
    fs.writeFileSync(path.join(workspace.workspaceDir, 'src', 'new.txt'), 'new file\n');
    const review = prepareTaskWorkspaceReview(workspace);
    assert.equal(review.status, 'review-required');
    assert.deepEqual(new Set(review.changedPaths), new Set(['src/base.txt', 'src/new.txt']));
    assert.match(fs.readFileSync(review.patchPath, 'utf8'), /new file/);
    assert.equal(runGit(f.projectDir, ['status', '--porcelain']), '');
  } finally { cleanup(f); }
});

test('promotion requires the exact owner-approved patch and leaves changes staged without committing', () => {
  const f = fixture();
  try {
    const workspace = create(f);
    fs.writeFileSync(path.join(workspace.workspaceDir, 'src', 'new.txt'), 'approved content\n');
    const review = prepareTaskWorkspaceReview(workspace);
    assert.throws(() => promoteTaskWorkspace(review, { approved: false, actor: 'owner', patchHash: review.patchHash }), (error) => error.code === 'owner-promotion-approval-required');
    assert.throws(() => promoteTaskWorkspace(review, { approved: true, actor: 'owner', patchHash: 'sha256:wrong' }), (error) => error.code === 'promotion-patch-mismatch');
    const promoted = promoteTaskWorkspace(review, { approved: true, actor: 'owner', patchHash: review.patchHash });
    assert.equal(promoted.status, 'promoted');
    assert.equal(fs.readFileSync(path.join(f.projectDir, 'src', 'new.txt'), 'utf8'), 'approved content\n');
    assert.deepEqual(runGit(f.projectDir, ['diff', '--cached', '--name-only']).split(/\r?\n/), ['src/new.txt']);
    assert.equal(runGit(f.projectDir, ['rev-parse', 'HEAD']), review.baseRevision);
  } finally { cleanup(f); }
});

test('promotion blocks if the primary checkout becomes dirty or advances', () => {
  const f = fixture();
  try {
    const workspace = create(f);
    fs.writeFileSync(path.join(workspace.workspaceDir, 'src', 'new.txt'), 'work\n');
    const review = prepareTaskWorkspaceReview(workspace);
    fs.writeFileSync(path.join(f.projectDir, 'owner.txt'), 'owner\n');
    assert.throws(() => promoteTaskWorkspace(review, { approved: true, actor: 'owner', patchHash: review.patchHash }), (error) => error.code === 'project-working-tree-dirty');
    assert.equal(fs.existsSync(path.join(f.projectDir, 'src', 'new.txt')), false);
  } finally { cleanup(f); }
});

test('promotion refuses a workspace changed after owner reviewed the patch', () => {
  const f = fixture();
  try {
    const workspace = create(f);
    fs.writeFileSync(path.join(workspace.workspaceDir, 'src', 'new.txt'), 'reviewed\n');
    const review = prepareTaskWorkspaceReview(workspace);
    fs.writeFileSync(path.join(workspace.workspaceDir, 'src', 'new.txt'), 'changed after review\n');
    assert.throws(() => promoteTaskWorkspace(review, { approved: true, actor: 'owner', patchHash: review.patchHash }), (error) => error.code === 'workspace-changed-after-review');
    assert.equal(fs.existsSync(path.join(f.projectDir, 'src', 'new.txt')), false);
    assert.equal(runGit(f.projectDir, ['diff', '--cached', '--name-only']), '');
  } finally { cleanup(f); }
});

test('review rejects check-runner side effects outside the approved path allowlist', () => {
  const f = fixture();
  try {
    const workspace = create(f);
    fs.writeFileSync(path.join(workspace.workspaceDir, 'other.txt'), 'unexpected\n');
    assert.throws(() => prepareTaskWorkspaceReview(workspace), (error) => error.code === 'workspace-change-outside-write-scope:other.txt');
    assert.equal(runGit(f.projectDir, ['status', '--porcelain']), '');
  } finally { cleanup(f); }
});

test('discard requires explicit owner approval and only removes the validated worktree', () => {
  const f = fixture();
  try {
    const workspace = create(f);
    fs.writeFileSync(path.join(workspace.workspaceDir, 'src', 'new.txt'), 'unwanted\n');
    assert.throws(() => discardTaskWorkspace(workspace, { approved: false, actor: 'owner' }), (error) => error.code === 'owner-discard-approval-required');
    const discarded = discardTaskWorkspace(workspace, { approved: true, actor: 'owner' });
    assert.equal(discarded.status, 'discarded');
    assert.equal(fs.existsSync(workspace.workspaceDir), false);
    assert.equal(runGit(f.projectDir, ['status', '--porcelain']), '');
  } finally { cleanup(f); }
});

test('rejects unsafe task identifiers before creating workspace paths', () => {
  const f = fixture();
  try {
    assert.throws(() => create(f, { taskId: '..\\escape' }), (error) => error.code === 'invalid-task-id');
    assert.equal(fs.existsSync(f.workspaceRoot), false);
  } finally { cleanup(f); }
});
