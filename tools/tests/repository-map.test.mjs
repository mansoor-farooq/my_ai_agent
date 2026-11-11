import test from 'node:test';
import assert from 'node:assert/strict';
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
