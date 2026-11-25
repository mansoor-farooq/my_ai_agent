import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { buildRepositoryMap, rankMap } from '../repository-map.mjs';

test('repository map extracts symbols and ignores generated/vendor paths', async () => {
  const map = await buildRepositoryMap({ dir: process.cwd(), includeFiles: ['tools/repository-map.mjs', 'tools/agent-benchmark.mjs', 'node_modules/ignored.js'] });
  assert.ok(map.files.some((file) => file.path === 'tools/repository-map.mjs'));
  assert.ok(map.files.find((file) => file.path === 'tools/repository-map.mjs').symbols.some((symbol) => symbol.name === 'buildRepositoryMap'));
  assert.equal(map.files.some((file) => file.path.includes('node_modules')), false);
});

test('ranked map is deterministic and respects symbol budget', async () => {
  const map = { files: [
    { path: 'src/auth.ts', symbols: [{ name: 'login', kind: 'function' }] },
    { path: 'src/cart.ts', symbols: [{ name: 'addToCart', kind: 'function' }] },
  ] };
  const ranked = rankMap(map, 'cart', 1);
  assert.equal(ranked.length, 1);
  assert.equal(ranked[0].path, 'src/cart.ts');
});

test('repository map reuses its metadata-validated cache', async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'repository-map-cache-'));
  try {
    await mkdir(path.join(dir, 'src'), { recursive: true });
    await writeFile(path.join(dir, 'src', 'feature.ts'), 'export function feature() {}\n');
    const first = await buildRepositoryMap({ dir });
    const second = await buildRepositoryMap({ dir });
    assert.equal(first.cacheHit, false);
    assert.equal(second.cacheHit, true);
    assert.equal(second.sourceFingerprint, first.sourceFingerprint);
    assert.equal(second.metrics.contentReads, 0);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('repository map rereads only changed files and removes deleted files', async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'repository-map-incremental-'));
  try {
    await mkdir(path.join(dir, 'src'), { recursive: true });
    await writeFile(path.join(dir, 'src', 'one.ts'), 'export function one() {}\n');
    await writeFile(path.join(dir, 'src', 'two.ts'), 'export function two() {}\n');
    await buildRepositoryMap({ dir });
    await writeFile(path.join(dir, 'src', 'one.ts'), 'export function changedOne() {}\n');
    const changed = await buildRepositoryMap({ dir });
    assert.equal(changed.metrics.contentReads, 1);
    assert.equal(changed.metrics.reusedFiles, 1);
    assert.ok(changed.files.find((file) => file.path === 'src/one.ts').symbols.some((symbol) => symbol.name === 'changedOne'));
    await rm(path.join(dir, 'src', 'two.ts'));
    const afterDelete = await buildRepositoryMap({ dir });
    assert.equal(afterDelete.metrics.contentReads, 0);
    assert.equal(afterDelete.metrics.deletedFiles, 1);
    assert.deepEqual(afterDelete.files.map((file) => file.path), ['src/one.ts']);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
