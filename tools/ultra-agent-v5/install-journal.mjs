#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const PHASES = Object.freeze(['prepared', 'processes-stopped', 'staged', 'activated', 'verified', 'rollback-complete']);

function fail(code) { throw Object.assign(new Error(code), { code }); }

function atomicWrite(filePath, value) {
  const tempPath = `${filePath}.tmp-${process.pid}-${Date.now()}`;
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(tempPath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
  fs.renameSync(tempPath, filePath);
}

export function recoverInstallJournal(filePath) {
  if (!fs.existsSync(filePath)) return { schema: 'mansoor.install-journal/v1', phases: [], currentPhase: null, release: null, previousRelease: null };
  try {
    const record = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    if (record?.schema !== 'mansoor.install-journal/v1' || !Array.isArray(record.phases)) fail('install-journal-invalid');
    return record;
  } catch (error) {
    if (error?.code === 'install-journal-invalid') throw error;
    fail('install-journal-corrupt');
  }
}

export class InstallJournal {
  constructor(filePath, { release = null, previousRelease = null, now = () => new Date() } = {}) {
    if (!String(filePath || '').trim()) fail('install-journal-path-required');
    this.filePath = path.resolve(filePath);
    this.now = now;
    const prior = recoverInstallJournal(this.filePath);
    this.record = prior.phases.length
      ? prior
      : { schema: 'mansoor.install-journal/v1', release, previousRelease, phases: [], currentPhase: null, rollbackReason: null, updatedAt: new Date(now()).toISOString() };
  }

  mark(phase, details = {}) {
    const next = String(phase || '');
    if (!PHASES.includes(next) || next === 'rollback-complete') fail('install-journal-phase-invalid');
    const priorIndex = this.record.currentPhase ? PHASES.indexOf(this.record.currentPhase) : -1;
    const nextIndex = PHASES.indexOf(next);
    if (nextIndex < priorIndex) fail('install-journal-phase-regression');
    if (this.record.currentPhase === next) return this.record;
    this.record = { ...this.record, phases: [...this.record.phases, next], currentPhase: next, updatedAt: new Date(this.now()).toISOString(), details: { ...(this.record.details || {}), [next]: details } };
    atomicWrite(this.filePath, this.record);
    return this.record;
  }

  rollback(reason, details = {}) {
    this.record = { ...this.record, phases: [...this.record.phases, 'rollback-complete'], currentPhase: 'rollback-complete', rollbackReason: String(reason || 'unspecified'), updatedAt: new Date(this.now()).toISOString(), details: { ...(this.record.details || {}), rollback: details } };
    atomicWrite(this.filePath, this.record);
    return this.record;
  }
}

export { PHASES as INSTALL_PHASES };
