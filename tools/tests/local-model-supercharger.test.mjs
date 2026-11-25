import test from 'node:test';
import assert from 'node:assert/strict';
import { buildLocalContextPacket, createLocalModelSuperchargePlan, listLocalBackends, probeLocalBackend } from '../ultra-agent-v5/local-model-supercharger.mjs';

test('probes a local backend through an injected runner without assuming installation', () => {
  const result = probeLocalBackend({ backend: 'ollama', commandRunner: (command, args) => ({ ok: command === 'ollama' && args[0] === 'list', model: 'qwen-local', contextTokens: 16384, device: 'cpu' }) });
  assert.deepEqual(result, { status: 'ready', backend: 'ollama', model: 'qwen-local', contextTokens: 16384, device: 'cpu' });
  assert.equal(listLocalBackends().length, 3);
});

test('supercharge plan adds evidence gates and visible fallback policy', () => {
  const plan = createLocalModelSuperchargePlan({ task: 'implement and browser-test a secure live site', risk: 'high', tools: ['rg', 'lighthouse', 'rg', 'unsafe-tool'] });
  assert.equal(plan.schema, 'mansoor.local-model-supercharger/v1');
  assert.equal(plan.maxParallelWorkers, 2);
  assert.ok(plan.requiredEvidence.includes('lighthouse-final-gate'));
  assert.ok(plan.requiredEvidence.includes('negative-path-security-check'));
  assert.equal(plan.tools.length, 3);
  assert.equal(plan.fallback.silentSwitchAllowed, false);
  assert.equal(plan.qualityContract.independentVerifier, true);
});

test('Turbo local model planning exposes twenty bounded worker slots', () => {
  const plan = createLocalModelSuperchargePlan({
    task: 'run independent repository research and verification workers',
    autonomy: 'turbo-autonomous',
  });
  assert.equal(plan.maxParallelWorkers, 20);
  assert.equal(plan.concurrency.mode, 'turbo-bounded');
  assert.match(plan.concurrency.scheduling, /backpressure/i);
});

test('context packet bounds evidence and reports omissions', () => {
  const packet = buildLocalContextPacket({ task: 'fix', evidence: [{ id: 1 }, { id: 2 }, { id: 3 }], maxItems: 2 });
  assert.equal(packet.evidence.length, 2);
  assert.equal(packet.omittedEvidence, 1);
  assert.equal(packet.provenanceRequired, true);
});
