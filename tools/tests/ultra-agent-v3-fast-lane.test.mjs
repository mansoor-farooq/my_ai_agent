import test from 'node:test';
import assert from 'node:assert/strict';
import { selectMode } from '../ultra-agent-v3/mode.mjs';

test('Fast mode exposes a host latency profile for the CLI and Antigravity selector', () => {
  const result = selectMode({ request: 'Fix a local button label' });

  assert.deepEqual(result.latencyProfile, {
    requestedModel: 'Gemini 3.8 Flash',
    requestedEffort: 'low',
    contextStrategy: 'relevant-only',
    skillStrategy: 'on-demand',
    cliArgs: ['--model', 'Gemini 3.8 Flash', '--effort', 'low'],
  });
});

test('Premium work does not pretend that the Fast host profile is active', () => {
  const result = selectMode({ request: 'Research a secure production architecture', explicitResearch: true, risk: 'high' });

  assert.equal(result.mode, 'premium');
  assert.equal(result.latencyProfile.requestedEffort, 'high');
  assert.equal(result.latencyProfile.contextStrategy, 'bounded-deep');
  assert.deepEqual(result.latencyProfile.cliArgs, ['--model', 'Gemini 3.8 Flash', '--effort', 'high']);
});
