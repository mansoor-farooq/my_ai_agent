import fs from 'node:fs';

const TRANSIENT_CODES = new Set(['ECONNREFUSED', 'ECONNRESET', 'EPIPE', 'ENOENT', 'ETIMEDOUT', 'EHOSTUNREACH', 'ENETUNREACH', 'WSL_RELAY_UNAVAILABLE']);
const HIGH_RISK_PATTERN = /permission|secret|credential|security|destructive|delete|scope|quota|push|deploy|publish|approval/i;

function asNumber(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

export function computeRetryPlan({ attempt = 1, maxAttempts = 3, baseDelayMs = 250, maxDelayMs = 2000, jitterMs = 0 } = {}) {
  const safeAttempt = Math.max(1, Math.floor(asNumber(attempt, 1)));
  const safeMax = Math.max(1, Math.floor(asNumber(maxAttempts, 3)));
  const exponent = Math.max(0, safeAttempt - 1);
  const jitter = Math.max(0, Math.floor(asNumber(jitterMs, 0)));
  const delayMs = Math.min(Math.max(0, Math.floor(asNumber(maxDelayMs, 2000))), Math.max(0, Math.floor(asNumber(baseDelayMs, 250))) * (2 ** exponent) + jitter);
  return { attempt: safeAttempt, maxAttempts: safeMax, delayMs, canRetry: safeAttempt < safeMax };
}

export function classifyHostFailure(error) {
  const code = String(error?.code || '').toUpperCase();
  const message = String(error?.message || error || 'host failure');
  if (HIGH_RISK_PATTERN.test(`${code} ${message}`)) return { kind: 'non-retryable', code: code || 'policy-failure', reason: 'policy-or-high-risk-failure' };
  if (TRANSIENT_CODES.has(code) || /execvpe\(\/bin\/bash\)|wsl.*(relay|unavailable)|daemon.*(timeout|unavailable)|socket.*(closed|not found)|connection.*(refused|reset|timeout)/i.test(message)) {
    return { kind: 'recoverable-host', code: code || 'host-unavailable', reason: 'transient-host-failure' };
  }
  return { kind: 'non-retryable', code: code || 'runtime-failure', reason: 'unknown-runtime-failure' };
}

export async function withBoundedRetry(operation, { maxAttempts = 3, baseDelayMs = 250, maxDelayMs = 2000, jitterMs = 0, sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms)), onRetry } = {}) {
  let attempt = 1;
  while (true) {
    try { return await operation({ attempt }); }
    catch (error) {
      const classification = classifyHostFailure(error);
      const plan = computeRetryPlan({ attempt, maxAttempts, baseDelayMs, maxDelayMs, jitterMs });
      if (classification.kind !== 'recoverable-host' || !plan.canRetry) {
        error.resilience = { ...classification, ...plan };
        throw error;
      }
      onRetry?.({ error, classification, ...plan });
      await sleep(plan.delayMs);
      attempt += 1;
    }
  }
}

export function selectRuntimeAdapter({ platform = process.platform, wslAvailable = false, windowsAvailable = platform === 'win32' } = {}) {
  if (platform === 'win32' && wslAvailable) return { name: 'wsl', fallback: 'windows', permissionAuthority: 'antigravity-selected' };
  if (platform === 'win32' && windowsAvailable) return { name: 'windows', fallback: null, permissionAuthority: 'antigravity-selected' };
  return { name: platform === 'win32' ? 'windows' : 'linux', fallback: null, permissionAuthority: 'antigravity-selected' };
}

export function readDaemonHealth({ paths, staleMs = 15_000, now = () => Date.now() } = {}) {
  const lockFile = paths?.lockFile;
  if (!lockFile) return { status: 'unavailable', recoverable: true, heartbeatAgeMs: null, pid: null };
  let lock;
  try { lock = JSON.parse(fs.readFileSync(lockFile, 'utf8')); }
  catch { return { status: 'unavailable', recoverable: true, heartbeatAgeMs: null, pid: null }; }
  const nowValue = typeof now === 'function' ? now() : now;
  const nowMs = typeof nowValue === 'number' ? nowValue : Date.parse(String(nowValue));
  const heartbeatMs = Date.parse(String(lock.heartbeatAt || lock.startedAt || ''));
  const heartbeatAgeMs = Number.isFinite(nowMs) && Number.isFinite(heartbeatMs) ? Math.max(0, nowMs - heartbeatMs) : null;
  const stale = heartbeatAgeMs == null || heartbeatAgeMs > staleMs;
  return { status: stale ? 'stale' : 'ready', recoverable: stale, heartbeatAgeMs, pid: Number.isFinite(Number(lock.pid)) ? Number(lock.pid) : null };
}
