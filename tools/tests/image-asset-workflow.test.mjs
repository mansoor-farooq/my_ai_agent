import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtemp, mkdir, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { composeImageBriefToSvg, parsePngDimensions, validateImageBrief, writeImageBriefPng, writeImageBriefSvg } from '../image-asset-workflow.mjs';

const pixelPng = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a1WQAAAAASUVORK5CYII=', 'base64');

function brief(imagePath = 'assets/product.png') {
  return {
    schema: 'mansoor.image-brief/v1',
    id: 'home-banner',
    canvas: { width: 1200, height: 400, background: '#0D4F43' },
    elements: [
      { id: 'logo', type: 'image', role: 'approved-logo', alt: 'Youngs Bazar logo', path: imagePath, x: 40, y: 30, width: 180, height: 60, fit: 'contain' },
      { id: 'headline', type: 'text', role: 'exact-copy', lines: ['Everyday favourites & fresh,', 'made easy.'], x: 48, y: 175, maxWidth: 620, fontSize: 32, lineHeight: 40, fontFamily: 'Arial, sans-serif', weight: 700, color: '#FFFFFF' },
      { id: 'panel', type: 'rect', role: 'decoration', x: 900, y: 30, width: 240, height: 340, fill: '#F7C95B', radius: 24 },
    ],
  };
}

test('validates a compact image brief and rejects absent requirements', () => {
  const result = validateImageBrief(brief());
  assert.equal(result.ok, true);
  assert.equal(result.id, 'home-banner');
  assert.equal(result.width, 1200);
  assert.equal(result.height, 400);
  assert.equal(result.elementCount, 3);
  assert.throws(() => validateImageBrief({ ...brief(), canvas: { width: 0, height: 400, background: '#fff' } }), /canvas/i);
  assert.throws(() => validateImageBrief({ ...brief(), elements: [] }), /element/i);
});

test('composes a deterministic standalone SVG with local assets and exact escaped copy', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'image-workflow-'));
  try {
    await mkdir(path.join(root, 'assets'));
    await writeFile(path.join(root, 'assets', 'product.png'), pixelPng);
    const result = await composeImageBriefToSvg(brief(), root);
    assert.equal(result.width, 1200);
    assert.equal(result.height, 400);
    assert.match(result.svg, /<svg[^>]+width="1200"[^>]+height="400"/);
    assert.match(result.svg, /data:image\/png;base64,/);
    assert.match(result.svg, /Everyday favourites &amp; fresh,/);
    assert.match(result.svg, /&amp;/, 'XML-special characters are escaped');
    assert.equal(result.assets[0].path, 'assets/product.png');
    assert.match(result.sha256, /^[a-f0-9]{64}$/);
    const second = await composeImageBriefToSvg(brief(), root);
    assert.equal(second.svg, result.svg, 'same brief and bytes produce identical SVG');
  } finally { await rm(root, { recursive: true, force: true }); }
});

test('rejects remote, traversal, and symlink-escaped source assets', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'image-workflow-root-'));
  const outside = await mkdtemp(path.join(os.tmpdir(), 'image-workflow-outside-'));
  try {
    await mkdir(path.join(root, 'assets'));
    await writeFile(path.join(outside, 'secret.png'), pixelPng);
    await symlink(outside, path.join(root, 'escape'), 'junction');
    await assert.rejects(composeImageBriefToSvg(brief('../outside.png'), root), /relative|traversal|asset path/i);
    await assert.rejects(composeImageBriefToSvg(brief('https://example.com/banner.png'), root), /relative|local|asset path/i);
    await assert.rejects(composeImageBriefToSvg(brief('escape/secret.png'), root), /outside|escape|asset path/i);
  } finally {
    await rm(root, { recursive: true, force: true });
    await rm(outside, { recursive: true, force: true });
  }
});

test('rejects overflowing elements, unsafe colors, and non-image source files', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'image-workflow-'));
  try {
    await mkdir(path.join(root, 'assets'));
    await writeFile(path.join(root, 'assets', 'product.png'), pixelPng);
    await assert.rejects(composeImageBriefToSvg({ ...brief(), elements: [{ ...brief().elements[0], x: 1190 } ] }, root), /bounds|canvas/i);
    await assert.rejects(composeImageBriefToSvg({ ...brief(), canvas: { ...brief().canvas, background: 'url(https://bad)' } }, root), /color/i);
    await writeFile(path.join(root, 'assets', 'not-image.png'), 'not an image');
    await assert.rejects(composeImageBriefToSvg(brief('assets/not-image.png'), root), /format|image/i);
  } finally { await rm(root, { recursive: true, force: true }); }
});

test('writes only a new SVG beneath an existing project directory', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'image-workflow-write-'));
  try {
    await mkdir(path.join(root, 'assets'));
    await writeFile(path.join(root, 'assets', 'product.png'), pixelPng);
    const result = await writeImageBriefSvg(brief(), { projectRoot: root, outputPath: 'assets/home-banner.svg' });
    assert.equal(result.status, 'created');
    assert.match(await readFile(path.join(root, 'assets', 'home-banner.svg'), 'utf8'), /<svg/);
    await assert.rejects(writeImageBriefSvg(brief(), { projectRoot: root, outputPath: 'assets/home-banner.svg' }), /exists/i);
    await assert.rejects(writeImageBriefSvg(brief(), { projectRoot: root, outputPath: '../outside.svg' }), /relative|inside|path/i);
  } finally { await rm(root, { recursive: true, force: true }); }
});

test('rasterizes a composed banner through an injected local renderer and verifies exact pixel dimensions', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'image-workflow-png-'));
  try {
    await mkdir(path.join(root, 'assets'));
    await writeFile(path.join(root, 'assets', 'product.png'), pixelPng);
    const result = await writeImageBriefPng(brief(), {
      projectRoot: root,
      outputPath: 'assets/home-banner.png',
      renderer: async ({ pngPath }) => {
        const output = Buffer.from(pixelPng);
        output.writeUInt32BE(1200, 16);
        output.writeUInt32BE(400, 20);
        await writeFile(pngPath, output);
      },
    });
    assert.equal(result.status, 'created');
    assert.equal(result.width, 1200);
    assert.equal(result.height, 400);
    assert.deepEqual(parsePngDimensions(await readFile(path.join(root, 'assets', 'home-banner.png'))), { width: 1200, height: 400 });
  } finally { await rm(root, { recursive: true, force: true }); }
});

test('rejects raster output when renderer dimensions do not match the canvas brief', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'image-workflow-png-size-'));
  try {
    await mkdir(path.join(root, 'assets'));
    await writeFile(path.join(root, 'assets', 'product.png'), pixelPng);
    await assert.rejects(writeImageBriefPng(brief(), {
      projectRoot: root,
      outputPath: 'assets/wrong-size.png',
      renderer: async ({ pngPath }) => writeFile(pngPath, pixelPng),
    }), /dimensions/i);
  } finally { await rm(root, { recursive: true, force: true }); }
});
