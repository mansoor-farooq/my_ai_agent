#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

export function shouldRunRagIntegrationTests(env = process.env) {
  return env.RUN_RAG_TESTS === '1';
}

export function validateRagCiConfig(env = process.env) {
  const name = env.RAG_DB_NAME || 'mansoor_agent_rag';
  const password = env.RAG_DB_PASSWORD || env.PGPASSWORD;
  const host = env.RAG_DB_HOST || 'localhost';
  const trustAuth = env.RAG_DB_TRUST_AUTH === '1' && Boolean(env.RAG_DB_HOST) && ['localhost', '127.0.0.1', '::1'].includes(host.toLowerCase());
  if (name !== 'mansoor_agent_rag_test') throw new Error('RAG CI requires the dedicated mansoor_agent_rag_test database.');
  if (!password && !trustAuth) throw new Error('RAG CI requires a database password via RAG_DB_PASSWORD or PGPASSWORD (or explicit localhost trust-auth opt-in).');
  return { database: name, user: env.RAG_DB_USER || 'postgres', host, port: env.RAG_DB_PORT || '5432', authMode: password ? 'password' : 'localhost-trust' };
}

export function parseRagTestSummary(output = '') {
  const capture = (name) => {
    const match = String(output).match(new RegExp(`^# ${name} (\\d+)\\s*$`, 'm'));
    return match ? Number(match[1]) : null;
  };
  const total = capture('tests');
  const passed = capture('pass');
  const failed = capture('fail');
  const skipped = capture('skipped');
  if ([total, passed, failed, skipped].some((value) => value === null)) throw new Error('RAG CI could not parse the Node TAP test summary.');
  return { total, passed, failed, skipped };
}

export function validateRagTestSummary(summary, expectedTests = 8) {
  if (!summary || summary.total !== expectedTests) throw new Error(`RAG CI expected ${expectedTests} database integration tests, observed ${summary?.total ?? 'unknown'}.`);
  if (summary.skipped !== 0) throw new Error(`RAG CI does not allow skipped integration tests (${summary.skipped} skipped).`);
  if (summary.failed !== 0 || summary.passed !== expectedTests) throw new Error(`RAG CI expected all ${expectedTests} RAG suite tests to pass.`);
  return { ok: true, ...summary };
}

function main() {
  const config = validateRagCiConfig();
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  if (config.authMode === 'localhost-trust') {
    const psql = process.env.RAG_PSQL_PATH || 'psql';
    const probe = spawnSync(psql, ['-X', '-w', '-h', config.host, '-p', config.port, '-U', config.user, '-d', config.database, '-Atqc', 'select 1'], { encoding: 'utf8', windowsHide: true, timeout: 15000 });
    if (probe.error || probe.status !== 0 || probe.stdout.trim() !== '1') {
      process.stderr.write('RAG CI localhost trust-auth probe failed; refusing to run integration tests.\n');
      process.exitCode = 1;
      return;
    }
  }
  const env = { ...process.env, RUN_RAG_TESTS: '1', RAG_DB_NAME: config.database, RAG_DB_HOST: config.host, RAG_DB_PORT: config.port, RAG_DB_USER: config.user };
  const run = spawnSync(process.execPath, ['--test', '--test-reporter=tap', 'tools/tests/project-rag.test.mjs'], { cwd: root, env, encoding: 'utf8', windowsHide: true, maxBuffer: 8 * 1024 * 1024 });
  if (run.stdout) process.stdout.write(run.stdout);
  if (run.stderr) process.stderr.write(run.stderr);
  if (run.error || run.status !== 0) {
    process.exitCode = run.status || 1;
    return;
  }
  const summary = validateRagTestSummary(parseRagTestSummary(run.stdout));
  process.stdout.write(JSON.stringify({ schema: 'mansoor.rag-ci-gate/v1', status: 'pass', database: config.database, authMode: config.authMode, summary }) + '\n');
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
