#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

const ignoredDirs = new Set(['.git', 'node_modules', '.dart_tool', 'build', 'dist', '.gradle', '.idea', 'coverage', '.agents']);
const sourceExt = new Set(['.js', '.mjs', '.cjs', '.ts', '.tsx', '.jsx', '.py', '.dart', '.cs', '.java', '.kt', '.kts', '.go', '.rs']);
const schema = 'mansoor.repository-map/v2';

async function filesUnder(root, current = root, output = []) {
  for (const entry of await fs.readdir(current, { withFileTypes: true })) {
    if (entry.isDirectory() && ignoredDirs.has(entry.name)) continue;
    const absolute = path.join(current, entry.name);
    if (entry.isDirectory()) await filesUnder(root, absolute, output);
    else if (entry.isFile() && sourceExt.has(path.extname(entry.name).toLowerCase())) output.push(path.relative(root, absolute).replaceAll('\\', '/'));
  }
  return output;
}

function extractSymbols(text) {
  const symbols = [];
  const patterns = [
    { kind: 'function', regex: /\b(?:export\s+)?(?:async\s+)?function\s+([A-Za-z_$][\w$]*)/g },
    { kind: 'class', regex: /\b(?:export\s+)?class\s+([A-Za-z_$][\w$]*)/g },
    { kind: 'declaration', regex: /\b(?:export\s+)?(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=/g },
    { kind: 'python-function', regex: /^\s*def\s+([A-Za-z_]\w*)\s*\(/gm },
    { kind: 'python-class', regex: /^\s*class\s+([A-Za-z_]\w*)/gm },
    { kind: 'dart-class', regex: /\bclass\s+([A-Za-z_]\w*)/g },
  ];
  for (const { kind, regex } of patterns) {
    for (const match of text.matchAll(regex)) symbols.push({ name: match[1], kind, offset: match.index ?? 0 });
  }
  return [...new Map(symbols.sort((a, b) => a.offset - b.offset || a.name.localeCompare(b.name)).map((item) => [`${item.name}:${item.kind}`, item])).values()];
}

async function statSources(root, candidates, maxBytesPerFile) {
  const entries = [];
  for (const relative of [...new Set(candidates)].sort()) {
    if (relative.split('/').some((part) => ignoredDirs.has(part))) continue;
    const absolute = path.resolve(root, relative);
    if (!absolute.startsWith(`${root}${path.sep}`)) continue;
    try {
      const stat = await fs.stat(absolute);
      if (!stat.isFile() || !sourceExt.has(path.extname(relative).toLowerCase())) continue;
      entries.push({ path: relative, size: stat.size, mtimeMs: stat.mtimeMs, ctimeMs: stat.ctimeMs, eligible: stat.size <= maxBytesPerFile });
    } catch { /* paths can be removed during concurrent edits */ }
  }
  return entries;
}

function fingerprint(entries) {
  const source = entries.map(({ path: file, size, mtimeMs, ctimeMs }) => `${file}:${size}:${mtimeMs}:${ctimeMs}`).join('\n');
  return `sha256:${crypto.createHash('sha256').update(source, 'utf8').digest('hex')}`;
}

function sameMetadata(left, right) {
  return Boolean(left && right && left.path === right.path && left.size === right.size
    && left.mtimeMs === right.mtimeMs && left.ctimeMs === right.ctimeMs);
}

async function readCache(file, root) {
  try {
    const cached = JSON.parse(await fs.readFile(file, 'utf8'));
    if (cached?.schema === schema && cached.root === root && Array.isArray(cached.files) && Array.isArray(cached.fileMetadata)) return cached;
  } catch { /* absent, old schema or malformed cache triggers a rebuild */ }
  return null;
}

async function saveCache(file, map) {
  try {
    await fs.mkdir(path.dirname(file), { recursive: true });
    const temporary = `${file}.tmp-${process.pid}-${Date.now()}`;
    await fs.writeFile(temporary, `${JSON.stringify(map, null, 2)}\n`, 'utf8');
    await fs.rename(temporary, file);
  } catch { /* the cache is an optimization; a fresh in-memory map remains usable */ }
}

export async function buildRepositoryMap({ dir = process.cwd(), includeFiles = null, maxBytesPerFile = 400_000, force = false } = {}) {
  const root = path.resolve(dir);
  const candidates = Array.isArray(includeFiles) ? includeFiles.map((file) => String(file).replaceAll('\\', '/')) : await filesUnder(root);
  const fileMetadata = await statSources(root, candidates, maxBytesPerFile);
  const sourceFingerprint = fingerprint(fileMetadata);
  const cacheFile = Array.isArray(includeFiles) ? null : path.join(root, '.agents', 'memory', 'repository-map.json');
  const cached = cacheFile ? await readCache(cacheFile, root) : null;
  const cachedMetadata = new Map((cached?.fileMetadata || []).map((entry) => [entry.path, entry]));
  const cachedFiles = new Map((cached?.files || []).map((entry) => [entry.path, entry]));
  const currentPaths = new Set(fileMetadata.map((entry) => entry.path));
  const deletedFiles = [...cachedMetadata.keys()].filter((relative) => !currentPaths.has(relative)).length;
  const metadataUnchanged = cached?.sourceFingerprint === sourceFingerprint;
  const thresholdUnchanged = cached?.maxBytesPerFile === maxBytesPerFile;

  if (!force && !Array.isArray(includeFiles) && metadataUnchanged && thresholdUnchanged) {
    const map = {
      schema,
      root,
      generatedAt: cached.generatedAt,
      sourceFingerprint,
      files: cached.files,
      fileMetadata,
      maxBytesPerFile,
    };
    return { ...map, cacheHit: true, metrics: { scannedFiles: fileMetadata.length, changedFiles: 0, reusedFiles: cached.files.length, deletedFiles: 0, contentReads: 0 } };
  }

  const files = [];
  let contentReads = 0;
  let reusedFiles = 0;
  let changedFiles = 0;
  for (const metadata of fileMetadata) {
    const previousMetadata = cachedMetadata.get(metadata.path);
    const unchanged = sameMetadata(previousMetadata, metadata);
    if (!unchanged) changedFiles += 1;
    if (!metadata.eligible) continue;
    const previousFile = cachedFiles.get(metadata.path);
    if (!force && unchanged && previousFile) {
      files.push(previousFile);
      reusedFiles += 1;
      continue;
    }
    try {
      const text = await fs.readFile(path.join(root, metadata.path), 'utf8');
      files.push({ path: metadata.path, bytes: metadata.size, symbols: extractSymbols(text).map(({ name, kind }) => ({ name, kind })) });
      contentReads += 1;
    } catch { /* a path may disappear or become unreadable during indexing */ }
  }

  const map = { schema, root, generatedAt: new Date().toISOString(), sourceFingerprint, files, fileMetadata, maxBytesPerFile };
  if (cacheFile) await saveCache(cacheFile, map);
  return {
    ...map,
    cacheHit: false,
    metrics: { scannedFiles: fileMetadata.length, changedFiles, reusedFiles, deletedFiles, contentReads },
  };
}

export function rankMap(map, query = '', maxSymbols = 80) {
  const terms = String(query).toLowerCase().split(/[^a-z0-9_$]+/).filter(Boolean);
  const limit = Math.max(1, Math.min(500, Number(maxSymbols) || 80));
  const ranked = (map?.files || []).map((file) => {
    const haystack = `${file.path} ${(file.symbols || []).map((symbol) => symbol.name).join(' ')}`.toLowerCase();
    const score = terms.reduce((total, term) => total + (haystack.includes(term) ? (file.path.toLowerCase().includes(term) ? 3 : 1) : 0), 0);
    return { ...file, score };
  }).sort((a, b) => b.score - a.score || a.path.localeCompare(b.path));
  const output = [];
  let count = 0;
  for (const file of ranked) {
    if (count >= limit) break;
    const remaining = Math.max(0, limit - count);
    const symbols = (file.symbols || []).slice(0, remaining);
    if (!symbols.length && file.score <= 0) continue;
    output.push({ ...file, symbols });
    count += symbols.length || 1;
  }
  return output;
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname)) {
  const args = process.argv.slice(2);
  const value = (name, fallback = '') => { const index = args.indexOf(name); return index >= 0 && args[index + 1] ? args[index + 1] : fallback; };
  buildRepositoryMap({ dir: value('--dir', process.cwd()), force: args.includes('--force') }).then((map) => {
    const ranked = rankMap(map, value('--query'), value('--max-symbols', '80'));
    console.log(JSON.stringify({ ...map, files: ranked }, null, 2));
  }).catch((error) => { console.error(error.message); process.exitCode = 1; });
}
