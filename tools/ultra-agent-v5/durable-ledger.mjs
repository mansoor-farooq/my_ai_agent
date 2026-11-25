#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { createApprovalAuthority } from './action-manifest.mjs';
import { withProcessLockSync } from './process-lock.mjs';

const LEDGER_SCHEMA = 'mansoor.action-ledger-event/v1';
const LEDGER_FILE = 'actions.jsonl';

const transitions = Object.freeze({
  run: {
    prepared: ['awaiting_approval', 'blocked'],
    awaiting_approval: ['approved', 'rejected', 'expired', 'blocked'],
    approved: ['executing', 'blocked', 'expired'],
    executing: ['verified', 'blocked', 'unknown'],
    verified: ['review-required', 'blocked'],
    'review-required': ['promoted', 'discarded', 'blocked'],
    promoted: [], discarded: [], rejected: [], expired: [], blocked: [], unknown: [],
  },
  approval: {
    awaiting_approval: ['approved', 'rejected', 'expired'],
    approved: ['consumed'], consumed: [], rejected: [], expired: [],
  },
  effect: {
    prepared: ['approved', 'blocked'],
    approved: ['executing', 'blocked'],
    executing: ['reconciled', 'unknown', 'blocked'],
    reconciled: ['verified', 'unknown'],
    verified: ['promoted'],
    promoted: [], blocked: [], unknown: [],
  },
});

function fail(code) {
  throw Object.assign(new Error(code), { code });
}

function normalize(value) {
  if (Array.isArray(value)) return value.map(normalize);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, normalize(value[key])]));
  }
  return value;
}

function stableJson(value) { return JSON.stringify(normalize(value)); }
function hash(value) { return `sha256:${crypto.createHash('sha256').update(typeof value === 'string' ? value : stableJson(value)).digest('hex')}`; }

function assertSafeDirectory(directory) {
  const absolute = path.resolve(directory);
  const parsed = path.parse(absolute);
  let current = parsed.root;
  for (const part of absolute.slice(parsed.root.length).split(path.sep).filter(Boolean)) {
    current = path.join(current, part);
    try {
      const stat = fs.lstatSync(current);
      if (stat.isSymbolicLink()) fail('action-ledger-symlink-path');
      if (!stat.isDirectory()) fail('action-ledger-path-not-directory');
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
      fs.mkdirSync(current);
    }
  }
  const real = fs.realpathSync(absolute);
  if (path.resolve(real) !== absolute) fail('action-ledger-path-resolution-mismatch');
  return absolute;
}

function eventBody(event) {
  const { eventHash: ignored, ...body } = event;
  return body;
}

function readEvents(filePath, projectId, taskId) {
  if (!fs.existsSync(filePath)) return [];
  try {
    const stat = fs.lstatSync(filePath);
    if (!stat.isFile() || stat.isSymbolicLink()) fail('action-ledger-file-invalid');
  } catch { fail('action-ledger-file-invalid'); }
  let content;
  try { content = fs.readFileSync(filePath, 'utf8'); }
  catch { fail('action-ledger-read-failed'); }
  if (content && !content.endsWith('\n')) fail('action-ledger-corrupt-tail');
  const lines = content.split('\n').filter(Boolean);
  const events = [];
  let previousHash = null;
  for (let index = 0; index < lines.length; index += 1) {
    let event;
    try { event = JSON.parse(lines[index]); }
    catch { fail('action-ledger-corrupt-json'); }
    if (event.schema !== LEDGER_SCHEMA || event.sequence !== index + 1 || event.previousHash !== previousHash
      || event.projectId !== projectId || event.taskId !== taskId
      || event.eventHash !== hash(eventBody(event))) fail('action-ledger-integrity-failed');
    events.push(event);
    previousHash = event.eventHash;
  }
  return events;
}

function currentFor(events, subjectType, subjectId) {
  for (let index = events.length - 1; index >= 0; index -= 1) {
    const event = events[index];
    if (event.subjectType === subjectType && event.subjectId === subjectId) return event;
  }
  return null;
}

export class DurableActionLedger {
  constructor({ directory, projectId, taskId, now = () => new Date() } = {}) {
    if (!String(projectId || '').trim() || !String(taskId || '').trim()) fail('action-ledger-identity-required');
    if (!String(directory || '').trim()) fail('action-ledger-directory-required');
    this.directory = assertSafeDirectory(directory);
    this.projectId = String(projectId);
    this.taskId = String(taskId);
    this.now = now;
    this.filePath = path.join(this.directory, LEDGER_FILE);
    this.lockPath = path.join(this.directory, `${LEDGER_FILE}.lock`);
    this.lockHeld = false;
    this.events();
  }

  events() { return readEvents(this.filePath, this.projectId, this.taskId); }

  state(subjectType, subjectId) {
    const current = currentFor(this.events(), String(subjectType), String(subjectId));
    return current ? { status: current.to, details: current.details, event: current } : null;
  }

  withLedgerLock(fn) {
    if (this.lockHeld) return fn();
    return withProcessLockSync(this.lockPath, () => {
      this.lockHeld = true;
      try { return fn(); } finally { this.lockHeld = false; }
    });
  }

