#!/usr/bin/env node
import crypto from 'node:crypto';

const SCHEMA = 'mansoor.v5-promotion-receipt/v1';

function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonicalize(value[key])]));
  return value;
}

function hash(value) {
  return `sha256:${crypto.createHash('sha256').update(JSON.stringify(canonicalize(value)), 'utf8').digest('hex')}`;
}

function expectedFiles(manifest) {
  return (Array.isArray(manifest?.actions) ? manifest.actions : [])
    .map((action) => ({ path: String(action.path || ''), contentHash: String(action.contentHash || '') }))
    .sort((left, right) => left.path.localeCompare(right.path));
}

export function createPromotionReceipt(manifest, approval, observedFiles, { now = new Date() } = {}) {
  const files = (Array.isArray(observedFiles) ? observedFiles : [])
    .map((file) => ({ path: String(file?.path || ''), contentHash: String(file?.contentHash || '') }))
    .sort((left, right) => left.path.localeCompare(right.path));
  const payload = {
    schema: SCHEMA,
    status: 'ready-for-promotion',
    manifestHash: String(manifest?.manifestHash || ''),
    approvalId: String(approval?.receiptId || ''),
    actor: String(approval?.actor || ''),
    source: String(approval?.source || ''),
    createdAt: new Date(now).toISOString(),
    observedFiles: files,
    fileSetHash: hash(files),
  };
  return { ...payload, receiptHash: hash(payload) };
}

export function validatePromotionReceipt(receipt, manifest, approval) {
  if (!receipt || receipt.schema !== SCHEMA || receipt.status !== 'ready-for-promotion') return { valid: false, reason: 'promotion-receipt-invalid' };
  if (receipt.manifestHash !== manifest?.manifestHash) return { valid: false, reason: 'promotion-manifest-mismatch' };
  if (receipt.approvalId !== approval?.receiptId || approval?.manifestHash !== manifest?.manifestHash) return { valid: false, reason: 'promotion-approval-mismatch' };
  const payload = { ...receipt };
  delete payload.receiptHash;
  if (receipt.receiptHash !== hash(payload)) return { valid: false, reason: 'promotion-receipt-integrity-failed' };
  const observed = Array.isArray(receipt.observedFiles) ? receipt.observedFiles : [];
  if (receipt.fileSetHash !== hash(observed)) return { valid: false, reason: 'promotion-file-set-integrity-failed' };
  const expected = expectedFiles(manifest);
  if (JSON.stringify(observed) !== JSON.stringify(expected)) return { valid: false, reason: 'promotion-file-drift' };
  return { valid: true, manifestHash: manifest.manifestHash, approvalId: approval.receiptId };
}

export { SCHEMA as PROMOTION_RECEIPT_SCHEMA };
