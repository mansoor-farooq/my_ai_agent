#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { projectIdentity } from './project-identity.mjs';

const args = process.argv.slice(2);
const command = args[0] || 'status';
const getArg = (name, fallback = '') => {
  const index = args.indexOf(name);
  return index >= 0 && args[index + 1] ? args[index + 1] : fallback;
};
const projectDir = path.resolve(getArg('--dir', process.cwd()));
const projectName = getArg('--project', path.basename(projectDir));
if (!fs.existsSync(projectDir) || !fs.statSync(projectDir).isDirectory()) {
  throw new Error('Project directory does not exist: ' + projectDir);
}

const project = projectIdentity({ dir: projectDir, project: projectName });
const slug = project.slug;
const origin = project.gitUrl || 'local:' + projectDir;
const projectId = project.projectId;

const db = {
  host: process.env.RAG_DB_HOST || 'localhost',
  port: process.env.RAG_DB_PORT || '5432',
  user: process.env.RAG_DB_USER || 'postgres',
  name: process.env.RAG_DB_NAME || 'mansoor_agent_rag',
};
if (!/^[A-Za-z_][A-Za-z0-9_-]*$/.test(db.name)) throw new Error('RAG_DB_NAME must be a simple PostgreSQL database name.');
const psql = process.env.RAG_PSQL_PATH || 'psql';
const password = process.env.RAG_DB_PASSWORD || process.env.PGPASSWORD || '';
const psqlEnv = { ...process.env, PGPASSWORD: password };

function sql(value) {
  return "'" + String(value ?? "").replaceAll("'", "''") + "'";
}
function sqlText(value) {
  return "convert_from(decode(" + sql(Buffer.from(String(value ?? ""), "utf8").toString("base64")) + "," + sql("base64") + ")," + sql("UTF8") + ")";
}
function identifier(value) {
  return '"' + String(value).replaceAll('"', '""') + '"';
}
function connectionArgs(database = db.name) {
  const args = ['-X', '-w'];
  if (db.host) args.push('-h', db.host);
  args.push('-p', db.port, '-U', db.user, '-d', database, '-v', 'ON_ERROR_STOP=1');
  return args;
}
function runSql(statement, options = {}) {
  const result = spawnSync(psql, [
    ...connectionArgs(options.database || db.name), '-At', '-F', '\t', '-c', statement
  ], { env: psqlEnv, encoding: 'utf8', windowsHide: true, maxBuffer: 32 * 1024 * 1024 });
  if (result.status !== 0) {
    const detail = (result.stderr || result.stdout || 'PostgreSQL command failed').trim().replace(/\s+/g, ' ');
    throw new Error(detail);
  }
  return (result.stdout || '').trim();
}
function runSqlFile(statement, database = db.name) {
  const result = spawnSync(psql, [
    ...connectionArgs(database), '-f', '-'
  ], { env: psqlEnv, input: statement, encoding: 'utf8', windowsHide: true, maxBuffer: 32 * 1024 * 1024 });
  if (result.status !== 0) {
    const detail = (result.stderr || result.stdout || 'PostgreSQL script failed').trim().replace(/\s+/g, ' ');
    throw new Error(detail);
  }
  return (result.stdout || '').trim();
}
function ensureDatabase() {
  const exists = runSql('SELECT 1 FROM pg_database WHERE datname=' + sql(db.name) + ';', { database: 'postgres' });
  if (exists) return;
  try {
    runSql('CREATE DATABASE ' + identifier(db.name) + ';', { database: 'postgres' });
  } catch (error) {
    const appeared = runSql('SELECT 1 FROM pg_database WHERE datname=' + sql(db.name) + ';', { database: 'postgres' });
    if (!appeared) throw error;
  }
}

