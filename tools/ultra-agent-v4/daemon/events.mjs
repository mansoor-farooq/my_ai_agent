import fs from 'node:fs';
import path from 'node:path';

const secretPattern = /(?:AIza[0-9A-Za-z_-]{20,}|(?:sk|ghp|github_pat)_[A-Za-z0-9_-]{8,}|Bearer\s+[A-Za-z0-9._~+/=-]+|(?:password|passwd|pwd|secret|apiKey|api_key|token|authorization)\s*[:=]\s*["']?[^\s"';,}]+)/gi;

export function redact(value, limit = 4000) {
  return String(value ?? '').replace(secretPattern, '[REDACTED_SECRET]').slice(0, limit);
}

function ensureRunDir(runsDir, runId) {
  const dir = path.join(runsDir, runId);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

export function appendRuntimeEvent({ runsDir, runId, event = {}, now = new Date().toISOString() }) {
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]{0,120}$/.test(String(runId || ''))) throw new Error('safe runId is required');
  const runDir = ensureRunDir(runsDir, runId);
  const record = {
    schema: 'mansoor.runtime-event/v1',
    runId: String(runId),
    createdAt: String(event.createdAt || now),
    kind: redact(event.kind || 'progress', 80),
    status: redact(event.status || 'running', 80),
    agent: redact(event.agent || 'Mansoor AI Team Manager', 120),
    message: redact(event.message || ''),
    evidenceIds: Array.isArray(event.evidenceIds) ? event.evidenceIds.map((id) => redact(id, 160)).slice(0, 50) : [],
    details: event.details && typeof event.details === 'object' ? JSON.parse(redact(JSON.stringify(event.details))) : undefined,
  };
  fs.appendFileSync(path.join(runDir, 'events.jsonl'), `${JSON.stringify(record)}\n`, 'utf8');
  return record;
}

export function readRuntimeEvents({ runsDir, runId, after = 0, limit = 200 }) {
  const file = path.join(ensureRunDir(runsDir, runId), 'events.jsonl');
  if (!fs.existsSync(file)) return [];
  return fs.readFileSync(file, 'utf8').split(/\r?\n/).filter(Boolean).map((line) => JSON.parse(line)).slice(Math.max(0, Number(after) || 0), Math.max(0, Number(after) || 0) + Math.max(1, Math.min(1000, Number(limit) || 200)));
}
