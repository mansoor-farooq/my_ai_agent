import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');

test('QA specialist routes live browser and reproducible browser-finding work to focused skills', () => {
  const profile = read('agents/Antigravity/custom-agents/qa-release-specialist/agent.md');
  assert.match(profile, /skills\/live-web-quality-auditor/);
  assert.match(profile, /skills\/playwright-cli-live-browser/);
  assert.match(profile, /skills\/browser-regression-handoff/);
});

test('live browser audit delegates CLI mechanics and regression handoff without changing audit ownership', () => {
  const audit = read('skills/live-web-quality-auditor/SKILL.md');
  assert.match(audit, /playwright-cli-live-browser/);
  assert.match(audit, /browser-regression-handoff/);
  assert.match(audit, /audit \(default\)/);
});

test('browser CLI adaptation preserves upstream attribution and safe session boundaries', () => {
  const skill = read('skills/playwright-cli-live-browser/SKILL.md');
  const license = read('skills/playwright-cli-live-browser/SOURCE-LICENSE.txt');
  assert.match(skill, /@playwright\/cli/);
  assert.match(skill, /snapshot/i);
  assert.match(skill, /untrusted/i);
  assert.match(skill, /persistent profile/i);
  assert.match(skill, /close|cleanup/i);
  assert.match(license, /MIT License/);
  assert.match(license, /Douglas Urrea Ocampo/);
});

test('regression handoff requires observed behavior and deterministic project-native tests', () => {
  const skill = read('skills/browser-regression-handoff/SKILL.md');
  assert.match(skill, /observed/i);
  assert.match(skill, /project's existing test runner/i);
  assert.match(skill, /deterministic/i);
  assert.match(skill, /real payment|production data/i);
});
