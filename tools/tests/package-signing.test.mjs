import test from 'node:test';
import assert from 'node:assert/strict';
import { generateKeyPairSync } from 'node:crypto';
import { signPackageManifest, verifyPackageSignature, OWNER_HANDLE, REPOSITORY_URL } from '../package-signing.mjs';

function createKeys() {
  return generateKeyPairSync('ed25519', {
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
  });
}

test('signs and verifies an owner package manifest', () => {
  const keys = createKeys();
  const manifest = Buffer.from('[{"Path":"README.md","SHA256":"ABC","Bytes":3}]\n');
  const signature = signPackageManifest(manifest, {
    privateKeyPem: keys.privateKey,
    publicKeyPem: keys.publicKey,
    version: '1.2.0'
  });

  assert.equal(signature.owner, OWNER_HANDLE);
  assert.equal(signature.repository, REPOSITORY_URL);
  assert.equal(verifyPackageSignature(manifest, signature, keys.publicKey), true);
});

test('rejects a changed package manifest', () => {
  const keys = createKeys();
  const manifest = Buffer.from('original\n');
  const signature = signPackageManifest(manifest, {
    privateKeyPem: keys.privateKey,
    publicKeyPem: keys.publicKey,
    version: '1.2.0'
  });

  assert.throws(() => verifyPackageSignature(Buffer.from('tampered\n'), signature, keys.publicKey), /signature|manifest/i);
});

test('rejects a signature with the wrong GitHub owner', () => {
  const keys = createKeys();
  const manifest = Buffer.from('manifest\n');
  const signature = signPackageManifest(manifest, {
    privateKeyPem: keys.privateKey,
    publicKeyPem: keys.publicKey,
    version: '1.2.0'
  });
  signature.owner = 'someone-else';

  assert.throws(() => verifyPackageSignature(manifest, signature, keys.publicKey), /owner/i);
});
