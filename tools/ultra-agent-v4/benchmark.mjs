#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const secretPattern = /(?:AIza[0-9A-Za-z_-]{30,}|(?:sk|ghp|github_pat)_[A-Za-z0-9_-]{16,}|Bearer\s+[A-Za-z0-9._~+/=-]+|(?:password|passwd|pwd|secret|apiKey|api_key|token|authorization)\s*[:=]\s*["']?[^\s"';,}]+)/gi;
const sanitize = (value, limit = 1000) => String(value || '').replace(secretPattern, '[REDACTED_SECRET]').slice(0, limit);
const passing = new Set(['pass', 'passed', 'success', 'verified', 'complete']);

function percentile(values, ratio) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  if (ratio === 0.5 && sorted.length % 2 === 0) return Math.round((sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2);
  return sorted[Math.max(0, Math.ceil(ratio * sorted.length) - 1)];
}

function metricsPath(dir) {
  return path.join(path.resolve(dir), '.agents', 'ultra-v4', 'metrics', 'tasks.jsonl');
}

function recordTaskMetric(input = {}) {
  if (!input.taskId || !/^[A-Za-z0-9][A-Za-z0-9._-]{0,95}$/.test(input.taskId)) throw new Error('taskId is required and must be a safe identifier');
  if (!input.projectId) throw new Error('projectId is required');
  const startedAt = new Date(input.startedAt);
  const completedAt = new Date(input.completedAt);
  if (Number.isNaN(startedAt.valueOf()) || Number.isNaN(completedAt.valueOf()) || completedAt < startedAt) throw new Error('valid startedAt/completedAt are required');
  const acceptanceChecks = (Array.isArray(input.acceptanceChecks) ? input.acceptanceChecks : []).map((status) => sanitize(status, 50));
  const record = {
    schemaVersion: 1,
    metricId: crypto.randomUUID(),
    recordedAt: new Date().toISOString(),
    taskId: input.taskId,
    projectId: sanitize(input.projectId, 100),
    mode: sanitize(input.mode || 'fast', 20),
    startedAt: startedAt.toISOString(),
    completedAt: completedAt.toISOString(),
    durationMs: completedAt - startedAt,
    outcome: sanitize(input.outcome || 'unknown', 50),
    failureCode: sanitize(input.failureCode || '', 100) || null,
    failureReason: sanitize(input.failureReason || '', 500) || null,
    acceptanceChecks,
  };
  const file = metricsPath(input.dir || process.cwd());
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.appendFileSync(file, `${JSON.stringify(record)}\n`, 'utf8');
  return { ok: true, file, record };
}

function summarizeTaskMetrics({ dir = process.cwd(), projectId, since = null } = {}) {
  const file = metricsPath(dir);
  const sinceTime = since ? Date.parse(since) : null;
  const records = fs.existsSync(file) ? fs.readFileSync(file, 'utf8').split(/\r?\n/).filter(Boolean).flatMap((line) => {
    try { return [JSON.parse(line)]; } catch { return []; }
  }).filter((record) => (!projectId || record.projectId === projectId) && (!sinceTime || Date.parse(record.recordedAt) >= sinceTime)) : [];
  const latencies = records.map((record) => Number(record.durationMs)).filter(Number.isFinite);
  const accepted = records.filter((record) => passing.has(String(record.outcome).toLowerCase())).length;
  const checks = records.flatMap((record) => Array.isArray(record.acceptanceChecks) ? record.acceptanceChecks : []);
  const passedChecks = checks.filter((status) => passing.has(String(status).toLowerCase())).length;
  const failuresByCode = {};
  for (const record of records.filter((item) => item.failureCode)) failuresByCode[record.failureCode] = (failuresByCode[record.failureCode] || 0) + 1;
  return {
    ok: true,
    projectId: projectId || null,
    tasks: records.length,
    successRate: records.length ? accepted / records.length : 0,
    verificationRate: records.length ? records.filter((record) => (record.acceptanceChecks || []).some((status) => passing.has(String(status).toLowerCase()))).length / records.length : 0,
    acceptancePassRate: checks.length ? passedChecks / checks.length : 0,
    medianLatencyMs: percentile(latencies, 0.5),
    p95LatencyMs: percentile(latencies, 0.95),
    failuresByCode,
  };
}

export { recordTaskMetric, summarizeTaskMetrics };

if (process.argv[1] && path.basename(process.argv[1]) === 'benchmark.mjs') {
  const args = process.argv.slice(2);
  const action = args[0] || 'summary';
  const getArg = (name, fallback = '') => { const index = args.indexOf(name); return index >= 0 && args[index + 1] ? args[index + 1] : fallback; };
  const output = action === 'record' ? recordTaskMetric({
    dir: getArg('--dir', process.cwd()),
    taskId: getArg('--task'),
    projectId: getArg('--project-id'),
    mode: getArg('--mode', 'fast'),
    startedAt: getArg('--started-at'),
    completedAt: getArg('--completed-at'),
    outcome: getArg('--outcome'),
    failureCode: getArg('--failure-code'),
    failureReason: getArg('--failure-reason'),
    acceptanceChecks: getArg('--checks').split(',').map((value) => value.trim()).filter(Boolean),
  }) : action === 'summary' ? summarizeTaskMetrics({ dir: getArg('--dir', process.cwd()), projectId: getArg('--project-id') || null, since: getArg('--since') || null }) : null;
  if (!output) throw new Error('Usage: benchmark.mjs record|summary [options]');
  console.log(JSON.stringify(output, null, 2));
}
