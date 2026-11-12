#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { guardWritePath } from './stages/act.mjs';

const SCHEMA = 'mansoor.task-workspace/v1';
const SAFE_ID = /^[A-Za-z0-9][A-Za-z0-9._-]{0,95}$/;

export class TaskWorkspaceError extends Error {
  constructor(code, message = code) {
    super(message);
    this.name = 'TaskWorkspaceError';
    this.code = code;
  }
}

function fail(code) { throw new TaskWorkspaceError(code); }
function digest(value) { return crypto.createHash('sha256').update(value).digest('hex'); }
function pathKey(value) { const resolved = path.resolve(value); return process.platform === 'win32' ? resolved.toLowerCase() : resolved; }
function samePath(left, right) { return pathKey(left) === pathKey(right); }
function inside(root, candidate) {
  const relative = path.relative(path.resolve(root), path.resolve(candidate));
  return relative === '' || (relative !== '..' && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative));
}
function safeIdentity({ projectId, taskId }) {
  const normalizedProject = String(projectId || '').trim();
  const normalizedTask = String(taskId || '').trim();
  if (!normalizedProject) fail('project-id-required');
  if (!SAFE_ID.test(normalizedTask)) fail('invalid-task-id');
  return { projectId: normalizedProject, taskId: normalizedTask };
}
function workspaceBase(root) {
  return path.resolve(root || path.join(os.homedir(), '.mansoor-agent-hub', 'workspaces'));
}
function taskKey(repoRoot, projectId, taskId) {
  return digest(`${pathKey(repoRoot)}\0${projectId}\0${taskId}`).slice(0, 32);
}
function workspacePaths(root, id) {
  const stateDir = path.resolve(root, id);
  const workspaceDir = path.join(stateDir, 'checkout');
  const manifestPath = path.join(stateDir, 'manifest.json');
  const patchPath = path.join(stateDir, 'review.patch');
  if (!inside(root, stateDir) || !inside(stateDir, workspaceDir) || !inside(stateDir, manifestPath) || !inside(stateDir, patchPath)) fail('workspace-path-invalid');
  return { stateDir, workspaceDir, manifestPath, patchPath };
}
function canonicalGitRoot(projectDir) {
  const input = path.resolve(String(projectDir || ''));
  if (!fs.existsSync(input) || !fs.statSync(input).isDirectory()) fail('project-directory-required');
  const realInput = fs.realpathSync(input);
  let top;
  let prefix;
  try { prefix = gitText(realInput, ['rev-parse', '--show-prefix']); }
  catch { fail('git-repository-required'); }
  if (prefix) fail('project-root-required');
  try { top = gitText(realInput, ['rev-parse', '--show-toplevel']); }
  catch { fail('git-repository-required'); }
  let repoRoot;
  try { repoRoot = fs.realpathSync(top); } catch { fail('git-root-unreadable'); }
  return repoRoot;
}
function git(cwd, args, { binary = false, timeout = 30000 } = {}) {
  const result = spawnSync('git', ['-C', cwd, ...args], {
    encoding: binary ? 'buffer' : 'utf8',
    windowsHide: true,
    shell: false,
    timeout,
    maxBuffer: 64 * 1024 * 1024,
  });
  if (result.error) {
    if (result.error.code === 'ENOENT') fail('git-not-available');
    if (result.error.code === 'ETIMEDOUT') fail('git-command-timeout');
    fail('git-command-failed');
  }
  if (result.status !== 0) fail('git-command-failed');
  return result.stdout;
}
function gitText(cwd, args, options) { return git(cwd, args, options).toString('utf8').trim(); }
function currentRevision(repoRoot) { return gitText(repoRoot, ['rev-parse', '--verify', 'HEAD^{commit}']); }
function workingTreeStatus(repoRoot) {
  return git(repoRoot, [
    'status', '--porcelain=v1', '--untracked-files=all', '--', '.',
    ':(exclude).agents/ultra-v3/**',
    ':(exclude).agents/ultra-v4/**',
  ]).toString('utf8').replace(/[\r\n]+$/, '');
}
function registeredWorktree(repoRoot, candidate) {
  if (!fs.existsSync(candidate)) return false;
  try {
    const candidateRoot = gitText(candidate, ['rev-parse', '--show-toplevel']);
    const commonRoot = gitText(repoRoot, ['rev-parse', '--git-common-dir']);
    const candidateCommon = gitText(candidate, ['rev-parse', '--git-common-dir']);
    const resolvedCommonRoot = path.resolve(repoRoot, commonRoot);
    const resolvedCandidateCommon = path.resolve(candidateRoot, candidateCommon);
    const sameCommon = pathKey(resolvedCommonRoot) === pathKey(resolvedCandidateCommon);
    const rows = gitText(repoRoot, ['worktree', 'list', '--porcelain']).split(/\r?\n/);
    const listed = rows.some((row) => row.startsWith('worktree ') && pathKey(row.slice(9)) === pathKey(candidateRoot));
    return sameCommon && listed;
  } catch { return false; }
}
function ensureSafeWorkspaceRoot(root, repoRoot) {
  if (inside(repoRoot, root)) fail('workspace-root-inside-project');
  fs.mkdirSync(root, { recursive: true });
  const realRoot = fs.realpathSync(root);
  if (inside(repoRoot, realRoot)) fail('workspace-root-inside-project');
  let cursor = path.parse(realRoot).root;
  for (const segment of path.relative(cursor, realRoot).split(path.sep).filter(Boolean)) {
    cursor = path.join(cursor, segment);
    try { if (fs.lstatSync(cursor).isSymbolicLink()) fail('workspace-root-symlink'); }
    catch (error) { if (error instanceof TaskWorkspaceError) throw error; fail('workspace-root-inspection-failed'); }
  }
  return realRoot;
}
function manifestHash(value) {
  const { contentHash, ...body } = value;
  return `sha256:${digest(JSON.stringify(body))}`;
}
function writeManifest(manifestPath, value) {
  const stored = { ...value };
  stored.contentHash = manifestHash(stored);
  const temporary = `${manifestPath}.${process.pid}.${crypto.randomBytes(5).toString('hex')}.tmp`;
  const fd = fs.openSync(temporary, 'wx', 0o600);
  try { fs.writeFileSync(fd, `${JSON.stringify(stored, null, 2)}\n`, 'utf8'); fs.fsyncSync(fd); }
  finally { fs.closeSync(fd); }
  try { fs.renameSync(temporary, manifestPath); }
  catch (error) { try { fs.unlinkSync(temporary); } catch {} throw error; }
  return stored;
}
function readManifest(manifestPath) {
  if (!fs.existsSync(manifestPath) || !fs.statSync(manifestPath).isFile()) fail('workspace-manifest-missing');
  let value;
  try { value = JSON.parse(fs.readFileSync(manifestPath, 'utf8')); } catch { fail('workspace-manifest-invalid'); }
  if (value?.schema !== SCHEMA || value.contentHash !== manifestHash(value)) fail('workspace-manifest-integrity-failed');
  if (!SAFE_ID.test(String(value.taskId || '')) || !String(value.projectId || '') || !/^[a-f0-9]{32}$/.test(String(value.workspaceId || ''))) fail('workspace-manifest-invalid');
  return value;
}
function manifestFor(workspaceInput) {
  const workspaceId = String(workspaceInput?.workspaceId || '');
  if (!/^[a-f0-9]{32}$/.test(workspaceId)) fail('workspace-id-invalid');
  const root = workspaceBase(workspaceInput?.workspaceRoot);
  const paths = workspacePaths(root, workspaceId);
  const manifest = readManifest(paths.manifestPath);
  if (manifest.workspaceId !== workspaceId || !samePath(manifest.workspaceDir, paths.workspaceDir)) fail('workspace-path-mismatch');
  for (const key of ['repoRoot', 'projectId', 'taskId', 'baseRevision', 'planHash']) {
    if (workspaceInput?.[key] !== undefined && String(workspaceInput[key]) !== String(manifest[key])) fail(`workspace-${key.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)}-mismatch`);
  }
  return { root, paths, manifest };
}
function ensureCurrentBase(manifest) {
  const revision = currentRevision(manifest.repoRoot);
  if (revision !== manifest.baseRevision) fail('workspace-base-mismatch');
  if (workingTreeStatus(manifest.repoRoot)) fail('project-working-tree-dirty');
  return revision;
}
function parsePorcelain(text) {
  return text.split(/\r?\n/).filter(Boolean).map((row) => ({ code: row.slice(0, 2), path: row.slice(3) }));
}
function validatePaths(manifest, paths) {
  const scope = Array.isArray(manifest.allowedPaths) ? manifest.allowedPaths : [];
  const forbiddenPaths = Array.isArray(manifest.forbiddenPaths) ? manifest.forbiddenPaths : [];
  if (!scope.length) fail('workspace-scope-missing');
  for (const relativePath of paths) {
    const decision = guardWritePath({ projectDir: manifest.workspaceDir, scope, forbiddenPaths }, relativePath);
    if (!decision.allowed) fail(`workspace-change-${decision.code}:${relativePath}`);
  }
}
function publicWorkspace(manifest, root, paths, status = manifest.status) {
  return {
    status,
    workspaceId: manifest.workspaceId,
    projectId: manifest.projectId,
    taskId: manifest.taskId,
    repoRoot: manifest.repoRoot,
    workspaceDir: manifest.workspaceDir,
    workspaceRoot: root,
    baseRevision: manifest.baseRevision,
    planHash: manifest.planHash,
    manifestPath: paths.manifestPath,
    patchPath: manifest.patchHash ? paths.patchPath : null,
    patchHash: manifest.patchHash || null,
    changedPaths: manifest.changedPaths || [],
  };
}

