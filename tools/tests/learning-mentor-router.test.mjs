import assert from 'node:assert/strict';
import test from 'node:test';
import { detectLearningIntent, enforceTopicScope, planTeacherResearch } from '../learning-mentor-router.mjs';

test('detects Roman Urdu learning intent and extracts the requested topic', () => {
  const result = detectLearningIntent({ request: 'mujhe socks ke bare mein deep dive karke samjhao' });
  assert.equal(result.matched, true);
  assert.equal(result.mode, 'deep');
  assert.equal(result.topic, 'socks');
});

test('unknown topic requires targeted research before an answer', () => {
  const plan = planTeacherResearch({ request: 'socks ka material aur history batao', evidence: [] });
  assert.equal(plan.status, 'research-required');
  assert.deepEqual(plan.queryTerms, ['socks', 'material', 'history']);
  assert.equal(plan.answerAllowed, false);
});

test('topic scope blocks a socks answer that drifts to sauce', () => {
  const result = enforceTopicScope({ requestedTopic: 'socks', answerText: 'Sauce is a condiment made from...' });
  assert.equal(result.ok, false);
  assert.equal(result.reason, 'topic-mismatch');
  assert.equal(result.answerAllowed, false);
});

test('topic scope permits evidence-backed explanation of the requested topic', () => {
  const result = enforceTopicScope({ requestedTopic: 'CSS', answerText: 'CSS controls presentation and layout in a web document.', evidenceTerms: ['css', 'layout'] });
  assert.equal(result.ok, true);
  assert.equal(result.answerAllowed, true);
});
