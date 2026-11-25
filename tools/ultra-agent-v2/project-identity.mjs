import crypto from 'node:crypto';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

function slugify(value, fallback = 'project') {
  return String(value || '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 48) || fallback;
}

function sanitizeGitUrl(raw) {
  if (!raw) return null;
  try {
    const url = new URL(String(raw).replace(/^git@([^:]+):/, 'ssh://git@$1/'));
    url.username = url.username === 'git' ? 'git' : '';
    url.password = '';
    return url.toString().replace(/\/$/, '');
  } catch {
    return String(raw).replace(/:\/\/[^@]+@/, '://');
  }
}

function git(dir, args) {
  const result = spawnSync('git', args, { cwd: dir, encoding: 'utf8', windowsHide: true });
  return result.status === 0 ? result.stdout.trim() : '';
}

function projectIdentity({ dir = process.cwd(), project = path.basename(dir), gitUrl = undefined } = {}) {
  const directory = path.resolve(dir);
  const slug = slugify(project);
  const sanitizedGitUrl = sanitizeGitUrl(gitUrl === undefined ? git(directory, ['config', '--get', 'remote.origin.url']) : gitUrl);
  const projectId = crypto.createHash('sha256')
    .update(`${(sanitizedGitUrl || `local:${directory}`).toLowerCase()}|${slug}`)
    .digest('hex').slice(0, 8);
  return {
    name: project,
    slug,
    projectId,
    directory,
    gitUrl: sanitizedGitUrl,
    branch: git(directory, ['branch', '--show-current']) || null,
    commit: git(directory, ['rev-parse', '--short', 'HEAD']) || null,
  };
}

export { projectIdentity, sanitizeGitUrl, slugify };