const schema = [
  'CREATE SCHEMA IF NOT EXISTS rag',
  'CREATE TABLE IF NOT EXISTS rag.projects (project_id text PRIMARY KEY, project_name text NOT NULL, origin text NOT NULL, slug text NOT NULL, source_revision text, worktree_fingerprint text, ranking_version integer NOT NULL DEFAULT 2, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now())',
  'CREATE TABLE IF NOT EXISTS rag.documents (document_id bigserial PRIMARY KEY, project_id text NOT NULL REFERENCES rag.projects(project_id) ON DELETE CASCADE, path text NOT NULL, content_hash text NOT NULL, start_line integer NOT NULL, end_line integer NOT NULL, content text NOT NULL, search_vector tsvector NOT NULL, embedding real[], embedding_model text NOT NULL DEFAULT ' + sql('hash-subword-v1') + ', updated_at timestamptz NOT NULL DEFAULT now(), UNIQUE(project_id, path, start_line, end_line))',
  'ALTER TABLE rag.projects ADD COLUMN IF NOT EXISTS source_revision text',
  'ALTER TABLE rag.projects ADD COLUMN IF NOT EXISTS worktree_fingerprint text',
  'ALTER TABLE rag.projects ADD COLUMN IF NOT EXISTS ranking_version integer NOT NULL DEFAULT 2',
  'ALTER TABLE rag.documents ADD COLUMN IF NOT EXISTS embedding real[]',
  'ALTER TABLE rag.documents ADD COLUMN IF NOT EXISTS embedding_model text NOT NULL DEFAULT ' + sql('hash-subword-v1'),
  'CREATE INDEX IF NOT EXISTS documents_search_idx ON rag.documents USING gin(search_vector)',
  'CREATE INDEX IF NOT EXISTS documents_project_path_idx ON rag.documents(project_id, path)',
].join(';') + ';';

const ignoredDirectories = new Set([
  '.git', '.agents', 'node_modules', 'vendor', 'dist', 'build', 'bin', 'obj',
  '.next', '.dart_tool', '.gradle', 'coverage', '__pycache__', '.venv', 'venv',
  'shared/native-profile', 'shared/private-backup',
]);
const ignoredDirectoryPaths = new Set(['shared/native-profile', 'shared/private-backup']);
const textExtensions = new Set([
  '', '.c', '.cc', '.cpp', '.cs', '.css', '.dart', '.go', '.html', '.ini', '.java',
  '.js', '.json', '.jsx', '.md', '.mjs', '.py', '.ps1', '.rs', '.sh', '.sql',
  '.toml', '.ts', '.tsx', '.txt', '.xml', '.yaml', '.yml', '.cshtml', '.razor',
]);
const secretPattern = /(?:AIza[0-9A-Za-z_-]{30,}|(?:sk|pk|rk|gh[pousr])_[A-Za-z0-9_-]{20,}|-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----|(?:password|passwd|secret|token|api[_-]?key)\s*[:=]\s*['"]?[^\s'"]{8,})/gi;
const forbiddenFilePattern = /(?:^|\/)(?:\.env(?:\..*)?|id_rsa|credentials?|secrets?|private[_-]?key|.*\.(?:pem|key|p12|pfx|sqlite|db|zip|7z|rar))$/i;

function safeText(file) {
  const relative = path.relative(projectDir, file).replaceAll('\\', '/');
  if (forbiddenFilePattern.test(relative)) return null;
  const extension = path.extname(file).toLowerCase();
  if (!textExtensions.has(extension)) return null;
  let stat;
  try { stat = fs.statSync(file); } catch { return null; }
  if (!stat.isFile() || stat.size > 200_000) return null;
  let text;
  try { text = fs.readFileSync(file, 'utf8'); } catch { return null; }
  // Treat NUL-containing files as binary even when they use a text extension.
  if (text.includes('\u0000')) return null;
  const redacted = text.replace(secretPattern, '[REDACTED]');
  return { relative, text: redacted, hash: crypto.createHash('sha256').update(redacted).digest('hex') };
}
function walk(directory, files = []) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (entry.isSymbolicLink()) continue;
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      const relativeDirectory = path.relative(projectDir, full).replaceAll('\\', '/').toLowerCase();
      if (!ignoredDirectories.has(entry.name.toLowerCase()) && !ignoredDirectoryPaths.has(relativeDirectory)) walk(full, files);
    } else {
      const item = safeText(full);
      if (item) files.push(item);
    }
  }
  return files;
}
function chunksFor(file) {
  const lines = file.text.split(/\r?\n/);
  const chunks = [];
  const window = 80;
  for (let index = 0; index < lines.length; index += window) {
    const text = lines.slice(index, index + window).join('\n').trim();
    if (!text) continue;
    chunks.push({
      path: file.relative,
      contentHash: file.hash,
      startLine: index + 1,
      endLine: Math.min(lines.length, index + window),
      content: text.slice(0, 12000),
    });
  }
  return chunks;
}
const VECTOR_DIMENSIONS = 64;
function hash32(value) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}
function vectorTokens(value) {
  const words = String(value || '').toLowerCase().match(/[a-z0-9_]+/g) || [];
  const tokens = [];
  for (const word of words.slice(0, 4000)) {
    tokens.push(word);
    const padded = `^${word}$`;
    for (let index = 0; index <= padded.length - 3; index += 1) tokens.push(padded.slice(index, index + 3));
  }
  return tokens;
}
function vectorFor(value) {
  const vector = Array(VECTOR_DIMENSIONS).fill(0);
  for (const token of vectorTokens(value)) {
    const hash = hash32(token);
    vector[hash % VECTOR_DIMENSIONS] += (hash & 0x80000000) ? -1 : 1;
  }
  const magnitude = Math.sqrt(vector.reduce((sum, item) => sum + item * item, 0));
  return magnitude ? vector.map((item) => item / magnitude) : vector;
}
function vectorSql(vector) {
  return `ARRAY[${vector.map((item) => Number(item).toFixed(8)).join(',')}]::real[]`;
}
function fingerprint(files) {
  return crypto.createHash('sha256').update(files.map((file) => `${file.relative}:${file.hash}`).sort().join('\n')).digest('hex');
}
function cosine(left, right) {
  if (!Array.isArray(left) || !Array.isArray(right) || left.length !== right.length) return 0;
  return left.reduce((sum, value, index) => sum + Number(value || 0) * Number(right[index] || 0), 0);
}
function json(value) {
  process.stdout.write(JSON.stringify(value, null, 2) + '\n');
}

