#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const manifestPath = path.join(root, 'KEY-CHECKSUMS.json');
const records = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
if (!Array.isArray(records)) throw new Error('KEY-CHECKSUMS.json must contain an array.');

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
