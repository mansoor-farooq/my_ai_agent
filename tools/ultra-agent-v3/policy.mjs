#!/usr/bin/env node
import path from 'node:path';

const externalActions = new Set(['git-push', 'publish', 'deploy', 'send-message', 'create-pr']);
const destructiveCommand = /(?:^|\s)(?:git\s+(?:reset\s+--hard|clean\s+-[a-z]*f|push\s+--force)|rm\s+-rf|remove-item\b[^\r\n]*-recurse|drop\s+(?:database|schema|table)|truncate\s+table)(?:\s|$)/i;

function evaluatePolicy({ role = '', action = '', command = '', approved = false } = {}) {
  const normalizedRole = String(role);
  const normalizedAction = String(action).toLowerCase();
  if (normalizedAction === 'invoke-subagent') {
    const allowed = normalizedRole === 'production-orchestrator';
    return { allowed, requiresApproval: false, code: allowed ? 'manager-delegation' : 'manager-only-delegation' };
  }
  if (externalActions.has(normalizedAction)) {
    return { allowed: Boolean(approved), requiresApproval: !approved, code: approved ? 'explicitly-approved-external-action' : 'external-action-approval-required' };
  }
  if (normalizedAction === 'run-command' && destructiveCommand.test(String(command))) {
    return { allowed: Boolean(approved), requiresApproval: !approved, code: approved ? 'explicitly-approved-destructive-command' : 'destructive-command-approval-required' };
  }
  if (['read-project', 'search-project', 'run-test', 'write-owned-path'].includes(normalizedAction)) {
    return { allowed: true, requiresApproval: false, code: 'project-local-action' };
  }
  return { allowed: false, requiresApproval: false, code: 'unknown-action' };
}

export { evaluatePolicy };

if (process.argv[1] && path.basename(process.argv[1]) === 'policy.mjs') {
  const args = process.argv.slice(2);
  const getArg = (name, fallback = '') => { const index = args.indexOf(name); return index >= 0 && args[index + 1] ? args[index + 1] : fallback; };
  console.log(JSON.stringify(evaluatePolicy({ role: getArg('--role'), action: getArg('--action'), command: getArg('--command'), approved: args.includes('--approved') }), null, 2));
}
