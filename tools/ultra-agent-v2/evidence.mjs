#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const args = process.argv.slice(2);
const action = args[0] || 'list';
const getArg = (name, fallback = '') => { const index = args.indexOf(name); return index >= 0 && args[index + 1] ? args[index + 1] : fallback; };
const projectDir = path.resolve(getArg('--dir', process.cwd()));
const memoryDir = path.join(projectDir, '.agents', 'memory');
const projectName = getArg('--project', path.basename(projectDir));
const slugify = (value) => String(value).toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 48) || 'project';
const git = (gitArgs) => { const result = spawnSync('git', gitArgs, { cwd: projectDir, encoding: 'utf8', windowsHide: true }); return result.status === 0 ? result.stdout.trim() : ''; };
const gitUrl = (() => { const raw = git(['config', '--get', 'remote.origin.url']); if (!raw) return null; try { const url = new URL(raw.replace(/^git@([^:]+):/, 'ssh://git@$1/')); url.username = url.username === 'git' ? 'git' : ''; url.password = ''; return url.toString().replace(/\/$/, ''); } catch { return raw.replace(/:\/\/[^@]+@/, '://'); } })();
const projectId = crypto.createHash('sha256').update(`${(gitUrl || `local:${projectDir}`).toLowerCase()}|${slugify(projectName)}`).digest('hex').slice(0, 8);
const secretPatterns = [
  /AIza[0-9A-Za-z_-]{30,}/g,
  /(?:sk|ghp|github_pat)_[A-Za-z0-9_-]{16,}/g,
  /Bearer\s+[A-Za-z0-9._~+/=-]+/gi,
  /((?:password|passwd|pwd|secret|apiKey|api_key|token|access[_-]?token|refresh[_-]?token|authorization)\s*[:=]\s*["']?)([^\s"';,}]+)/gi,
];
function sanitize(value) { let result = String(value || ''); for (const pattern of secretPatterns) result = result.replace(pattern, (...match) => match.length > 2 && typeof match[1] === 'string' ? `${match[1]}[REDACTED_SECRET]` : '[REDACTED_SECRET]'); return result; }
function readLines(file) { try { return fs.readFileSync(file, 'utf8').split(/\r?\n/).filter(Boolean).map((line) => JSON.parse(line)); } catch { return []; } }

if (action === 'append') {
  const kind = getArg('--kind');
  if (!['research', 'verification'].includes(kind)) throw new Error('--kind must be research or verification');
  const record = {
    schemaVersion: 1,
    id: getArg('--id') || crypto.createHash('sha256').update([kind, getArg('--question'), getArg('--claim'), getArg('--source-url'), getArg('--command')].join('|')).digest('hex').slice(0, 12),
    kind,
    projectId,
    project: projectName,
    recordedAt: new Date().toISOString(),
    question: sanitize(getArg('--question')),
    claim: sanitize(getArg('--claim')),
    sourceUrl: sanitize(getArg('--source-url')) || null,
    sourceType: sanitize(getArg('--source-type', 'official-or-primary')),
    confidence: sanitize(getArg('--confidence', 'unverified')),
    independentCheck: sanitize(getArg('--independent-check')) || null,
    contradictions: sanitize(getArg('--contradictions')) || null,
    decisionImpact: sanitize(getArg('--decision-impact')) || null,
    command: sanitize(getArg('--command')) || null,
    result: sanitize(getArg('--result')) || null,
    status: sanitize(getArg('--status', 'observed')),
  };
  fs.mkdirSync(memoryDir, { recursive: true });
  const file = path.join(memoryDir, kind === 'research' ? 'research-ledger.jsonl' : 'verification-ledger.jsonl');
  const existing = readLines(file);
  const duplicate = existing.some((entry) => entry.id === record.id);
  if (!duplicate) fs.appendFileSync(file, `${JSON.stringify(record)}\n`, 'utf8');
  console.log(JSON.stringify({ ok: true, action, file, id: record.id, duplicate, secretsRedacted: true }));
} else if (action === 'list') {
  const kind = getArg('--kind', '');
  const files = kind === 'research' ? ['research-ledger.jsonl'] : kind === 'verification' ? ['verification-ledger.jsonl'] : ['research-ledger.jsonl', 'verification-ledger.jsonl'];
  console.log(JSON.stringify(files.flatMap((file) => readLines(path.join(memoryDir, file))), null, 2));
} else {
  throw new Error('Usage: node evidence.mjs append|list [--dir PATH]');
}

