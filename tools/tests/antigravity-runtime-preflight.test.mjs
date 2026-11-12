import assert from 'node:assert/strict';
import test from 'node:test';
import { inspectAntigravityRuntime } from '../antigravity-runtime-preflight.mjs';

test('Windows 10 CLI sandbox absence fails closed to review-required', () => {
  const result = inspectAntigravityRuntime({ platform: 'win32', release: '10.0.19045' });
  assert.equal(result.sandbox, 'unavailable');
  assert.equal(result.execution, 'review-required');
});

test('Windows 11 platform alone does not claim sandbox is active', () => {
  const result = inspectAntigravityRuntime({ platform: 'win32', release: '10.0.26100' });
  assert.equal(result.platformSupport, 'supported');
  assert.equal(result.osFamily, 'windows-11');
  assert.equal(result.sandbox, 'unknown');
  assert.equal(result.execution, 'review-required');
});

test('Windows 10 is supported with review-required execution when sandboxing is unavailable', () => {
  const result = inspectAntigravityRuntime({ platform: 'win32', release: '10.0.19045' });
  assert.equal(result.platformSupport, 'supported');
  assert.equal(result.osFamily, 'windows-10');
  assert.equal(result.sandbox, 'unavailable');
});

test('explicit host sandbox probe is the only source that can report available', () => {
  assert.equal(inspectAntigravityRuntime({ platform: 'win32', release: '10.0.19045', sandboxStatus: 'available' }).sandbox, 'available');
  assert.equal(inspectAntigravityRuntime({ platform: 'linux', release: '6.8.0' }).sandbox, 'unknown');
});
