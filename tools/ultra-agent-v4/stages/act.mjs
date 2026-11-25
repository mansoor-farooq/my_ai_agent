#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const ALWAYS_FORBIDDEN = ['.env*', '**/.env*', '.git/**', '**/.git/**', 'requirements/**', '**/requirements/**', '**/*.pem', '**/*.key', '**/*.p12', '**/*.pfx', '**/id_rsa', '**/id_ed25519'];

function normalized(value) {
  return String(value || '').replaceAll('\\', '/').replace(/^\.\//, '');
}

function list(value) {
  if (Array.isArray(value)) return value.map(normalized).filter(Boolean);
  if (typeof value === 'string' && value.trim()) return [normalized(value)];
  return [];
}

function globRegex(pattern) {
  const escaped = normalized(pattern)
    .replace(/[|\\{}()[\]^$+?.]/g, '\\$&')
    .replaceAll('**', '__DOUBLE_STAR__')
    .replaceAll('*', '[^/]*')
    .replaceAll('__DOUBLE_STAR__', '.*');
  return new RegExp(`^${escaped}$`, 'i');
}

function matches(relativePath, patterns) {
  return patterns.some((pattern) => {
    try { return globRegex(pattern).test(relativePath); } catch { return false; }
  });
}

export function normalizeRelativePath(value) {
  const raw = normalized(value);
  const absolute = path.win32.isAbsolute(String(value || '')) || path.posix.isAbsolute(raw) || /^[A-Za-z]:\//.test(raw) || raw.startsWith('//');
  if (!raw || absolute || raw.includes('\0') || raw.split('/').includes('..')) return { ok: false, path: raw, code: 'unsafe-relative-path' };
  return { ok: true, path: raw, code: 'normalized' };
}

function isInsideRoot(root, candidate) {
  const resolvedRoot = path.resolve(root);
  const resolvedCandidate = path.resolve(candidate);
  return resolvedCandidate === resolvedRoot || resolvedCandidate.startsWith(`${resolvedRoot}${path.sep}`);
}

function safeProjectPath(root, relativePath, fileSystem = fs) {
  const projectRoot = path.resolve(root);
  const absolute = path.resolve(projectRoot, relativePath);
  if (!isInsideRoot(projectRoot, absolute)) return { safe: false, code: 'outside-project-root' };
  let current = projectRoot;
  for (const segment of path.relative(projectRoot, absolute).split(path.sep).filter(Boolean)) {
    current = path.join(current, segment);
    try {
      if (fileSystem.existsSync(current) && fileSystem.lstatSync(current).isSymbolicLink()) return { safe: false, code: 'symlink-escape' };
    } catch {
      return { safe: false, code: 'path-inspection-failed' };
    }
  }
  try {
    const rootReal = fileSystem.realpathSync(projectRoot);
    const existing = fileSystem.existsSync(absolute);
    let candidateReal;
    if (existing) candidateReal = fileSystem.realpathSync(absolute);
    else {
      let ancestor = path.dirname(absolute);
      while (ancestor !== projectRoot && !fileSystem.existsSync(ancestor)) ancestor = path.dirname(ancestor);
      candidateReal = fileSystem.realpathSync(ancestor);
    }
    const safe = candidateReal === rootReal || candidateReal.startsWith(`${rootReal}${path.sep}`);
    return { safe, code: safe ? 'safe-project-path' : 'symlink-escape' };
  } catch {
    return { safe: false, code: 'path-inspection-failed' };
  }
}

export function guardWritePath(task = {}, requestedPath, options = {}) {
  const normalizedPath = normalizeRelativePath(requestedPath);
  if (!normalizedPath.ok) return { allowed: false, path: normalizedPath.path, code: normalizedPath.code };
  const relativePath = normalizedPath.path;
  const forbiddenPaths = [...ALWAYS_FORBIDDEN, ...list(task.forbiddenPaths ?? task.forbidden_paths)];
  if (matches(relativePath, forbiddenPaths)) return { allowed: false, path: relativePath, code: 'protected-path' };
  const scope = list(task.scope);
  if (!matches(relativePath, scope)) return { allowed: false, path: relativePath, code: 'outside-write-scope' };
  const rootCheck = safeProjectPath(task.projectDir || task.project_dir || options.projectDir || process.cwd(), relativePath, options.fileSystem || fs);
  if (!rootCheck.safe) return { allowed: false, path: relativePath, code: rootCheck.code };
  return { allowed: true, path: relativePath, code: 'approved-write-path' };
}

export function actStage(task = {}, plan = {}, actions = [], options = {}) {
  const normalizedActions = Array.isArray(actions) ? actions : [];
  const violations = [];
  const allowedActions = [];
  for (const action of normalizedActions) {
    const type = String(action?.type || 'write').toLowerCase();
    if (type !== 'write') {
      violations.push({ path: String(action?.path || ''), code: 'unsupported-action-type', action: { ...action, type } });
      continue;
    }
    const result = guardWritePath(task, action?.path, options);
    if (!result.allowed) violations.push({ ...result, action });
    else allowedActions.push({ ...action, type, path: result.path });
  }
  if (violations.length) {
    return {
      schema: 'mansoor.core-loop-act/v1',
      status: 'blocked',
      scopeViolation: true,
      violations,
      allowedActions: [],
      changes: [],
      planApproved: plan.approved === true,
    };
  }
  return {
    schema: 'mansoor.core-loop-act/v1',
    status: 'validated',
    scopeViolation: false,
    violations: [],
    allowedActions,
    changes: allowedActions.filter((action) => action.type === 'write').map((action) => action.path),
    planApproved: plan.approved === true,
  };
}