  transition(subjectType, subjectId, to, details = {}) {
    return this.withLedgerLock(() => {
      const type = String(subjectType);
      const id = String(subjectId);
      if (!transitions[type] || !id || !transitions[type][String(to)]) fail('action-ledger-transition-invalid');
      const events = this.events();
      const current = currentFor(events, type, id);
      const from = current?.to ?? null;
      const next = String(to);
      if (from === next) {
        if (type === 'effect' && current.details?.payloadHash !== details?.payloadHash) fail('ledger-idempotency-payload-mismatch');
        if (hash(current.details || {}) === hash(details || {})) return { ...current, idempotent: true };
        fail('action-ledger-duplicate-state-conflict');
      }
      if (from === null ? next !== 'prepared' && !(type === 'approval' && next === 'awaiting_approval') : !transitions[type][from]?.includes(next)) {
        fail('illegal-ledger-transition');
      }
      if (type === 'effect' && current?.details?.payloadHash && details?.payloadHash
        && current.details.payloadHash !== details.payloadHash) fail('ledger-idempotency-payload-mismatch');
      const event = {
        schema: LEDGER_SCHEMA,
        sequence: events.length + 1,
        previousHash: events.at(-1)?.eventHash || null,
        occurredAt: new Date(this.now()).toISOString(),
        projectId: this.projectId,
        taskId: this.taskId,
        subjectType: type,
        subjectId: id,
        from,
        to: next,
        details: normalize(details || {}),
      };
      const record = { ...event, eventHash: hash(event) };
      let fd;
      try {
        fd = fs.openSync(this.filePath, 'a', 0o600);
        const bytes = Buffer.from(`${JSON.stringify(record)}\n`, 'utf8');
        let offset = 0;
        while (offset < bytes.byteLength) offset += fs.writeSync(fd, bytes, offset, bytes.byteLength - offset);
        fs.fsyncSync(fd);
      } catch { fail('action-ledger-persist-failed'); }
      finally { if (fd !== undefined) fs.closeSync(fd); }
      return record;
    });
  }

  findApproval(nonce) {
    const events = this.events().filter((event) => event.subjectType === 'approval' && event.subjectId === String(nonce));
    const approved = events.find((event) => event.to === 'approved');
    return approved ? { receipt: approved.details.receipt, current: events.at(-1) } : null;
  }

  consumeApproval(receipt, manifest, authority, { now = this.now() } = {}) {
    return this.withLedgerLock(() => {
      const validity = authority?.verify?.(receipt, manifest, { now });
      if (!validity?.valid) return { valid: false, reason: validity?.reason || 'approval-authority-invalid' };
      const prior = this.findApproval(manifest.nonce);
      if (prior) {
        if (prior.receipt?.receiptId !== receipt.receiptId || prior.receipt?.manifestHash !== manifest.manifestHash) {
          return { valid: false, reason: 'approval-receipt-replayed' };
        }
        if (prior.current?.to === 'approved') this.transition('approval', manifest.nonce, 'consumed', { manifestHash: manifest.manifestHash, receiptId: receipt.receiptId });
        return { valid: true, resumed: true, receiptId: receipt.receiptId, manifestHash: manifest.manifestHash };
      }
      const requested = this.state('approval', manifest.nonce);
      if (requested?.status !== 'awaiting_approval' || requested.details?.manifestHash !== manifest.manifestHash) {
        return { valid: false, reason: 'approval-request-not-pending' };
      }
      this.transition('approval', manifest.nonce, 'approved', { manifestHash: manifest.manifestHash, receipt });
      this.transition('approval', manifest.nonce, 'consumed', { manifestHash: manifest.manifestHash, receiptId: receipt.receiptId });
      return { valid: true, resumed: false, receiptId: receipt.receiptId, manifestHash: manifest.manifestHash };
    });
  }
}

export function createFileBackedApprovalAuthority(directory) {
  const safeDirectory = assertSafeDirectory(directory);
  const keyPath = path.join(safeDirectory, 'approval.key');
  let secret;
  try {
    const fd = fs.openSync(keyPath, 'wx', 0o600);
    try {
      secret = crypto.randomBytes(32);
      fs.writeSync(fd, secret);
      fs.fsyncSync(fd);
    } finally { fs.closeSync(fd); }
  } catch (error) {
    if (error.code !== 'EEXIST') fail('approval-key-create-failed');
    try {
      const stat = fs.lstatSync(keyPath);
      if (!stat.isFile() || stat.isSymbolicLink()) fail('approval-key-invalid');
      secret = fs.readFileSync(keyPath);
    } catch { fail('approval-key-read-failed'); }
  }
  if (!Buffer.isBuffer(secret) || secret.length !== 32) fail('approval-key-invalid');
  return createApprovalAuthority({ secret });
}

export function createStableEffectKey({ projectId, taskId, actionId } = {}) {
  for (const [name, value] of Object.entries({ projectId, taskId, actionId })) {
    if (!String(value || '').trim()) fail(`effect-${name}-required`);
  }
  return `effect-${hash({ projectId: String(projectId), taskId: String(taskId), actionId: String(actionId) }).slice(7)}`;
}

export { LEDGER_SCHEMA };
