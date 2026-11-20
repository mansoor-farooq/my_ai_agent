#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const lockPath = path.join(root, 'skills-lock.json');
const skillRoot = path.join(root, 'skills');
const apply = process.argv.slice(2).includes('--apply');
if (process.argv.slice(2).some((arg) => arg !== '--apply')) throw new Error('Usage: npm run skills:update [-- --apply]');

export function validateReference(entry) {
  if (!entry || typeof entry !== 'object' || !/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(entry.source || '')) throw new Error('Skill source must be an explicit GitHub owner/repository.');
  if (!['github'].includes(entry.sourceType)) throw new Error('Only GitHub skill sources are supported.');
  if (typeof entry.skillPath !== 'string' || entry.skillPath.startsWith('/') || entry.skillPath.includes('\\') || entry.skillPath.split('/').some((part) => !part || part === '.' || part === '..')) throw new Error('Skill path must be a normalized repository-relative path.');
  if (!entry.skillPath.endsWith('/SKILL.md')) throw new Error('Skill references must point to SKILL.md.');
  if (typeof entry.ref !== 'string' || !/^[A-Za-z0-9._/-]{1,100}$/.test(entry.ref) || entry.ref.includes('..')) throw new Error('Skill reference must use a safe branch, tag, or commit.');
}

export function planSkillUpdate({ entry, installedHash, latestHash, commit }) {
  if (installedHash !== entry.computedHash) return { status: 'local-change' };
  if (latestHash === (entry.upstreamHash || installedHash)) return { status: 'current', commit };
  return { status: 'update-available', commit, hash: latestHash };
}

export function planSkillReference({ entry, installedHash, latestHash, commit }) {
  const base = planSkillUpdate({ entry, installedHash, latestHash, commit });
  if (base.status === 'local-change') return base;
  if (entry.resolvedCommit === commit && base.status === 'current') return { status: 'current', commit };
  return base;
}

