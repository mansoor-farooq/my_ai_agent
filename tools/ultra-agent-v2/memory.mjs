#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { projectIdentity } from './project-identity.mjs';

const args = process.argv.slice(2);
const commandName = args[0] || 'status';
const getArg = (name, fallback = '') => {
  const index = args.indexOf(name);
  return index >= 0 && args[index + 1] ? args[index + 1] : fallback;
};
const projectDir = path.resolve(getArg('--dir', process.cwd()));
if (!fs.existsSync(projectDir)) throw new Error(`Project directory does not exist: ${projectDir}`);

const memoryDir = path.join(projectDir, '.agents', 'memory');
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
  const explicitGitUrl = getArg('--git-url', '');
  return projectIdentity({ dir: projectDir, project: name, gitUrl: explicitGitUrl || undefined });
}

function writeIfMissing(file, content) { if (!fs.existsSync(file)) fs.writeFileSync(file, content, 'utf8'); }
function timestamp() { return new Date().toISOString(); }
function safeFile(name) { return new Set(['PROJECT_MEMORY.md', 'project-map.md', 'decisions.md', 'change-log.md', 'open-questions.md']).has(name) ? name : null; }
function readJsonl(file) {
  if (!fs.existsSync(file)) return [];
  return fs.readFileSync(file, 'utf8').split(/\r?\n/).filter(Boolean).flatMap((line) => {
    try { return [JSON.parse(line)]; } catch { return []; }
  });
}
function positiveInt(value, fallback, maximum = 500) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? Math.min(parsed, maximum) : fallback;
}
function atomicWrite(file, content) {
  const temp = `${file}.${process.pid}.${crypto.randomBytes(4).toString('hex')}.tmp`;
  fs.writeFileSync(temp, content, 'utf8');
  fs.renameSync(temp, file);
}

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
} else if (commandName === 'compact') {
  fs.mkdirSync(memoryDir, { recursive: true });
  const project = identity();
  const maxFacts = positiveInt(getArg('--max-facts', '50'), 50);
  const maxNotes = positiveInt(getArg('--max-notes', '50'), 50);
  const ledgers = ['research-ledger.jsonl', 'verification-ledger.jsonl'];
  const records = ledgers.flatMap((file) => readJsonl(path.join(memoryDir, file)))
    .filter((record) => record?.projectId === project.projectId);
  const superseded = new Set(records.flatMap((record) => Array.isArray(record.supersedes) ? record.supersedes : []));
  const active = records.filter((record) => !superseded.has(record.id));
  const staleRecords = active.filter((record) => (record.commit && record.commit !== project.commit)
    || (record.validUntil && Date.parse(record.validUntil) < Date.now()));
  const unversionedRecords = active.filter((record) => !record.commit && !staleRecords.includes(record));
  const factRecords = active.filter((record) => !staleRecords.includes(record) && !unversionedRecords.includes(record));
  const groups = new Map();
  for (const record of active.filter((item) => item.subject && item.claim && !staleRecords.includes(item))) {
    const key = String(record.subject).toLowerCase().trim();
    const values = groups.get(key) || [];
    values.push(record);
    groups.set(key, values);
  }
  const conflicts = [];
  const conflictingSubjects = new Set();
  for (const [subject, candidates] of groups) {
    const claims = [...new Set(candidates.map((record) => String(record.claim).trim()))];
    if (claims.length > 1) {
      conflictingSubjects.add(subject);
      conflicts.push({ subject, claims: claims.map(sanitize), evidenceRefs: candidates.map((record) => record.id).filter(Boolean) });
    }
  }
  const passing = new Set(['pass', 'passed', 'verified', 'complete', 'success']);
  const currentFacts = factRecords
    .filter((record) => record.subject && record.claim && passing.has(String(record.status).toLowerCase()) && !conflictingSubjects.has(String(record.subject).toLowerCase().trim()))
    .sort((a, b) => String(b.recordedAt || '').localeCompare(String(a.recordedAt || '')))
    .slice(0, maxFacts)
    .map((record) => ({ id: record.id, kind: record.kind, subject: sanitize(record.subject), claim: sanitize(record.claim), status: record.status, recordedAt: record.recordedAt, commit: record.commit || null }));
  const noteFiles = ['decisions.md', 'open-questions.md'];
  const notes = Object.fromEntries(noteFiles.map((file) => {
    const lines = fs.existsSync(path.join(memoryDir, file)) ? fs.readFileSync(path.join(memoryDir, file), 'utf8').split(/\r?\n/).map((line) => line.trim()).filter((line) => line && !line.startsWith('#')).slice(-maxNotes).map(sanitize) : [];
    return [file, lines];
  }));
  const ledgerHashes = Object.fromEntries(ledgers.map((file) => {
    const target = path.join(memoryDir, file);
    const bytes = fs.existsSync(target) ? fs.readFileSync(target) : Buffer.alloc(0);
    return [file, crypto.createHash('sha256').update(bytes).digest('hex')];
  }));
  const extraConflicts = [];
  const unversionedSubjects = new Set();
  for (const record of unversionedRecords) {
    const subject = String(record.subject || '').toLowerCase().trim();
    if (!subject || unversionedSubjects.has(subject)) continue;
    unversionedSubjects.add(subject);
    if (conflicts.some((conflict) => conflict.subject === subject)) continue;
    extraConflicts.push({ type: 'unversioned-evidence', subject: sanitize(record.subject), claim: sanitize(record.claim), evidenceRefs: [record.id].filter(Boolean) });
  }
  for (const record of staleRecords) {
    extraConflicts.push({ type: 'stale-evidence', subject: sanitize(record.subject), evidenceRefs: [record.id].filter(Boolean), recordCommit: sanitize(record.commit), currentCommit: sanitize(project.commit) });
  }
  const snapshot = {
    schemaVersion: 1,
    generatedAt: timestamp(),
    project,
    currentFacts,
    unresolvedConflicts: [...conflicts, ...extraConflicts].slice(0, maxFacts),
    notes,
    omitted: { facts: Math.max(0, factRecords.length - currentFacts.length), conflicts: Math.max(0, conflicts.length + extraConflicts.length - maxFacts) },
    ledgerHashes,
  };
  const snapshotPath = path.join(memoryDir, 'context-snapshot.json');
  atomicWrite(snapshotPath, `${JSON.stringify(snapshot, null, 2)}\n`);
  console.log(JSON.stringify({ ok: true, command: 'compact', snapshotPath, project, counts: { records: records.length, currentFacts: currentFacts.length, conflicts: conflicts.length } }, null, 2));
} else {
  throw new Error('Usage: node memory.mjs init|append|status|compact [--dir PATH]');
}

