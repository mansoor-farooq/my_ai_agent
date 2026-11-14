import assert from 'node:assert/strict';
import test from 'node:test';
import { probeCapabilities } from '../ultra-agent-v5/capability-preflight.mjs';
import { createPromotionReceipt, validatePromotionReceipt } from '../ultra-agent-v5/promotion-receipt.mjs';

test('capability preflight distinguishes supported, unknown and unsupported isolation', () => {
  const win10 = probeCapabilities({ platform: 'win32', release: '10.0.19045' });
  const win11 = probeCapabilities({ platform: 'win32', release: '10.0.26100' });
  const linux = probeCapabilities({ platform: 'linux', release: '6.1.0' });
  assert.equal(win10.isolation.status, 'unsupported');
  assert.equal(win11.isolation.status, 'available');
  assert.equal(linux.isolation.status, 'unknown');
  assert.notEqual(win11.isolation.status, 'verified-by-probe');
});

test('promotion receipt is bound to approval, manifest and observed file hashes', () => {
  const manifest = {
    manifestHash: 'sha256:manifest-1',
    actions: [{ path: 'src/app.js', contentHash: 'sha256:file-1' }],
  };
  const approval = { receiptId: 'APR-1', manifestHash: manifest.manifestHash, actor: 'owner', source: 'host-review' };
  const receipt = createPromotionReceipt(manifest, approval, [{ path: 'src/app.js', contentHash: 'sha256:file-1' }], { now: '2026-11-14T10:00:00.000Z' });
  assert.equal(validatePromotionReceipt(receipt, manifest, approval).valid, true);
  assert.equal(validatePromotionReceipt({ ...receipt, manifestHash: 'sha256:other' }, manifest, approval).valid, false);
  assert.equal(validatePromotionReceipt(receipt, manifest, { ...approval, receiptId: 'APR-2' }).valid, false);
});
