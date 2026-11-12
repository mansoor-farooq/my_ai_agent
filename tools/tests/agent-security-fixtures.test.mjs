import assert from 'node:assert/strict';
import test from 'node:test';
import { runAgentSecurityFixtures } from '../run-agent-security-fixtures.mjs';

test('agent red-team fixtures block unsafe actions and preserve the project tree', async () => {
  const report = await runAgentSecurityFixtures();
  assert.equal(report.allPassed, true, JSON.stringify(report));
  assert.ok(report.fixtures.length >= 8);
  assert.ok(report.fixtures.every((fixture) => fixture.actual === fixture.expected));
});
