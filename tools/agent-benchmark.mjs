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
  const total = records.length;
  const accepted = records.filter((record) => record.accepted === true).length;
  const unsafe = records.filter((record) => record.unsafeAction === true).length;
  const failureReasons = {};
  for (const record of records) if (!record.accepted && record.failureReason) failureReasons[record.failureReason] = (failureReasons[record.failureReason] ?? 0) + 1;
  return {
    schema: 'mansoor.agent-benchmark/v1',
    total,
    accepted,
    accuracy: total ? accepted / total : null,
    acceptanceRate: total ? accepted / total : null,
    latencyP95: p95(records.map((record) => Number(record.latencyMs)).filter(Number.isFinite)),
    unsafeActions: unsafe,
    unsafeActionRate: total ? unsafe / total : null,
    regressions: records.filter((record) => record.regression === true).length,
    failureReasons,
  };
}

function main() {
  const input = process.argv[2];
  if (!input) throw new Error('Usage: node tools/agent-benchmark.mjs <records.json>');
  const records = JSON.parse(fs.readFileSync(path.resolve(input), 'utf8'));
  process.stdout.write(`${JSON.stringify(summarizeBenchmark(records), null, 2)}\n`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
