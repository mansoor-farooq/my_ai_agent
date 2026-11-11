#!/usr/bin/env node
import crypto from 'node:crypto';

function list(value) {
  return Array.isArray(value) ? value.map(String).filter(Boolean) : [];
}

export function rememberStage(state = {}) {
  if (state.verification?.allPassed !== true) {
    return { schema: 'mansoor.core-loop-memory/v1', status: 'skipped', facts: [], reason: 'verification-not-passed' };
  }
  const sourceRefs = list(state.sourceRefs ?? state.references?.sourceRefs);
  const facts = list(state.verifiedFacts ?? state.facts);
  const verifiedAt = String(state.verifiedAt || new Date().toISOString());
  const records = facts.filter(Boolean).map((fact) => ({
    fact,
    sourceRefs,
    verifiedAt,
    contentHash: `sha256:${crypto.createHash('sha256').update(JSON.stringify({ fact, sourceRefs, verifiedAt })).digest('hex')}`,
    status: 'verified',
  }));
  return { schema: 'mansoor.core-loop-memory/v1', status: 'ready', facts: records };
}

