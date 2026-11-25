#!/usr/bin/env node
import crypto from 'node:crypto';
import { validateActionManifest } from './action-manifest.mjs';
import { isDestructiveAction, isDestructiveCommand } from './destructive-action.mjs';

export const APPROVAL_BROKER_SCHEMA = 'mansoor.approval-broker/v1';
export const POLICY_VERSION = 'mansoor.risk-policy/v1';
export const RISK_TIERS = Object.freeze({ AUTONOMOUS: 0, NOTIFY: 1, EXCEPTION: 2, OWNER: 3 });

const TIER_3_TERMS = [
  'production', 'deploy', 'publish', 'git-push', 'git_push', 'protected-branch', 'protected_branch',
  'secret', 'signing', 'credential', 'iam', 'billing', 'delete', 'destroy', 'drop', 'truncate', 'migration',
  'destructive', 'send-message', 'send_message', 'external-communication', 'external_communication',
];
const TIER_1_TERMS = ['draft-pr', 'draft_pr', 'pull-request', 'pull_request', 'test-deploy', 'test_deploy', 'metadata-refresh', 'metadata_refresh', 'notify'];
const TIER_2_TERMS = ['dependency', 'network', 'mcp', 'cross-project', 'cross_project', 'sensitive-data', 'sensitive_data', 'ambiguous'];
const KNOWN_TASK_TYPES = new Set([
  '', 'implementation', 'bug-fix', 'feature', 'refactor', 'ui', 'flutter', 'android', 'test', 'qa', 'lint', 'build',
  'draft-pr', 'draft_pr', 'pull-request', 'pull_request', 'test-deploy', 'test_deploy', 'metadata-refresh', 'metadata_refresh', 'notify',
  'dependency-update', 'dependency_update', 'network-call', 'network_call', 'mcp-tool', 'mcp_tool', 'research',
  'production-deploy', 'production_deploy', 'deploy', 'publish', 'git-push', 'git_push', 'secret-rotation', 'secret_rotation',
  'database-migration', 'database_migration', 'send-message', 'send_message', 'delete', 'destructive',
]);

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stable(value[key])]));
  return value;
}

function hash(value) {
  return `sha256:${crypto.createHash('sha256').update(JSON.stringify(stable(value)), 'utf8').digest('hex')}`;
}

function textOf(...values) {
  return values.filter((value) => value !== undefined && value !== null).map((value) => (typeof value === 'string' ? value : JSON.stringify(value))).join(' ').toLowerCase();
}

function hasTerm(text, terms) {
  const normalized = text.replace(/[^a-z0-9]+/gi, ' ').replace(/\s+/g, ' ').trim();
  return terms.find((term) => {
    const candidate = String(term).replace(/[^a-z0-9]+/gi, ' ').replace(/\s+/g, ' ').trim();
    return candidate && (` ${normalized} `).includes(` ${candidate} `);
  });
}

/**
 * Deterministic risk classification. The model never supplies the authority
 * tier: concrete task, plan and action facts are classified here instead.
 */
