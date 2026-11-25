import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const profile = path.join(root, 'agents/Antigravity/custom-agents/learning-mentor-specialist/agent.md');
const skills = ['teacher-learner-calibration','teacher-layered-explanations','teacher-socratic-dialogue','teacher-concept-maps','teacher-source-research','teacher-open-education-materials','teacher-decision-rationale','teacher-roadmap-design','teacher-guided-coding','teacher-retrieval-assessment','teacher-misconception-recovery','teacher-voice-conversation'];
test('learning mentor is a non-manager with twelve bounded skills', () => {
  const text = fs.readFileSync(profile, 'utf8');
  assert.match(text, /mainAgent:\s*false/); assert.match(text, /model:\s*inherit/); assert.doesNotMatch(text, /invoke_subagent/);
  for (const name of skills) {
    const body = fs.readFileSync(path.join(root, 'skills', name, 'SKILL.md'), 'utf8');
    assert.match(body, new RegExp(`name:\\s*${name}`)); assert.match(body, /Use when/); assert.match(body, /Stop condition/i);
  }
});
