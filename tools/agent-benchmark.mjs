#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

function p95(values) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * 0.95) - 1)];
}

export function summarizeBenchmark(records) {
  if (!Array.isArray(records)) throw new Error('benchmark records must be an array');
  const unique = new Set();
  for (const record of records) {
    const required = ['caseId', 'agentId', 'taskType', 'profileVersion', 'modelId', 'configHash', 'baseRevision', 'reviewedBy'];
    const missing = required.filter((field) => !String(record?.[field] || '').trim());
    if (missing.length) throw new Error(`benchmark provenance missing: ${missing.join(', ')}`);
    if (record.reviewStatus !== 'approved') throw new Error(`benchmark case ${record.caseId} is not owner-reviewed`);
    if (!/^sha256:[a-f0-9]{64}$/i.test(String(record.configHash))) throw new Error(`benchmark case ${record.caseId} has invalid configHash`);
    if (!/^[a-f0-9]{40}(?:[a-f0-9]{24})?$/i.test(String(record.baseRevision))) throw new Error(`benchmark case ${record.caseId} has invalid baseRevision`);
    if (!Number.isInteger(Number(record.repeatIndex)) || Number(record.repeatIndex) < 1) throw new Error(`benchmark case ${record.caseId} has invalid repeatIndex`);
    if (typeof record.expectedAccepted !== 'boolean' || typeof record.accepted !== 'boolean') throw new Error(`benchmark case ${record.caseId} requires expected and observed acceptance`);
    const observation = `${record.caseId}|${record.agentId}|${record.modelId}|${record.configHash}|${record.repeatIndex}`;
    if (unique.has(observation)) throw new Error(`duplicate benchmark observation: ${observation}`);
    unique.add(observation);
  }
  const total = records.length;
  const accepted = records.filter((record) => record.accepted === true).length;
  const accurate = records.filter((record) => record.accepted === record.expectedAccepted).length;
  const unsafe = records.filter((record) => record.unsafeAction === true).length;
  const failureReasons = {};
  for (const record of records) if (!record.accepted && record.failureReason) failureReasons[record.failureReason] = (failureReasons[record.failureReason] ?? 0) + 1;
  const summarizeGroup = (items) => {
    const n = items.length;
    const success = items.filter((item) => item.accepted).length;
    return {
      total: n,
      uniqueCases: new Set(items.map((item) => item.caseId)).size,
      acceptanceRate: n ? success / n : null,
      firstPassRate: n ? items.filter((item) => item.firstPass === true).length / n : null,
      regressionRate: n ? items.filter((item) => item.regression === true).length / n : null,
      unsafeActionRate: n ? items.filter((item) => item.unsafeAction === true).length / n : null,
      accuracyRate: n ? items.filter((item) => item.accepted === item.expectedAccepted).length / n : null,
      repairSuccessRate: (() => {
        const repaired = items.filter((item) => item.repairAttempted === true && typeof item.repairAccepted === 'boolean');
        return repaired.length ? repaired.filter((item) => item.repairAccepted).length / repaired.length : null;
      })(),
      humanReworkMinutesMean: (() => {
        const measured = items.map((item) => Number(item.humanReworkMinutes)).filter((value) => Number.isFinite(value) && value >= 0);
        return measured.length ? measured.reduce((sum, value) => sum + value, 0) / measured.length : null;
      })(),
      latencyP95: p95(items.map((item) => Number(item.latencyMs)).filter(Number.isFinite)),
    };
  };
  const groupBy = (key) => Object.fromEntries([...new Set(records.map((item) => item[key]))].sort().map((value) => [value, summarizeGroup(records.filter((item) => item[key] === value))]));
  const costComplete = total > 0 && records.every((record) => Number.isFinite(Number(record.costUsd)) && record.costUsd !== null);
  const costs = records.reduce((sum, record) => sum + (Number(record.costUsd) || 0), 0);
  const byAgent = groupBy('agentId');
  return {
    schema: 'mansoor.agent-benchmark/v1',
    total,
    accepted,
    accuracy: total ? accurate / total : null,
    accuracyRate: total ? accurate / total : null,
    acceptanceRate: total ? accepted / total : null,
    latencyP95: p95(records.map((record) => Number(record.latencyMs)).filter(Number.isFinite)),
    unsafeActions: unsafe,
    unsafeActionRate: total ? unsafe / total : null,
    regressions: records.filter((record) => record.regression === true).length,
    failureReasons,
    byAgent,
    byTaskType: groupBy('taskType'),
    costCoverage: total ? records.filter((record) => Number.isFinite(Number(record.costUsd)) && record.costUsd !== null).length / total : null,
    costPerAcceptedTaskUsd: costComplete && accepted ? costs / accepted : null,
    coverageWarnings: Object.entries(byAgent).filter(([, metrics]) => metrics.uniqueCases < 10).map(([agentId, metrics]) => `${agentId}: only ${metrics.uniqueCases} approved unique cases; target is 10-20`),
  };
}

function main() {
  const input = process.argv[2];
  if (!input) throw new Error('Usage: node tools/agent-benchmark.mjs <records.json>');
  const records = JSON.parse(fs.readFileSync(path.resolve(input), 'utf8'));
  process.stdout.write(`${JSON.stringify(summarizeBenchmark(records), null, 2)}\n`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
