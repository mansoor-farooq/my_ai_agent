import assert from 'node:assert/strict';
import test from 'node:test';
import { canonicalContentBytes, contentSha256 } from '../content-hash.mjs';

test('canonical text hashes and byte counts are independent of LF or CRLF checkout', () => {
  const lf = Buffer.from('first\nsecond\n', 'utf8');
  const crlf = Buffer.from('first\r\nsecond\r\n', 'utf8');
  assert.deepEqual(canonicalContentBytes(lf, 'rules/example.md'), canonicalContentBytes(crlf, 'rules/example.md'));
  assert.equal(contentSha256(lf, 'rules/example.md'), contentSha256(crlf, 'rules/example.md'));
  assert.equal(canonicalContentBytes(lf, 'rules/example.md').length, canonicalContentBytes(crlf, 'rules/example.md').length);
});

test('binary content hashes remain byte-exact', () => {
  const bytes = Buffer.from([0, 13, 10, 255]);
  assert.deepEqual(canonicalContentBytes(bytes, 'asset.bin'), bytes);
});