export function decorateSkillSource(text, { license, sourceUrl }) {
  const normalized = text.replace(/\r\n/g, '\n');
  const frontmatter = normalized.match(/^---\n([\s\S]*?)\n---\n/);
  if (!frontmatter) throw new Error('Fetched skill has no valid YAML frontmatter.');
  let header = frontmatter[1];
  const licenseMatch = header.match(/^license:\s*(.+)\s*$/m);
  if (license && licenseMatch && licenseMatch[1].replace(/^['"]|['"]$/g, '') !== license) {
    throw new Error(`Upstream license changed from ${license} to ${licenseMatch[1]}; update blocked for review.`);
  }
  if (license && !licenseMatch) header += `\nlicense: ${license}`;
  if (/^source_url:/m.test(header)) {
    header = header.replace(/^source_url:.*$/m, `source_url: ${sourceUrl}`);
  } else {
    header += `\nsource_url: ${sourceUrl}`;
  }
  return normalized.replace(/^---\n[\s\S]*?\n---\n/, `---\n${header}\n---\n`);
}

export function bumpPatchVersion(version) {
  const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(version || '');
  if (!match) throw new Error(`Cannot safely bump non-stable package version: ${version}`);
  return `${match[1]}.${match[2]}.${Number(match[3]) + 1}`;
}

export function packageNeedsRebuild(sourceVersion, installedVersion) {
  return !sourceVersion || sourceVersion !== installedVersion;
}

const sha = (text) => crypto.createHash('sha256').update(text).digest('hex');
const readLock = () => JSON.parse(fs.readFileSync(lockPath, 'utf8'));
const fetchText = async (url, accept = 'application/vnd.github+json') => {
  const response = await fetch(url, { headers: { accept, 'user-agent': 'mansoor-agent-hub-skill-updater' } });
  if (!response.ok) throw new Error(`Reference fetch failed (${response.status}): ${url}`);
  return response.text();
};
const validSkill = (text, name) => {
  if (Buffer.byteLength(text, 'utf8') > 1_000_000) throw new Error(`${name}: SKILL.md exceeds 1 MB.`);
  if (!/^---\r?\n[\s\S]*?\r?\n---\r?\n/.test(text)) throw new Error(`${name}: fetched skill has invalid frontmatter.`);
  const header = text.match(/^---\r?\n([\s\S]*?)\r?\n---/)?.[1] ?? '';
  for (const field of ['name', 'description']) if (!new RegExp(`^${field}:\\s*\\S`, 'm').test(header)) throw new Error(`${name}: fetched skill is missing ${field}.`);
  if (/(?:gh[pousr]_[A-Za-z0-9]{30,}|sk-[A-Za-z0-9_-]{24,}|-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----)/.test(text)) throw new Error(`${name}: credential-like content found; update rejected.`);
};

async function update() {
  const lock = readLock();
  const provenance = JSON.parse(fs.readFileSync(path.join(root, 'SKILL-PROVENANCE.json'), 'utf8'));
  const commitCache = new Map();
  let changed = false;
  const actions = [];
  const pendingWrites = [];
  for (const [name, entry] of Object.entries(lock.skills)) {
    validateReference(entry);
    const currentPath = path.join(skillRoot, name, 'SKILL.md');
    const current = fs.readFileSync(currentPath, 'utf8');
    const currentHash = sha(current);
    if (currentHash !== entry.computedHash) {
      actions.push({ name, status: 'local-change-preserved' });
      continue;
    }
    const sourceId = entry.source;
    const apiBase = `https://api.github.com/repos/${sourceId}`;
    const cacheKey = `${sourceId}@${entry.ref}`;
    if (!commitCache.has(cacheKey)) commitCache.set(cacheKey, fetchText(`${apiBase}/commits/${encodeURIComponent(entry.ref)}`).then(JSON.parse));
    const commit = await commitCache.get(cacheKey);
    if (!/^[0-9a-f]{40}$/.test(commit.sha || '')) throw new Error(`${name}: GitHub returned an invalid commit identity.`);
    if (entry.resolvedCommit === commit.sha) {
      const plan = planSkillReference({ entry, installedHash: currentHash, latestHash: entry.upstreamHash || currentHash, commit: commit.sha });
      actions.push({ name, status: plan.status === 'current' ? 'current' : plan.status, commit: commit.sha.slice(0, 12) });
      continue;
    }
    const rawUrl = `https://raw.githubusercontent.com/${sourceId}/${commit.sha}/${entry.skillPath}`;
    const remote = await fetchText(rawUrl, 'text/plain');
    validSkill(remote, name);
    const remoteHash = sha(remote);
    const plan = planSkillReference({ entry, installedHash: currentHash, latestHash: remoteHash, commit: commit.sha });
    if (plan.status === 'local-change') {
      actions.push({ name, status: 'local-change-preserved' });
      continue;
    }
    if (plan.status === 'current') {
      if (entry.resolvedCommit !== commit.sha) {
        const sourceUrl = `https://github.com/${sourceId}/blob/${commit.sha}/${entry.skillPath}`;
        const installed = decorateSkillSource(remote, { license: entry.license, sourceUrl });
        if (apply) {
          const installedHash = sha(installed);
          if (installedHash !== currentHash) {
            pendingWrites.push({ currentPath, installed });
            entry.computedHash = installedHash;
            entry.upstreamHash = remoteHash;
            entry.sourceUrl = sourceUrl;
          }
          entry.resolvedCommit = commit.sha;
        }
        changed = true;
      }
      actions.push({ name, status: 'current', commit: commit.sha.slice(0, 12) });
      continue;
    }
    const provenanceEntry = provenance.skills.find((item) => item.name === name);
    if (!provenanceEntry?.declaredSource || !provenanceEntry?.declaredLicense) {
      actions.push({ name, status: 'blocked-missing-source-or-license' });
      continue;
    }
    actions.push({ name, status: 'update-available', commit: commit.sha.slice(0, 12) });
    if (apply) {
      const sourceUrl = `https://github.com/${sourceId}/blob/${commit.sha}/${entry.skillPath}`;
      const installed = decorateSkillSource(remote, { license: entry.license, sourceUrl });
      entry.computedHash = sha(installed);
      entry.upstreamHash = remoteHash;
      entry.sourceUrl = sourceUrl;
      entry.resolvedCommit = commit.sha;
      pendingWrites.push({ currentPath, installed });
      changed = true;
    }
  }
  if (apply && changed) {
    for (const pending of pendingWrites) fs.writeFileSync(pending.currentPath, pending.installed);
    fs.writeFileSync(lockPath, `${JSON.stringify(lock, null, 2)}\n`);
    if (pendingWrites.length) {
      const packagePath = path.join(root, 'package.json');
      const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
      packageJson.version = bumpPatchVersion(packageJson.version);
      fs.writeFileSync(packagePath, `${JSON.stringify(packageJson, null, 2)}\n`);
    }
  }
  for (const item of actions) console.log(`${item.status.padEnd(34)} ${item.name}${item.commit ? ` @ ${item.commit}` : ''}`);
  if (!apply && actions.some((item) => item.status === 'update-available')) console.log('Dry run only. Apply validated updates with: npm run skills:update -- --apply');
  if (apply && pendingWrites.length) console.log('Source skills updated and package patch version bumped. Run npm run agents:refresh to sync every installed provider.');
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  update().catch((error) => { console.error(error.message); process.exitCode = 1; });
}
