#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const args = process.argv.slice(2);
const commandName = args[0] || 'status';
const getArg = (name, fallback = '') => {
  const index = args.indexOf(name);
  return index >= 0 && args[index + 1] ? args[index + 1] : fallback;
};
const projectDir = path.resolve(getArg('--dir', process.cwd()));
if (!fs.existsSync(projectDir)) throw new Error(`Project directory does not exist: ${projectDir}`);

const memoryDir = path.join(projectDir, '.agents', 'memory');
const slugify = (value, fallback = 'project') => value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 48) || fallback;
const git = (gitArgs) => { const result = spawnSync('git', gitArgs, { cwd: projectDir, encoding: 'utf8', windowsHide: true }); return result.status === 0 ? result.stdout.trim() : ''; };
const sanitizeGitUrl = (raw) => {
  if (!raw) return null;
  try { const url = new URL(raw.replace(/^git@([^:]+):/, 'ssh://git@$1/')); url.username = url.username === 'git' ? 'git' : ''; url.password = ''; return url.toString().replace(/\/$/, ''); } catch { return raw.replace(/:\/\/[^@]+@/, '://'); }
};
const secretPatterns = [
  /AIza[0-9A-Za-z_-]{30,}/g,
  /(?:sk|ghp|github_pat)_[A-Za-z0-9_-]{16,}/g,
  /Bearer\s+[A-Za-z0-9._~+/=-]+/gi,
  /((?:password|passwd|pwd|secret|apiKey|api_key|token|access[_-]?token|refresh[_-]?token|authorization)\s*[:=]\s*["']?)([^\s"';,}]+)/gi,
  /(postgres|mysql|mongodb(?:\+srv)?:\/\/)[^\s"']+/gi,
];
function sanitize(value) { let result = String(value); for (const pattern of secretPatterns) result = result.replace(pattern, (...match) => match.length > 2 && typeof match[1] === 'string' ? `${match[1]}[REDACTED_SECRET]` : '[REDACTED_SECRET]'); return result; }

function identity() {
  const name = getArg('--project', path.basename(projectDir));
  const slug = slugify(name);
  const gitUrl = sanitizeGitUrl(getArg('--git-url', git(['config', '--get', 'remote.origin.url'])));
  const projectId = crypto.createHash('sha256').update(`${(gitUrl || `local:${projectDir}`).toLowerCase()}|${slug}`).digest('hex').slice(0, 8);
  return { name, slug, projectId, gitUrl, branch: git(['branch', '--show-current']) || null, commit: git(['rev-parse', '--short', 'HEAD']) || null };
}

function writeIfMissing(file, content) { if (!fs.existsSync(file)) fs.writeFileSync(file, content, 'utf8'); }
function timestamp() { return new Date().toISOString(); }
function safeFile(name) { return new Set(['PROJECT_MEMORY.md', 'project-map.md', 'decisions.md', 'change-log.md', 'open-questions.md']).has(name) ? name : null; }

if (commandName === 'init') {
  fs.mkdirSync(memoryDir, { recursive: true });
  const project = identity();
  const header = `# Project Memory\n\n- Schema: 1\n- Generated: ${timestamp()}\n- Project: ${project.name}\n- Project ID: ${project.projectId}\n- Git URL: ${project.gitUrl || 'not provided'}\n- Branch: ${project.branch || 'detached-or-unknown'}\n- Commit: ${project.commit || 'unknown'}\n\nThis is an evidence cache. Re-check source before security, money, persistence or irreversible decisions. Hidden reasoning, secrets, customer data and raw unrelated chats are never stored here.\n`;
  writeIfMissing(path.join(memoryDir, 'PROJECT_MEMORY.md'), header);
  writeIfMissing(path.join(memoryDir, 'project-map.md'), `# Project Map\n\n- Last refreshed: ${timestamp()}\n- Entry point and affected flow: pending repository discovery\n- Manifests: pending preflight\n- Data boundaries: pending repository discovery\n- Verification command: pending\n`);
  writeIfMissing(path.join(memoryDir, 'decisions.md'), '# Decisions\n\nRecord: question → observed evidence → options → decision → verification → reversal condition.\n');
  writeIfMissing(path.join(memoryDir, 'change-log.md'), '# Change Log\n\n');
  writeIfMissing(path.join(memoryDir, 'open-questions.md'), '# Open Questions\n\n');
  writeIfMissing(path.join(memoryDir, 'research-ledger.jsonl'), '');
  writeIfMissing(path.join(memoryDir, 'verification-ledger.jsonl'), '');
  console.log(JSON.stringify({ ok: true, command: 'init', memoryDir, project }));
} else if (commandName === 'append') {
  fs.mkdirSync(memoryDir, { recursive: true });
  const fileName = safeFile(getArg('--file', 'change-log.md'));
  const text = getArg('--text', '');
  if (!fileName) throw new Error('Allowed memory files: PROJECT_MEMORY.md, project-map.md, decisions.md, change-log.md, open-questions.md');
  if (!text) throw new Error('--text is required');
  fs.appendFileSync(path.join(memoryDir, fileName), `\n## ${timestamp()}\n\n${sanitize(text)}\n`, 'utf8');
  console.log(JSON.stringify({ ok: true, command: 'append', file: fileName, redacted: true }));
} else if (commandName === 'status') {
  const files = ['PROJECT_MEMORY.md', 'project-map.md', 'decisions.md', 'change-log.md', 'open-questions.md', 'research-ledger.jsonl', 'verification-ledger.jsonl'];
  console.log(JSON.stringify({ ok: true, command: 'status', memoryDir, project: identity(), files: Object.fromEntries(files.map((file) => [file, fs.existsSync(path.join(memoryDir, file))])) }, null, 2));
} else {
  throw new Error('Usage: node memory.mjs init|append|status [--dir PATH]');
}

