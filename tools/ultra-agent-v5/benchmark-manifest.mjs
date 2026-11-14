#!/usr/bin/env node
import crypto from 'node:crypto';

function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonicalize(value[key])]));
  return value;
}
function hash(value) { return `sha256:${crypto.createHash('sha256').update(JSON.stringify(canonicalize(value)), 'utf8').digest('hex')}`; }

export function createBenchmarkManifest(input = {}, { now = new Date() } = {}) {
  const payload = {
    schema: 'mansoor.v5-benchmark-manifest/v1',
    benchmarkId: String(input.benchmarkId || ''),
    taskId: String(input.taskId || ''),
    agent: String(input.agent || ''),
    repoCommit: String(input.repoCommit || ''),
    kitVersion: String(input.kitVersion || ''),
    modelIdentity: String(input.modelIdentity || 'not-exposed-by-host'),
    prompt: String(input.prompt || ''),
    checks: Array.isArray(input.checks) ? input.checks.map(String) : [],
    acceptance: Array.isArray(input.acceptance) ? input.acceptance.map(String) : [],
    createdAt: new Date(now).toISOString(),
  };
  return { ...payload, manifestHash: hash(payload) };
}

export function validateBenchmarkManifest(manifest) {
  if (!manifest || manifest.schema !== 'mansoor.v5-benchmark-manifest/v1') return false;
  const payload = { ...manifest };
  delete payload.manifestHash;
  return Boolean(manifest.benchmarkId && manifest.taskId && manifest.agent && manifest.repoCommit && manifest.kitVersion && manifest.prompt && manifest.checks?.length && manifest.acceptance?.length && manifest.manifestHash === hash(payload));
}
