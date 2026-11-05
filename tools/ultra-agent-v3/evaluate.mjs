const passing = new Set(['pass', 'passed', 'success', 'verified', 'complete']);

function evaluateCompletion(input = {}) {
  const mode = String(input.mode || 'fast').toLowerCase();
  const risk = String(input.risk || 'low').toLowerCase();
  const records = Array.isArray(input.verificationRecords) ? input.verificationRecords : [];
  const commands = Array.isArray(input.commandResults) ? input.commandResults : [];
  const missingEvidence = [];
  const passedVerification = records.some((record) => passing.has(String(record.status || '').toLowerCase()) && ['verification', 'independent-check'].includes(String(record.kind || 'verification')));
  const passedCommand = commands.some((result) => passing.has(String(result.status || '').toLowerCase()));
  const failedCommand = commands.find((result) => ['fail', 'failed', 'error'].includes(String(result.status || '').toLowerCase()));
  if (!passedVerification) missingEvidence.push('targeted-verification');
  if (!passedCommand) missingEvidence.push('targeted-verification-command');
  if (!Array.isArray(input.changedPaths) || !input.changedPaths.length) missingEvidence.push('changed-path-summary');
  if (mode === 'premium' && ['high', 'critical'].includes(risk)) {
    const independent = records.some((record) => String(record.kind || '').toLowerCase() === 'independent-check' && passing.has(String(record.status || '').toLowerCase()));
    if (!independent) missingEvidence.push('independent-check');
  }
  if (failedCommand) {
    return {
      accepted: false,
      missingEvidence: [...new Set([...missingEvidence, 'failed-command'])],
      warnings: ['A verification command failed; state remains recoverable.'],
      nextState: 'RECOVERABLE_FAILURE',
      resumeCheckpoint: {
        taskId: input.taskId || null,
        resumeFrom: 'VERIFY',
        createdAt: new Date().toISOString(),
        changedPaths: input.changedPaths || [],
        failedCommand: String(failedCommand.command || '').slice(0, 500),
      },
    };
  }
  const uniqueMissing = [...new Set(missingEvidence)];
  return {
    accepted: uniqueMissing.length === 0,
    missingEvidence: uniqueMissing,
    warnings: uniqueMissing.length ? ['Completion is blocked until required evidence exists.'] : [],
    nextState: uniqueMissing.length ? 'VERIFY' : 'COMPLETE',
    resumeCheckpoint: null,
  };
}

export { evaluateCompletion };
