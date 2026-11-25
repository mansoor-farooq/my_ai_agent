import assert from 'node:assert/strict';
import test from 'node:test';
import { createMaterialRecord, findCurriculumSources, validateMaterialRecord } from '../learning-material-registry.mjs';

test('finds official Sindh curriculum and textbook links without copying books', () => {
  assert.equal(findCurriculumSources({ subject: 'Computer Science' }).length, 2);
  const record = createMaterialRecord({ url: 'https://ebooks.stbb.edu.pk/', title: 'STBB eBooks', sourceClass: 'official-textbook-link', board: 'Sindh', licence: 'all-rights-reserved-link-only' });
  assert.equal(record.redistribution, 'link-only');
});
test('rejects unlicensed or raw textbook corpus records', () => {
  assert.equal(validateMaterialRecord({ url: 'https://example.test', title: 'x', sourceClass: 'official-textbook-link', redistribution: 'raw corpus' }).ok, false);
});
