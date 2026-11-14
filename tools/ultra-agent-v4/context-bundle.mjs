import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildContextPacket } from '../ultra-agent-v3/context.mjs';

const HUB_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const POLICY_FILE = path.join(HUB_ROOT, 'shared', 'control-plane', 'default-engineering-policies.json');

function readPolicies() {
  try { return JSON.parse(fs.readFileSync(POLICY_FILE, 'utf8')).policies || []; } catch { return []; }
}

export function resolveDefaultPolicies({ projectType = '', detectedAuth = '', domain = '' } = {}) {
  const types = new Set([String(projectType).toLowerCase(), String(domain).toLowerCase(), String(detectedAuth).toLowerCase()]);
  return readPolicies().filter((policy) => policy.appliesTo.some((value) => types.has(String(value).toLowerCase())));
}

export async function buildContextEnvelope({ projectDir, task, mode = 'fast', projectContext, policies } = {}) {
  if (!projectDir || !task?.objective || !Array.isArray(task.scope) || !task.scope.length || !Array.isArray(task.acceptance) || !task.acceptance.length) throw new Error('projectDir, objective, scope and acceptance are required');
  const context = projectContext || await buildContextPacket({ dir: projectDir, project: task.projectId || path.basename(projectDir) });
  const selectedPolicies = policies || resolveDefaultPolicies({ projectType: task.projectType, detectedAuth: task.detectedAuth, domain: task.domain || task.objective });
  return {
    schema: 'mansoor.context-envelope/v1', projectId: String(task.projectId || context.project?.projectId || ''), taskId: String(task.taskId || ''),
    projectDir: path.resolve(projectDir), mode, objective: String(task.objective), scope: [...task.scope], acceptance: [...task.acceptance],
    forbiddenPaths: Array.isArray(task.forbiddenPaths) ? [...task.forbiddenPaths] : [], nonGoals: Array.isArray(task.nonGoals) ? [...task.nonGoals] : [],
    domain: String(task.domain || ''), policies: selectedPolicies, verifiedFacts: context.verifiedFacts || [], decisions: context.decisions || [],
    conflicts: context.conflicts || [], evidenceRefs: context.evidenceRefs || [], memorySource: 'project-identity-default',
  };
}

function globToRegex(pattern) {
  let source = String(pattern).replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*\*/g, '§§').replace(/\*/g, '[^/]*').replace(/§§/g, '.*');
  return new RegExp(`^${source}$`, 'i');
}

function pathAllowed(file, scopes = []) { return scopes.some((scope) => globToRegex(String(scope).replaceAll('\\', '/')).test(String(file).replaceAll('\\', '/'))); }

export function validateScopeContract({ task, envelope = {}, proposedChanges = {} } = {}) {
  const objective = `${task?.objective || ''} ${proposedChanges.objective || ''}`.toLowerCase();
  if (/(inventory|stock)/.test(String(envelope.domain || task?.domain || objective)) && /store[- ]based|seller storefront|marketplace/.test(objective)) return { allowed: false, status: 'blocked', reason: 'domain drift: inventory management cannot become store-based without owner approval' };
  if (Array.isArray(proposedChanges.extraFeatures) && proposedChanges.extraFeatures.length) return { allowed: false, status: 'blocked', reason: 'extra feature outside approved scope' };
  const scopes = task?.scope || envelope.scope || [];
  const outside = (proposedChanges.affectedPaths || []).filter((file) => !pathAllowed(file, scopes));
  if (outside.length) return { allowed: false, status: 'blocked', reason: `changed path outside approved scope: ${outside.join(', ')}`, outside };
  return { allowed: true, status: 'allowed', outside: [] };
}

export function validateAuthInvariant({ request = {}, session, policy = {} } = {}) {
  const auth = String(policy.auth || '').toLowerCase();
  if (!['jwt', 'session', 'oauth'].includes(auth)) return { allowed: true, status: 'not-applicable' };
  if (!session?.authenticated) return { allowed: false, status: 'blocked', reason: 'authentication required before protected API work' };
  const now = Date.parse(policy.now || new Date().toISOString());
  if (!session.expiresAt || Number.isNaN(Date.parse(session.expiresAt)) || Date.parse(session.expiresAt) <= now) return { allowed: false, status: 'blocked', reason: 'session expired' };
  if (request.userId && session.subject !== request.userId) return { allowed: false, status: 'blocked', reason: 'session subject does not match requested user' };
  if (request.tenantId && session.tenantId !== request.tenantId) return { allowed: false, status: 'blocked', reason: 'session tenant does not match requested tenant' };
  return { allowed: true, status: 'allowed' };
}
