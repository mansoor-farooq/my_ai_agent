import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { InstallJournal, recoverInstallJournal } from '../ultra-agent-v5/install-journal.mjs';

test('install journal is resumable and records an ordered phase history', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mansoor-install-journal-'));
  const file = path.join(dir, 'install-journal.json');
  try {
    const journal = new InstallJournal(file, { release: '1.20.0', previousRelease: '1.19.5' });
    journal.mark('prepared');
    journal.mark('processes-stopped');
    journal.mark('staged');
    const reopened = recoverInstallJournal(file);
    assert.deepEqual(reopened.phases, ['prepared', 'processes-stopped', 'staged']);
    assert.equal(reopened.currentPhase, 'staged');
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('install journal rejects phase regression and can record rollback', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mansoor-install-journal-rollback-'));
  const file = path.join(dir, 'install-journal.json');
  try {
    const journal = new InstallJournal(file, { release: '1.20.0' });
    journal.mark('prepared');
    journal.mark('staged');
    assert.throws(() => journal.mark('prepared'), /install-journal-phase-regression/);
    journal.rollback('health-check-failed');
    assert.equal(recoverInstallJournal(file).currentPhase, 'rollback-complete');
    assert.equal(recoverInstallJournal(file).rollbackReason, 'health-check-failed');
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});
