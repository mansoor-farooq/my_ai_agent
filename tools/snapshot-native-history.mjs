import { backup, DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';

const profile = path.join(process.env.USERPROFILE, '.gemini');
const output = path.resolve(process.argv[2]);
const scratch = path.resolve(process.argv[3]);
if (!output || !scratch || output === scratch) throw new Error('Pass separate snapshot and scratch paths.');
fs.mkdirSync(output, { recursive: true });
fs.mkdirSync(scratch, { recursive: true });

async function snapshotDb(source, destination) {
  const work = path.join(scratch, path.basename(path.dirname(source)), path.basename(source));
  fs.mkdirSync(path.dirname(work), { recursive: true });
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  for (const suffix of ['', '-wal', '-shm']) {
    if (fs.existsSync(source + suffix)) fs.copyFileSync(source + suffix, work + suffix);
  }
  const db = new DatabaseSync(work);
  try {
    if (db.prepare('pragma integrity_check').get().integrity_check !== 'ok') {
      throw new Error(`SQLite integrity failed: ${source}`);
    }
    await backup(db, destination);
  } finally { db.close(); }
  const check = new DatabaseSync(destination, { readOnly: true });
  try {
    if (check.prepare('pragma integrity_check').get().integrity_check !== 'ok') {
      throw new Error(`Snapshot integrity failed: ${destination}`);
    }
  } finally { check.close(); }
}

const app = path.join(profile, 'antigravity');
const ide = path.join(profile, 'antigravity-ide');
const sources = [
  [path.join(app, 'conversations'), path.join(output, 'app', 'conversations')],
  [path.join(ide, 'conversations'), path.join(output, 'ide', 'conversations')],
];
const counts = {};
for (const [sourceDir, destinationDir] of sources) {
  const key = path.basename(path.dirname(sourceDir));
  counts[key] = 0;
  if (!fs.existsSync(sourceDir)) continue;
  for (const file of fs.readdirSync(sourceDir).filter(name => name.endsWith('.db'))) {
    await snapshotDb(path.join(sourceDir, file), path.join(destinationDir, file));
    counts[key]++;
  }
}
await snapshotDb(path.join(app, 'conversation_summaries.db'), path.join(output, 'app', 'conversation_summaries.db'));

for (const [source, destination] of [
  [path.join(app, 'brain'), path.join(output, 'app', 'brain')],
  [path.join(ide, 'brain'), path.join(output, 'ide', 'brain')],
]) {
  if (fs.existsSync(source)) fs.cpSync(source, destination, { recursive: true, force: false });
}

const sourceProjects = path.join(profile, 'config', 'projects');
const destProjects = path.join(output, 'projects');
fs.mkdirSync(destProjects, { recursive: true });
let projectCount = 0;
for (const file of fs.readdirSync(sourceProjects).filter(name => name.endsWith('.json') && name !== 'outside-of-project.json')) {
  const json = JSON.parse(fs.readFileSync(path.join(sourceProjects, file), 'utf8'));
  delete json.permissionGrants;
  json.settings = {};
  fs.writeFileSync(path.join(destProjects, file), JSON.stringify(json, null, 2));
  projectCount++;
}

const summary = new DatabaseSync(path.join(output, 'app', 'conversation_summaries.db'), { readOnly: true });
const conversationCount = summary.prepare('select count(*) as n from conversation_summaries').get().n;
summary.close();
const manifest = { snapshotDate: new Date().toISOString(), conversations: counts,
  summaryRows: conversationCount, projectDefinitions: projectCount,
  note: 'Private Antigravity profile snapshot; no auth tokens, installation IDs or browser profile.' };
fs.writeFileSync(path.join(output, 'manifest.json'), JSON.stringify(manifest, null, 2));
console.log(JSON.stringify(manifest));