ensureDatabase();
runSql(schema);
if (command === 'status') {
  const currentFingerprint = fingerprint(walk(projectDir));
  const row = runSql('SELECT p.project_id, p.project_name, p.updated_at, count(d.document_id), coalesce(p.source_revision,' + sql('') + '), coalesce(p.worktree_fingerprint,' + sql('') + ') FROM rag.projects p LEFT JOIN rag.documents d ON d.project_id = p.project_id WHERE p.project_id = ' + sql(projectId) + ' GROUP BY p.project_id, p.project_name, p.updated_at, p.source_revision, p.worktree_fingerprint;');
  if (!row) {
    json({ ok: true, command, state: 'missing', project: projectName, projectId, database: db.name });
  } else {
    const [id, name, updatedAt, count, sourceRevision, storedFingerprint] = row.split('	');
    const state = storedFingerprint === currentFingerprint ? 'ready' : 'stale';
    json({ ok: true, command, state, project: name, projectId: id, updatedAt, chunkCount: Number(count), sourceRevision: sourceRevision || null, currentRevision: project.commit, database: db.name });
  }
  process.exit(0);
}

if (command === 'build') {
  const files = walk(projectDir);
  const worktreeFingerprint = fingerprint(files);
  const currentPaths = new Set(files.map((file) => file.relative));
  const existingRows = runSql('SELECT path, max(content_hash), bool_and(embedding IS NOT NULL) FROM rag.documents WHERE project_id = ' + sql(projectId) + ' GROUP BY path;');
  const existing = new Map(existingRows ? existingRows.split('\n').map((line) => {
    const [relative, hash, embedded] = line.split('\t');
    return [relative, { hash, embedded: embedded === 't' }];
  }) : []);
  const changed = files.filter((file) => existing.get(file.relative)?.hash !== file.hash || !existing.get(file.relative)?.embedded);
  const removed = [...existing.keys()].filter((file) => !currentPaths.has(file));
  const statements = [
    'BEGIN',
    'INSERT INTO rag.projects(project_id, project_name, origin, slug, source_revision, worktree_fingerprint, ranking_version, updated_at) VALUES (' + sql(projectId) + ',' + sql(projectName) + ',' + sql(origin) + ',' + sql(slug) + ',' + sql(project.commit || '') + ',' + sql(worktreeFingerprint) + ',2,now()) ON CONFLICT(project_id) DO UPDATE SET project_name=EXCLUDED.project_name, origin=EXCLUDED.origin, slug=EXCLUDED.slug, source_revision=EXCLUDED.source_revision, worktree_fingerprint=EXCLUDED.worktree_fingerprint, ranking_version=EXCLUDED.ranking_version, updated_at=now()',
  ];
  for (const relative of [...changed.map((file) => file.relative), ...removed]) {
    statements.push('DELETE FROM rag.documents WHERE project_id=' + sql(projectId) + ' AND path=' + sql(relative));
  }
  for (const file of changed) {
    for (const chunk of chunksFor(file)) {
      const contentExpression = sqlText(chunk.content);
      const embedding = vectorSql(vectorFor(`${chunk.path}\n${chunk.content}`));
      statements.push('INSERT INTO rag.documents(project_id,path,content_hash,start_line,end_line,content,search_vector,embedding,embedding_model) VALUES (' + [projectId, chunk.path, chunk.contentHash, chunk.startLine, chunk.endLine].map(sql).join(',') + ',' + contentExpression + ',to_tsvector(' + sql('simple') + ',' + contentExpression + '),' + embedding + ',' + sql('hash-subword-v1') + ')');
    }
  }
  statements.push('COMMIT');
  runSqlFile(statements.map((statement) => statement + ';').join('\n'));
  json({ ok: true, command, project: projectName, projectId, indexedFiles: files.length, changedFiles: changed.length, removedFiles: removed.length, chunkCount: files.reduce((sum, file) => sum + chunksFor(file).length, 0), database: db.name });
  process.exit(0);
}