export function inspectTaskWorkspace({ projectDir, projectId, taskId, workspaceRoot } = {}) {
  try {
    const identity = safeIdentity({ projectId, taskId });
    const repoRoot = canonicalGitRoot(projectDir);
    const dirty = Boolean(workingTreeStatus(repoRoot));
    const baseRevision = currentRevision(repoRoot);
    const root = workspaceBase(workspaceRoot);
    const workspaceId = taskKey(repoRoot, identity.projectId, identity.taskId);
    const paths = workspacePaths(root, workspaceId);
    const exists = fs.existsSync(paths.workspaceDir) || fs.existsSync(paths.manifestPath);
    if (exists) {
      const manifest = readManifest(paths.manifestPath);
      if (!samePath(manifest.repoRoot, repoRoot) || manifest.projectId !== identity.projectId || manifest.taskId !== identity.taskId) fail('workspace-identity-mismatch');
      if (manifest.workspaceId !== workspaceId) fail('workspace-identity-mismatch');
      if (manifest.baseRevision !== baseRevision) fail('workspace-base-mismatch');
      if (!registeredWorktree(repoRoot, paths.workspaceDir) || !fs.existsSync(paths.workspaceDir)) fail('workspace-registration-mismatch');
    }
    return { ok: !dirty, reason: dirty ? 'project-working-tree-dirty' : null, dirty, repoRoot, baseRevision, workspaceId, workspaceDir: paths.workspaceDir, existing: exists };
  } catch (error) {
    return { ok: false, reason: error.code || 'workspace-inspection-failed', error };
  }
}

