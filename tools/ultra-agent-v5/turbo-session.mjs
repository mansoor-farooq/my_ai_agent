#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

export const TURBO_SESSION_SCHEMA = 'mansoor.turbo-session/v1';
export const DEFAULT_TURBO_FORBIDDEN_PATHS = Object.freeze(['.env*', '.git/**', '.ssh/**']);

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stable(value[key])]));
  return value;
}

function hash(value) {
  return `sha256:${crypto.createHash('sha256').update(JSON.stringify(stable(value)), 'utf8').digest('hex')}`;
}

function safeId(value, label) {
  const result = String(value || '');
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]{0,120}$/.test(result)) throw new Error(`${label} must be a safe identifier`);
  return result;
}

function list(value, label) {
  if (!Array.isArray(value) || !value.length || value.some((item) => !String(item || '').trim())) throw new Error(`${label} is required`);
  return [...new Set(value.map((item) => String(item).trim().replaceAll('\\', '/').replace(/^\.\//, '')))];
}

function normalizeProject(projectDir) {
  const resolved = path.resolve(String(projectDir || ''));
  if (!fs.existsSync(resolved) || !fs.statSync(resolved).isDirectory()) throw new Error('turbo project directory is required');
  return resolved;
}

function validateRelativePatterns(patterns, label) {
  for (const pattern of patterns) {
    if (!pattern || path.isAbsolute(pattern) || pattern.startsWith('../') || pattern.includes('/../')) throw new Error(`${label} must contain project-relative patterns`);
  }
  return patterns;
}

function atomicWrite(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const temporary = `${file}.tmp-${process.pid}-${Date.now()}`;
  fs.writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
  fs.renameSync(temporary, file);
  try { if (process.platform !== 'win32') fs.chmodSync(file, 0o600); } catch {}
}

function patternMatches(pattern, value) {
  const escaped = String(pattern).replace(/[.+^${}()|[\]\\]/g, '\\$&').replaceAll('**', '§GLOBSTAR§').replaceAll('*', '[^/]*').replaceAll('§GLOBSTAR§', '.*');
  return new RegExp(`^${escaped}$`, 'i').test(String(value).replaceAll('\\', '/').replace(/^\.\//, ''));
}

function scopeAllowed(requested, allowed) {
  return allowed.some((pattern) => pattern === '**' || pattern === requested || patternMatches(pattern, requested) || (pattern.endsWith('/**') && requested.startsWith(pattern.slice(0, -3))));
}

function readSession(file) {
  if (!fs.existsSync(file)) return null;
  let session;
  try { session = JSON.parse(fs.readFileSync(file, 'utf8')); } catch { throw new Error('turbo-session-invalid-json'); }
  if (!session || session.schema !== TURBO_SESSION_SCHEMA || !session.sessionId || !session.sessionHash) throw new Error('turbo-session-invalid');
  if (session.revokedAt) throw new Error('turbo-session-revoked');
  if (Date.parse(session.expiresAt) <= Date.now()) throw new Error('turbo-session-expired');
  const { sessionHash, ...unsigned } = session;
  if (hash(unsigned) !== sessionHash) throw new Error('turbo-session-integrity-failed');
  return session;
}

export function createTurboSession({ file, projectDir, projectId, scopes, forbiddenPaths = DEFAULT_TURBO_FORBIDDEN_PATHS, ttlHours = 12, actor = 'owner' } = {}) {
  if (!file) throw new Error('turbo-session-file is required');
  const project = normalizeProject(projectDir);
  const safeProjectId = safeId(projectId, 'projectId');
  const allowedScopes = validateRelativePatterns(list(scopes, 'turbo scope'), 'turbo scope');
  const forbidden = validateRelativePatterns([...new Set([...DEFAULT_TURBO_FORBIDDEN_PATHS, ...(Array.isArray(forbiddenPaths) ? forbiddenPaths : [])])], 'forbidden paths');
  const hours = Number(ttlHours);
  if (!Number.isFinite(hours) || hours <= 0 || hours > 168) throw new Error('turbo session ttl must be between 1 and 168 hours');
  const createdAt = new Date().toISOString();
  const expiresAt = new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
  const session = {
    schema: TURBO_SESSION_SCHEMA,
    sessionId: `TURBO-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`,
    projectDir: project,
    projectId: safeProjectId,
    scopes: allowedScopes,
    forbiddenPaths: forbidden,
    capabilities: ['workspace-read-write', 'run-approved-checks', 'wsl-or-windows-fallback', 'browser-and-lighthouse-when-requested'],
    freshApprovalRequiredFor: ['delete', 'destructive', 'git-push', 'deploy', 'publish', 'secrets', 'external-communication', 'system-paths'],
    noRepeatedPrompt: true,
    actor: String(actor || 'owner'),
    createdAt,
    expiresAt,
  };
  atomicWrite(file, { ...session, sessionHash: hash(session) });
  return { ...session, sessionHash: hash(session) };
}

export function getTurboSession({ file } = {}) {
  if (!file) throw new Error('turbo-session-file is required');
  return readSession(file);
}

export function revokeTurboSession({ file, actor = 'owner' } = {}) {
  const session = readSession(file);
  const revoked = { ...session, revokedAt: new Date().toISOString(), revokedBy: String(actor || 'owner') };
  const { sessionHash, ...unsigned } = revoked;
  atomicWrite(file, { ...unsigned, sessionHash: hash(unsigned) });
  return { ...unsigned, sessionHash: hash(unsigned) };
}

export function authorizeTurboRun({ file, sessionId, projectDir, projectId, scope } = {}) {
  const session = readSession(file);
  if (String(sessionId || '') !== session.sessionId) throw new Error('turbo-session-id-mismatch');
  if (normalizeProject(projectDir) !== session.projectDir) throw new Error('turbo-project-mismatch');
  if (String(projectId || '') !== session.projectId) throw new Error('turbo-project-id-mismatch');
  const requested = list(scope, 'run scope');
  if (requested.some((item) => !scopeAllowed(item, session.scopes))) throw new Error('turbo-run-scope-outside-session');
  return {
    schema: 'mansoor.turbo-authorization/v1',
    sessionId: session.sessionId,
    sessionHash: session.sessionHash,
    projectId: session.projectId,
    projectDir: session.projectDir,
    scope: requested,
    approvalMode: 'manager-turbo-autonomous',
    noRepeatedPrompt: true,
    freshApprovalRequiredFor: session.freshApprovalRequiredFor,
    authorizedAt: new Date().toISOString(),
  };
}
