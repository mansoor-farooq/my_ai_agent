import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const secretPatterns = [
  /AIza[0-9A-Za-z_-]{30,}/g,
  /(?:sk|ghp|github_pat)_[A-Za-z0-9_-]{16,}/g,
  /Bearer\s+[A-Za-z0-9._~+/=-]+/gi,
  /((?:password|passwd|pwd|secret|apiKey|api_key|token|access[_-]?token|refresh[_-]?token|authorization)\s*[:=]\s*["']?)([^\s"';,}]+)/gi,
];
const rawReasoning = /chain[- ]of[- ]thought|hidden reasoning|internal reasoning|private deliberation|model scratchpad/i;
const sanitize = (value) => {
  let result = String(value || '');
  for (const pattern of secretPatterns) result = result.replace(pattern, (...match) => match.length > 2 && typeof match[1] === 'string' ? `${match[1]}[REDACTED_SECRET]` : '[REDACTED_SECRET]');
  return result.slice(0, 2000);
};
const git = (dir, args) => {
  const result = spawnSync('git', args, { cwd: dir, encoding: 'utf8', windowsHide: true });
  return result.status === 0 ? result.stdout.trim() : '';
};
const slugify = (value) => String(value).toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 48) || 'project';
function sanitizedRemote(raw) {
  if (!raw) return null;
  try {
    const url = new URL(raw.replace(/^git@([^:]+):/, 'ssh://git@$1/'));
    url.username = url.username === 'git' ? 'git' : '';
    url.password = '';
    return url.toString().replace(/\/$/, '');
  } catch {
    return String(raw).replace(/:\/\/[^@]+@/, '://');
  }
}
function projectIdentity(dir, name) {
  const gitUrl = sanitizedRemote(git(dir, ['config', '--get', 'remote.origin.url']));
  const projectId = crypto.createHash('sha256').update(`${(gitUrl || `local:${dir}`).toLowerCase()}|${slugify(name)}`).digest('hex').slice(0, 8);
  return { name, slug: slugify(name), projectId, directory: dir, gitUrl, branch: git(dir, ['branch', '--show-current']) || null, commit: git(dir, ['rev-parse', '--short', 'HEAD']) || null };
}

function readJsonl(file) {
  if (!fs.existsSync(file)) return { records: [], malformed: false };
  const records = [];
  let malformed = false;
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    if (!line.trim()) continue;
    try { records.push(JSON.parse(line)); } catch { malformed = true; }
  }
  return { records, malformed };
}

function relevant(record, projectId) {
  if (record?.projectId !== projectId || rawReasoning.test(JSON.stringify(record))) return false;
  return true;
}

function fact(record) {
  return {
    id: sanitize(record.id),
    kind: sanitize(record.kind),
    subject: sanitize(record.subject),
    claim: sanitize(record.claim),
    status: sanitize(record.status),
    recordedAt: sanitize(record.recordedAt),
    commit: sanitize(record.commit),
  };
}

