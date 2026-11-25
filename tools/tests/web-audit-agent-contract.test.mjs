import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const profilePath = path.join(root, 'agents', 'Antigravity', 'custom-agents', 'web-audit-specialist', 'agent.md');
const skills = [
  'audit-crawl-indexing', 'audit-onpage-content', 'audit-structured-data', 'audit-browser-smoke',
  'audit-performance-lighthouse', 'audit-core-web-vitals', 'audit-accessibility', 'audit-security-headers',
  'audit-network-api', 'audit-assets-media', 'audit-mobile-responsive', 'audit-report-evidence',
];

test('web audit specialist profile and twelve custom skills are packaged as a hard audit lane', () => {
  const profile = fs.readFileSync(profilePath, 'utf8');
  assert.match(profile, /name:\s*web-audit-specialist/);
  assert.match(profile, /mainAgent:\s*false/);
  assert.match(profile, /Lighthouse.*final|final.*Lighthouse/i);
  assert.match(profile, /360x800.*390x844.*412x915/);
  assert.match(profile, /source.*file\/line|file\/line.*source/i);
  assert.match(profile, /post-audit choice|post-audit/i);
  for (const skill of skills) {
    const body = fs.readFileSync(path.join(root, 'skills', skill, 'SKILL.md'), 'utf8');
    assert.match(body, new RegExp(`name:\\s*${skill}`));
    assert.match(body, /Use when/);
    assert.match(body, /Stop condition/i);
  }
});
