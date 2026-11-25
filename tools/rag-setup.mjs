#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ALLOWED_KEYS = new Set([
  'RAG_DB_HOST', 'RAG_DB_PORT', 'RAG_DB_NAME', 'RAG_DB_USER', 'RAG_DB_PASSWORD',
  'RAG_PSQL_PATH', 'RAG_DATABASE_URL', 'DATABASE_URL', 'PGHOST', 'PGPORT', 'PGDATABASE', 'PGUSER', 'PGPASSWORD',
]);
const LOOPBACK_HOSTS = new Set(['localhost', '127.0.0.1', '::1', '[::1]']);

export function findLocalPsql({ env = process.env, platform = process.platform, existsSync = fs.existsSync, readdirSync = fs.readdirSync } = {}) {
  const explicit = env.RAG_PSQL_PATH;
  if (explicit) return explicit;
  const candidates = [];
  if (platform === 'win32') {
    for (const base of [env.ProgramFiles, env['ProgramFiles(x86)']].filter(Boolean)) {
      const postgresRoot = path.join(base, 'PostgreSQL');
      try {
        const versions = readdirSync(postgresRoot, { withFileTypes: true })
          .filter((entry) => entry.isDirectory())
          .map((entry) => entry.name)
          .sort((a, b) => b.localeCompare(a, undefined, { numeric: true }));
        for (const version of versions) candidates.push(path.join(postgresRoot, version, 'bin', 'psql.exe'));
      } catch {}
    }
  } else {
    candidates.push('/usr/bin/psql', '/usr/local/bin/psql', '/usr/pgsql-17/bin/psql', '/opt/homebrew/bin/psql');
  }
  return candidates.find((candidate) => existsSync(candidate)) || 'psql';
}

export function parseEnvFile(text = '') {
  const parsed = {};
  for (const rawLine of String(text).split(/\r?\n/)) {
    const line = rawLine.trim().replace(/^export\s+/, '');
    if (!line || line.startsWith('#')) continue;
    const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!match) continue;
    const [, key] = match;
    if (!ALLOWED_KEYS.has(key)) continue;
    let value = match[2].trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
      if (match[2].trim().startsWith('"')) value = value.replaceAll('\\n', '\n').replaceAll('\\r', '\r');
    } else {
      value = value.replace(/\s+#.*$/, '').trim();
    }
    parsed[key] = value;
  }
  return parsed;
}

function readLocalSettings(projectDir, readFile = fs.readFileSync) {
  const merged = {};
  // Low-to-high precedence. Process environment always wins over local files.
  for (const name of ['.env.example', 'example.env', '.env', '.env.local']) {
    try { Object.assign(merged, parseEnvFile(readFile(path.join(projectDir, name), 'utf8'))); } catch {}
  }
  return merged;
}

