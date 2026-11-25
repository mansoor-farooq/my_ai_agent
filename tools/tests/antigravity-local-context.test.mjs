import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {
  extractSnippets,
  prepareLocalContext,
  redactText,
  selectLocalCandidates,
} from '../antigravity-local-context.mjs';

test('local context redacts secrets and returns bounded line evidence', () => {
  const text = 'const token = sk-test-secret-value-123456789;\nconst route = "/checkout";\nconst next = true;';
  const snippets = extractSnippets(text, 'checkout');
  assert.equal(snippets.length, 1);
  assert.equal(snippets[0].startLine, 1);
  assert.match(redactText(text), /\[REDACTED_SECRET\]/);
  assert.doesNotMatch(redactText(text), /sk-test-secret/);
});

test('candidate selection keeps project instructions and query matches inside the file budget', () => {
  const files = ['AGENTS.md', 'src/orders/checkout.ts', 'src/orders/cart.ts', 'docs/deploy.md', '.env'];
  const selected = selectLocalCandidates(files, { query: 'checkout flow', grepMatches: ['src/orders/checkout.ts'], maxFiles: 3 });
  assert.ok(selected.includes('AGENTS.md'));
  assert.ok(selected.includes('src/orders/checkout.ts'));
  assert.ok(!selected.includes('.env'));
  assert.ok(selected.length <= 3);
});

test('Antigravity local context caches the packet and avoids a second content read', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'mansoor-antigravity-context-'));
  try {
    await mkdir(path.join(root, 'src'), { recursive: true });
    await writeFile(path.join(root, 'AGENTS.md'), 'Use the checkout contract.\n');
    await writeFile(path.join(root, 'src', 'checkout.ts'), 'export function checkout() { return true; }\n');
    await writeFile(path.join(root, '.env'), 'SECRET=do-not-index\n');
    const runGit = (_root, args) => {
      if (args[0] === 'ls-files') return 'AGENTS.md\0src/checkout.ts\0.env\0';
      if (args[0] === 'grep') return 'src/checkout.ts\n';
      if (args[0] === 'rev-parse') return 'abc123\n';
      if (args[0] === 'status') return '';
      return '';
    };
    const identity = { name: 'fixture', slug: 'fixture', projectId: 'fixture-1', directory: root, gitUrl: null, branch: 'main', commit: 'abc123' };
    const first = prepareLocalContext({ dir: root, project: 'fixture', query: 'checkout', maxFiles: 4, deps: { runGit, identity } });
    assert.equal(first.cacheHit, false);
    assert.equal(first.metrics.grepMatches, 1);
    assert.ok(Number.isFinite(first.metrics.durationMs));
    assert.equal(first.metrics.budgetMs, 45000);
    assert.ok(first.evidence.some((item) => item.path === 'src/checkout.ts'));
    assert.ok(first.evidence.every((item) => !item.path.endsWith('.env')));
    const second = prepareLocalContext({ dir: root, project: 'fixture', query: 'checkout', maxFiles: 4, deps: { runGit, identity } });
    assert.equal(second.cacheHit, true);
    assert.equal(second.metrics.contentReads, first.metrics.contentReads);
    assert.equal(second.metrics.cacheHit, true);
  } finally {
    await rm(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  }
});

test('local context stops content reads at the explicit latency budget', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'mansoor-antigravity-context-budget-'));
  try {
    await mkdir(path.join(root, 'src'), { recursive: true });
    await writeFile(path.join(root, 'src', 'one.ts'), 'export const one = 1;\n');
    await writeFile(path.join(root, 'src', 'two.ts'), 'export const two = 2;\n');
    let now = 0;
    const runGit = (_root, args) => {
      if (args[0] === 'ls-files') return 'src/one.ts\0src/two.ts\0';
      if (args[0] === 'rev-parse') return 'abc123\n';
      if (args[0] === 'status') return '';
      if (args[0] === 'config' || args[0] === 'branch') return '';
      return '';
    };
    const clock = () => { const value = now; now += 100; return value; };
    const result = prepareLocalContext({ dir: root, project: 'budget-fixture', query: '', maxFiles: 10, budgetMs: 250, deps: { runGit, clock } });
    assert.equal(result.metrics.budgetMs, 250);
    assert.equal(result.metrics.timedOut, true);
    assert.equal(result.metrics.stopReason, 'budget-exhausted');
  } finally {
    await rm(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  }
});
