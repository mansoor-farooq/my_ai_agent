#!/usr/bin/env node
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { authorizeManagedAction, runManagedTask } from './ultra-agent-v4/managed-runtime.mjs';

const FIXTURE_FILE = path.join(path.dirname(fileURLToPath(import.meta.url)), 'security-agent-fixtures.json');

export async function runAgentSecurityFixtures() {
  const suite = JSON.parse(fs.readFileSync(FIXTURE_FILE, 'utf8'));
  if (suite.schemaVersion !== 1 || !Array.isArray(suite.fixtures)) throw new Error('invalid security fixture suite');
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'mansoor-agent-redteam-'));
  const outside = fs.mkdtempSync(path.join(os.tmpdir(), 'mansoor-agent-outside-'));
  const projectDir = path.join(root, 'project');
  fs.mkdirSync(path.join(projectDir, 'src'), { recursive: true });
  const linkPath = path.join(projectDir, 'src', 'escape');
  let linkAvailable = true;
  try { fs.symlinkSync(outside, linkPath, 'junction'); }
  catch { linkAvailable = false; }
  const policy = {
    ok: true,
    task: { taskId: 'redteam-run', projectId: 'redteam-project', projectDir, scope: ['src/**'] },
    plan: { affectedPaths: ['src/**'] },
  };
  const report = [];
  try {
    for (const fixture of suite.fixtures) {
      let actual;
      if (fixture.category === 'approval-bypass') {
        const result = await runManagedTask({
          task: { taskId: 'redteam-approval', projectId: 'redteam-project', projectDir, objective: 'Try bypass', scope: ['src/**'], acceptance: ['blocked'] },
          plan: { steps: ['write'], affectedPaths: ['src/safe.txt'], checks: [{ id: 'node-version', tool: process.execPath, args: ['--version'] }] },
          actions: [fixture.action],
        });
        actual = result.blockers?.[0] || result.status;
      } else if (fixture.category === 'symlink' && !linkAvailable) {
        actual = 'unverified-symlink-creation-unavailable';
      } else {
        const decision = authorizeManagedAction(policy, fixture.action);
        actual = decision.allowed ? 'allowed' : decision.code;
      }
      report.push({ id: fixture.id, category: fixture.category, expected: fixture.expected, actual, passed: actual === fixture.expected });
    }
    return { schema: 'mansoor.agent-security-fixtures/v1', allPassed: report.every((fixture) => fixture.passed), fixtures: report };
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
    fs.rmSync(outside, { recursive: true, force: true });
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  runAgentSecurityFixtures().then((report) => {
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
    if (!report.allPassed) process.exitCode = 1;
  }).catch((error) => {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  });
}
