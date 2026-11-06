#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

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

const slugify = (value, fallback = 'project') => value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 48) || fallback;
const git = (gitArgs) => {
  const result = spawnSync('git', gitArgs, { cwd: projectDir, encoding: 'utf8', windowsHide: true });
  return result.status === 0 ? result.stdout.trim() : '';
};
const slug = slugify(projectName);
const origin = git(['config', '--get', 'remote.origin.url']) || 'local:' + projectDir;
const projectId = crypto.createHash('sha256').update(origin.toLowerCase() + '|' + slug).digest('hex').slice(0, 16);

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
  'CREATE TABLE IF NOT EXISTS rag.projects (project_id text PRIMARY KEY, project_name text NOT NULL, origin text NOT NULL, slug text NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now())',
  'CREATE TABLE IF NOT EXISTS rag.documents (document_id bigserial PRIMARY KEY, project_id text NOT NULL REFERENCES rag.projects(project_id) ON DELETE CASCADE, path text NOT NULL, content_hash text NOT NULL, start_line integer NOT NULL, end_line integer NOT NULL, content text NOT NULL, search_vector tsvector NOT NULL, updated_at timestamptz NOT NULL DEFAULT now(), UNIQUE(project_id, path, start_line, end_line))',
  'CREATE INDEX IF NOT EXISTS documents_search_idx ON rag.documents USING gin(search_vector)',
  'CREATE INDEX IF NOT EXISTS documents_project_path_idx ON rag.documents(project_id, path)',
].join(';') + ';';

const ignoredDirectories = new Set([
  '.git', '.agents', 'node_modules', 'vendor', 'dist', 'build', 'bin', 'obj',
  '.next', '.dart_tool', '.gradle', 'coverage', '__pycache__', '.venv', 'venv',
]);
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
      if (!ignoredDirectories.has(entry.name.toLowerCase())) walk(full, files);
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
function json(value) {
  process.stdout.write(JSON.stringify(value, null, 2) + '\n');
}

ensureDatabase();
runSql(schema);
if (command === 'status') {
  const row = runSql('SELECT p.project_id, p.project_name, p.updated_at, count(d.document_id) FROM rag.projects p LEFT JOIN rag.documents d ON d.project_id = p.project_id WHERE p.project_id = ' + sql(projectId) + ' GROUP BY p.project_id, p.project_name, p.updated_at;');
  if (!row) {
    json({ ok: true, command, state: 'missing', project: projectName, projectId, database: db.name });
  } else {
    const [id, name, updatedAt, count] = row.split('	');
    json({ ok: true, command, state: 'ready', project: name, projectId: id, updatedAt, chunkCount: Number(count), database: db.name });
  }
  process.exit(0);
}

if (command === 'build') {
  const files = walk(projectDir);
  const currentPaths = new Set(files.map((file) => file.relative));
  const existingRows = runSql('SELECT path, max(content_hash) FROM rag.documents WHERE project_id = ' + sql(projectId) + ' GROUP BY path;');
  const existing = new Map(existingRows ? existingRows.split('\n').map((line) => line.split('\t')) : []);
  const changed = files.filter((file) => existing.get(file.relative)?.[1] !== file.hash);
  const removed = [...existing.keys()].filter((file) => !currentPaths.has(file));
  const statements = [
    'BEGIN',
    'INSERT INTO rag.projects(project_id, project_name, origin, slug, updated_at) VALUES (' + sql(projectId) + ',' + sql(projectName) + ',' + sql(origin) + ',' + sql(slug) + ',now()) ON CONFLICT(project_id) DO UPDATE SET project_name=EXCLUDED.project_name, origin=EXCLUDED.origin, slug=EXCLUDED.slug, updated_at=now()',
  ];
  for (const relative of [...changed.map((file) => file.relative), ...removed]) {
    statements.push('DELETE FROM rag.documents WHERE project_id=' + sql(projectId) + ' AND path=' + sql(relative));
  }
  for (const file of changed) {
    for (const chunk of chunksFor(file)) {
      statements.push('INSERT INTO rag.documents(project_id,path,content_hash,start_line,end_line,content,search_vector) VALUES (' + [projectId, chunk.path, chunk.contentHash, chunk.startLine, chunk.endLine].map(sql).join(',') + ',' + sqlText(chunk.content) + ',to_tsvector(' + sql('simple') + ',' + sql('') + '))');
    }
    statements.push('UPDATE rag.documents SET search_vector=to_tsvector(' + sql('simple') + ',content) WHERE project_id=' + sql(projectId) + ' AND path=' + sql(file.relative));
  }
  statements.push('COMMIT');
  runSqlFile(statements.map((statement) => statement + ';').join('\n'));
  json({ ok: true, command, project: projectName, projectId, indexedFiles: files.length, changedFiles: changed.length, removedFiles: removed.length, chunkCount: files.reduce((sum, file) => sum + chunksFor(file).length, 0), database: db.name });
  process.exit(0);
}

if (command === 'query') {
  const query = getArg('--q', '').trim();
  const top = Math.max(1, Math.min(Number(getArg('--top', '8')) || 8, 20));
  if (!query) {
    json({ ok: true, command, project: projectName, projectId, query, results: [] });
    process.exit(0);
  }
  const pathQuery = query.toLowerCase();
  const rankExpression = 'ts_rank_cd(search_vector, plainto_tsquery(' + sql('simple') + ',' + sql(query) + '))';
  const pathBoostExpression = 'CASE WHEN position(lower(' + sql(pathQuery) + ') in lower(path)) > 0 THEN 0.15 ELSE 0 END';
  const statement = [
    "SELECT coalesce(json_agg(row_to_json(result)),'[]'::json) FROM (",
    'SELECT path, start_line AS "startLine", end_line AS "endLine", round((' + rankExpression + ' + ' + pathBoostExpression + ')::numeric, 6)::float AS score, content_hash AS "sourceHash", content, project_id AS "projectId"',
    'FROM rag.documents WHERE project_id=' + sql(projectId) + ' AND search_vector @@ plainto_tsquery(' + sql('simple') + ',' + sql(query) + ')',
    'ORDER BY score DESC, updated_at DESC, path ASC, start_line ASC LIMIT ' + top,
    ') result;'
  ].join(' ');
  const output = runSql(statement);
  json({ ok: true, command, project: projectName, projectId, query, results: output ? JSON.parse(output) : [] });
  process.exit(0);
}

throw new Error('Usage: rag.mjs build|status|query --dir PATH --project NAME [--q TEXT] [--top K]');