async function buildContextPacket({ dir = process.cwd(), project = path.basename(dir) } = {}) {
  const projectDir = path.resolve(dir);
  const projectInfo = projectIdentity(projectDir, project);
  const memory = path.join(projectDir, '.agents', 'memory');
  const research = readJsonl(path.join(memory, 'research-ledger.jsonl'));
  const verification = readJsonl(path.join(memory, 'verification-ledger.jsonl'));
  const records = [...research.records, ...verification.records].filter((record) => relevant(record, projectInfo.projectId));
  const malformedMemory = [
    research.malformed ? 'research-ledger.jsonl' : null,
    verification.malformed ? 'verification-ledger.jsonl' : null,
  ].filter(Boolean);
  const staleRecords = records.filter((record) => record.commit && record.commit !== projectInfo.commit);
  const currentRecords = records.filter((record) => !staleRecords.includes(record));
  const verifiedFacts = currentRecords
    .filter((record) => ['verified', 'pass', 'passed', 'complete'].includes(String(record.status).toLowerCase()))
    .map(fact);
  const groups = new Map();
  for (const record of currentRecords.filter((candidate) => candidate.subject && candidate.claim)) {
    const key = String(record.subject).toLowerCase().trim();
    const claims = groups.get(key) || [];
    claims.push(record);
    groups.set(key, claims);
  }
  const conflicts = [...groups.entries()]
    .map(([subject, candidates]) => {
      const distinctClaims = [...new Set(candidates.map((record) => String(record.claim).trim()))];
      if (distinctClaims.length < 2) return null;
      return {
        type: 'contradictory-evidence',
        subject: sanitize(subject),
        evidenceRefs: candidates.map((record) => sanitize(record.id)).filter(Boolean).sort(),
        claims: distinctClaims.map(sanitize),
        latestRecordedAt: sanitize(candidates.map((record) => record.recordedAt || '').sort().at(-1)),
      };
    })
    .filter(Boolean);
  const decisionsFile = path.join(memory, 'decisions.md');
  const decisionRecords = [];
  if (fs.existsSync(decisionsFile)) {
    fs.readFileSync(decisionsFile, 'utf8').split(/\r?\n/).forEach((line, index) => {
      const match = line.match(/^\[projectId:([^\]]+)\]\s*\[subject:([^\]]+)\]\s*(.+)$/);
      if (match && match[1] === projectInfo.projectId && !rawReasoning.test(line)) {
        decisionRecords.push({ id: `decision-${index + 1}`, subject: match[2], claim: match[3] });
      }
    });
  }
  const decisionGroups = new Map();
  for (const decision of decisionRecords) {
    const key = decision.subject.toLowerCase().trim();
    const candidates = decisionGroups.get(key) || [];
    candidates.push(decision);
    decisionGroups.set(key, candidates);
  }
  for (const [subject, candidates] of decisionGroups) {
    const claims = [...new Set(candidates.map((candidate) => candidate.claim.trim()))];
    if (claims.length > 1) conflicts.push({
      type: 'contradictory-decision',
      subject: sanitize(subject),
      evidenceRefs: candidates.map((candidate) => candidate.id),
      claims: claims.map(sanitize),
    });
  }
  for (const record of staleRecords) {
    conflicts.push({
      type: 'stale-evidence',
      subject: sanitize(record.subject),
      evidenceRefs: [sanitize(record.id)].filter(Boolean),
      recordCommit: sanitize(record.commit),
      currentCommit: sanitize(projectInfo.commit),
    });
  }
  for (const source of malformedMemory) conflicts.push({ type: 'malformed-memory', source });
  const readNotes = (file) => {
    if (!fs.existsSync(file)) return [];
    return fs.readFileSync(file, 'utf8').split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => {
        const projectMatch = line.match(/^\[projectId:([^\]]+)\]/);
        return line && !line.startsWith('#') && !rawReasoning.test(line) && (!projectMatch || projectMatch[1] === projectInfo.projectId);
      })
      .map(sanitize)
      .filter(Boolean)
      .slice(0, 100);
  };
  return {
    project: projectInfo,
    verifiedFacts,
    decisions: readNotes(path.join(memory, 'decisions.md')),
    openQuestions: readNotes(path.join(memory, 'open-questions.md')),
    conflicts,
    evidenceRefs: records.map((record) => sanitize(record.id)).filter(Boolean),
  };
}

export { buildContextPacket, projectIdentity };

if (process.argv[1] && path.basename(process.argv[1]) === 'context.mjs') {
  const args = process.argv.slice(2);
  const getArg = (name, fallback = '') => { const index = args.indexOf(name); return index >= 0 && args[index + 1] ? args[index + 1] : fallback; };
  buildContextPacket({ dir: getArg('--dir', process.cwd()), project: getArg('--project', path.basename(process.cwd())) })
    .then((packet) => console.log(JSON.stringify(packet, null, 2)))
    .catch((error) => { console.error(`Ultra Agent v3 context: ${error.message}`); process.exitCode = 1; });
}
