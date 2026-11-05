import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

const secretPattern = /(?:AIza[0-9A-Za-z_-]{30,}|(?:sk|ghp|github_pat)_[A-Za-z0-9_-]{16,}|Bearer\s+[A-Za-z0-9._~+/=-]+|(?:password|passwd|pwd|secret|apiKey|api_key|token|authorization)\s*[:=]\s*["']?[^\s"';,}]+)/gi;
const safe = (value) => String(value || '').replace(secretPattern, '[REDACTED_SECRET]').slice(0, 2000);

async function appendTrace({ dir = process.cwd(), taskId, projectId = null, evidenceRefs = [], event, status = 'observed', result = '', details = '' } = {}) {
  if (!taskId || !/^[A-Za-z0-9][A-Za-z0-9._-]{0,95}$/.test(taskId)) throw new Error('taskId is required and must be a safe identifier');
  const tracesDir = path.join(path.resolve(dir), '.agents', 'ultra-v3', 'traces');
  await fs.mkdir(tracesDir, { recursive: true });
  const tracePath = path.join(tracesDir, `${taskId}.jsonl`);
  const record = {
    schemaVersion: 1,
    traceId: crypto.randomUUID(),
    recordedAt: new Date().toISOString(),
    taskId,
    projectId: projectId ? safe(projectId) : null,
    evidenceRefs: Array.isArray(evidenceRefs) ? evidenceRefs.map(safe).slice(0, 20) : [],
    event: safe(event),
    status: safe(status),
    result: safe(result),
    details: safe(details),
  };
  await fs.appendFile(tracePath, `${JSON.stringify(record)}\n`, 'utf8');
  return { ok: true, tracePath, record };
}

export { appendTrace };

if (process.argv[1] && path.basename(process.argv[1]) === 'trace.mjs') {
  const args = process.argv.slice(2);
  const getArg = (name, fallback = '') => { const index = args.indexOf(name); return index >= 0 && args[index + 1] ? args[index + 1] : fallback; };
  appendTrace({
    dir: getArg('--dir', process.cwd()),
    taskId: getArg('--task'),
    projectId: getArg('--project') || null,
    evidenceRefs: getArg('--evidence').split(',').map((value) => value.trim()).filter(Boolean),
    event: getArg('--event'),
    status: getArg('--status', 'observed'),
    result: getArg('--result'),
    details: getArg('--details'),
  }).then((output) => console.log(JSON.stringify(output, null, 2)))
    .catch((error) => { console.error(`Ultra Agent v3 trace: ${error.message}`); process.exitCode = 1; });
}
