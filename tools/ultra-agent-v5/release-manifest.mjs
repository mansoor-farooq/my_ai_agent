#!/usr/bin/env node
import crypto from 'node:crypto';

function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonicalize(value[key])]));
  return value;
}

function hash(value) { return `sha256:${crypto.createHash('sha256').update(JSON.stringify(canonicalize(value)), 'utf8').digest('hex')}`; }

export function createReleaseManifest(input = {}, { now = new Date() } = {}) {
  const payload = {
    schema: 'mansoor.v5-release-manifest/v1',
    version: String(input.version || ''),
    sourceCommit: String(input.sourceCommit || ''),
    configHash: String(input.configHash || 'unavailable'),
    promptSetHash: String(input.promptSetHash || 'unavailable'),
    artifactSha256: String(input.artifactSha256 || 'unavailable'),
    schemaVersion: String(input.schemaVersion || 'v5'),
    builtAt: new Date(now).toISOString(),
  };
  return { ...payload, manifestHash: hash(payload) };
}

export function validateReleaseManifest(manifest) {
  if (!manifest || manifest.schema !== 'mansoor.v5-release-manifest/v1') return false;
  const payload = { ...manifest };
  delete payload.manifestHash;
  return Boolean(manifest.version && manifest.sourceCommit && manifest.schemaVersion && manifest.manifestHash === hash(payload));
}

export { hash as releaseManifestHash };
