#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { sanitizeGitUrl, slugify } from './ultra-agent-v2/project-identity.mjs';

const SCHEMA = 'mansoor.antigravity-local-context/v1';
const DEFAULT_MAX_FILES = 24;
const DEFAULT_MAX_BYTES = 120_000;
const INSTRUCTION_NAMES = [
  'AGENTS.md', 'README.md', 'README.MD', 'package.json', 'pubspec.yaml',
  'pyproject.toml', 'Cargo.toml', 'go.mod', 'Directory.Build.props',
];
const SOURCE_EXTENSIONS = new Set([
  '.c', '.cc', '.cpp', '.cs', '.css', '.dart', '.go', '.html', '.java',
  '.js', '.jsx', '.json', '.kt', '.mjs', '.py', '.razor', '.rs', '.sql',
  '.ts', '.tsx', '.txt', '.xml', '.yaml', '.yml', '.md', '.toml',
]);
const IGNORED_DIRS = new Set([
  '.git', '.agents', 'node_modules', 'vendor', 'dist', 'build', 'coverage',
  '.next', '.dart_tool', '.gradle', '__pycache__', '.venv', 'venv', 'bin', 'obj',
]);
const SECRET_PATTERN = /(?:AIza[0-9A-Za-z_-]{30,}|(?:sk|pk|rk|gh[pousr])_[A-Za-z0-9_-]{16,}|-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----|(?:password|passwd|secret|token|api[_-]?key|authorization)\s*[:=]\s*["']?[^\s"';,}]{8,})/gi;
const SECRET_FILE = /(?:^|\/)(?:\.env(?:\..*)?|id_rsa|credentials?|secrets?|private[_-]?key|.*\.(?:pem|key|p12|pfx|sqlite|db|zip|7z|rar))$/i;

const sha256 = (value) => crypto.createHash('sha256').update(String(value), 'utf8').digest('hex');
const normalize = (value) => String(value || '').replaceAll('\\', '/').replace(/^\.\//, '');
const tokensFor = (value) => [...new Set(String(value || '').toLowerCase().match(/[a-z0-9_$.-]+/g) || [])].filter((token) => token.length > 1).slice(0, 24);
const isSafeRelative = (relative) => {
  const normalized = normalize(relative);
  return normalized && !normalized.startsWith('../') && !normalized.includes('/../') && !SECRET_FILE.test(normalized)
    && !normalized.split('/').some((part) => IGNORED_DIRS.has(part.toLowerCase()));
};

function runGit(root, args, { timeout = 3_000, exec = execFileSync } = {}) {
  try {
    return exec('git', ['-C', root, ...args], { encoding: 'utf8', windowsHide: true, timeout, maxBuffer: 8 * 1024 * 1024 });
  } catch {
    return '';
  }
}

function fallbackFiles(root, max = 3000, fsApi = fs, current = root, output = [], deadline = Infinity, clock = () => performance.now()) {
  if (output.length >= max || clock() >= deadline) return output;
  let entries = [];
  try { entries = fsApi.readdirSync(current, { withFileTypes: true }); } catch { return output; }
  for (const entry of entries) {
    if (output.length >= max || clock() >= deadline) break;
    const absolute = path.join(current, entry.name);
    const relative = normalize(path.relative(root, absolute));
    if (entry.isDirectory()) {
      if (!IGNORED_DIRS.has(entry.name.toLowerCase())) fallbackFiles(root, max, fsApi, absolute, output, deadline, clock);
    } else if (entry.isFile() && isSafeRelative(relative) && SOURCE_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) {
      output.push(relative);
    }
  }
  return output;
}

export function listProjectFiles(root, { run = runGit, fsApi = fs, deadline = Infinity, clock = () => performance.now() } = {}) {
  const listed = run(root, ['ls-files', '--cached', '--others', '--exclude-standard', '-z']);
  const files = listed ? listed.split('\0').map(normalize).filter(isSafeRelative) : fallbackFiles(root, 3000, fsApi, root, [], deadline, clock);
  return [...new Set(files)].sort();
}

export function grepProjectFiles(root, tokens, { run = runGit } = {}) {
  if (!tokens.length) return [];
  const output = run(root, ['grep', '-Il', ...tokens.flatMap((token) => ['-e', token]), '--']);
  return [...new Set(output.split(/\r?\n/).map(normalize).filter(isSafeRelative))];
}

export function redactText(text) {
  return String(text || '').replace(SECRET_PATTERN, '[REDACTED_SECRET]');
}

function scorePath(relative, tokens, grepMatches, required) {
  const lower = relative.toLowerCase();
  let score = required.has(relative) ? 100 : 0;
  if (grepMatches.has(relative)) score += 40;
  for (const token of tokens) if (lower.includes(token)) score += 8;
  if (lower.split('/').length <= 2) score += 2;
  return score;
}

export function selectLocalCandidates(files, { query = '', grepMatches = [], maxFiles = DEFAULT_MAX_FILES } = {}) {
  const tokens = tokensFor(query);
  const safeFiles = files.map(normalize).filter(isSafeRelative);
  const grepSet = new Set(grepMatches.map(normalize));
  const required = new Set(safeFiles.filter((file) => INSTRUCTION_NAMES.some((name) => name.toLowerCase() === path.basename(file).toLowerCase())));
  const ranked = safeFiles.map((file) => ({ path: file, score: scorePath(file, tokens, grepSet, required) }))
    .filter((entry) => entry.score > 0 || !tokens.length)
    .sort((left, right) => right.score - left.score || left.path.localeCompare(right.path));
  const selected = ranked.slice(0, Math.max(1, Math.min(100, Number(maxFiles) || DEFAULT_MAX_FILES))).map((entry) => entry.path);
  if (!selected.length) return safeFiles.slice(0, Math.max(1, Math.min(100, Number(maxFiles) || DEFAULT_MAX_FILES)));
  return [...new Set(selected)];
}

export function extractSnippets(text, query = '', maxSnippets = 8) {
  const lines = redactText(text).split(/\r?\n/);
  const tokens = tokensFor(query);
  const matching = tokens.length ? lines.map((line, index) => tokens.some((token) => line.toLowerCase().includes(token)) ? index : -1).filter((index) => index >= 0) : [0];
  const ranges = [];
  for (const index of matching.slice(0, Math.max(1, maxSnippets * 2))) {
    const start = Math.max(0, index - 2);
    const end = Math.min(lines.length - 1, index + 2);
    const previous = ranges.at(-1);
    if (previous && start <= previous.end + 1) previous.end = Math.max(previous.end, end);
    else ranges.push({ start, end });
  }
  return ranges.slice(0, maxSnippets).map(({ start, end }) => ({
    startLine: start + 1,
    endLine: end + 1,
    text: lines.slice(start, end + 1).join('\n').slice(0, 8_000),
  }));
}

function sourceRevision(root, { run = runGit } = {}) {
  const commit = run(root, ['rev-parse', '--short', 'HEAD']).trim();
  const status = run(root, ['status', '--porcelain=v1', '-z', '--untracked-files=all']);
  return { commit: commit || null, workingTreeHash: `sha256:${sha256(status)}`, statusBytes: status.length };
}

function localIdentity(root, project, revision, { run = runGit } = {}) {
  const gitUrl = sanitizeGitUrl(run(root, ['config', '--get', 'remote.origin.url']).trim()) || null;
  const slug = slugify(project);
  const projectId = sha256(`${(gitUrl || `local:${root}`).toLowerCase()}|${slug}`).slice(0, 8);
  return { name: project, slug, projectId, directory: root, gitUrl, branch: run(root, ['branch', '--show-current']).trim() || null, commit: revision.commit };
}

function readCache(file, key, fsApi = fs) {
  try {
    const cache = JSON.parse(fsApi.readFileSync(file, 'utf8'));
    if (cache?.schema === SCHEMA && cache.cacheKey === key && cache.packet) return cache.packet;
  } catch {}
  return null;
}

function writeCache(file, key, packet, fsApi = fs) {
  try {
    fsApi.mkdirSync(path.dirname(file), { recursive: true });
    const temporary = `${file}.tmp-${process.pid}-${Date.now()}`;
    fsApi.writeFileSync(temporary, `${JSON.stringify({ schema: SCHEMA, cacheKey: key, generatedAt: new Date().toISOString(), packet }, null, 2)}\n`, 'utf8');
    fsApi.renameSync(temporary, file);
  } catch {}
}

export function prepareLocalContext({ dir = process.cwd(), project = path.basename(path.resolve(dir)), query = '', maxFiles = DEFAULT_MAX_FILES, maxBytes = DEFAULT_MAX_BYTES, budgetMs = 45_000, deps = {} } = {}) {
  const fsApi = deps.fsApi || fs;
  const root = path.resolve(dir);
  if (!fsApi.existsSync(root) || !fsApi.statSync(root).isDirectory()) throw new Error(`Project directory does not exist: ${root}`);
  const clock = deps.clock || (() => performance.now());
  const startedAt = clock();
  const boundedBudgetMs = Math.max(250, Math.min(120_000, Number(budgetMs) || 45_000));
  const deadline = startedAt + boundedBudgetMs;
  const run = deps.runGit || ((gitRoot, args) => runGit(gitRoot, args, { timeout: Math.max(100, Math.min(3_000, deadline - clock())) }));
  const revision = sourceRevision(root, { run });
  const identity = deps.identity || localIdentity(root, project, revision, { run });
  const files = listProjectFiles(root, { run, fsApi, deadline, clock });
  const tokens = tokensFor(query);
  const grepMatches = clock() < deadline ? grepProjectFiles(root, tokens, { run }) : [];
  const selected = selectLocalCandidates(files, { query, grepMatches, maxFiles });
  const cacheFile = path.join(root, '.agents', 'memory', 'antigravity-local-context.json');
  const cacheKey = `sha256:${sha256(JSON.stringify({ projectId: identity.projectId, commit: revision.commit, workingTreeHash: revision.workingTreeHash, query: String(query).trim().toLowerCase(), maxFiles, maxBytes, selected }))}`;
  const cached = deps.force ? null : readCache(cacheFile, cacheKey, fsApi);
  if (cached) {
    return {
      ...cached,
      cacheHit: true,
      cacheFile,
      metrics: { ...cached.metrics, cacheHit: true, durationMs: Math.max(0, Math.round(clock() - startedAt)), budgetMs: boundedBudgetMs },
    };
  }

  const evidence = [];
  let readFiles = 0;
  let stopReason = null;
  for (const relative of selected) {
    if (clock() >= deadline) { stopReason = 'budget-exhausted'; break; }
    if (!isSafeRelative(relative)) continue;
    const absolute = path.resolve(root, relative);
    if (!absolute.startsWith(`${root}${path.sep}`)) continue;
    let stat;
    try { stat = fsApi.statSync(absolute); } catch { continue; }
    if (!stat.isFile() || stat.size > maxBytes) continue;
    let text;
    try { text = fsApi.readFileSync(absolute, 'utf8'); } catch { continue; }
    readFiles += 1;
    const redacted = redactText(text);
    const snippets = extractSnippets(redacted, query);
    if (!snippets.length && tokens.length) continue;
    evidence.push({ path: relative, sourceHash: `sha256:${sha256(redacted)}`, size: stat.size, snippets });
  }
  const packet = {
    schema: SCHEMA,
    project: identity,
    revision,
    query: String(query || '').trim(),
    selectedFiles: selected,
    evidence,
    metrics: { candidateFiles: files.length, grepMatches: grepMatches.length, selectedFiles: selected.length, contentReads: readFiles, cacheHit: false, durationMs: Math.max(0, Math.round(clock() - startedAt)), budgetMs: boundedBudgetMs, timedOut: Boolean(stopReason), stopReason },
    retrieval: { backend: 'antigravity-local-git', databaseRequired: false, bounded: true, latencyBudgetMs: boundedBudgetMs, secretsRedacted: true, next: 'Re-read only the cited current lines before editing.' },
  };
  writeCache(cacheFile, cacheKey, packet, fsApi);
  return { ...packet, cacheHit: false, cacheFile };
}

function cli() {
  const args = process.argv.slice(2);
  const command = args[0] || 'prepare';
  const value = (name, fallback = '') => { const index = args.indexOf(name); return index >= 0 && args[index + 1] ? args[index + 1] : fallback; };
  if (!['prepare', 'query', 'status'].includes(command)) throw new Error('Usage: antigravity-local-context.mjs prepare|query|status --dir PATH --project NAME --query TEXT');
  const dir = path.resolve(value('--dir', process.cwd()));
  const cacheFile = path.join(dir, '.agents', 'memory', 'antigravity-local-context.json');
  if (command === 'status') {
    let cache = null;
    try { cache = JSON.parse(fs.readFileSync(cacheFile, 'utf8')); } catch {}
    console.log(JSON.stringify({ schema: SCHEMA, status: cache?.schema === SCHEMA ? 'cached' : 'missing', cacheFile, cacheAge: cache?.generatedAt || null }, null, 2));
    return;
  }
  console.log(JSON.stringify(prepareLocalContext({ dir, project: value('--project', path.basename(dir)), query: value('--query', ''), maxFiles: Number(value('--max-files', DEFAULT_MAX_FILES)), maxBytes: Number(value('--max-bytes', DEFAULT_MAX_BYTES)), budgetMs: Number(value('--budget-ms', 45_000)), deps: { force: args.includes('--force') } }), null, 2));
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))) {
  try { cli(); } catch (error) { console.error(`Antigravity local context: ${error.message}`); process.exitCode = 1; }
}
