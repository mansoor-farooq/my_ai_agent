#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonical(value[key])]));
  return value;
}

function digest(value) {
  return crypto.createHash('sha256').update(JSON.stringify(canonical(value))).digest('hex');
}

export function createEffectKey({ projectId, taskId, action, target, payload } = {}) {
  for (const [name, value] of Object.entries({ projectId, taskId, action, target })) {
    if (!String(value || '').trim()) throw new Error(`${name} is required for an effect key`);
  }
  return `effect-${digest({ projectId, taskId, action, target, payload })}`;
}

function mapFor(store) {
  if (store instanceof Map) return store;
  if (store && typeof store.get === 'function' && typeof store.set === 'function') return store;
  throw new Error('effect store must provide get/set (Map or EffectLedger)');
}

export class EffectLedger {
  constructor(filePath) {
    this.filePath = path.resolve(filePath);
    this.records = new Map();
    if (fs.existsSync(this.filePath)) {
      for (const line of fs.readFileSync(this.filePath, 'utf8').split(/\r?\n/).filter(Boolean)) {
        try { const record = JSON.parse(line); if (record?.key) this.records.set(record.key, record); } catch { /* ignore malformed historical line */ }
      }
    }
  }
  get(key) { return this.records.get(key); }
  set(key, value) {
    this.records.set(key, value);
    fs.mkdirSync(path.dirname(this.filePath), { recursive: true });
    fs.appendFileSync(this.filePath, `${JSON.stringify(value)}\n`, 'utf8');
    return this;
  }
}

export function claimEffect(input = {}, store = new Map()) {
  const targetStore = mapFor(store);
  const key = input.effectKey || createEffectKey(input);
  const payloadHash = digest(input.payload ?? null);
  const existing = targetStore.get(key);
  if (existing) {
    if (existing.payloadHash !== payloadHash) throw new Error('effect payload mismatch for existing effect key');
    return { claimed: false, key, record: existing };
  }
  const record = {
    schemaVersion: 1,
    key,
    projectId: String(input.projectId),
    taskId: String(input.taskId),
    action: String(input.action),
    target: String(input.target),
    payloadHash,
    status: 'claimed',
    claimedAt: new Date().toISOString(),
    receipt: null,
  };
  targetStore.set(key, record);
  return { claimed: true, key, record };
}

export function completeEffect(key, receipt, store = new Map()) {
  const targetStore = mapFor(store);
  const existing = targetStore.get(key);
  if (!existing) throw new Error(`unknown effect key: ${key}`);
  const record = { ...existing, status: 'completed', completedAt: new Date().toISOString(), receipt: receipt ?? null };
  targetStore.set(key, record);
  return record;
}

export function readEffect(key, store = new Map()) {
  return mapFor(store).get(key) || null;
}

