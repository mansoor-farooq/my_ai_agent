import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFile } from 'node:fs/promises';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const runtime = path.join(root, 'tools', 'ultra-agent-v2', 'rag.mjs');
const enabled = process.env.RUN_RAG_TESTS === '1' || Boolean(process.env.RAG_DB_PASSWORD || process.env.PGPASSWORD);

function run(dir, project, command, extra = [], overrides = {}) {
  const output = execFileSync(process.execPath, [runtime, command, '--dir', dir, '--project', project, ...extra], {
    encoding: 'utf8',
    env: { ...process.env, ...overrides, RAG_DB_PASSWORD: process.env.RAG_DB_PASSWORD || process.env.PGPASSWORD || '' },
  });
  return JSON.parse(output);
}

test('RAG uses a local hostname instead of a hard-coded loopback IP', async () => {
  const source = await readFile(runtime, 'utf8');
  assert.doesNotMatch(source, /127\.0\.0\.1/);
  assert.match(source, /localhost/);
});

test('RAG bootstraps a missing local database when credentials permit it', { skip: !enabled }, async () => {
  const project = await mkdtemp(path.join(os.tmpdir(), 'mansoor-rag-test-bootstrap-'));
  const database = `mansoor_agent_rag_test_${Date.now()}_${process.pid}`;
  const psql = process.env.RAG_PSQL_PATH || 'psql';
  const env = { ...process.env, RAG_DB_PASSWORD: process.env.RAG_DB_PASSWORD || process.env.PGPASSWORD || '' };
  try {
    await writeFile(path.join(project, 'README.md'), 'Automatic local database bootstrap contract.\n');
    const result = run(project, 'bootstrap-project', 'build', [], { RAG_DB_HOST: 'localhost', RAG_DB_NAME: database });
    assert.equal(result.database, database);
    assert.equal(run(project, 'bootstrap-project', 'status', [], { RAG_DB_HOST: 'localhost', RAG_DB_NAME: database }).state, 'ready');
  } finally {
    try {
      execFileSync(psql, ['-X', '-w', '-h', 'localhost', '-p', env.RAG_DB_PORT || '5432', '-U', env.RAG_DB_USER || 'postgres', '-d', 'postgres', '-v', 'ON_ERROR_STOP=1', '-c', `DROP DATABASE IF EXISTS "${database}"`], { env, stdio: 'ignore' });
    } catch {
      // The database may not exist when the RED assertion is run.
    }
    await rm(project, { recursive: true, force: true });
  }
});

test('PostgreSQL RAG isolates projects and excludes secrets/dependencies', { skip: !enabled }, async () => {
  const first = await mkdtemp(path.join(os.tmpdir(), 'mansoor-rag-test-a-'));
  const second = await mkdtemp(path.join(os.tmpdir(), 'mansoor-rag-test-b-'));
  try {
    await mkdir(path.join(first, 'node_modules'), { recursive: true });
    await writeFile(path.join(first, 'README.md'), 'PostgreSQL retrieval contract for the first project.\\n');
    await writeFile(path.join(first, '.env'), 'OPENAI_API_KEY=sk-test-secret-value-123456789\\n');
    await writeFile(path.join(first, 'node_modules', 'ignored.md'), 'PostgreSQL dependency text must not be indexed.\\n');
    await writeFile(path.join(second, 'README.md'), 'PostgreSQL retrieval contract for the second project.\\n');

    const firstBuild = run(first, 'same-name', 'build');
    const secondBuild = run(second, 'same-name', 'build');
    assert.equal(firstBuild.indexedFiles, 1);
    assert.equal(secondBuild.indexedFiles, 1);
    assert.notEqual(firstBuild.projectId, secondBuild.projectId);

    const firstQuery = run(first, 'same-name', 'query', ['--q', 'first project']);
    assert.equal(firstQuery.results.length, 1);
    assert.equal(firstQuery.results[0].projectId, firstBuild.projectId);
    assert.equal(firstQuery.results[0].path, 'README.md');
    assert.match(firstQuery.results[0].content, /first project/);
    assert.doesNotMatch(firstQuery.results[0].content, /sk-test-secret/);
  } finally {
    await rm(first, { recursive: true, force: true });
    await rm(second, { recursive: true, force: true });
  }
});

