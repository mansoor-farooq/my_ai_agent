#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

function factsPath(dir) { return path.join(path.resolve(dir), '.agents', 'memory', 'facts.jsonl'); }
function stableId(input) { return `MEM-${crypto.createHash('sha256').update(JSON.stringify(input)).digest('hex').slice(0, 16)}`; }
async function readFacts(file) {
  try { return (await fs.readFile(file, 'utf8')).split(/\r?\n/).filter(Boolean).map(JSON.parse); } catch { return []; }
}
async function writeFacts(file, facts) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  const temp = `${file}.${process.pid}.tmp`;
  await fs.writeFile(temp, `${facts.map((fact) => JSON.stringify(fact)).join('\n')}\n`, 'utf8');
  await fs.rename(temp, file);
}

export async function appendMemoryFact({ dir, projectId, subject, claim, sourceRefs, revision = null, confidence = 'observed', status = 'active', supersedes = null } = {}) {
  if (!String(projectId || '').trim()) throw new Error('projectId is required');
  if (!String(subject || '').trim()) throw new Error('subject is required');
  if (!String(claim || '').trim()) throw new Error('claim is required');
  if (!Array.isArray(sourceRefs) || sourceRefs.length === 0) throw new Error('sourceRefs must contain at least one provenance reference');
  const recordedAt = new Date().toISOString();
  const fact = { schemaVersion: 1, id: stableId({ projectId, subject, claim, sourceRefs, revision, recordedAt }), projectId: String(projectId), subject: String(subject), claim: String(claim), sourceRefs: sourceRefs.map(String), revision: revision ? String(revision) : null, confidence: String(confidence), status: String(status), supersedes: supersedes || null, recordedAt };
  const file = factsPath(dir);
  const facts = await readFacts(file);
  facts.push(fact);
  await writeFacts(file, facts);
  return fact;
}

export async function supersedeMemoryFact(oldId, input = {}) {
  if (!String(oldId || '').trim()) throw new Error('old memory id is required');
  const file = factsPath(input.dir);
  const facts = await readFacts(file);
  const old = facts.find((fact) => fact.id === oldId);
  if (!old) throw new Error(`memory fact not found: ${oldId}`);
  if (old.projectId !== input.projectId) throw new Error('memory project mismatch');
  if (old.status === 'superseded') throw new Error('memory fact is already superseded');
  old.status = 'superseded';
  old.supersededAt = new Date().toISOString();
  await writeFacts(file, facts);
  const next = await appendMemoryFact({ ...input, supersedes: oldId });
  return next;
}

export function formatMemoryCitation(fact) {
  if (!fact?.id || !Array.isArray(fact.sourceRefs) || !fact.sourceRefs.length) throw new Error('fact provenance is required for citation');
  return `[${fact.subject}] ${fact.claim} (memory ${fact.id}; sources: ${fact.sourceRefs.join(', ')}; revision: ${fact.revision || 'unknown'})`;
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname)) {
  const args = process.argv.slice(2);
  const value = (name, fallback = '') => { const index = args.indexOf(name); return index >= 0 && args[index + 1] ? args[index + 1] : fallback; };
  const command = args[0] || 'append';
  const sourceRefs = value('--source-refs').split(',').map((item) => item.trim()).filter(Boolean);
  const input = { dir: value('--dir', process.cwd()), projectId: value('--project'), subject: value('--subject'), claim: value('--claim'), sourceRefs, revision: value('--revision') || null, confidence: value('--confidence', 'observed') };
  const action = command === 'supersede' ? supersedeMemoryFact(value('--old-id'), input) : appendMemoryFact(input);
  action.then((fact) => console.log(JSON.stringify({ ok: true, fact, citation: formatMemoryCitation(fact) }, null, 2))).catch((error) => { console.error(error.message); process.exitCode = 1; });
}

