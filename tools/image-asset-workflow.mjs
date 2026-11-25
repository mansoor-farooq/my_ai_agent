#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { access, copyFile, mkdtemp, readFile, realpath, rm, stat, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const MAX_CANVAS_EDGE = 8192;
const MAX_CANVAS_PIXELS = 40_000_000;
const MAX_ASSET_BYTES = 10 * 1024 * 1024;
const MAX_TOTAL_ASSET_BYTES = 40 * 1024 * 1024;
const COLOR = /^#[0-9a-f]{3}(?:[0-9a-f]{3})?$/i;
const SAFE_ID = /^[A-Za-z][A-Za-z0-9_.-]{0,63}$/;
const SAFE_FONT_FAMILY = /^[A-Za-z0-9 ,_-]{1,96}$/;
const PROTECTED_SEGMENT = /^(?:\.env(?:\..*)?|\.git|requirements)$/i;
const IMAGE_TYPES = [
  { mime: 'image/png', matches: (b) => b.length >= 8 && b.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) },
  { mime: 'image/jpeg', matches: (b) => b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  { mime: 'image/webp', matches: (b) => b.length >= 12 && b.toString('ascii', 0, 4) === 'RIFF' && b.toString('ascii', 8, 12) === 'WEBP' },
];

function fail(message) {
  throw new Error(message);
}

function finiteNumber(value, label, min = 0, max = Number.MAX_SAFE_INTEGER) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max) fail(`${label} must be a finite number from ${min} to ${max}.`);
  return value;
}

function nonEmpty(value, label, max = 500) {
  if (typeof value !== 'string' || !value.trim() || value.length > max) fail(`${label} must be a non-empty string of at most ${max} characters.`);
  return value;
}

function safeId(value, label) {
  if (typeof value !== 'string' || !SAFE_ID.test(value)) fail(`${label} must be a simple identifier (letters, digits, dot, underscore or dash).`);
  return value;
}

function safeColor(value, label) {
  if (typeof value !== 'string' || !COLOR.test(value)) fail(`${label} must be a hexadecimal color such as #123456.`);
  return value;
}

function safeRelativePath(raw, label) {
  if (typeof raw !== 'string' || !raw.trim() || raw.includes('\0') || /^[a-z][a-z0-9+.-]*:/i.test(raw)) fail(`${label} must be a local relative path.`);
  const normalized = raw.replaceAll('\\', '/');
  if (normalized.startsWith('/') || /^[A-Za-z]:/.test(normalized) || normalized.startsWith('//')) fail(`${label} must be a local relative path.`);
  const segments = normalized.split('/').filter(Boolean);
  if (!segments.length || segments.some((segment) => segment === '.' || segment === '..')) fail(`${label} cannot contain dot or traversal segments.`);
  if (segments.some((segment) => PROTECTED_SEGMENT.test(segment))) fail(`${label} targets a protected path.`);
  return segments.join('/');
}

function inside(root, candidate) {
  const relative = path.relative(root, candidate);
  return relative === '' || (!relative.startsWith(`..${path.sep}`) && relative !== '..' && !path.isAbsolute(relative));
}

function boundedBox(element, canvas, label) {
  const x = finiteNumber(element.x, `${label}.x`, 0, canvas.width);
  const y = finiteNumber(element.y, `${label}.y`, 0, canvas.height);
  const width = finiteNumber(element.width, `${label}.width`, 1, canvas.width);
  const height = finiteNumber(element.height, `${label}.height`, 1, canvas.height);
  if (x + width > canvas.width || y + height > canvas.height) fail(`${label} extends outside the canvas bounds.`);
  return { x, y, width, height };
}

