import test from 'node:test';
import assert from 'node:assert/strict';
import { scanText } from '../secret-scan.mjs';

test('secret scanner catches provider keys and redacts their values', () => {
  const findings = scanText('API_KEY=sk-proj-abcdefghijklmnopqrstuvwxyz123456', 'config.env');
  assert.equal(findings.length, 1);
  assert.match(findings[0].redacted, /<REDACTED>/);
  assert.doesNotMatch(JSON.stringify(findings), /abcdefghijklmnopqrstuvwxyz/);
});

test('secret scanner ignores placeholders and normal public URLs', () => {
  const findings = scanText('API_KEY=YOUR_API_KEY_HERE\nURL=https://example.com/catalog', 'README.md');
  assert.equal(findings.length, 0);
});