export function createOrResumeTaskWorkspace({ projectDir, projectId, taskId, planHash, allowedPaths, forbiddenPaths = [], workspaceRoot, expectedBaseRevision } = {}) {
  const identity = safeIdentity({ projectId, taskId });
  if (!String(planHash || '').trim()) fail('approved-plan-hash-required');
  if (!Array.isArray(allowedPaths) || !allowedPaths.length) fail('approved-scope-required');
  const inspected = inspectTaskWorkspace({ projectDir, ...identity, workspaceRoot });
  if (!inspected.ok) fail(inspected.reason);
  if (expectedBaseRevision && expectedBaseRevision !== inspected.baseRevision) fail('workspace-base-mismatch');
  const root = ensureSafeWorkspaceRoot(workspaceBase(workspaceRoot), inspected.repoRoot);
  const paths = workspacePaths(root, inspected.workspaceId);
  if (inspected.existing) {
    const manifest = readManifest(paths.manifestPath);
    if (!registeredWorktree(inspected.repoRoot, paths.workspaceDir)) fail('workspace-registration-mismatch');
    if (manifest.planHash !== planHash) fail('workspace-plan-mismatch');
    if (JSON.stringify(manifest.allowedPaths) !== JSON.stringify(allowedPaths) || JSON.stringify(manifest.forbiddenPaths) !== JSON.stringify(forbiddenPaths)) fail('workspace-scope-mismatch');
    if (['discarded', 'closed'].includes(manifest.status)) fail('workspace-not-resumable');
    return publicWorkspace(manifest, root, paths, 'resumed');
  }
  if (fs.existsSync(paths.stateDir)) fail('workspace-path-collision');
  fs.mkdirSync(paths.stateDir, { recursive: false });
  git(inspected.repoRoot, ['worktree', 'add', '--detach', paths.workspaceDir, inspected.baseRevision]);
  const manifest = writeManifest(paths.manifestPath, {
    schema: SCHEMA,
    workspaceId: inspected.workspaceId,
    projectId: identity.projectId,
    taskId: identity.taskId,
    repoRoot: inspected.repoRoot,
    workspaceDir: paths.workspaceDir,
    baseRevision: inspected.baseRevision,
    planHash,
    allowedPaths: [...new Set(allowedPaths.map(String))],
    forbiddenPaths: [...new Set(forbiddenPaths.map(String))],
    status: 'active',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    patchHash: null,
    changedPaths: [],
  });
  return publicWorkspace(manifest, root, paths, 'created');
}

