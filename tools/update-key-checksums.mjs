#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const manifestPath = path.join(root, 'KEY-CHECKSUMS.json');
let records = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
if (!Array.isArray(records)) throw new Error('KEY-CHECKSUMS.json must contain an array.');

const retiredPaths = new Set([
  'Agents/tools/ultra-agent-v4-control-panel/server.mjs',
  'Agents/tools/ultra-agent-v4-control-panel/public/index.html',
  'Agents/tools/ultra-agent-v4-control-panel/public/styles.css',
  'Agents/tools/ultra-agent-v4-control-panel/public/app.js',
  'Agents/Open-Ultra-Agent-Control-Panel.cmd',
]);
records = records.filter((record) => !retiredPaths.has(String(record?.Path || '').replaceAll('\\', '/')));

const requiredPaths = [
  'tools/ultra-agent-v2/preflight.mjs',
  'tools/ultra-agent-v2/memory.mjs',
  'tools/ultra-agent-v2/evidence.mjs',
  'tools/ultra-agent-v2/project-identity.mjs',
  'tools/ultra-agent-v2/rag.mjs',
  'tools/tests/ultra-agent-v2.test.mjs',
  'shared/ULTRA_AGENT_V2_PROTOCOL.md',
  'tools/ultra-agent-v3/state.mjs',
  'tools/ultra-agent-v3/mode.mjs',
  'tools/ultra-agent-v3/plan.mjs',
  'tools/ultra-agent-v3/context.mjs',
  'tools/ultra-agent-v3/evaluate.mjs',
  'tools/ultra-agent-v3/trace.mjs',
  'tools/ultra-agent-v3/delegation.mjs',
  'tools/ultra-agent-v3/policy.mjs',
  'tools/ultra-agent-v3/activity.mjs',
  'tools/ultra-agent-v4/benchmark.mjs',
  'tools/ultra-agent-v4/recovery.mjs',
  'tools/ultra-agent-v4/core-loop.mjs',
  'tools/ultra-agent-v4/stages/context.mjs',
  'tools/ultra-agent-v4/stages/plan.mjs',
  'tools/ultra-agent-v4/stages/reference.mjs',
  'tools/ultra-agent-v4/stages/act.mjs',
  'tools/ultra-agent-v4/stages/verify.mjs',
  'tools/ultra-agent-v4/stages/repair.mjs',
  'tools/ultra-agent-v4/stages/answer.mjs',
  'tools/ultra-agent-v4/stages/remember.mjs',
  'tools/tests/ultra-agent-v3-delegation.test.mjs',
  'tools/tests/ultra-agent-v3-policy-activity.test.mjs',
  'tools/tests/ultra-agent-v4-control.test.mjs',
  'tools/tests/ultra-agent-v4-core-loop.test.mjs',
];
const knownPaths = new Set(records.map((record) => String(record?.Path || '').replaceAll('\\', '/')));
for (const relative of requiredPaths) {
  const manifestPathValue = `Agents/${relative}`;
  if (!knownPaths.has(manifestPathValue)) {
    records.push({ Path: manifestPathValue, SHA256: '', Bytes: 0 });
    knownPaths.add(manifestPathValue);
  }
}

let refreshed = 0;
for (const record of records) {
  if (typeof record?.Path !== 'string') throw new Error('Checksum record is missing its Path.');
  const relative = record.Path.replaceAll('\\', '/').replace(/^Agents\//, '');
  const file = path.resolve(root, relative);
  if (!file.startsWith(`${root}${path.sep}`)) throw new Error(`Checksum path escapes the repository: ${record.Path}`);
  if (/(?:^|\/)(?:shared\/native-profile|shared\/private-backup|shared\/knowledge\/readable-chat-context)(?:\/|$)|\.(?:db|sqlite|zip)$/i.test(relative)) continue;
  const bytes = fs.readFileSync(file);
  record.SHA256 = crypto.createHash('sha256').update(bytes).digest('hex').toUpperCase();
  record.Bytes = bytes.length;
  refreshed += 1;
}

fs.writeFileSync(manifestPath, `${JSON.stringify(records, null, 2)}\n`);
console.log(`Refreshed ${refreshed} owner source checksums.`);