function validateElement(element, canvas, index) {
  if (!element || typeof element !== 'object' || Array.isArray(element)) fail(`elements[${index}] must be an object.`);
  const id = safeId(element.id, `elements[${index}].id`);
  const role = nonEmpty(element.role, `elements[${index}].role`, 80);
  if (element.type === 'image') {
    const box = boundedBox(element, canvas, `elements[${index}]`);
    const fit = element.fit ?? 'contain';
    if (!['contain', 'cover'].includes(fit)) fail(`elements[${index}].fit must be contain or cover.`);
    return { ...box, id, role, type: 'image', path: safeRelativePath(element.path, `elements[${index}].path`), alt: nonEmpty(element.alt, `elements[${index}].alt`, 240), fit };
  }
  if (element.type === 'rect') {
    const box = boundedBox(element, canvas, `elements[${index}]`);
    const radius = finiteNumber(element.radius ?? 0, `elements[${index}].radius`, 0, Math.min(box.width, box.height) / 2);
    return { ...box, id, role, type: 'rect', fill: safeColor(element.fill, `elements[${index}].fill`), radius };
  }
  if (element.type === 'text') {
    if (!Array.isArray(element.lines) || element.lines.length < 1 || element.lines.length > 12) fail(`elements[${index}].lines must contain 1 to 12 explicit lines.`);
    const lines = element.lines.map((line, lineIndex) => nonEmpty(line, `elements[${index}].lines[${lineIndex}]`, 220));
    const x = finiteNumber(element.x, `elements[${index}].x`, 0, canvas.width);
    const y = finiteNumber(element.y, `elements[${index}].y`, 1, canvas.height);
    const maxWidth = finiteNumber(element.maxWidth, `elements[${index}].maxWidth`, 1, canvas.width);
    const fontSize = finiteNumber(element.fontSize, `elements[${index}].fontSize`, 8, 512);
    const lineHeight = finiteNumber(element.lineHeight ?? fontSize * 1.2, `elements[${index}].lineHeight`, fontSize, 640);
    const weight = finiteNumber(element.weight ?? 400, `elements[${index}].weight`, 100, 900);
    if (!Number.isInteger(weight)) fail(`elements[${index}].weight must be an integer.`);
    const anchor = element.anchor ?? 'start';
    if (!['start', 'middle', 'end'].includes(anchor)) fail(`elements[${index}].anchor must be start, middle or end.`);
    const left = anchor === 'start' ? x : anchor === 'middle' ? x - maxWidth / 2 : x - maxWidth;
    const right = anchor === 'start' ? x + maxWidth : anchor === 'middle' ? x + maxWidth / 2 : x;
    if (left < 0 || right > canvas.width || y - fontSize < 0 || y + (lines.length - 1) * lineHeight + fontSize * 0.4 > canvas.height) fail(`elements[${index}] text box extends outside the canvas bounds.`);
    for (const [lineIndex, line] of lines.entries()) {
      const wideGlyph = /[^\u0000-\u00ff]/u.test(line);
      const estimatedWidth = [...line].length * fontSize * (wideGlyph ? 0.95 : 0.62);
      if (estimatedWidth > maxWidth) fail(`elements[${index}].lines[${lineIndex}] is too long for maxWidth; add explicit line breaks or reduce fontSize.`);
    }
    const fontFamily = nonEmpty(element.fontFamily ?? 'Arial, sans-serif', `elements[${index}].fontFamily`, 96);
    if (!SAFE_FONT_FAMILY.test(fontFamily)) fail(`elements[${index}].fontFamily contains unsupported characters.`);
    return { id, role, type: 'text', lines, x, y, maxWidth, fontSize, lineHeight, weight, anchor, fontFamily, color: safeColor(element.color, `elements[${index}].color`) };
  }
  fail(`elements[${index}].type must be image, text or rect.`);
}

export function validateImageBrief(brief) {
  if (!brief || typeof brief !== 'object' || Array.isArray(brief) || brief.schema !== 'mansoor.image-brief/v1') fail('Image brief must use schema mansoor.image-brief/v1.');
  const id = safeId(brief.id, 'id');
  if (!brief.canvas || typeof brief.canvas !== 'object') fail('canvas is required.');
  const width = finiteNumber(brief.canvas.width, 'canvas.width', 1, MAX_CANVAS_EDGE);
  const height = finiteNumber(brief.canvas.height, 'canvas.height', 1, MAX_CANVAS_EDGE);
  if (!Number.isInteger(width) || !Number.isInteger(height) || width * height > MAX_CANVAS_PIXELS) fail(`Canvas must use integer dimensions and remain at or below ${MAX_CANVAS_PIXELS} pixels.`);
  const background = safeColor(brief.canvas.background, 'canvas.background');
  if (!Array.isArray(brief.elements) || brief.elements.length < 1 || brief.elements.length > 40) fail('Image brief must contain 1 to 40 explicit elements.');
  const elements = brief.elements.map((element, index) => validateElement(element, { width, height }, index));
  const ids = elements.map((element) => element.id);
  if (new Set(ids).size !== ids.length) fail('Element IDs must be unique.');
  return { ok: true, id, width, height, elementCount: elements.length, background, title: typeof brief.title === 'string' ? brief.title : id, description: typeof brief.description === 'string' ? brief.description : '', elements };
}

