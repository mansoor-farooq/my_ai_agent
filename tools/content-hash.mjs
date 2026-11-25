import { createHash } from 'node:crypto';

export function canonicalContentBytes(input, filePath = '') {
  const bytes = Buffer.isBuffer(input) ? input : Buffer.from(input);
  if (bytes.includes(0)) return bytes;
  const text = bytes.toString('utf8');
  // Git may apply autocrlf to extensionless text assets such as OWNERS and
  // LICENSE. Normalize valid UTF-8 text independent of its filename while
  // retaining exact bytes for binary/non-UTF-8 payloads.
  if (!Buffer.from(text, 'utf8').equals(bytes)) return bytes;
  return Buffer.from(text.replace(/\r\n?/g, '\n'), 'utf8');
}

export function contentSha256(input, filePath = '') {
  return createHash('sha256').update(canonicalContentBytes(input, filePath)).digest('hex');
}
