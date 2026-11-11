#!/usr/bin/env node

import fs from 'node:fs';
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
    for (const match of line.matchAll(ASSIGNMENT)) {
      const value = match[2] ?? match[3] ?? match[4] ?? '';
      const quoted = Boolean(match[2] ?? match[3]);
      const looksLikeCodeReference = !quoted && (value.startsWith('_') || value.includes('.'));
      if (!looksLikeCodeReference && !isPlaceholder(value)) findings.push({ file: filePath, line: index + 1, type: `${match[1].toLowerCase()}-assignment`, redacted: '<REDACTED>' });
    }
  });
  return findings;
}

function filesUnder(root) {
  const ignored = new Set(['.git', '.dart_tool', 'build', 'dist', 'node_modules', '.gradle']);
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
  return filesUnder(path.resolve(root)).flatMap((file) => {
    try { return scanText(fs.readFileSync(file, 'utf8'), path.relative(root, file)); } catch { return []; }
  });
}

function main() {
  const root = path.resolve(process.argv[2] ?? process.cwd());
  const findings = scanDirectory(root);
  process.stdout.write(`${JSON.stringify({ schema: 'mansoor.secret-scan/v1', root, findings, count: findings.length }, null, 2)}\n`);
  if (findings.length) process.exitCode = 1;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
