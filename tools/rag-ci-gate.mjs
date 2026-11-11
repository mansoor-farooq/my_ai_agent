#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

export function validateRagCiConfig(env = process.env) {
  const name = env.RAG_DB_NAME || 'mansoor_agent_rag';
  const password = env.RAG_DB_PASSWORD || env.PGPASSWORD;
  if (name !== 'mansoor_agent_rag_test') throw new Error('RAG CI requires the dedicated mansoor_agent_rag_test database.');
  if (!password) throw new Error('RAG CI requires a database password via RAG_DB_PASSWORD or PGPASSWORD.');
  return { database: name, user: env.RAG_DB_USER || 'postgres', host: env.RAG_DB_HOST || 'localhost', port: env.RAG_DB_PORT || '5432' };
}

function main() {
  const config = validateRagCiConfig();
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const env = { ...process.env, RUN_RAG_TESTS: '1', RAG_DB_NAME: config.database, RAG_DB_HOST: config.host, RAG_DB_PORT: config.port, RAG_DB_USER: config.user };
  try {
    execFileSync(process.execPath, ['--test', 'tools/tests/project-rag.test.mjs'], { cwd: root, env, stdio: 'inherit' });
  } catch (error) {
    process.exitCode = error.status || 1;
    return;
  }
  process.stdout.write(JSON.stringify({ schema: 'mansoor.rag-ci-gate/v1', status: 'pass', database: config.database }) + '\n');
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
