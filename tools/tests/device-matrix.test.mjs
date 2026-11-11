import test from 'node:test';
import assert from 'node:assert/strict';
import { summarizeMatrix } from '../device-matrix.mjs';

test('device matrix never treats missing OEM/API profiles as passing', () => {
  const report = summarizeMatrix([{ manufacturer: 'samsung', android: '16', overallStatus: 'pass' }]);
  assert.equal(report.coverage, 1 / 9);
  assert.equal(report.missingProfiles.length, 8);
  assert.equal(report.status, 'unverified');
});
