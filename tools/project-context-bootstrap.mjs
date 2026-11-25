#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildContextPacket } from './ultra-agent-v3/context.mjs';
import { ensureProjectMemory } from './ultra-agent-v2/project-memory.mjs';
import { projectIdentity } from './ultra-agent-v2/project-identity.mjs';

const startMarker = '<!-- mansoor:auto-project-map:start -->';
const endMarker = '<!-- mansoor:auto-project-map:end -->';

function positiveInt(value, fallback = 80) {
  const number = Number.parseInt(value, 10);
  return Number.isFinite(number) && number > 0 ? Math.min(500, number) : fallback;
}

function oneLine(value) {
  return String(value ?? '').replace(/[\r\n|]+/g, ' ').trim();
}

function blockFor(packet) {
  const map = packet.repositoryMap;
  const rows = map.files.flatMap((file) => {
    const symbols = file.symbols.map((symbol) => `${symbol.name} (${symbol.kind})`).join(', ') || 'symbol-free file';
    return [`- \`${oneLine(file.path)}\` — ${oneLine(symbols)}`];
  });
  const selected = rows.length ? rows.join('\n') : '- No source files matched the current query.';
  return [
    startMarker,
    '## Automated repository index',
    `- Project: ${oneLine(packet.project.name)} (${packet.project.projectId})`,
    `- Branch/revision: ${oneLine(packet.project.branch || 'unknown')} / ${oneLine(packet.project.commit || 'working tree')}`,
    `- Indexed: ${oneLine(map.totalFiles)} source files; fingerprint: \`${oneLine(map.sourceFingerprint)}\``,
    `- Task-focused selection: ${map.files.length} files; selected symbol budget: ${map.symbolBudget}`,
    `- Refreshed: ${oneLine(map.generatedAt)}; content reads this pass: ${map.metrics.contentReads}; unchanged indexed files reused: ${map.metrics.reusedFiles}`,
    '- This index is navigation evidence only. Re-read the target lines and current callers before editing.',
    '',
    '### Relevant files and symbols',
    selected,
    endMarker,
  ].join('\n');
}

async function updateProjectMap(file, packet) {
  const current = await fs.readFile(file, 'utf8').catch(() => '# Project Map\n');
  const block = blockFor(packet);
  const markerPattern = /<!-- mansoor:auto-project-map:start -->[\s\S]*?<!-- mansoor:auto-project-map:end -->/;
  const next = markerPattern.test(current)
    ? current.replace(markerPattern, block)
    : `${current.trimEnd()}\n\n${block}\n`;
  if (next !== current) await fs.writeFile(file, next, 'utf8');
}

export async function prepareProjectContext({ dir = process.cwd(), project = path.basename(path.resolve(dir)), query = '', maxSymbols = 80, forceMap = false } = {}) {
  const projectDir = path.resolve(dir);
  const memoryDir = path.join(projectDir, '.agents', 'memory');
  const projectMapFile = path.join(memoryDir, 'project-map.md');
  const firstRun = !(await fs.stat(path.join(memoryDir, 'repository-map.json')).then(() => true).catch(() => false));
  ensureProjectMemory({ dir: projectDir, project: projectIdentity({ dir: projectDir, project }) });

  const packet = await buildContextPacket({ dir: projectDir, project, query, maxSymbols: positiveInt(maxSymbols), forceMap });
  await updateProjectMap(projectMapFile, packet);
  return {
    ok: true,
    command: 'prepare',
    firstRun,
    project: packet.project,
    memoryDir,
    mapFile: projectMapFile,
    contextFile: path.join(memoryDir, 'context-packet-cache.json'),
    contextCacheHit: packet.cacheHit,
    memorySource: packet.memorySource,
    repositoryMap: {
      schema: packet.repositoryMap.schema,
      sourceFingerprint: packet.repositoryMap.sourceFingerprint,
      totalFiles: packet.repositoryMap.totalFiles,
      selectedFiles: packet.repositoryMap.files.map((file) => file.path),
      symbolBudget: packet.repositoryMap.symbolBudget,
      cacheHit: packet.repositoryMap.cacheHit,
      metrics: packet.repositoryMap.metrics,
    },
    verifiedFacts: packet.verifiedFacts.length,
    conflicts: packet.conflicts.length,
    next: 'Read the ranked target files, relevant callers and tests; update only evidence-backed memory sections after the task.',
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))) {
  const args = process.argv.slice(2);
  const getArg = (name, fallback = '') => { const index = args.indexOf(name); return index >= 0 && args[index + 1] ? args[index + 1] : fallback; };
  prepareProjectContext({
    dir: getArg('--dir', process.cwd()),
    project: getArg('--project', path.basename(path.resolve(getArg('--dir', process.cwd())))),
    query: getArg('--query', ''),
    maxSymbols: getArg('--max-symbols', '80'),
    forceMap: args.includes('--force-map'),
  }).then((result) => console.log(JSON.stringify(result, null, 2)))
    .catch((error) => { console.error(`Project context bootstrap: ${error.message}`); process.exitCode = 1; });
}