export function prepareTaskWorkspaceReview(workspaceInput) {
  const { root, paths, manifest } = manifestFor(workspaceInput);
  ensureCurrentBase(manifest);
  if (!registeredWorktree(manifest.repoRoot, manifest.workspaceDir) || !fs.existsSync(manifest.workspaceDir)) fail('workspace-registration-mismatch');
  const initialStatus = workingTreeStatus(manifest.workspaceDir);
  const rows = parsePorcelain(initialStatus);
  if (!rows.length) {
    const next = writeManifest(paths.manifestPath, { ...manifest, status: 'nothing-to-promote', updatedAt: new Date().toISOString(), patchHash: null, changedPaths: [] });
    return publicWorkspace(next, root, paths, 'nothing-to-promote');
  }
  const untracked = rows.filter((row) => row.code === '??').map((row) => row.path);
  if (untracked.length) git(manifest.workspaceDir, ['add', '--intent-to-add', '--', ...untracked]);
  const changedPaths = parsePorcelain(workingTreeStatus(manifest.workspaceDir)).map((row) => row.path);
  validatePaths(manifest, changedPaths);
  const patch = git(manifest.workspaceDir, ['diff', '--binary', '--no-ext-diff', manifest.baseRevision, '--'], { binary: true });
  if (!patch.length) fail('workspace-patch-empty');
  const temporary = `${paths.patchPath}.${process.pid}.${crypto.randomBytes(5).toString('hex')}.tmp`;
  const fd = fs.openSync(temporary, 'wx', 0o600);
  try { fs.writeFileSync(fd, patch); fs.fsyncSync(fd); }
  finally { fs.closeSync(fd); }
  try { fs.renameSync(temporary, paths.patchPath); }
  catch (error) { try { fs.unlinkSync(temporary); } catch {} throw error; }
  const patchHash = `sha256:${digest(patch)}`;
  const next = writeManifest(paths.manifestPath, {
    ...manifest,
    status: 'review-required',
    updatedAt: new Date().toISOString(),
    patchHash,
    changedPaths: [...new Set(changedPaths)],
  });
  return publicWorkspace(next, root, paths, 'review-required');
}

