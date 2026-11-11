#!/usr/bin/env node
import crypto from 'node:crypto';

function digest(value) {
  const normalize = (input) => Array.isArray(input)
    ? input.map(normalize)
    : input && typeof input === 'object'
      ? Object.fromEntries(Object.keys(input).sort().map((key) => [key, normalize(input[key])]))
      : input;
  return crypto.createHash('sha256').update(JSON.stringify(normalize(value))).digest('hex');
}

function required(input, name) {
  if (!String(input?.[name] || '').trim()) throw new Error(`${name} is required for approval`);
  return String(input[name]);
}

export function createApprovalRequest(input = {}) {
  const projectId = required(input, 'projectId');
  const taskId = required(input, 'taskId');
  const action = required(input, 'action');
  const callId = required(input, 'callId');
  return {
    schemaVersion: 1,
    approvalId: `APP-${crypto.randomUUID()}`,
    projectId,
    taskId,
    action,
    callId,
    payloadHash: digest(input.payload ?? null),
    status: 'pending',
    createdAt: new Date().toISOString(),
    decidedAt: null,
    actor: null,
    reason: null,
  };
}

export function bindApproval(request, payload) {
  if (!request?.approvalId || request.status !== 'pending') return { valid: false, reason: 'approval-not-pending' };
  const payloadHash = digest(payload ?? null);
  return { valid: payloadHash === request.payloadHash, reason: payloadHash === request.payloadHash ? null : 'payload-mismatch' };
}

export function resolveApproval(request, { decision, actor, reason = null } = {}) {
  if (!request?.approvalId) throw new Error('approval request is required');
  if (request.status !== 'pending') throw new Error('approval is already terminal');
  if (!['approve', 'reject'].includes(decision)) throw new Error('decision must be approve or reject');
  if (!String(actor || '').trim()) throw new Error('approval actor is required');
  return { ...request, status: decision === 'approve' ? 'approved' : 'rejected', decidedAt: new Date().toISOString(), actor: String(actor), reason: reason ? String(reason) : null };
}

export function canResume(request, { projectId, callId, payload } = {}) {
  return Boolean(request?.status === 'approved'
    && request.projectId === projectId
    && request.callId === callId
    && digest(payload ?? null) === request.payloadHash);
}

