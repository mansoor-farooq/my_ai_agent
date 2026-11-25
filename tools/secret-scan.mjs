#!/usr/bin/env node

import fs from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const PLACEHOLDERS = new Set(['YOUR_API_KEY_HERE', 'YOUR_SECRET_HERE', 'YOUR_PASSWORD_HERE', 'CHANGE_ME', 'CHANGEME', 'example', 'sample', 'placeholder']);
const ASSIGNMENT = /\b(api[_-]?key|secret|password|token|private[_-]?key)\b\s*[:=]\s*(?:"([^"]+)"|'([^']+)'|([A-Za-z0-9_+\/=.-]{16,}))/gi;
const HIGH_CONFIDENCE = [
  { type: 'private-key', pattern: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/i },
  { type: 'provider-key', pattern: /\bsk-(?:proj-|live-|test-)?[A-Za-z0-9_-]{20,}/ },
  { type: 'aws-access-key', pattern: /\bAKIA[0-9A-Z]{16}\b/ },
  { type: 'bearer-token', pattern: /\bBearer\s+[A-Za-z0-9._~+/=-]{24,}/i },
];

function isPlaceholder(value) {
  const normalized = value.replace(/["']/g, '').trim();
  return PLACEHOLDERS.has(normalized) || normalized.startsWith('${') || normalized.includes('YOUR_') || normalized.includes('<REDACTED>');
}

export function scanText(text, filePath = '<memory>') {
  const findings = [];
  text.split(/\r?\n/).forEach((line, index) => {
    let highConfidenceMatched = false;
    for (const rule of HIGH_CONFIDENCE) {
      if (rule.pattern.test(line)) {
        findings.push({ file: filePath, line: index + 1, type: rule.type, redacted: '<REDACTED>' });
        highConfidenceMatched = true;
      }
      rule.pattern.lastIndex = 0;
    }
    if (highConfidenceMatched) return;
    if (/\btoken\s*=\s*['"]\{['"]\s*\+/.test(line)) return;
    // The bundled local browser editor builds route-token query parameters from an
    // in-memory nonce; this code reference is not a credential literal.
    if (/localhost(?::\d+)?/.test(line) && /\btoken=['"]\s*\+\s*(?:encodeURIComponent|TOKEN)\b/.test(line)) return;
    for (const match of line.matchAll(ASSIGNMENT)) {
      const value = match[2] ?? match[3] ?? match[4] ?? '';
      const quoted = Boolean(match[2] ?? match[3]);
      const sourceAfterAssignment = line.slice(match.index + match[0].indexOf(value) + value.length);
      const isFunctionReference = !quoted && /^\s*\(/.test(sourceAfterAssignment);
      if (isFunctionReference) continue;
      const looksLikeCodeReference = !quoted && (value.startsWith('_') || value.includes('.'));
      if (!looksLikeCodeReference && !isPlaceholder(value)) findings.push({ file: filePath, line: index + 1, type: `${match[1].toLowerCase()}-assignment`, redacted: '<REDACTED>' });
    }
  });
  return findings;
}

export function fingerprintLine(filePath, line) {
  const normalizedPath = filePath.replace(/\\/g, '/');
  return createHash('sha256').update(`${normalizedPath}\0${line}`, 'utf8').digest('hex');
}

function filesUnder(root) {
  const ignored = new Set(['.git', '.dart_tool', 'build', 'dist', 'node_modules', '.gradle', 'native-profile']);
  const results = [];
  const walk = (current) => {
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      if (ignored.has(entry.name)) continue;
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.isFile() && fs.statSync(full).size < 2_000_000) results.push(full);
    }
  };
  walk(root);
  return results;
}

export function scanDirectory(root) {
  const resolvedRoot = path.resolve(root);
  const allowlistPath = path.join(resolvedRoot, 'tools', 'secret-scan-allowlist.json');
  let allowlisted = new Set();
  try {
    const document = JSON.parse(fs.readFileSync(allowlistPath, 'utf8'));
    if (document.schema === 'mansoor.secret-scan-allowlist/v1' && Array.isArray(document.findings)) {
      allowlisted = new Set(document.findings
        .filter((entry) => typeof entry.file === 'string'
          && /^[a-f0-9]{64}$/i.test(entry.lineSha256)
          && typeof entry.reason === 'string' && entry.reason.trim())
        .map((entry) => `${entry.file.replace(/\\/g, '/')}\0${entry.lineSha256.toLowerCase()}`));
    }
  } catch { /* No allowlist is the default. */ }

  return filesUnder(resolvedRoot).flatMap((file) => {
    try {
      const relativePath = path.relative(resolvedRoot, file).replace(/\\/g, '/');
      const text = fs.readFileSync(file, 'utf8');
      return scanText(text, relativePath).filter((finding) => {
        if (!finding.type.endsWith('-assignment')) return true;
        const line = text.split(/\r?\n/)[finding.line - 1];
        const fingerprint = fingerprintLine(relativePath, line);
        return !allowlisted.has(`${relativePath}\0${fingerprint}`);
      });
    } catch { return []; }
  });
}

function main() {
  const root = path.resolve(process.argv[2] ?? process.cwd());
  const findings = scanDirectory(root);
  process.stdout.write(`${JSON.stringify({ schema: 'mansoor.secret-scan/v1', root, findings, count: findings.length }, null, 2)}\n`);
  if (findings.length) process.exitCode = 1;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