export function readTaskWorkspacePatch(workspaceInput) {
  const { paths, manifest } = manifestFor(workspaceInput);
  if (manifest.status !== 'review-required' || !manifest.patchHash || !fs.existsSync(paths.patchPath)) fail('workspace-not-reviewable');
  ensureCurrentBase(manifest);
  const patch = fs.readFileSync(paths.patchPath);
  const patchHash = `sha256:${digest(patch)}`;
  if (patchHash !== manifest.patchHash) fail('promotion-patch-integrity-failed');
  return {
    workspaceId: manifest.workspaceId,
    taskId: manifest.taskId,
    projectId: manifest.projectId,
    baseRevision: manifest.baseRevision,
    changedPaths: [...(manifest.changedPaths || [])],
    patchHash,
    patchText: patch.toString('utf8'),
    patchBase64: patch.toString('base64'),
  };
}

export function promoteTaskWorkspace(workspaceInput, approval = {}) {
  if (approval.approved !== true || !String(approval.actor || '').trim()) fail('owner-promotion-approval-required');
  const { root, paths, manifest } = manifestFor(workspaceInput);
  if (manifest.status !== 'review-required' || !manifest.patchHash) fail('workspace-not-reviewable');
  if (String(approval.patchHash || '') !== manifest.patchHash || String(workspaceInput?.patchHash || '') !== manifest.patchHash) fail('promotion-patch-mismatch');
  ensureCurrentBase(manifest);
  validatePaths(manifest, manifest.changedPaths || []);
  if (!registeredWorktree(manifest.repoRoot, manifest.workspaceDir) || !fs.existsSync(manifest.workspaceDir)) fail('workspace-registration-mismatch');
  const currentWorkspacePaths = git(manifest.workspaceDir, ['diff', '--name-only', '-z', manifest.baseRevision, '--']).toString('utf8').split('\0').filter(Boolean).sort();
  const approvedWorkspacePaths = [...new Set(manifest.changedPaths || [])].sort();
  if (JSON.stringify(currentWorkspacePaths) !== JSON.stringify(approvedWorkspacePaths)) fail('workspace-changed-after-review');
  const patch = fs.readFileSync(paths.patchPath);
  if (`sha256:${digest(patch)}` !== manifest.patchHash) fail('promotion-patch-integrity-failed');
  const currentPatch = git(manifest.workspaceDir, ['diff', '--binary', '--no-ext-diff', manifest.baseRevision, '--'], { binary: true });
  if (`sha256:${digest(currentPatch)}` !== manifest.patchHash) fail('workspace-changed-after-review');
  git(manifest.repoRoot, ['apply', '--index', '--binary', '--check', paths.patchPath]);
  git(manifest.repoRoot, ['apply', '--index', '--binary', paths.patchPath]);
  const stagedPaths = git(manifest.repoRoot, ['diff', '--cached', '--name-only', '-z']).toString('utf8').split('\0').filter(Boolean);
  if (JSON.stringify([...new Set(stagedPaths)].sort()) !== JSON.stringify([...new Set(manifest.changedPaths)].sort())) fail('promotion-path-set-mismatch');
  const next = writeManifest(paths.manifestPath, {
    ...manifest,
    status: 'promoted',
    updatedAt: new Date().toISOString(),
    promotedAt: new Date().toISOString(),
    promotedBy: String(approval.actor),
  });
  return { ...publicWorkspace(next, root, paths, 'promoted'), stagedPaths, committed: false, pushed: false };
}

export function discardTaskWorkspace(workspaceInput, approval = {}) {
  if (approval.approved !== true || !String(approval.actor || '').trim()) fail('owner-discard-approval-required');
  const { root, paths, manifest } = manifestFor(workspaceInput);
  if (!registeredWorktree(manifest.repoRoot, manifest.workspaceDir)) fail('workspace-registration-mismatch');
  git(manifest.repoRoot, ['worktree', 'remove', '--force', manifest.workspaceDir]);
  git(manifest.repoRoot, ['worktree', 'prune']);
  const next = writeManifest(paths.manifestPath, {
    ...manifest,
    status: 'discarded',
    updatedAt: new Date().toISOString(),
    discardedAt: new Date().toISOString(),
    discardedBy: String(approval.actor),
  });
  return publicWorkspace(next, root, paths, 'discarded');
}
