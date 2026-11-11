import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { redactTrace, startTrace, recordSpan, finishTrace } from '../ultra-agent-v3/trace.mjs';

test('trace redaction removes credentials while keeping operational metadata', () => {
  const redacted = redactTrace('token=sk-proj-12345678901234567890 path=src/app.ts latency=23');
  assert.doesNotMatch(redacted, /sk-proj/);
  assert.match(redacted, /src\/app\.ts/);
  assert.match(redacted, /latency=23/);
});

test('local trace captures task, tool and approval spans', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'mansoor-trace-'));
  const trace = await startTrace({ dir, taskId: 'task-1', projectId: 'project-1' });
  await recordSpan(trace, { kind: 'tool', name: 'run-test', status: 'ok', details: 'path=src/app.ts' });
  const report = await finishTrace(trace);
  const lines = (await fs.readFile(report.path, 'utf8')).trim().split(/\r?\n/).map(JSON.parse);
  assert.equal(lines.length, 3);
  assert.equal(lines[0].kind, 'trace-start');
  assert.equal(lines[1].kind, 'tool');
  assert.equal(lines[2].kind, 'trace-finish');
});
