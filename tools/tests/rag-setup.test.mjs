import test from 'node:test';
import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { classifyProbeFailure, findLocalPsql, parseEnvFile, probePostgres, psqlProbeArgs, resolveRagConfig } from '../rag-setup.mjs';

test('parses only approved local database settings and never returns unrelated secrets', () => {
  const parsed = parseEnvFile('export RAG_DB_USER="dev"\nRAG_DB_PASSWORD=local-pass # comment\nAPI_TOKEN=do-not-read\n');
  assert.deepEqual(parsed, { RAG_DB_USER: 'dev', RAG_DB_PASSWORD: 'local-pass' });
});

test('local environment files have stable precedence and process values win', () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), 'rag-setup-'));
  try {
    writeFileSync(path.join(dir, '.env.example'), 'RAG_DB_USER=sample\n');
    writeFileSync(path.join(dir, 'example.env'), 'RAG_DB_USER=example\n');
    writeFileSync(path.join(dir, '.env'), 'RAG_DB_USER=project\nRAG_DB_PASSWORD="file-secret"\n');
    writeFileSync(path.join(dir, '.env.local'), 'RAG_DB_USER=local\n');
    const config = resolveRagConfig({ projectDir: dir, env: { RAG_DB_USER: 'process' } });
    assert.equal(config.user, 'process');
    assert.equal(config.password, 'file-secret');
    assert.equal(config.host, 'localhost');
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('automatic RAG access rejects remote database hosts without connecting', () => {
  const config = resolveRagConfig({ projectDir: os.tmpdir(), env: { DATABASE_URL: 'postgres://u:p@db.example.com:5432/data' } });
  let called = false;
  const result = probePostgres(config, { run: () => { called = true; return { status: 0, stdout: '1' }; } });
  assert.equal(result.status, 'remote-db-skipped');
  assert.equal(called, false);
});

test('Postgres probe never prompts and classifies common connection failures without exposing details', () => {
  const config = { status: 'configured', host: 'localhost', port: '5432', user: 'dev', name: 'rag', password: '<REDACTED>', psql: 'psql' };
  let captured;
  const result = probePostgres(config, { run: (...args) => { captured = args; return { status: 2, stderr: 'password authentication failed for user dev' }; } });
  assert.equal(result.status, 'credentials-rejected');
  assert.deepEqual(captured[1], psqlProbeArgs(config));
  assert.ok(captured[1].includes('-w'));
  assert.equal(JSON.stringify(result).includes('private'), false);
  assert.equal(classifyProbeFailure('could not connect to server: Connection refused'), 'postgres-not-listening');
  assert.equal(classifyProbeFailure('spawn psql ENOENT'), 'psql-not-installed');
  assert.equal(classifyProbeFailure('spawnSync psql EPERM'), 'client-execution-blocked');
});

test('local PostgreSQL URL credentials are decoded but non-local hosts are skipped', () => {
  const config = resolveRagConfig({ projectDir: os.tmpdir(), env: { RAG_DATABASE_URL: 'postgresql://dev:p%40ss@127.0.0.1:5544/rag_db' } });
  assert.equal(config.status, 'configured');
  assert.equal(config.password, 'p@ss');
  assert.equal(config.port, '5544');
  assert.equal(config.name, 'rag_db');
});

test('finds a locally installed Windows PostgreSQL client even when PATH is incomplete', () => {
  const selected = findLocalPsql({
    platform: 'win32',
    env: { ProgramFiles: 'C:\\Program Files' },
    readdirSync: () => [{ name: '18', isDirectory: () => true }, { name: '17', isDirectory: () => true }],
    existsSync: (candidate) => candidate.endsWith('PostgreSQL\\17\\bin\\psql.exe'),
  });
  assert.equal(selected, path.join('C:\\Program Files', 'PostgreSQL', '17', 'bin', 'psql.exe'));
});