function parseConnectionUrl(value) {
  if (!value) return null;
  try {
    const parsed = new URL(value);
    if (!['postgres:', 'postgresql:'].includes(parsed.protocol)) return { invalid: true };
    return {
      host: decodeURIComponent(parsed.hostname || 'localhost'),
      port: parsed.port || '5432',
      user: decodeURIComponent(parsed.username || 'postgres'),
      password: decodeURIComponent(parsed.password || ''),
      name: decodeURIComponent(parsed.pathname.replace(/^\//, '') || 'mansoor_agent_rag'),
    };
  } catch { return { invalid: true }; }
}

export function resolveRagConfig({ projectDir, env = process.env, readFile = fs.readFileSync } = {}) {
  const files = readLocalSettings(projectDir || process.cwd(), readFile);
  const merged = { ...files };
  for (const [key, value] of Object.entries(env || {})) if (ALLOWED_KEYS.has(key) && value !== '') merged[key] = value;
  const urlValue = merged.RAG_DATABASE_URL || merged.DATABASE_URL || '';
  const fromUrl = parseConnectionUrl(urlValue);
  const host = merged.RAG_DB_HOST || merged.PGHOST || fromUrl?.host || 'localhost';
  const port = merged.RAG_DB_PORT || merged.PGPORT || fromUrl?.port || '5432';
  const user = merged.RAG_DB_USER || merged.PGUSER || fromUrl?.user || 'postgres';
  const name = merged.RAG_DB_NAME || merged.PGDATABASE || fromUrl?.name || 'mansoor_agent_rag';
  const password = merged.RAG_DB_PASSWORD || merged.PGPASSWORD || fromUrl?.password || '';
  const psql = findLocalPsql({ env: { ...process.env, ...merged } });
  if (fromUrl?.invalid) return { status: 'invalid-database-url', host, port, user, name, password: '', psql };
  if (!LOOPBACK_HOSTS.has(String(host).toLowerCase())) return { status: 'remote-db-skipped', host, port, user, name, password: '', psql };
  if (!/^[A-Za-z_][A-Za-z0-9_-]*$/.test(name)) return { status: 'invalid-database-name', host, port, user, name, password: '', psql };
  if (!/^\d{1,5}$/.test(String(port)) || Number(port) < 1 || Number(port) > 65535) return { status: 'invalid-database-port', host, port, user, name, password: '', psql };
  return { status: 'configured', host, port: String(port), user, name, password, psql };
}

export function psqlProbeArgs(config) {
  return ['-X', '-w', '-h', config.host, '-p', config.port, '-U', config.user, '-d', 'postgres', '-Atqc', 'SELECT 1'];
}

export function classifyProbeFailure(error = '') {
  const text = String(error).toLowerCase();
  if (/eperm|eacces|operation not permitted|access is denied/.test(text)) return 'client-execution-blocked';
  if (/enoent|not found|is not recognized/.test(text)) return 'psql-not-installed';
  if (/password authentication failed|no password supplied|role .+ does not exist|authentication failed/.test(text)) return 'credentials-rejected';
  if (/connection refused|could not connect to server|actively refused/.test(text)) return 'postgres-not-listening';
  if (/timeout|timed out/.test(text)) return 'connection-timeout';
  return 'connection-failed';
}

export function probePostgres(config, { run = spawnSync, timeout = 6_000 } = {}) {
  if (config.status !== 'configured') return { status: config.status, ready: false };
  const result = run(config.psql, psqlProbeArgs(config), {
    env: { ...process.env, PGPASSWORD: config.password }, encoding: 'utf8', windowsHide: true, timeout, maxBuffer: 64 * 1024,
  });
  if (!result.error && result.status === 0 && String(result.stdout || '').trim() === '1') {
    return { status: 'ready', ready: true, database: config.name };
  }
  const signature = [result.error?.code, result.error?.message, result.stderr, result.stdout].filter(Boolean).join(' ');
  return { status: classifyProbeFailure(signature), ready: false };
}

const guidance = {
  ready: 'Local PostgreSQL is reachable. RAG can use the configured local credentials.',
  'remote-db-skipped': 'RAG skipped the non-local database URL. Use localhost, 127.0.0.1, or ::1 for local-only setup.',
  'invalid-database-url': 'RAG skipped an invalid database URL. Check the local PostgreSQL URL in your environment file.',
  'invalid-database-name': 'RAG could not use the database name. Use letters, digits, underscores, and hyphens.',
  'invalid-database-port': 'RAG could not use the database port. Set a valid local PostgreSQL port.',
  'psql-not-installed': 'PostgreSQL client psql was not found. Install the client or set RAG_PSQL_PATH; no RAG data was changed.',
  'postgres-not-listening': 'No local PostgreSQL server accepted the connection. Start the service or check its port; then rerun rag:doctor.',
  'credentials-rejected': 'Local PostgreSQL rejected the credentials. Update RAG_DB_USER/RAG_DB_PASSWORD (or PGUSER/PGPASSWORD) in the local env file, then rerun rag:doctor.',
  'connection-timeout': 'Local PostgreSQL did not answer within 6 seconds. Check that the local service is running, then rerun rag:doctor.',
  'client-execution-blocked': 'The host denied launching the local psql client from this runtime. Check Antigravity command permissions or run the read-only doctor from the project terminal; the agent will not retry or bypass host policy.',
  'connection-failed': 'Local PostgreSQL connection failed. Check the local service and env values, then rerun rag:doctor.',
  'setup-failed': 'RAG could not create/update its local index. Check local database create/schema permissions and credentials, update the env file, then rerun rag:setup.',
  'setup-timeout': 'RAG indexing exceeded its five-minute limit. It stopped without retrying; rerun rag:setup after checking the project size and local database.',
};

function emit(result, asJson) {
  if (asJson) process.stdout.write(`${JSON.stringify({ ...result, message: guidance[result.status] || 'RAG setup completed.' })}\n`);
  else process.stdout.write(`${result.ready ? 'RAG READY' : 'RAG NOT READY'} / ${result.status}\n${guidance[result.status] || ''}\n`);
}

export function main(argv = process.argv.slice(2), deps = {}) {
  const command = argv[0] || 'doctor';
  const value = (key, fallback = '') => { const index = argv.indexOf(key); return index >= 0 ? argv[index + 1] || fallback : fallback; };
  const projectDir = path.resolve(value('--dir', process.cwd()));
  const project = value('--project', path.basename(projectDir));
  const asJson = argv.includes('--json');
  if (!['doctor', 'setup'].includes(command)) throw new Error('Usage: rag-setup.mjs doctor|setup [--dir PATH] [--project NAME] [--json]');
  if (!fs.existsSync(projectDir) || !fs.statSync(projectDir).isDirectory()) throw new Error('Project directory does not exist.');
  const config = resolveRagConfig({ projectDir, env: deps.env || process.env, readFile: deps.readFile || fs.readFileSync });
  const probe = probePostgres(config, { run: deps.run || spawnSync, timeout: 6_000 });
  if (!probe.ready) {
    emit(probe, asJson);
    return 2;
  }
  if (command === 'doctor') {
    emit(probe, asJson);
    return 0;
  }
  const runtime = process.execPath;
  const ragScript = path.join(path.dirname(fileURLToPath(import.meta.url)), 'ultra-agent-v2', 'rag.mjs');
  const result = (deps.runBuild || spawnSync)(runtime, [ragScript, 'build', '--dir', projectDir, '--project', project], {
    cwd: projectDir,
    env: { ...process.env, ...(deps.env || {}), PGPASSWORD: config.password, RAG_DB_HOST: config.host, RAG_DB_PORT: config.port, RAG_DB_USER: config.user, RAG_DB_NAME: config.name, RAG_PSQL_PATH: config.psql },
    encoding: 'utf8', windowsHide: true, timeout: 300_000, maxBuffer: 4 * 1024 * 1024,
  });
  if (result.error?.code === 'ETIMEDOUT') {
    emit({ status: 'setup-timeout', ready: false }, asJson);
    return 1;
  }
  if (result.status !== 0) {
    emit({ status: 'setup-failed', ready: false }, asJson);
    return 1;
  }
  let details = {};
  try { details = JSON.parse(String(result.stdout || '').trim().split(/\r?\n/).at(-1)); } catch {}
  const output = { status: 'ready', ready: true, database: config.name, indexedFiles: Number(details.indexedFiles || 0), changedFiles: Number(details.changedFiles || 0), chunkCount: Number(details.chunkCount || 0) };
  emit(output, asJson);
  return 0;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { process.exitCode = main(); }
  catch (error) {
    process.stderr.write(`RAG SETUP ERROR / ${error instanceof Error ? error.message : 'Unexpected error'}\n`);
    process.exitCode = 1;
  }
}
