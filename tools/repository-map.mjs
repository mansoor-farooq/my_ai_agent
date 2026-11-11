#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';

const ignoredDirs = new Set(['.git', 'node_modules', '.dart_tool', 'build', 'dist', '.gradle', '.idea', 'coverage', '.agents']);
const sourceExt = new Set(['.js', '.mjs', '.cjs', '.ts', '.tsx', '.jsx', '.py', '.dart', '.cs', '.java', '.kt', '.kts', '.go', '.rs']);

async function filesUnder(root, current = root, output = []) {
  for (const entry of await fs.readdir(current, { withFileTypes: true })) {
    if (entry.isDirectory() && ignoredDirs.has(entry.name)) continue;
    const absolute = path.join(current, entry.name);
    if (entry.isDirectory()) await filesUnder(root, absolute, output);
    else if (sourceExt.has(path.extname(entry.name).toLowerCase())) output.push(path.relative(root, absolute).replaceAll('\\', '/'));
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

export async function buildRepositoryMap({ dir = process.cwd(), includeFiles = null, maxBytesPerFile = 400_000 } = {}) {
  const root = path.resolve(dir);
  const candidates = Array.isArray(includeFiles) ? includeFiles.map((file) => String(file).replaceAll('\\', '/')) : await filesUnder(root);
  const files = [];
  for (const relative of [...new Set(candidates)].sort()) {
    if (relative.split('/').some((part) => ignoredDirs.has(part))) continue;
    const absolute = path.resolve(root, relative);
    if (!absolute.startsWith(`${root}${path.sep}`)) continue;
    try {
      const stat = await fs.stat(absolute);
      if (!stat.isFile() || stat.size > maxBytesPerFile || !sourceExt.has(path.extname(relative).toLowerCase())) continue;
      const text = await fs.readFile(absolute, 'utf8');
      files.push({ path: relative, bytes: stat.size, symbols: extractSymbols(text).map(({ name, kind }) => ({ name, kind })) });
    } catch { /* files may disappear during a concurrent edit */ }
  }
  return { schema: 'mansoor.repository-map/v1', root, generatedAt: new Date().toISOString(), files };
}

export function rankMap(map, query = '', maxSymbols = 80) {
  const terms = String(query).toLowerCase().split(/[^a-z0-9_$]+/).filter(Boolean);
  const ranked = (map?.files || []).map((file) => {
    const haystack = `${file.path} ${(file.symbols || []).map((symbol) => symbol.name).join(' ')}`.toLowerCase();
    const score = terms.reduce((total, term) => total + (haystack.includes(term) ? (file.path.toLowerCase().includes(term) ? 3 : 1) : 0), 0);
    return { ...file, score };
  }).sort((a, b) => b.score - a.score || a.path.localeCompare(b.path));
  const output = [];
  let count = 0;
  for (const file of ranked) {
    if (count >= Math.max(1, Number(maxSymbols) || 80)) break;
    const remaining = Math.max(0, Math.max(1, Number(maxSymbols) || 80) - count);
    const symbols = file.symbols.slice(0, remaining);
    if (!symbols.length && file.score <= 0) continue;
    output.push({ ...file, symbols });
    count += symbols.length || 1;
  }
  return output;
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname)) {
  const args = process.argv.slice(2);
  const value = (name, fallback = '') => { const index = args.indexOf(name); return index >= 0 && args[index + 1] ? args[index + 1] : fallback; };
  buildRepositoryMap({ dir: value('--dir', process.cwd()) }).then((map) => {
    const ranked = rankMap(map, value('--query'), value('--max-symbols', '80'));
    console.log(JSON.stringify({ ...map, files: ranked }, null, 2));
  }).catch((error) => { console.error(error.message); process.exitCode = 1; });
}

