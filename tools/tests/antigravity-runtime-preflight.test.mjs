import assert from 'node:assert/strict';
import test from 'node:test';
import { inspectAntigravityRuntime, inspectWslRuntime } from '../antigravity-runtime-preflight.mjs';

const wslList = '  NAME              STATE           VERSION\n* Ubuntu            Running         2\n  docker-desktop    Stopped         2\n';

test('WSL is selected only after a non-Docker distro passes the Linux toolchain and user probe', () => {
  const absentProbe = inspectWslRuntime({ platform: 'win32', listOutput: wslList, statusOutput: 'Default Version: 2' });
  assert.equal(absentProbe.available, false);
  assert.equal(absentProbe.reason, 'distro-not-ready');
  const dockerProbe = inspectWslRuntime({ platform: 'win32', listOutput: wslList, statusOutput: 'Default Version: 2', readyDistro: 'docker-desktop' });
  assert.equal(dockerProbe.available, false);
  assert.equal(dockerProbe.reason, 'distro-not-ready');
  const ready = inspectWslRuntime({ platform: 'win32', listOutput: wslList, statusOutput: 'Default Version: 2', readyDistro: 'Ubuntu' });
  assert.equal(ready.available, true);
  assert.equal(ready.defaultDistro, 'Ubuntu');
  assert.deepEqual(ready.readiness, ['bash', 'node', 'python3', 'non-root-user']);
});

test('Docker-only WSL installations fall back to native Windows', () => {
  const result = inspectWslRuntime({
    platform: 'win32',
    listOutput: '  NAME              STATE           VERSION\n* docker-desktop    Stopped         2\n',
    statusOutput: 'Default Version: 2',
  });
  assert.equal(result.available, false);
  assert.equal(result.reason, 'no-usable-distro');
  assert.equal(result.preferredDistro, 'docker-desktop');
});

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
