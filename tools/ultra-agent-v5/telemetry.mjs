#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const SECRET_PATTERN = /(?:AIza[0-9A-Za-z_-]{20,}|(?:sk|ghp|github_pat)_[A-Za-z0-9_-]{8,}|Bearer\s+[A-Za-z0-9._~+/=-]+|(?:password|passwd|pwd|secret|apiKey|api_key|token|authorization|privateKey|credential)\s*[:=]\s*["']?[^\s"';,}]+)/gi;
const SECRET_KEY_PATTERN = /(password|passwd|pwd|secret|api[_-]?key|token|authorization|private[_-]?key|credential)/i;

function redact(value, limit = 8000) {
  if (value === null || value === undefined) return value;
  if (typeof value === 'string') return value.replace(SECRET_PATTERN, '[REDACTED_SECRET]').slice(0, limit);
  if (Array.isArray(value)) return value.map((item) => redact(item, limit));
  if (typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, SECRET_KEY_PATTERN.test(key) ? '[REDACTED_SECRET]' : redact(item, limit)]));
  return value;
}

export class LocalTelemetry {
  constructor(filePath, { maxBytes = 5 * 1024 * 1024, now = () => new Date() } = {}) {
    this.filePath = path.resolve(filePath);
    this.maxBytes = Math.max(1024, Number(maxBytes) || 5 * 1024 * 1024);
    this.now = now;
    fs.mkdirSync(path.dirname(this.filePath), { recursive: true });
  }

  record(event = {}) {
    const record = redact({
      schema: 'mansoor.local-telemetry/v1',
      createdAt: new Date(this.now()).toISOString(),
      runId: String(event.runId || 'unknown'),
      kind: String(event.kind || 'event'),
      status: String(event.status || 'unknown'),
      durationMs: Number.isFinite(event.durationMs) ? event.durationMs : null,
      details: event.details && typeof event.details === 'object' ? event.details : {},
    });
    const line = `${JSON.stringify(record)}\n`;
    if (fs.existsSync(this.filePath) && fs.statSync(this.filePath).size + Buffer.byteLength(line) > this.maxBytes) {
      const rotated = `${this.filePath}.1`;
      try { fs.rmSync(rotated, { force: true }); } catch { /* best effort */ }
      fs.renameSync(this.filePath, rotated);
    }
    fs.appendFileSync(this.filePath, line, 'utf8');
    return record;
  }
}

export function readTelemetrySummary(filePath) {
  if (!fs.existsSync(filePath)) return { total: 0, failed: 0, passed: 0, successRate: 0 };
  const events = fs.readFileSync(filePath, 'utf8').split(/\r?\n/).filter(Boolean).map((line) => JSON.parse(line));
  const failed = events.filter((event) => ['fail', 'failed', 'blocked', 'error', 'escalated'].includes(String(event.status).toLowerCase())).length;
  const passed = events.filter((event) => ['pass', 'passed', 'complete', 'completed', 'verified'].includes(String(event.status).toLowerCase())).length;
  return { total: events.length, failed, passed, successRate: events.length ? passed / events.length : 0 };
}

export { redact as redactTelemetry };
