import { generateKeyPairSync } from 'node:crypto';
import { chmod, mkdir, stat, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join, resolve } from 'node:path';

const force = process.argv.includes('--force');
const keyDirectory = resolve(process.argv[2] || join(homedir(), '.mansoor-agent-keys'));
const privateKeyPath = join(keyDirectory, 'release-ed25519-private.pem');
const publicKeyPath = join(keyDirectory, 'release-ed25519-public.pem');

await mkdir(keyDirectory, { recursive: true });
const keyFiles = [privateKeyPath, publicKeyPath];
const existing = await Promise.all(keyFiles.map(async (file) => {
  try {
    return (await stat(file)).isFile();
  } catch (error) {
    if (error.code === 'ENOENT') return false;
    throw error;
  }
}));

if (!force && existing.every(Boolean)) {
  console.log(`Owner signing key already exists and will be reused: ${keyDirectory}`);
  process.exit(0);
}
if (!force && existing.some(Boolean)) {
  throw new Error(`The owner key pair is incomplete in ${keyDirectory}. Restore the missing file or use --force to rotate both files together.`);
}

const { privateKey, publicKey } = generateKeyPairSync('ed25519', {
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  publicKeyEncoding: { type: 'spki', format: 'pem' }
});
await writeFile(privateKeyPath, privateKey, { encoding: 'utf8', mode: 0o600 });
await writeFile(publicKeyPath, publicKey, { encoding: 'utf8', mode: 0o644 });
try { await chmod(privateKeyPath, 0o600); } catch { /* Windows ACLs provide the effective boundary. */ }

console.log(`Owner signing key created outside the repository: ${keyDirectory}`);
console.log('Back up the private PEM securely. It is never copied into the ZIP or Git.');
