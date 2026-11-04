import { generateKeyPairSync } from 'node:crypto';
import { chmod, mkdir, readFile, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join, resolve } from 'node:path';

const force = process.argv.includes('--force');
const keyDirectory = resolve(process.argv[2] || join(homedir(), '.mansoor-agent-keys'));
const privateKeyPath = join(keyDirectory, 'release-ed25519-private.pem');
const publicKeyPath = join(keyDirectory, 'release-ed25519-public.pem');

await mkdir(keyDirectory, { recursive: true });
for (const file of [privateKeyPath, publicKeyPath]) {
  try {
    await readFile(file);
    if (!force) throw new Error(`Key already exists: ${file}. Use --force only if you intend to rotate it.`);
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
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
