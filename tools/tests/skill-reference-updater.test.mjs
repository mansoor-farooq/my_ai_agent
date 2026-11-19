import test from 'node:test';
import assert from 'node:assert/strict';
import { validateReference, planSkillUpdate } from '../update-skill-references.mjs';

test('accepts only pinned GitHub repository references and safe skill paths', () => {
  assert.doesNotThrow(() => validateReference({
    source: 'vercel-labs/agent-skills',
    sourceType: 'github',
    skillPath: 'skills/composition-patterns/SKILL.md',
    ref: 'main',
  }));
  for (const entry of [
    { source: 'example.com/acme/repo', skillPath: 'skills/x/SKILL.md', ref: 'main' },
    { source: 'vercel-labs/agent-skills', sourceType: 'github', skillPath: '../secrets', ref: 'main' },
    { source: 'vercel-labs/agent-skills', sourceType: 'github', skillPath: 'skills/x/SKILL.md', ref: 'main;rm -rf /' },
  ]) assert.throws(() => validateReference(entry));
});

test('plans an update only when the installed skill still matches its lock hash', () => {
  const entry = { computedHash: 'a'.repeat(64), resolvedCommit: 'old' };
  assert.deepEqual(planSkillUpdate({ entry, installedHash: 'a'.repeat(64), latestHash: 'b'.repeat(64), commit: 'new' }), {
    status: 'update-available', commit: 'new', hash: 'b'.repeat(64),
  });
  assert.equal(planSkillUpdate({ entry, installedHash: 'c'.repeat(64), latestHash: 'b'.repeat(64), commit: 'new' }).status, 'local-change');
  assert.equal(planSkillUpdate({ entry, installedHash: 'a'.repeat(64), latestHash: 'a'.repeat(64), commit: 'new' }).status, 'current');
  assert.equal(planSkillUpdate({ entry: { ...entry, upstreamHash: 'b'.repeat(64) }, installedHash: 'a'.repeat(64), latestHash: 'b'.repeat(64), commit: 'new' }).status, 'current');
  assert.equal(planSkillUpdate({ entry: { ...entry, upstreamHash: 'b'.repeat(64) }, installedHash: 'a'.repeat(64), latestHash: 'c'.repeat(64), commit: 'new' }).status, 'update-available');
});
