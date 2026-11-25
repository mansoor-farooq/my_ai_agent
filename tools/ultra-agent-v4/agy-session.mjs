import { spawn } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

const secretPattern = /(?:AIza[0-9A-Za-z_-]{20,}|(?:sk|ghp|github_pat)_[A-Za-z0-9_-]{8,}|Bearer\s+[A-Za-z0-9._~+/=-]+|(?:password|passwd|pwd|secret|apiKey|api_key|token|authorization)\s*[:=]\s*["']?[^\s"';,}]+)/gi;

function redact(value) { return String(value ?? '').replace(secretPattern, '[REDACTED_SECRET]').slice(0, 4000); }

function readAntigravityCliSettings() {
  try {
    return JSON.parse(readFileSync(join(homedir(), '.gemini', 'antigravity-cli', 'settings.json'), 'utf8'));
  } catch {
    return {};
  }
}

export function buildAgyArgs({ agent = 'Mansoor AI Team Manager', projectDir, mode = 'fast', hostModel, hostEffort, env = process.env, settings = readAntigravityCliSettings() } = {}) {
  if (!projectDir) throw new Error('projectDir is required');
  const model = hostModel || env.MANSOOR_ANTIGRAVITY_MODEL || settings.model || 'Gemini 3.8 Flash';
  const effort = hostEffort || env.MANSOOR_ANTIGRAVITY_EFFORT || settings.effort || settings.thinkingLevel || (mode === 'premium' ? 'high' : 'low');
  return ['--print', '--input-format', 'stream-json', '--output-format', 'stream-json', '--agent', agent, '--project', projectDir, '--model', model, '--effort', effort];
}

export function parseAgyStreamLine(line) {
  try {
    const value = JSON.parse(String(line));
    return value && typeof value === 'object' ? { ...value, message: redact(value.message || ''), details: value.details ? redact(JSON.stringify(value.details)) : undefined } : { type: 'unverified', message: redact(line) };
  } catch { return { type: 'unverified', message: redact(line) }; }
}

export function sessionStatus({ available, error } = {}) {
  if (!available) return { status: 'queued-host-unavailable', providerFallback: false, ...(error ? { reason: redact(error) } : {}) };
  return { status: 'connected', providerFallback: false };
}

export function resolveAgy({ command = 'agy', env = process.env } = {}) {
  return { executable: env.AGY_PATH || command, version: null };
}

export function startAgySession({ agent, projectDir, mode, hostModel, hostEffort, command = 'agy', spawnProcess = spawn } = {}) {
  const child = spawnProcess(resolveAgy({ command }).executable, buildAgyArgs({ agent, projectDir, mode, hostModel, hostEffort }), { stdio: ['pipe', 'pipe', 'pipe'] });
  const events = [];
  let output = '';
  child.stdout?.setEncoding?.('utf8');
  child.stderr?.setEncoding?.('utf8');
  child.stdout?.on?.('data', (chunk) => {
    output += chunk;
    const lines = output.split(/\r?\n/);
    output = lines.pop() || '';
    for (const line of lines.filter(Boolean)) events.push(parseAgyStreamLine(line));
  });
  child.stderr?.on?.('data', (chunk) => events.push({ type: 'stderr', message: redact(chunk) }));
  return { child, events, send(message) { child.stdin.write(`${JSON.stringify(message)}\n`); }, close() { child.stdin.end(); child.kill(); } };
}
