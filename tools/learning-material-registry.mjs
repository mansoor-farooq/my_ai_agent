import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const allowedClasses = new Set(['official-curriculum','official-textbook-link','open-skill','user-provided','optional-api']);
const sources = JSON.parse(fs.readFileSync(path.join(root, 'shared/learning/sindh-curriculum-sources.json'), 'utf8'));

export function redactMaterialText(value = '') {
  return String(value).replace(/(?:sk-[A-Za-z0-9_-]{20,}|Bearer\s+[A-Za-z0-9._~+/=-]+|-----BEGIN[\s\S]*?PRIVATE KEY-----)/gi, '[REDACTED]');
}
export function validateMaterialRecord(record = {}) {
  const errors = [];
  if (!allowedClasses.has(record.sourceClass)) errors.push('unsupported-source-class');
  if (!/^https?:\/\//i.test(String(record.url || ''))) errors.push('source-url-required');
  if (!record.title) errors.push('title-required');
  if (!record.licence) errors.push('licence-required');
  if (record.sourceClass === 'official-textbook-link' && /redistribut|raw.?corpus/i.test(JSON.stringify(record))) errors.push('copyrighted-corpus-not-allowed');
  return { ok: errors.length === 0, errors };
}
export function createMaterialRecord(input = {}) {
  const record = { url: String(input.url || ''), title: String(input.title || ''), sourceClass: String(input.sourceClass || ''), board: input.board || null, grade: input.grade || null, subject: input.subject || null, medium: input.medium || null, version: input.version || null, licence: input.licence || null, accessedAt: input.accessedAt || new Date().toISOString() };
  const validation = validateMaterialRecord(record);
  if (!validation.ok) throw new Error(validation.errors.join(','));
  return { schema: 'mansoor.learning-material/v1', ...record, redistribution: record.sourceClass === 'official-textbook-link' ? 'link-only' : 'metadata-and-licence-bound' };
}
export function findCurriculumSources({ board = 'Sindh', grade, subject, medium } = {}) {
  return sources.filter((item) => item.board === board && (!grade || !item.grades || item.grades.includes(String(grade))) && (!subject || !item.subjects || item.subjects.includes(String(subject))) && (!medium || !item.mediums || item.mediums.includes(String(medium))));
}
