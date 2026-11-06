import fs from 'node:fs';
import path from 'node:path';
import { createRecoveryPlan } from '../ultra-agent-v4/recovery.mjs';

const passing = new Set(['pass', 'passed', 'success', 'verified', 'complete']);

function evaluateCompletion(input = {}) {
  const mode = String(input.mode || 'fast').toLowerCase();
  const risk = String(input.risk || 'low').toLowerCase();
  const records = Array.isArray(input.verificationRecords) ? input.verificationRecords : [];
  const commands = Array.isArray(input.commandResults) ? input.commandResults : [];
  const missingEvidence = [];
  const passedVerification = records.some((record) => passing.has(String(record.status || '').toLowerCase()) && String(record.kind || 'verification').toLowerCase() === 'verification');
  const passedResearch = (Array.isArray(input.researchRecords) ? input.researchRecords : []).some((record) => passing.has(String(record.status || '').toLowerCase()) && String(record.kind || 'research').toLowerCase() === 'research');
  const passedCommand = commands.some((result) => passing.has(String(result.status || '').toLowerCase()));
  const failedCommand = commands.find((result) => ['fail', 'failed', 'error'].includes(String(result.status || '').toLowerCase()));
  if (!passedVerification) missingEvidence.push('targeted-verification');
  if (!passedCommand) missingEvidence.push('targeted-verification-command');
  if (!Array.isArray(input.changedPaths) || !input.changedPaths.length) missingEvidence.push('changed-path-summary');
  if (mode === 'premium' || input.explicitResearch) {
    if (!passedResearch) missingEvidence.push('research-ledger');
  }
  if (mode === 'premium' && ['high', 'critical'].includes(risk)) {
    const independent = records.some((record) => String(record.kind || '').toLowerCase() === 'independent-check' && passing.has(String(record.status || '').toLowerCase()));
    if (!independent) missingEvidence.push('independent-check');
  }
  if (failedCommand) {
    const recoveryPlan = createRecoveryPlan({
      failureCode: failedCommand.failureCode || 'verification-failed',
      attempt: input.attempt || 1,
      maxAttempts: input.maxRecoveryAttempts || 2,
      previousSignature: input.previousFailureSignature || null,
      failedChecks: [String(failedCommand.command || 'verification')],
      affectedPaths: input.changedPaths || [],
    });
    const checkpoint = {
      taskId: input.taskId || null,
      projectId: input.projectId || null,
      resumeFrom: 'VERIFY',
      createdAt: new Date().toISOString(),
      changedPaths: input.changedPaths || [],
      failedCommand: String(failedCommand.command || '').slice(0, 500),
    };
    if (input.dir && input.taskId) {
      const checkpointDir = path.join(path.resolve(input.dir), '.agents', 'ultra-v3', 'tasks', input.taskId, 'checkpoints');
      fs.mkdirSync(checkpointDir, { recursive: true });
      checkpoint.checkpointPath = path.join(checkpointDir, `evaluation-${Date.now()}.json`);
      fs.writeFileSync(checkpoint.checkpointPath, `${JSON.stringify(checkpoint, null, 2)}\n`, 'utf8');
    }
    return {
      accepted: false,
      missingEvidence: [...new Set([...missingEvidence, 'failed-command'])],
      warnings: ['A verification command failed; state remains recoverable.'],
      nextState: 'RECOVERABLE_FAILURE',
      resumeCheckpoint: checkpoint,
      recoveryPlan,
    };
  }
  const uniqueMissing = [...new Set(missingEvidence)];
  return {
    accepted: uniqueMissing.length === 0,
    missingEvidence: uniqueMissing,
    warnings: uniqueMissing.length ? ['Completion is blocked until required evidence exists.'] : [],
    nextState: uniqueMissing.length ? 'VERIFY' : 'COMPLETE',
    resumeCheckpoint: null,
    recoveryPlan: null,
  };
}

export { evaluateCompletion };
