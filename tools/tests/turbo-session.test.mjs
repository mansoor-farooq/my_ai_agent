import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createTurboSession, getTurboSession, revokeTurboSession, authorizeTurboRun } from '../ultra-agent-v5/turbo-session.mjs';
import { enqueueRun } from '../ultra-agent-v4/daemon/queue.mjs';

function fixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'mansoor-turbo-'));
  const project = path.join(root, 'project');
  fs.mkdirSync(project, { recursive: true });
  return { root, project, sessionFile: path.join(root, 'turbo-session.json') };
}

test('Turbo session is scoped, hash-bound and revocable', () => {
  const f = fixture();
  const created = createTurboSession({ file: f.sessionFile, projectDir: f.project, projectId: 'PRJ-001', scopes: ['src/**'] });
  assert.equal(created.noRepeatedPrompt, true);
  assert.equal(getTurboSession({ file: f.sessionFile }).sessionId, created.sessionId);
  const auth = authorizeTurboRun({ file: f.sessionFile, sessionId: created.sessionId, projectDir: f.project, projectId: 'PRJ-001', scope: ['src/app.ts'] });
  assert.equal(auth.approvalMode, 'manager-turbo-autonomous');
  assert.throws(() => authorizeTurboRun({ file: f.sessionFile, sessionId: created.sessionId, projectDir: f.project, projectId: 'PRJ-001', scope: ['.env'] }), /outside-session/i);
  revokeTurboSession({ file: f.sessionFile });
  assert.throws(() => getTurboSession({ file: f.sessionFile }), /revoked/i);
});

test('Turbo queue submission records the durable authorization envelope', () => {
  const f = fixture();
  const session = createTurboSession({ file: f.sessionFile, projectDir: f.project, projectId: 'PRJ-001', scopes: ['src/**'] });
  const run = enqueueRun({ runsDir: path.join(f.root, 'runs'), input: {
    projectDir: f.project,
    projectId: 'PRJ-001',
    taskId: 'TASK-001',
    objective: 'Implement the scoped feature',
    scope: ['src/**'],
    acceptance: ['focused check passes'],
    autonomy: 'turbo',
    turboSessionFile: f.sessionFile,
    turboSessionId: session.sessionId,
  } });
  assert.equal(run.autonomyProfile, 'turbo-autonomous');
  assert.equal(run.turboAuthorization.noRepeatedPrompt, true);
  assert.equal(run.mode, 'premium');
});
