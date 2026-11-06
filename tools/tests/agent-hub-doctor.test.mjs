import test from 'node:test';
import assert from 'node:assert/strict';
import { runDoctor } from '../agent-hub-doctor.mjs';

test('doctor verifies the portable Gemini expert team from the E:\\Agents source only', async () => {
  const report = await runDoctor();
  assert.equal(report.failures, 0, JSON.stringify(report.checks.filter((item) => item.status === 'FAIL')));
  assert.equal(report.warnings, 0);
  assert.ok(report.checks.some((item) => item.name === 'single Gemini manager' && item.status === 'PASS'));
  assert.ok(report.checks.some((item) => item.name === 'expert team inventory' && item.detail.includes('15')));
});

test('doctor enforces provider-free packaging and agent tool boundaries', async () => {
  const report = await runDoctor();
  assert.ok(report.checks.some((item) => item.name === 'self-contained package policy' && item.status === 'PASS'));
  assert.ok(report.checks.some((item) => item.name === 'portable skills and rules' && item.status === 'PASS'));
  assert.ok(report.checks.some((item) => item.name === 'agent tool boundary' && item.status === 'PASS'));
  assert.ok(report.checks.some((item) => item.name === 'manager-only delegation policy' && item.status === 'PASS'));
  assert.ok(report.checks.some((item) => item.name === 'Ultra Agent v2 runtime' && item.status === 'PASS'));
  assert.ok(report.checks.some((item) => item.name === 'Ultra Agent v3 control plane' && item.status === 'PASS'));
});