test('PostgreSQL RAG refreshes changed and deleted files deterministically', { skip: !enabled }, async () => {
  const project = await mkdtemp(path.join(os.tmpdir(), 'mansoor-rag-test-refresh-'));
  const file = path.join(project, 'architecture.md');
  try {
    await writeFile(file, 'PostgreSQL retrieval architecture v1.\\n');
    const first = run(project, 'refresh-project', 'build');
    assert.equal(first.changedFiles, 1);

    const unchanged = run(project, 'refresh-project', 'build');
    assert.equal(unchanged.changedFiles, 0);

    await writeFile(file, 'PostgreSQL retrieval architecture v2 with updated contracts.\\n');
    const second = run(project, 'refresh-project', 'build');
    assert.equal(second.changedFiles, 1);
    const query = run(project, 'refresh-project', 'query', ['--q', 'updated contracts']);
    assert.equal(query.results.length, 1);
    assert.match(query.results[0].content, /updated contracts/);

    await rm(file);
    const third = run(project, 'refresh-project', 'build');
    assert.equal(third.removedFiles, 1);
    const status = run(project, 'refresh-project', 'status');
    assert.equal(status.chunkCount, 0);
    assert.deepEqual(run(project, 'refresh-project', 'query', ['--q', 'updated contracts']).results, []);
  } finally {
    await rm(project, { recursive: true, force: true });
  }
});

test('PostgreSQL RAG shares canonical identity and reports stale source state', { skip: !enabled }, async () => {
  const project = await mkdtemp(path.join(os.tmpdir(), 'mansoor-rag-test-stale-'));
  try {
    execFileSync('git', ['init'], { cwd: project, stdio: 'ignore' });
    execFileSync('git', ['remote', 'add', 'origin', 'https://secret-user:secret-token@example.com/owner/rag-fixture.git'], { cwd: project, stdio: 'ignore' });
    await writeFile(path.join(project, 'README.md'), 'Stable source revision.\n');
    const preflight = JSON.parse(execFileSync(process.execPath, [path.join(root, 'tools', 'ultra-agent-v2', 'preflight.mjs'), '--dir', project, '--project', 'RAG Identity'], { encoding: 'utf8' }));
    const built = run(project, 'RAG Identity', 'build');
    assert.equal(built.projectId, preflight.project.projectId);
    assert.equal(run(project, 'RAG Identity', 'status').state, 'ready');
    await writeFile(path.join(project, 'README.md'), 'Source changed after index build.\n');
    assert.equal(run(project, 'RAG Identity', 'status').state, 'stale');
  } finally {
    await rm(project, { recursive: true, force: true });
  }
});

test('hybrid RAG retrieves path-related evidence and reports component scores', { skip: !enabled }, async () => {
  const project = await mkdtemp(path.join(os.tmpdir(), 'mansoor-rag-test-hybrid-'));
  try {
    await mkdir(path.join(project, 'docs'), { recursive: true });
    await writeFile(path.join(project, 'docs', 'memory-compaction.md'), 'Snapshot pruning keeps the evidence lifecycle bounded.\n');
    await writeFile(path.join(project, 'docs', 'unrelated.md'), 'Deployment release checklist and smoke verification.\n');
    run(project, 'hybrid-project', 'build');
    const hybrid = run(project, 'hybrid-project', 'query', ['--q', 'memory compact', '--ranking', 'hybrid', '--top', '2']);
    assert.equal(hybrid.results[0].path, 'docs/memory-compaction.md');
    assert.equal(hybrid.results[0].rankingMode, 'hybrid');
    assert.equal(typeof hybrid.results[0].lexicalScore, 'number');
    assert.equal(typeof hybrid.results[0].vectorScore, 'number');
    assert.equal(typeof hybrid.results[0].pathScore, 'number');
  } finally {
    await rm(project, { recursive: true, force: true });
  }
});

test('PostgreSQL RAG returns a stable empty result for a blank query', { skip: !enabled }, async () => {
  const project = await mkdtemp(path.join(os.tmpdir(), 'mansoor-rag-test-empty-'));
  try {
    await writeFile(path.join(project, 'README.md'), 'Project memory retrieval.\\n');
    run(project, 'empty-query-project', 'build');
    assert.deepEqual(run(project, 'empty-query-project', 'query', ['--q', '   ']).results, []);
  } finally {
    await rm(project, { recursive: true, force: true });
  }
});
