import { readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const skillRoot = path.join(root, 'skills');
const sourceRoots = [
  { label: 'antigravity-global', path: 'C:/Users/m.mansoor/.gemini/config/skills' },
  { label: 'cross-runtime-agents', path: 'C:/Users/m.mansoor/.agents/skills' },
  { label: 'codex-global', path: 'C:/Users/m.mansoor/.codex/skills' },
];

const entries = [];
for (const item of await readdir(skillRoot, { withFileTypes: true })) {
  if (!item.isDirectory()) continue;
  const skillFile = path.join(skillRoot, item.name, 'SKILL.md');
  let markdown;
  try { markdown = await readFile(skillFile, 'utf8'); } catch { continue; }
  const frontmatter = markdown.match(/^---\r?\n([\s\S]*?)\r?\n---/)?.[1] ?? '';
  const roots = [];
  for (const source of sourceRoots) {
    try { await readFile(path.join(source.path, item.name, 'SKILL.md')); roots.push(source.label); } catch {}
  }
  if (!roots.length) roots.push('mansoor-agent-hub-owned');
  const license = frontmatter.match(/^license:\s*([^\r\n]+)$/m)?.[1]?.trim() ?? null;
  const declaredSource = frontmatter.match(/^(?:source|source_repo|source_url):\s*([^\r\n]+)$/m)?.[1]?.trim() ?? null;
  entries.push({
    name: item.name,
    sourceRoots: roots,
    declaredLicense: license,
    declaredSource: declaredSource,
    provenanceStatus: license && declaredSource ? 'declared' : 'unverified',
    distribution: 'private-only',
    publicReleaseReviewRequired: !(license && declaredSource),
  });
}

entries.sort((a, b) => a.name.localeCompare(b.name));
const manifest = {
  schemaVersion: 1,
  generatedFrom: 'E:/Agents/skills',
  policy: {
    packageDistribution: 'private-only',
    unverifiedSkillsMayShipPrivately: true,
    publicReleaseRequiresDeclaredLicenseAndSource: true,
    neverInventLicenseOrProvenance: true,
  },
  skills: entries,
};
await writeFile(path.join(root, 'SKILL-PROVENANCE.json'), `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`Wrote provenance ledger for ${entries.length} skills; ${entries.filter((entry) => entry.publicReleaseReviewRequired).length} require public-release review.`);