function xmlEscape(value) {
  return String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&apos;');
}

function number(value) {
  return Number.isInteger(value) ? String(value) : String(Number(value.toFixed(3)));
}

async function readLocalImage(rootReal, relativePath) {
  const target = path.resolve(rootReal, ...relativePath.split('/'));
  let actual;
  try { actual = await realpath(target); } catch { fail(`Local image asset does not exist: ${relativePath}`); }
  if (!inside(rootReal, actual)) fail(`Local image asset resolves outside the project: ${relativePath}`);
  const info = await stat(actual);
  if (!info.isFile()) fail(`Local image asset is not a file: ${relativePath}`);
  if (info.size < 12 || info.size > MAX_ASSET_BYTES) fail(`Image asset must be between 12 bytes and ${MAX_ASSET_BYTES} bytes: ${relativePath}`);
  const bytes = await readFile(actual);
  const type = IMAGE_TYPES.find((candidate) => candidate.matches(bytes));
  if (!type) fail(`Unsupported local image format (use PNG, JPEG or WebP): ${relativePath}`);
  return { path: relativePath, bytes, mime: type.mime, sha256: createHash('sha256').update(bytes).digest('hex') };
}

export async function composeImageBriefToSvg(brief, projectRoot) {
  const validated = validateImageBrief(brief);
  const rootReal = await realpath(projectRoot);
  const assets = new Map();
  let totalBytes = 0;
  for (const element of validated.elements) {
    if (element.type !== 'image' || assets.has(element.path)) continue;
    const asset = await readLocalImage(rootReal, element.path);
    totalBytes += asset.bytes.length;
    if (totalBytes > MAX_TOTAL_ASSET_BYTES) fail(`Embedded source images exceed the ${MAX_TOTAL_ASSET_BYTES} byte total limit.`);
    assets.set(element.path, asset);
  }

  const parts = [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<svg xmlns="http://www.w3.org/2000/svg" width="${validated.width}" height="${validated.height}" viewBox="0 0 ${validated.width} ${validated.height}" role="img" aria-labelledby="banner-title banner-description">`,
    `<title id="banner-title">${xmlEscape(validated.title)}</title>`,
    `<desc id="banner-description">${xmlEscape(validated.description)}</desc>`,
    `<rect width="100%" height="100%" fill="${validated.background}"/>`,
  ];

  for (const element of validated.elements) {
    if (element.type === 'rect') {
      parts.push(`<rect id="${xmlEscape(element.id)}" data-role="${xmlEscape(element.role)}" x="${number(element.x)}" y="${number(element.y)}" width="${number(element.width)}" height="${number(element.height)}" rx="${number(element.radius)}" fill="${element.fill}"/>`);
    } else if (element.type === 'image') {
      const asset = assets.get(element.path);
      const clipId = `clip-${element.id}`;
      parts.push(`<defs><clipPath id="${clipId}"><rect x="${number(element.x)}" y="${number(element.y)}" width="${number(element.width)}" height="${number(element.height)}"/></clipPath></defs>`);
      parts.push(`<image id="${xmlEscape(element.id)}" data-role="${xmlEscape(element.role)}" data-asset-path="${xmlEscape(element.path)}" x="${number(element.x)}" y="${number(element.y)}" width="${number(element.width)}" height="${number(element.height)}" preserveAspectRatio="xMidYMid ${element.fit === 'cover' ? 'slice' : 'meet'}" clip-path="url(#${clipId})" href="data:${asset.mime};base64,${asset.bytes.toString('base64')}"><title>${xmlEscape(element.alt)}</title></image>`);
    } else {
      const label = element.lines.join('\n');
      const tspans = element.lines.map((line, index) => `<tspan x="${number(element.x)}" dy="${index === 0 ? '0' : number(element.lineHeight)}">${xmlEscape(line)}</tspan>`).join('');
      parts.push(`<text id="${xmlEscape(element.id)}" data-role="${xmlEscape(element.role)}" aria-label="${xmlEscape(label)}" x="${number(element.x)}" y="${number(element.y)}" text-anchor="${element.anchor}" font-family="${xmlEscape(element.fontFamily)}" font-size="${number(element.fontSize)}" font-weight="${number(element.weight)}" fill="${element.color}">${tspans}</text>`);
    }
  }

  parts.push('</svg>');
  const svg = `${parts.join('\n')}\n`;
  const sha256 = createHash('sha256').update(svg, 'utf8').digest('hex');
  return {
    svg,
    width: validated.width,
    height: validated.height,
    sha256,
    assets: [...assets.values()].map(({ path: assetPath, mime, bytes, sha256: assetHash }) => ({ path: assetPath, mime, bytes: bytes.length, sha256: assetHash })),
  };
}

export async function writeImageBriefSvg(brief, { projectRoot, outputPath }) {
  const rootReal = await realpath(projectRoot);
  const outputRelative = safeRelativePath(outputPath, 'outputPath');
  if (!outputRelative.toLowerCase().endsWith('.svg')) fail('outputPath must end in .svg.');
  const target = path.resolve(rootReal, ...outputRelative.split('/'));
  const parent = path.dirname(target);
  const parentReal = await realpath(parent).catch(() => fail('Output directory must already exist; choose an existing project asset directory.'));
  if (!inside(rootReal, parentReal)) fail('Output directory resolves outside the project.');
  if (!(await stat(parentReal)).isDirectory()) fail('Output parent must be a directory.');
  if (await access(target).then(() => true, () => false)) fail(`Output file already exists; choose a new filename: ${outputRelative}`);
  const result = await composeImageBriefToSvg(brief, rootReal);
  await writeFile(target, result.svg, { encoding: 'utf8', flag: 'wx' });
  return { status: 'created', path: outputRelative, width: result.width, height: result.height, bytes: Buffer.byteLength(result.svg), sha256: result.sha256, assets: result.assets };
}

export function parsePngDimensions(bytes) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  if (!Buffer.isBuffer(bytes) || bytes.length < 24 || !bytes.subarray(0, 8).equals(signature) || bytes.toString('ascii', 12, 16) !== 'IHDR') fail('Raster renderer did not produce a valid PNG header.');
  return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
}

function findBrowser(browserPath) {
  if (browserPath) {
    if (!path.isAbsolute(browserPath) || !existsSync(browserPath)) fail('browserPath must name an existing local Chromium/Chrome executable.');
    return browserPath;
  }
  const roots = [process.env.PROGRAMFILES, process.env['PROGRAMFILES(X86)'], process.env.LOCALAPPDATA].filter(Boolean);
  const relatives = process.platform === 'win32'
    // Prefer Edge on Windows: the local release smoke completed reliably there,
    // while Chrome may already be running with a profile lock on this machine.
    ? ['Microsoft/Edge/Application/msedge.exe', 'Google/Chrome/Application/chrome.exe']
    : ['google-chrome', 'chromium', 'chromium-browser', 'microsoft-edge'];
  for (const relative of relatives) {
    for (const root of roots) {
      const candidate = path.join(root, relative);
      if (existsSync(candidate)) return candidate;
    }
  }
  if (process.platform !== 'win32') {
    for (const command of relatives) {
      const result = spawnSync('which', [command], { encoding: 'utf8', windowsHide: true, timeout: 3000 });
      const candidate = result.stdout?.trim();
      if (result.status === 0 && candidate) return candidate;
    }
  }
  fail('No local Chrome, Chromium or Edge renderer was found. SVG output remains available without a renderer.');
}

function renderEnvironment() {
  const keys = process.platform === 'win32'
    ? ['PATH', 'SYSTEMROOT', 'WINDIR', 'TEMP', 'TMP', 'LOCALAPPDATA', 'APPDATA', 'USERPROFILE']
    : ['PATH', 'HOME', 'TMPDIR', 'DISPLAY'];
  return Object.fromEntries(keys.filter((key) => process.env[key]).map((key) => [key, process.env[key]]));
}

async function renderSvgToPng({ svgPath, pngPath, width, height, browserPath }) {
  const browser = findBrowser(browserPath);
  const profile = await mkdtemp(path.join(os.tmpdir(), 'mansoor-image-render-profile-'));
  try {
    const args = [
      '--headless=new', '--disable-gpu', '--disable-extensions', '--disable-background-networking',
      '--disable-sync', '--no-first-run', '--no-default-browser-check', '--hide-scrollbars',
      '--force-device-scale-factor=1', `--window-size=${width},${height}`,
      `--user-data-dir=${profile}`, `--screenshot=${pngPath}`, pathToFileURL(svgPath).href,
    ];
    const result = spawnSync(browser, args, { encoding: 'utf8', windowsHide: true, timeout: 30_000, maxBuffer: 1024 * 1024, env: renderEnvironment() });
    if (result.error) fail(result.error.code === 'ETIMEDOUT' ? 'Local Chromium render exceeded its 30-second budget.' : `Local Chromium render failed: ${result.error.message}`);
    if (result.status !== 0) fail(`Local Chromium render exited with code ${result.status}.`);
  } finally {
    await rm(profile, { recursive: true, force: true });
  }
}

export async function writeImageBriefPng(brief, { projectRoot, outputPath, browserPath, renderer = renderSvgToPng }) {
  const rootReal = await realpath(projectRoot);
  const outputRelative = safeRelativePath(outputPath, 'outputPath');
  if (!outputRelative.toLowerCase().endsWith('.png')) fail('outputPath must end in .png.');
  const target = path.resolve(rootReal, ...outputRelative.split('/'));
  const parent = path.dirname(target);
  const parentReal = await realpath(parent).catch(() => fail('Output directory must already exist; choose an existing project asset directory.'));
  if (!inside(rootReal, parentReal)) fail('Output directory resolves outside the project.');
  if (!(await stat(parentReal)).isDirectory()) fail('Output parent must be a directory.');
  if (await access(target).then(() => true, () => false)) fail(`Output file already exists; choose a new filename: ${outputRelative}`);

  const composed = await composeImageBriefToSvg(brief, rootReal);
  const tempRoot = await mkdtemp(path.join(os.tmpdir(), 'mansoor-image-render-'));
  const svgPath = path.join(tempRoot, `${brief.id}.svg`);
  const pngPath = path.join(tempRoot, `${brief.id}.png`);
  try {
    await writeFile(svgPath, composed.svg, { encoding: 'utf8', flag: 'wx' });
    await renderer({ svgPath, pngPath, width: composed.width, height: composed.height, browserPath });
    const png = await readFile(pngPath);
    const dimensions = parsePngDimensions(png);
    if (dimensions.width !== composed.width || dimensions.height !== composed.height) fail(`Local renderer returned PNG dimensions ${dimensions.width}x${dimensions.height}; expected ${composed.width}x${composed.height}.`);
    await copyFile(pngPath, target, 1);
    return { status: 'created', path: outputRelative, width: dimensions.width, height: dimensions.height, bytes: png.length, sha256: createHash('sha256').update(png).digest('hex'), svgSha256: composed.sha256, assets: composed.assets };
  } finally {
    await rm(tempRoot, { recursive: true, force: true });
  }
}

function parseArgs(args) {
  const result = {};
  for (let i = 0; i < args.length; i += 1) {
    const name = args[i];
    if (!name.startsWith('--') || !args[i + 1] || args[i + 1].startsWith('--')) fail(`Expected a value after ${name}.`);
    result[name.slice(2)] = args[++i];
  }
  return result;
}

async function main() {
  const [command, ...args] = process.argv.slice(2);
  if (command === '--help' || command === '-h') {
    process.stdout.write('Usage: node tools/image-asset-workflow.mjs compose --dir <project> --brief <brief.json> --out <new-banner.svg|new-banner.png> [--browser <chrome-or-edge.exe>]\n');
    return;
  }
  if (command !== 'compose') fail('Only the deterministic local compose command is available.');
  const options = parseArgs(args);
  if (!options.dir || !options.brief || !options.out) fail('compose requires --dir, --brief and --out.');
  const projectRoot = await realpath(options.dir);
  const briefRelative = safeRelativePath(options.brief, 'brief');
  const briefPath = path.resolve(projectRoot, ...briefRelative.split('/'));
  const briefReal = await realpath(briefPath);
  if (!inside(projectRoot, briefReal)) fail('brief resolves outside the project.');
  const brief = JSON.parse(await readFile(briefReal, 'utf8'));
  const outputOptions = { projectRoot, outputPath: options.out, browserPath: options.browser };
  const extension = path.extname(options.out).toLowerCase();
  const result = extension === '.svg'
    ? await writeImageBriefSvg(brief, outputOptions)
    : extension === '.png'
      ? await writeImageBriefPng(brief, outputOptions)
      : fail('Output must use .svg or .png.');
  process.stdout.write(`${JSON.stringify({ schema: 'mansoor.image-workflow-result/v1', ...result })}\n`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    process.stderr.write(`Image asset workflow blocked: ${error.message}\n`);
    process.exitCode = 1;
  });
}
