#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import { mkdir, readdir, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { projectIdentity } from './project-identity.mjs';

const CONTRACT_FOLDERS = ['plan', 'flow', 'status', 'logic', 'requirements', 'test-cases'];
const PROTECTED_PATTERNS = ['.env*', '.git/**', 'requirements/**', '**/*.pem', '**/*.key'];
const SAFE_ID = /^[A-Za-z][A-Za-z0-9._-]{0,95}$/;

function normalized(value) {
  return String(value || '').replaceAll('\\', '/').replace(/^\.\//, '');
}

function isSafeRelativePath(value) {
  const relative = normalized(value);
  return Boolean(relative) && !relative.startsWith('/') && !/^[A-Za-z]:\//.test(relative)
    && !relative.split('/').includes('..') && !relative.includes('\0');
}

function globRegex(pattern) {
  const escaped = normalized(pattern)
    .replace(/[|\\{}()[\]^$+?.]/g, '\\$&')
    .replaceAll('**', '__DOUBLE_STAR__')
    .replaceAll('*', '[^/]*')
    .replaceAll('__DOUBLE_STAR__', '.*');
  return new RegExp(`^${escaped}$`, 'i');
}

function matches(relativePath, patterns = []) {
  return patterns.some((pattern) => globRegex(pattern).test(relativePath));
}

function safeProjectPath(dir, relativePath) {
  const projectDir = path.resolve(dir);
  const absolute = path.resolve(projectDir, relativePath);
  if (!(absolute === projectDir || absolute.startsWith(`${projectDir}${path.sep}`))) return false;
  let current = projectDir;
  for (const segment of path.relative(projectDir, absolute).split(path.sep).filter(Boolean)) {
    current = path.join(current, segment);
    if (!fs.existsSync(current)) break;
    try { if (fs.lstatSync(current).isSymbolicLink()) return false; } catch { return false; }
  }
  try {
    const rootReal = fs.realpathSync(projectDir);
    const candidateReal = fs.existsSync(absolute) ? fs.realpathSync(absolute) : absolute;
    return candidateReal === rootReal || candidateReal.startsWith(`${rootReal}${path.sep}`);
  } catch { return false; }
}

function artifactHash(body) {
  return `sha256:${crypto.createHash('sha256').update(String(body).replace(/\r\n/g, '\n')).digest('hex')}`;
}

function yamlScalar(value) {
  const trimmed = String(value || '').trim();
  if (trimmed === 'null') return null;
  if (/^\d+$/.test(trimmed)) return Number(trimmed);
  return trimmed.replace(/^['"]|['"]$/g, '');
}

function parseFrontMatter(text) {
  const match = String(text).match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/);
  if (!match) return null;
  return Object.fromEntries(match[1].split(/\r?\n/).filter(Boolean).map((line) => {
    const index = line.indexOf(':');
    return index < 0 ? [line.trim(), ''] : [line.slice(0, index).trim(), yamlScalar(line.slice(index + 1))];
  }));
}

function identity({ dir, project, gitUrl } = {}) {
  return projectIdentity({ dir, project: project || path.basename(path.resolve(dir)), gitUrl });
}

async function auditContract({ dir = process.cwd(), project, gitUrl } = {}) {
  const projectDir = path.resolve(dir);
  if (!fs.existsSync(projectDir) || !fs.statSync(projectDir).isDirectory()) throw new Error(`Project directory does not exist: ${projectDir}`);
  const entries = await readdir(projectDir, { withFileTypes: true });
  const existing = entries.filter((entry) => entry.isDirectory() && CONTRACT_FOLDERS.includes(entry.name)).map((entry) => entry.name);
  const missing = CONTRACT_FOLDERS.filter((folder) => !existing.includes(folder));
  return {
    ok: missing.length === 0,
    project: identity({ dir: projectDir, project, gitUrl }),
    requiredFolders: [...CONTRACT_FOLDERS],
    existing: CONTRACT_FOLDERS.filter((folder) => existing.includes(folder)),
    missing,
    bootstrapRequired: missing.length > 0,
    proposal: missing.length ? `Owner approval required to create: ${missing.join(', ')}` : null,
  };
}

async function bootstrapContract({ dir = process.cwd(), project, gitUrl, approved = false, approvalId = '' } = {}) {
  const audit = await auditContract({ dir, project, gitUrl });
  if (!approved) return { ...audit, approved: false, created: [], requiresApproval: true };
  if (!approvalId || !SAFE_ID.test(approvalId)) throw new Error('approved bootstrap requires a safe approvalId');
  const created = [];
  for (const folder of audit.missing) {
    await mkdir(path.join(audit.project.directory, folder), { recursive: false });
    created.push(folder);
  }
  return { ...await auditContract({ dir, project, gitUrl }), approved: true, approvalId, created };
}

async function createRequirement({ dir = process.cwd(), project, id, version = 1, body, owner, approvalId, supersedes = null, sourceRefs = [] } = {}) {
  if (!SAFE_ID.test(String(id || ''))) throw new Error('requirement id must be a safe identifier');
  if (!Number.isInteger(version) || version < 1) throw new Error('requirement version must be a positive integer');
  if (!body || !owner || !approvalId) throw new Error('requirement body, owner and approvalId are required');
  if (version > 1 && !supersedes) throw new Error('superseding requirement must reference the previous artifact');
  const projectInfo = identity({ dir, project });
  const requirementDir = path.join(projectInfo.directory, 'requirements');
  if (!fs.existsSync(requirementDir)) throw new Error('requirements folder is missing; run approved bootstrap first');
  const file = path.join(requirementDir, `${id}-v${String(version).padStart(3, '0')}.md`);
  if (fs.existsSync(file)) throw new Error('accepted requirements are append-only; create a new version instead');
  if (supersedes) {
    const previous = path.resolve(projectInfo.directory, supersedes);
    if (!safeProjectPath(projectInfo.directory, supersedes) || !previous.startsWith(`${requirementDir}${path.sep}`) || !fs.existsSync(previous)) {
      throw new Error('supersedes must reference an existing requirements artifact');
    }
  }
  const createdAt = new Date().toISOString();
  const contentHash = artifactHash(body);
  const frontMatter = [
    '---', `id: ${id}`, 'kind: requirement', `version: ${version}`, 'status: accepted',
    `project_id: ${projectInfo.projectId}`, `owner: ${owner}`, `created_at: ${createdAt}`,
    `supersedes: ${supersedes || 'null'}`, `source_refs: ${sourceRefs.length ? sourceRefs.join(', ') : '[]'}`,
    `content_hash: ${contentHash}`, `approval_id: ${approvalId}`, '---', '',
  ].join('\n');
  await writeFile(file, `${frontMatter}${String(body).trim()}\n`, { encoding: 'utf8', flag: 'wx' });
  return { ok: true, id, version, file, project: projectInfo, contentHash, approvalId };
}

function validateDelegationEnvelope(envelope = {}) {
  const required = ['projectId', 'contractVersion', 'taskId', 'role', 'objective', 'readAllowlist', 'writeAllowlist', 'forbiddenPaths', 'requiredEvidence', 'approvalId'];
  const missing = required.filter((key) => envelope[key] === undefined || envelope[key] === null || (typeof envelope[key] === 'string' && !envelope[key].trim()));
  const arrays = ['readAllowlist', 'writeAllowlist', 'forbiddenPaths', 'requiredEvidence'];
  const invalidArrays = arrays.filter((key) => !Array.isArray(envelope[key]) || envelope[key].some((value) => typeof value !== 'string' || !value.trim()));
  const safeTask = SAFE_ID.test(String(envelope.taskId || ''));
  return { ok: missing.length === 0 && invalidArrays.length === 0 && safeTask, missing, invalidArrays, safeTask };
}

function validateWriteAllowlist({ dir = process.cwd(), relativePath, writeAllowlist = [], forbiddenPaths = [] } = {}) {
  const relative = normalized(relativePath);
  if (!isSafeRelativePath(relative)) return { allowed: false, code: 'unsafe-relative-path', path: relative };
  const allForbidden = [...PROTECTED_PATTERNS, ...forbiddenPaths];
  if (matches(relative, allForbidden)) return { allowed: false, code: 'protected-path', path: relative };
  if (!matches(relative, writeAllowlist) || !safeProjectPath(dir, relative)) return { allowed: false, code: 'outside-write-allowlist', path: relative };
  return { allowed: true, code: 'approved-write-path', path: relative };
}

export { CONTRACT_FOLDERS, auditContract, bootstrapContract, createRequirement, parseFrontMatter, validateDelegationEnvelope, validateWriteAllowlist };

if (process.argv[1] && path.basename(process.argv[1]) === 'contract.mjs') {
  const args = process.argv.slice(2);
  const command = args[0] || 'audit';
  const getArg = (name, fallback = '') => { const index = args.indexOf(name); return index >= 0 && args[index + 1] ? args[index + 1] : fallback; };
  const dir = getArg('--dir', process.cwd());
  const project = getArg('--project', path.basename(path.resolve(dir)));
  if (command === 'audit') console.log(JSON.stringify(await auditContract({ dir, project }), null, 2));
  else if (command === 'bootstrap') console.log(JSON.stringify(await bootstrapContract({ dir, project, approved: args.includes('--approved'), approvalId: getArg('--approval-id') }), null, 2));
  else throw new Error('Usage: node contract.mjs audit|bootstrap [--dir PATH] [--project NAME] [--approved --approval-id ID]');
}