if (command === 'query') {
  const query = getArg('--q', '').trim();
  const top = Math.max(1, Math.min(Number(getArg('--top', '8')) || 8, 20));
  const rankingMode = getArg('--ranking', 'hybrid').toLowerCase();
  if (!['lexical', 'hybrid'].includes(rankingMode)) throw new Error('--ranking must be lexical or hybrid');
  if (!query) {
    json({ ok: true, command, project: projectName, projectId, query, rankingMode, results: [] });
    process.exit(0);
  }
  const rankExpression = 'ts_rank_cd(search_vector, plainto_tsquery(' + sql('simple') + ',' + sql(query) + '))';
  const where = rankingMode === 'lexical'
    ? ' AND search_vector @@ plainto_tsquery(' + sql('simple') + ',' + sql(query) + ')'
    : '';
  const candidateStatement = [
    "SELECT coalesce(json_agg(row_to_json(result)),'[]'::json) FROM (",
    'SELECT document_id AS "documentId", path, start_line AS "startLine", end_line AS "endLine", content_hash AS "sourceHash", project_id AS "projectId", to_json(embedding) AS embedding, round((' + rankExpression + ')::numeric, 8)::float AS "lexicalScore", updated_at AS "updatedAt"',
    'FROM rag.documents WHERE project_id=' + sql(projectId) + where,
    ') result;'
  ].join(' ');
  const candidateOutput = runSql(candidateStatement);
  const candidates = candidateOutput ? JSON.parse(candidateOutput) : [];
  const queryVector = vectorFor(query);
  const queryTokens = [...new Set(query.toLowerCase().match(/[a-z0-9_]+/g) || [])];
  const ranked = candidates.map((candidate) => {
    const normalizedPath = String(candidate.path || '').toLowerCase().replace(/[^a-z0-9_]+/g, ' ');
    const pathHits = queryTokens.filter((token) => normalizedPath.includes(token)).length;
    const pathScore = queryTokens.length ? pathHits / queryTokens.length : 0;
    const lexicalScore = Number(candidate.lexicalScore || 0);
    const vectorScore = rankingMode === 'hybrid' ? Math.max(0, cosine(queryVector, candidate.embedding)) : 0;
    const score = rankingMode === 'hybrid'
      ? (0.65 * Math.min(1, lexicalScore * 4)) + (0.25 * vectorScore) + (0.10 * pathScore)
      : lexicalScore;
    return { ...candidate, lexicalScore, vectorScore, pathScore, score };
  }).sort((left, right) => right.score - left.score || String(right.updatedAt).localeCompare(String(left.updatedAt)) || left.path.localeCompare(right.path) || left.startLine - right.startLine).slice(0, top);
  const ids = ranked.map((candidate) => Number(candidate.documentId)).filter(Number.isSafeInteger);
  const contentOutput = ids.length ? runSql("SELECT coalesce(json_object_agg(document_id::text, content),'{}'::json) FROM rag.documents WHERE document_id IN (" + ids.join(',') + ');') : '{}';
  const contents = contentOutput ? JSON.parse(contentOutput) : {};
  const results = ranked.map((candidate) => ({
    path: candidate.path,
    startLine: candidate.startLine,
    endLine: candidate.endLine,
    score: Number(candidate.score.toFixed(6)),
    lexicalScore: Number(candidate.lexicalScore.toFixed(6)),
    vectorScore: Number(candidate.vectorScore.toFixed(6)),
    pathScore: Number(candidate.pathScore.toFixed(6)),
    rankingMode,
    sourceHash: candidate.sourceHash,
    content: contents[String(candidate.documentId)] || '',
    projectId: candidate.projectId,
  }));
  json({ ok: true, command, project: projectName, projectId, query, rankingMode, results });
  process.exit(0);
}

throw new Error('Usage: rag.mjs build|status|query --dir PATH --project NAME [--q TEXT] [--top K] [--ranking lexical|hybrid]');