export function classifyRisk({ task = {}, plan = {}, actions = [], manifest = null, context = {} } = {}) {
  const taskType = String(task.taskType ?? manifest?.project?.taskType ?? '').trim().toLowerCase();
  const reasons = [];
  let riskTier = RISK_TIERS.AUTONOMOUS;

  const destructive = isDestructiveCommand(taskType)
    || (Array.isArray(actions) && actions.some(isDestructiveAction))
    || (Array.isArray(plan.steps) && plan.steps.some(isDestructiveCommand));
  if (destructive) {
    riskTier = RISK_TIERS.OWNER;
    reasons.push('delete or data-loss action requires fresh owner approval');
  } else {
    reasons.push('non-delete action covered by the approved project plan');
  }

  if (!String(task.objective ?? manifest?.project?.objective ?? '').trim()
    || !Array.isArray(task.scope ?? manifest?.project?.taskScope)
    || !(task.scope ?? manifest?.project?.taskScope).length
    || !Array.isArray(plan.affectedPaths ?? manifest?.plan?.affectedPaths)
    || !(plan.affectedPaths ?? manifest?.plan?.affectedPaths).length) {
    riskTier = RISK_TIERS.OWNER;
    reasons.push('missing objective, scope or affected paths cannot be authorized');
  }
  const decision = riskTier === RISK_TIERS.OWNER ? 'owner_approval' : 'auto_approve';
  return {
    schema: 'mansoor.policy-decision/v1', policyVersion: POLICY_VERSION,
    policyHash: hash({ policyVersion: POLICY_VERSION, riskTier, reasons }),
    riskTier, decision, requiresOwner: riskTier === RISK_TIERS.OWNER,
    managerCanApprove: riskTier !== RISK_TIERS.OWNER, reasons,
  };

}

function validateReceipt(authority, receipt, manifest) {
  if (!receipt || !authority || typeof authority.verify !== 'function') return { valid: false, reason: 'approval-receipt-missing' };
  return authority.verify(receipt, manifest);
}

export function createApprovalBroker({ policyVersion = POLICY_VERSION, allowlistedNetwork = [], autoApproveTier2 = false } = {}) {
  const networkAllowlist = new Set((Array.isArray(allowlistedNetwork) ? allowlistedNetwork : []).map((item) => String(item).trim().toLowerCase()).filter(Boolean));
  const effectiveVersion = String(policyVersion || POLICY_VERSION);

  function evaluate(input = {}) {
    const decision = classifyRisk(input);
    const declaredNetwork = Array.isArray(input.plan?.allowedNetwork) ? input.plan.allowedNetwork.map((item) => String(item).trim().toLowerCase()).filter(Boolean) : [];
    if (decision.riskTier === RISK_TIERS.EXCEPTION && autoApproveTier2 && declaredNetwork.every((host) => networkAllowlist.has(host))) {
      const reasons = [...decision.reasons, 'Tier 2 network is explicitly allowlisted by policy'];
      return { ...decision, policyVersion: effectiveVersion, policyHash: hash({ policyVersion: effectiveVersion, riskTier: decision.riskTier, reasons }), decision: 'auto_approve', requiresOwner: false, managerCanApprove: true, reasons };
    }
    return { ...decision, policyVersion: effectiveVersion, policyHash: hash({ policyVersion: effectiveVersion, riskTier: decision.riskTier, reasons: decision.reasons }) };
  }

  async function authorize(manifest, authority, input = {}) {
    const decision = evaluate({ ...input, manifest });
    if (!validateActionManifest(manifest)) return { status: 'blocked', reason: 'action-manifest-invalid', decision };
    if (decision.managerCanApprove && (decision.decision === 'auto_approve' || decision.decision === 'notify')) {
      const receipt = authority.issue(manifest, {
        approved: true,
        actor: 'mansoor-ai-team-manager',
        source: 'manager-policy-auto-approval',
        manifestHash: manifest.manifestHash,
        nonce: manifest.nonce,
      });
      return { status: 'approved', receipt, decision, approvalMode: decision.decision };
    }
    if (decision.requiresOwner && typeof input.ownerApprove === 'function') {
      const receipt = await input.ownerApprove(manifest, {
        approved: true,
        actor: 'owner',
        source: 'owner-review',
        manifestHash: manifest.manifestHash,
        nonce: manifest.nonce,
      });
      const verified = validateReceipt(authority, receipt, manifest);
      if (!verified.valid) return { status: 'blocked', reason: verified.reason || 'owner-approval-invalid', decision };
      return { status: 'approved', receipt, decision, approvalMode: 'owner' };
    }
    return { status: 'owner-approval-required', decision };
  }

  return Object.freeze({ evaluate, authorize });
}

export { hash as approvalPolicyHash };

