import { createHash, createPublicKey, sign, verify } from 'node:crypto';
import { homedir } from 'node:os';
import { join } from 'node:path';

export const OWNER_HANDLE = 'mansoor-farooq';
export const REPOSITORY_URL = 'https://github.com/mansoor-farooq/my_ai_agent';
export const SIGNATURE_ALGORITHM = 'Ed25519';

export function defaultOwnerKeyPath() {
  return join(homedir(), '.mansoor-agent-keys', 'release-ed25519-private.pem');
}

export function publicKeyPemFromPrivate(privateKeyPem) {
  return createPublicKey(privateKeyPem).export({ type: 'spki', format: 'pem' }).toString();
}

function normalizePem(value) {
  return String(value).replace(/\r\n/g, '\n').trim();
}

function manifestDigest(manifestBytes) {
  return createHash('sha256').update(manifestBytes).digest('hex').toUpperCase();
}

export function signPackageManifest(manifestBytes, { privateKeyPem, publicKeyPem, version }) {
  if (!Buffer.isBuffer(manifestBytes)) throw new TypeError('manifestBytes must be a Buffer.');
  if (!privateKeyPem || !version) throw new Error('A private key and release version are required.');

  const derivedPublicKey = publicKeyPemFromPrivate(privateKeyPem);
  const trustedPublicKey = normalizePem(publicKeyPem || derivedPublicKey);
  if (normalizePem(derivedPublicKey) !== trustedPublicKey) {
    throw new Error('The supplied public key does not match the owner private key.');
  }

  const signature = sign(null, manifestBytes, privateKeyPem).toString('base64');
  return {
    version: 1,
    algorithm: SIGNATURE_ALGORITHM,
    owner: OWNER_HANDLE,
    repository: REPOSITORY_URL,
    releaseVersion: version,
    manifestSHA256: manifestDigest(manifestBytes),
    publicKeyPem: trustedPublicKey,
    signatureBase64: signature
  };
}

export function verifyPackageSignature(manifestBytes, signatureRecord, trustedPublicKeyPem) {
  if (!Buffer.isBuffer(manifestBytes)) throw new TypeError('manifestBytes must be a Buffer.');
  if (!signatureRecord || typeof signatureRecord !== 'object') throw new Error('Package signature metadata is missing.');
  if (signatureRecord.version !== 1 || signatureRecord.algorithm !== SIGNATURE_ALGORITHM) {
    throw new Error('Unsupported package signature format.');
  }
  if (signatureRecord.owner !== OWNER_HANDLE) throw new Error('Package owner verification failed.');
  if (signatureRecord.repository !== REPOSITORY_URL) throw new Error('Package repository verification failed.');
  if (normalizePem(signatureRecord.publicKeyPem) !== normalizePem(trustedPublicKeyPem)) {
    throw new Error('Package public-key trust verification failed.');
  }
  if (signatureRecord.manifestSHA256 !== manifestDigest(manifestBytes)) {
    throw new Error('Package manifest digest verification failed.');
  }

  const valid = verify(
    null,
    manifestBytes,
    trustedPublicKeyPem,
    Buffer.from(String(signatureRecord.signatureBase64 || ''), 'base64')
  );
  if (!valid) throw new Error('Package Ed25519 signature verification failed.');
  return true;
}
