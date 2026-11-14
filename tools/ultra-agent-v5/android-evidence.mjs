#!/usr/bin/env node
import crypto from 'node:crypto';
import path from 'node:path';

function hash(value) { return `sha256:${crypto.createHash('sha256').update(JSON.stringify(value), 'utf8').digest('hex')}`; }

export function createAndroidEvidence(input = {}, { now = new Date() } = {}) {
  const status = ['pass', 'fail', 'not-run', 'unverified'].includes(String(input.status)) ? String(input.status) : 'unverified';
  const record = {
    schema: 'mansoor.v5-android-evidence/v1',
    projectRoot: input.projectRoot ? path.resolve(String(input.projectRoot)) : process.cwd(),
    status,
    reason: String(input.reason || ''),
    buildHash: input.buildHash ? String(input.buildHash) : null,
    device: input.device && typeof input.device === 'object' ? {
      serial: input.device.serial ? String(input.device.serial) : null,
      model: input.device.model ? String(input.device.model) : null,
      apiLevel: Number.isFinite(input.device.apiLevel) ? input.device.apiLevel : null,
      orientation: input.device.orientation ? String(input.device.orientation) : null,
      locale: input.device.locale ? String(input.device.locale) : null,
    } : null,
    command: Array.isArray(input.command) ? input.command.map(String) : [],
    artifacts: Array.isArray(input.artifacts) ? input.artifacts.map(String) : [],
    recordedAt: new Date(now).toISOString(),
  };
  return { ...record, evidenceHash: hash(record) };
}

export function summarizeAndroidEvidence(records = []) {
  const items = Array.isArray(records) ? records : [];
  if (!items.length || items.every((item) => item.status === 'not-run')) return { overallStatus: 'not-run', total: items.length, passed: 0, failed: 0 };
  if (items.some((item) => item.status === 'fail')) return { overallStatus: 'fail', total: items.length, passed: items.filter((item) => item.status === 'pass').length, failed: items.filter((item) => item.status === 'fail').length };
  if (items.every((item) => item.status === 'pass')) return { overallStatus: 'pass', total: items.length, passed: items.length, failed: 0 };
  return { overallStatus: 'unverified', total: items.length, passed: items.filter((item) => item.status === 'pass').length, failed: items.filter((item) => item.status === 'fail').length };
}
