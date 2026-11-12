import { createHash } from 'node:crypto';
import path from 'node:path';

const textExtensions = new Set([
  '.bat', '.cmd', '.css', '.dart', '.html', '.ini', '.java', '.js', '.json', '.jsx',
  '.md', '.mjs', '.ps1', '.py', '.rs', '.sh', '.sql', '.toml', '.ts', '.tsx', '.txt',
  '.xml', '.yaml', '.yml', '.cs', '.cshtml', '.razor', '.svg', '.properties', '.gradle',
]);

export function canonicalContentBytes(input, filePath = '') {
  const bytes = Buffer.isBuffer(input) ? input : Buffer.from(input);
  if (!textExtensions.has(path.extname(String(filePath)).toLowerCase()) || bytes.includes(0)) return bytes;
  return Buffer.from(bytes.toString('utf8').replace(/\r\n?/g, '\n'), 'utf8');
}

export function contentSha256(input, filePath = '') {
  return createHash('sha256').update(canonicalContentBytes(input, filePath)).digest('hex');
}
