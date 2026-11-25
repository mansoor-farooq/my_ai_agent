#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { constants as fsConstants } from 'node:fs';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const stateName = '.mansoor-agent-hub-antigravity-managed.json';
const stateSchema = 'mansoor-antigravity-agent-sync/v1';
const ownerMarker = '<!-- managed-by: mansoor-agent-hub-antigravity -->';

function sha256(bytes) {
  return createHash('sha256').update(bytes).digest('hex');
}

function isInside(parent, child) {
  const relative = path.relative(path.resolve(parent), path.resolve(child));
  return relative === '' || (!relative.startsWith(`..${path.sep}`) && relative !== '..' && !path.isAbsolute(relative));
}

async function assertNoSymlinkAncestors(value) {
  const resolved = path.resolve(value);
  const { root } = path.parse(resolved);
  const tail = resolved.slice(root.length);
  let current = root;
  for (const part of tail.split(path.sep).filter(Boolean)) {
    current = path.join(current, part);
    try {
      const stats = await fs.lstat(current);
      if (stats.isSymbolicLink()) throw new Error(`Refusing symbolic-link path component: ${current}`);
    } catch (error) { if (error?.code === 'ENOENT') return; throw error; }
  }
}

function profileName(text) {
  const frontmatter = text.match(/^---\r?\n([\s\S]*?)\r?\n---/m)?.[1] ?? '';
  const value = frontmatter.match(/^name:\s*(.*?)\s*$/m)?.[1] ?? '';
  return value.replace(/^['"]|['"]$/g, '').trim();
}

function isLegacyMansoorProfile(slug, text) {
  const normalized = String(slug).toLowerCase();
  const name = profileName(text).toLowerCase();
  return /^(?:mansoor|chester)(?:$|[-_.\s])/.test(normalized)
    || /\b(?:mansoor|chester)\b/.test(name);
}

function safeRelative(relative) {
  const normalized = String(relative || '').replaceAll('\\', '/');
  if (!normalized || normalized.startsWith('/') || normalized.split('/').some((part) => !part || part === '.' || part === '..')) return false;
  return normalized.split('/').length === 2 && normalized.endsWith('/agent.md');
}

async function readSources(sourceRoot, release) {
  const resolved = path.resolve(sourceRoot);
  await assertNoSymlinkAncestors(resolved);
  const pluginRoot = path.dirname(resolved);
  const manifestFile = path.join(pluginRoot, 'plugin.json');
  const manifestStats = await fs.lstat(manifestFile);
  if (manifestStats.isSymbolicLink() || !manifestStats.isFile()) throw new Error(`Plugin manifest is not a regular file: ${manifestFile}`);
  const manifest = JSON.parse(await fs.readFile(manifestFile, 'utf8'));
  if (manifest.name !== 'mansoor-agent-hub' || String(manifest.version) !== String(release)) {
    throw new Error(`Refusing agent sync from unexpected plugin identity/version: ${manifest.name}@${manifest.version}`);
  }
  const profiles = [];
  for (const entry of await fs.readdir(resolved, { withFileTypes: true })) {
    if (entry.isSymbolicLink()) throw new Error(`Refusing symbolic link in packaged agent profiles: ${entry.name}`);
    if (!entry.isFile() || !entry.name.endsWith('.md')) continue;
    const slug = path.basename(entry.name, '.md');
    if (!/^[a-z0-9][a-z0-9_-]*$/i.test(slug)) throw new Error(`Invalid packaged agent profile name: ${entry.name}`);
    const contents = await fs.readFile(path.join(resolved, entry.name));
    const text = contents.toString('utf8');
    if (!profileName(text)) throw new Error(`Packaged profile has no frontmatter name: ${entry.name}`);
    if (!text.includes(ownerMarker)) throw new Error(`Packaged profile is missing Mansoor ownership marker: ${entry.name}`);
    profiles.push({ slug, relative: `${slug}/agent.md`, contents, sha256: sha256(contents), name: profileName(text) });
  }
  if (!profiles.length) throw new Error('No signed Antigravity agent profiles were found in the active plugin.');
  return profiles.sort((left, right) => left.slug.localeCompare(right.slug));
}

async function loadState(file) {
  try {
    const stats = await fs.lstat(file);
    if (stats.isSymbolicLink() || !stats.isFile()) throw new Error(`Managed-profile state is not a regular file: ${file}`);
  } catch (error) { if (error?.code !== 'ENOENT') throw error; }
  let raw;
  try { raw = await fs.readFile(file, 'utf8'); }
  catch (error) { if (error?.code === 'ENOENT') return null; throw error; }
  let state;
  try { state = JSON.parse(raw); }
  catch { throw new Error(`Managed-profile state is malformed; preserving this root: ${file}`); }
  if (state?.schema !== stateSchema || !Array.isArray(state.files)) {
    throw new Error(`Managed-profile state has an unsupported schema; preserving this root: ${file}`);
  }
  for (const item of state.files) {
    if (!safeRelative(item.path) || !/^[a-f0-9]{64}$/i.test(String(item.sha256 || ''))) {
      throw new Error(`Managed-profile state contains an unsafe entry; preserving this root: ${file}`);
    }
  }
  return state;
}

async function existsFile(file) {
  try { return (await fs.lstat(file)).isFile(); }
  catch (error) { if (error?.code === 'ENOENT') return false; throw error; }
}

async function ensureRegularParent(root, relative) {
  const parts = relative.split('/');
  if (parts.length !== 2 || parts[1] !== 'agent.md') throw new Error(`Unsafe profile path: ${relative}`);
  const folder = path.join(root, parts[0]);
  try {
    const stats = await fs.lstat(folder);
    if (stats.isSymbolicLink() || !stats.isDirectory()) throw new Error(`Refusing non-directory or linked profile path: ${folder}`);
  } catch (error) {
    if (error?.code !== 'ENOENT') throw error;
    await fs.mkdir(folder, { recursive: false });
  }
  const file = path.join(folder, 'agent.md');
  try {
    const stats = await fs.lstat(file);
    if (stats.isSymbolicLink() || !stats.isFile()) throw new Error(`Refusing linked or non-file agent profile: ${file}`);
  } catch (error) { if (error?.code !== 'ENOENT') throw error; }
  return file;
}

async function archiveFile({ file, relative, targetRoot, backupRoot, release, category }) {
  const targetDigest = sha256(Buffer.from(path.resolve(targetRoot).toLowerCase())).slice(0, 16);
  const base = path.join(backupRoot, release, targetDigest, category, ...relative.split('/'));
  await assertNoSymlinkAncestors(base);
  let destination = base;
  try {
    const destinationStats = await fs.lstat(destination);
    if (destinationStats.isSymbolicLink() || !destinationStats.isFile()) throw new Error(`Refusing linked or non-file backup destination: ${destination}`);
    const existing = await fs.readFile(destination);
    if (sha256(existing) !== sha256(await fs.readFile(file))) destination = `${base}.${Date.now()}.bak`;
    else return destination;
  } catch (error) { if (error?.code !== 'ENOENT') throw error; }
  await fs.mkdir(path.dirname(destination), { recursive: true });
  await assertNoSymlinkAncestors(destination);
  await fs.copyFile(file, destination, fsConstants.COPYFILE_EXCL).catch((error) => {
    if (error?.code !== 'EEXIST') throw error;
  });
  const backupStats = await fs.lstat(destination);
  if (backupStats.isSymbolicLink() || !backupStats.isFile()) throw new Error(`Backup is not a regular file: ${destination}`);
  const sourceHash = sha256(await fs.readFile(file));
  const backupHash = sha256(await fs.readFile(destination));
  if (sourceHash !== backupHash) {
    await fs.rm(destination, { force: true });
    throw new Error(`Backup verification failed for ${file}`);
  }
  return destination;
}

async function writeAtomically(file, contents) {
  const temporary = `${file}.tmp-${process.pid}-${Date.now()}`;
  await fs.writeFile(temporary, contents, { flag: 'wx' });
  try { await fs.rename(temporary, file); }
  catch (error) { await fs.rm(temporary, { force: true }); throw error; }
}

async function archiveAndRemove({ file, relative, targetRoot, backupRoot, release, category }) {
  const stats = await fs.lstat(file);
  if (stats.isSymbolicLink() || !stats.isFile()) return { preserved: true };
  const backup = await archiveFile({ file, relative, targetRoot, backupRoot, release, category });
  await fs.rm(file);
  return { preserved: false, backup };
}

async function inspectLegacyProfiles(targetRoot, currentSlugs) {
  const candidates = [];
  for (const entry of await fs.readdir(targetRoot, { withFileTypes: true })) {
    if (entry.name === stateName || currentSlugs.has(entry.name.toLowerCase())) continue;
    if (entry.isSymbolicLink()) continue;
    if (entry.isDirectory()) {
      const file = path.join(targetRoot, entry.name, 'agent.md');
      if (!(await existsFile(file))) continue;
      const text = await fs.readFile(file, 'utf8');
      if (isLegacyMansoorProfile(entry.name, text)) candidates.push({ file, relative: `${entry.name}/agent.md` });
    } else if (entry.isFile() && entry.name.toLowerCase().endsWith('.md')) {
      const text = await fs.readFile(path.join(targetRoot, entry.name), 'utf8');
      if (isLegacyMansoorProfile(path.basename(entry.name, '.md'), text)) candidates.push({ file: path.join(targetRoot, entry.name), relative: entry.name });
    }
  }
  return candidates;
}

async function pruneEmptyParent(file, targetRoot) {
  const parent = path.dirname(file);
  if (parent === targetRoot) return;
  try { if ((await fs.readdir(parent)).length === 0) await fs.rmdir(parent); }
  catch (error) { if (!['ENOENT', 'ENOTEMPTY', 'EEXIST'].includes(error?.code)) throw error; }
}

async function validateRoot({ sourceProfiles, targetRoot, sourceRoot }) {
  const resolvedTarget = path.resolve(targetRoot);
  await assertNoSymlinkAncestors(resolvedTarget);
  if (resolvedTarget.split(path.sep).some((part) => part.toLowerCase() === 'plugins')) {
    throw new Error(`Refusing profile cleanup inside any plugin directory: ${resolvedTarget}`);
  }
  if (isInside(sourceRoot, resolvedTarget) || isInside(resolvedTarget, sourceRoot)) {
    throw new Error(`Refusing a profile target that overlaps the active plugin tree: ${resolvedTarget}`);
  }
  try {
    const rootStats = await fs.lstat(resolvedTarget);
    if (rootStats.isSymbolicLink() || !rootStats.isDirectory()) throw new Error(`Refusing linked or non-directory agent root: ${resolvedTarget}`);
  } catch (error) { if (error?.code !== 'ENOENT') throw error; }
  const stateFile = path.join(resolvedTarget, stateName);
  const previous = await loadState(stateFile);
  const previousByPath = new Map((previous?.files || []).map((entry) => [String(entry.path).replaceAll('\\', '/'), entry]));
  for (const profile of sourceProfiles) {
    const file = path.resolve(resolvedTarget, ...profile.relative.split('/'));
    if (!isInside(resolvedTarget, file)) throw new Error(`Profile path escapes target root: ${profile.relative}`);
    if (!(await existsFile(file))) continue;
    const current = await fs.readFile(file);
    const previousEntry = previousByPath.get(profile.relative);
    const owned = current.toString('utf8').includes(ownerMarker)
      || (previousEntry && sha256(current) === previousEntry.sha256)
      || profileName(current.toString('utf8')) === profile.name;
    if (sha256(current) !== profile.sha256 && !owned) {
      throw new Error(`Unmanaged profile conflict at ${file}; it was preserved and no profile roots were changed.`);
    }
  }
  return { resolvedTarget, previousByPath };
}

async function syncRoot({ sourceProfiles, targetRoot, backupRoot, release, sourceRoot }) {
  const { resolvedTarget, previousByPath } = await validateRoot({ sourceProfiles, targetRoot, sourceRoot });
  await fs.mkdir(resolvedTarget, { recursive: true });
  const rootStats = await fs.lstat(resolvedTarget);
  if (rootStats.isSymbolicLink() || !rootStats.isDirectory()) throw new Error(`Refusing linked or non-directory agent root: ${resolvedTarget}`);
  const stateFile = path.join(resolvedTarget, stateName);
  const currentPaths = new Set(sourceProfiles.map((profile) => profile.relative));
  const result = { targetRoot: resolvedTarget, written: 0, updated: 0, retired: 0, legacyArchived: 0, preserved: 0, conflicts: [] };

  for (const profile of sourceProfiles) {
    const file = await ensureRegularParent(resolvedTarget, profile.relative);
    if (await existsFile(file)) {
      const current = await fs.readFile(file);
      if (sha256(current) === profile.sha256) continue;
      const previousEntry = previousByPath.get(profile.relative);
      const owned = current.toString('utf8').includes(ownerMarker)
        || (previousEntry && sha256(current) === previousEntry.sha256)
        || profileName(current.toString('utf8')) === profile.name;
      if (!owned) throw new Error(`Unmanaged profile conflict appeared during sync: ${file}`);
      await archiveFile({ file, relative: profile.relative, targetRoot: resolvedTarget, backupRoot, release, category: 'replaced' });
      await writeAtomically(file, profile.contents);
      result.updated += 1;
    } else {
      await writeAtomically(file, profile.contents);
      result.written += 1;
    }
  }

  for (const [relative, entry] of previousByPath) {
    if (currentPaths.has(relative)) continue;
    const file = path.resolve(resolvedTarget, ...relative.split('/'));
    if (!isInside(resolvedTarget, file) || !(await existsFile(file))) continue;
    const current = await fs.readFile(file);
    if (sha256(current) !== entry.sha256 || !current.toString('utf8').includes(ownerMarker)) {
      result.preserved += 1;
      continue;
    }
    const archived = await archiveAndRemove({ file, relative, targetRoot: resolvedTarget, backupRoot, release, category: 'retired' });
    if (archived.preserved) result.preserved += 1;
    else { result.retired += 1; await pruneEmptyParent(file, resolvedTarget); }
  }

  const currentSlugs = new Set(sourceProfiles.map((profile) => profile.slug.toLowerCase()));
  for (const candidate of await inspectLegacyProfiles(resolvedTarget, currentSlugs)) {
    const archived = await archiveAndRemove({ file: candidate.file, relative: candidate.relative, targetRoot: resolvedTarget, backupRoot, release, category: 'legacy' });
    if (archived.preserved) result.preserved += 1;
    else { result.legacyArchived += 1; await pruneEmptyParent(candidate.file, resolvedTarget); }
  }

  const ownedFiles = [];
  for (const profile of sourceProfiles) {
    const file = path.resolve(resolvedTarget, ...profile.relative.split('/'));
    if (!(await existsFile(file))) continue;
    const actual = await fs.readFile(file);
    if (sha256(actual) === profile.sha256 && actual.toString('utf8').includes(ownerMarker)) {
      ownedFiles.push({ path: profile.relative, sha256: profile.sha256 });
    }
  }
  const state = { schema: stateSchema, plugin: 'mansoor-agent-hub', release: String(release), files: ownedFiles.sort((a, b) => a.path.localeCompare(b.path)) };
  await writeAtomically(stateFile, `${JSON.stringify(state, null, 2)}\n`);
  return result;
}

async function pruneOwnedPluginProfiles({ sourceProfiles, pluginRoot, backupRoot, release }) {
  const resolvedPlugin = path.resolve(pluginRoot);
  if (path.basename(resolvedPlugin).toLowerCase() !== 'mansoor-agent-hub'
    || path.basename(path.dirname(resolvedPlugin)).toLowerCase() !== 'plugins') {
    throw new Error(`Refusing cleanup outside the exact Mansoor plugin directory: ${resolvedPlugin}`);
  }
  await assertNoSymlinkAncestors(resolvedPlugin);
  const manifestFile = path.join(resolvedPlugin, 'plugin.json');
  const manifestStats = await fs.lstat(manifestFile);
  if (manifestStats.isSymbolicLink() || !manifestStats.isFile()) throw new Error(`Active plugin manifest is not a regular file: ${manifestFile}`);
  const manifest = JSON.parse(await fs.readFile(manifestFile, 'utf8'));
  if (manifest.name !== 'mansoor-agent-hub' || String(manifest.version) !== String(release)) {
    throw new Error(`Refusing cleanup in an unverified Mansoor plugin version: ${manifest.name}@${manifest.version}`);
  }
  const agentsRoot = path.join(resolvedPlugin, 'agents');
  const stats = await fs.lstat(agentsRoot);
  if (stats.isSymbolicLink() || !stats.isDirectory()) throw new Error(`Refusing linked or missing Mansoor plugin agent root: ${agentsRoot}`);
  const currentSlugs = new Set(sourceProfiles.map((profile) => profile.slug.toLowerCase()));
  const candidates = [];
  for (const entry of await fs.readdir(agentsRoot, { withFileTypes: true })) {
    if (entry.isSymbolicLink()) continue;
    if (entry.isFile() && entry.name.toLowerCase().endsWith('.md')) {
      const slug = path.basename(entry.name, '.md');
      if (currentSlugs.has(slug.toLowerCase())) continue;
      const file = path.join(agentsRoot, entry.name);
      const text = await fs.readFile(file, 'utf8');
      if (text.includes(ownerMarker) || isLegacyMansoorProfile(slug, text)) candidates.push({ file, relative: entry.name });
    } else if (entry.isDirectory()) {
      const file = path.join(agentsRoot, entry.name, 'agent.md');
      if (!(await existsFile(file))) continue;
      const text = await fs.readFile(file, 'utf8');
      if (text.includes(ownerMarker) || isLegacyMansoorProfile(entry.name, text)) candidates.push({ file, relative: `${entry.name}/agent.md` });
    }
  }
  const result = { pluginRoot: resolvedPlugin, retired: 0, preserved: 0, retiredProfiles: [] };
  for (const candidate of candidates) {
    const archived = await archiveAndRemove({ file: candidate.file, relative: candidate.relative, targetRoot: agentsRoot, backupRoot, release, category: 'plugin-legacy' });
    if (archived.preserved) result.preserved += 1;
    else {
      result.retired += 1;
      result.retiredProfiles.push(candidate.relative);
      await pruneEmptyParent(candidate.file, agentsRoot);
    }
  }
  return result;
}

export async function syncAntigravityAgentProfiles({ sourceRoot, targetRoots, backupRoot, release, pluginRoot = null }) {
  if (!Array.isArray(targetRoots) || targetRoots.length === 0) throw new Error('At least one Antigravity agent root is required.');
  if (!backupRoot) throw new Error('A separate backup root is required.');
  if (!/^[0-9]+\.[0-9]+\.[0-9]+(?:[-+][a-z0-9.-]+)?$/i.test(String(release || ''))) throw new Error('A valid release version is required for profile backup ownership.');
  const sourceProfiles = await readSources(sourceRoot, release);
  const resolvedSourceRoot = path.resolve(sourceRoot);
  const resolvedBackup = path.resolve(backupRoot);
  await assertNoSymlinkAncestors(resolvedBackup);
  const activePluginRoot = pluginRoot ? path.resolve(pluginRoot) : null;
  if (isInside(path.dirname(resolvedSourceRoot), resolvedBackup) || isInside(resolvedBackup, path.dirname(resolvedSourceRoot))
    || (activePluginRoot && (isInside(activePluginRoot, resolvedBackup) || isInside(resolvedBackup, activePluginRoot)))
    || targetRoots.some((target) => isInside(path.resolve(target), resolvedBackup) || isInside(resolvedBackup, path.resolve(target)))) {
    throw new Error('Profile backup root must be separate from the plugin and every active agent root.');
  }
  const uniqueTargets = [...new Set(targetRoots.map((value) => path.resolve(value)))];
  for (const targetRoot of uniqueTargets) await validateRoot({ sourceProfiles, targetRoot, sourceRoot: path.dirname(resolvedSourceRoot) });
  const results = [];
  for (const targetRoot of uniqueTargets) {
    results.push(await syncRoot({ sourceProfiles, targetRoot, backupRoot: resolvedBackup, release: String(release), sourceRoot: path.dirname(resolvedSourceRoot) }));
  }
  const pluginCleanup = activePluginRoot
    ? await pruneOwnedPluginProfiles({ sourceProfiles, pluginRoot: activePluginRoot, backupRoot: resolvedBackup, release: String(release) })
    : null;
  return { schema: stateSchema, release: String(release), profiles: sourceProfiles.length, backupRoot: resolvedBackup, roots: results, pluginCleanup };
}

function parseArgs(args) {
  const values = { targetRoots: [] };
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === '--source-root') values.sourceRoot = args[++index];
    else if (arg === '--target-root') values.targetRoots.push(args[++index]);
    else if (arg === '--backup-root') values.backupRoot = args[++index];
    else if (arg === '--release') values.release = args[++index];
    else if (arg === '--plugin-root') values.pluginRoot = args[++index];
    else throw new Error(`Unknown argument: ${arg}`);
  }
  return values;
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))) {
  try {
    const result = await syncAntigravityAgentProfiles(parseArgs(process.argv.slice(2)));
    console.log(JSON.stringify(result));
    const conflicts = result.roots.flatMap((root) => root.conflicts.map((relative) => `${root.targetRoot}:${relative}`));
    if (conflicts.length) {
      console.error(`Preserved unmanaged profile conflicts: ${conflicts.join(', ')}`);
      process.exitCode = 2;
    }
  } catch (error) {
    console.error(`Antigravity profile refresh failed safely: ${error.message}`);
    process.exitCode = 1;
  }
}
