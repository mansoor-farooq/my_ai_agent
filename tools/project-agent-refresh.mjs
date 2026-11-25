#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { projectIdentity } from './ultra-agent-v2/project-identity.mjs';

export const PROJECT_STATE_RELATIVE = '.agents/mansoor-agent-state.json';
export const WORKSPACE_PLUGIN_RELATIVE = '.agents/plugins/mansoor-agent-hub';
export const ANTIGRAVITY_PROJECT_REGISTRY_RELATIVE = '.gemini/config/projects';

function fail(code, message = code) {
  throw Object.assign(new Error(message), { code });
}

function normalizeRoot(value, code) {
  const root = path.resolve(String(value || ''));
  if (!fs.existsSync(root) || !fs.statSync(root).isDirectory()) fail(code, `${code}: ${root}`);
  return fs.realpathSync.native(root);
}

function readJson(filePath, fallback = null) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return fallback;
  }
}

function sha256(value) {
  return `sha256:${crypto.createHash('sha256').update(value).digest('hex')}`;
}

function packageFingerprint(pluginRoot) {
  const manifest = path.join(pluginRoot, 'plugin.json');
  if (!fs.existsSync(manifest)) return null;
  const parts = [];
  for (const name of ['plugin.json', 'PACKAGE-CHECKSUMS.json', 'PACKAGE-SIGNATURE.json']) {
    const file = path.join(pluginRoot, name);
    if (fs.existsSync(file)) parts.push(`${name}\0${fs.readFileSync(file)}`);
  }
  if (!parts.length) return null;
  return sha256(Buffer.concat(parts.map((part) => Buffer.from(part))));
}

function packageIdentity(pluginRoot) {
  const plugin = readJson(path.join(pluginRoot, 'plugin.json'));
  if (!plugin || plugin.name !== 'mansoor-agent-hub') return null;
  const syncSource = path.join(pluginRoot, 'tools', 'ultra-agent-v5', 'sync-antigravity-permissions.mjs');
  const syncText = fs.existsSync(syncSource) ? fs.readFileSync(syncSource, 'utf8') : '';
  const policyVersion = syncText.match(/PERMISSION_POLICY_VERSION\s*=\s*['"]([^'"]+)/)?.[1] || null;
  return {
    name: plugin.name,
    version: String(plugin.version || ''),
    policyVersion,
    fingerprint: packageFingerprint(pluginRoot),
  };
}

function statePath(projectDir) {
  return path.join(projectDir, PROJECT_STATE_RELATIVE);
}

function workspacePluginPath(projectDir) {
  return path.join(projectDir, WORKSPACE_PLUGIN_RELATIVE);
}

function readState(projectDir) {
  const file = statePath(projectDir);
  if (!fs.existsSync(file)) return null;
  const state = readJson(file);
  return state && state.schema === 'mansoor.project-agent-state/v1' ? state : { invalid: true };
}

function projectFolderUris(projectRecord) {
  const resources = projectRecord?.projectResources?.resources;
  if (!Array.isArray(resources)) return [];
  return resources.flatMap((resource) => {
    const uri = resource?.folderUri || resource?.gitFolder?.folderUri;
    return typeof uri === 'string' && uri.startsWith('file:') ? [uri] : [];
  });
}

function projectPathFromUri(uri) {
  try {
    const decoded = fileURLToPath(uri);
    return path.resolve(decoded);
  } catch {
    return null;
  }
}

function permissionRegistryMode(projectRecord) {
  const grants = projectRecord?.permissionGrants;
  if (!grants || typeof grants !== 'object') return 'global-inherited';
  const customKeys = Object.keys(grants).filter((key) => key !== 'v2Migrated');
  return customKeys.length ? 'project-override-preserved' : 'global-inherited';
}

function readGlobalPermissionPolicy(configPath) {
  const config = readJson(configPath);
  const policy = config?.userSettings?.mansoorPermissionPolicy;
  if (!policy || typeof policy !== 'object') return null;
  return {
    schema: policy.schema || null,
    version: policy.version || null,
    mode: policy.mode || null,
    approvalScope: policy.approvalScope || null,
    manager: policy.manager || null,
  };
}

function writeJsonAtomic(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const temporary = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  fs.writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
  fs.renameSync(temporary, filePath);
}

function copyDirectory(source, destination) {
  fs.cpSync(source, destination, { recursive: true, force: true, errorOnExist: false });
}

function updateWorkspacePlugin({ projectDir, sourceRoot, currentFingerprint }) {
  const target = workspacePluginPath(projectDir);
  const parent = path.dirname(target);
  const stage = path.join(parent, `.mansoor-agent-hub.stage-${process.pid}-${Date.now()}`);
  const backupRoot = path.join(projectDir, '.agents', 'mansoor-agent-backups');
  const backup = path.join(backupRoot, `mansoor-agent-hub-${Date.now()}`);
  fs.mkdirSync(parent, { recursive: true });
  try {
    copyDirectory(sourceRoot, stage);
    if (fs.existsSync(target)) {
      fs.mkdirSync(backupRoot, { recursive: true });
      fs.renameSync(target, backup);
    }
    fs.renameSync(stage, target);
    const installed = packageIdentity(target);
    if (!installed || installed.fingerprint !== currentFingerprint) fail('project-plugin-verification-failed');
    return { target, rollbackPath: path.relative(projectDir, backup).replaceAll('\\', '/') };
  } catch (error) {
    if (fs.existsSync(stage)) fs.rmSync(stage, { recursive: true, force: true });
    if (!fs.existsSync(target) && fs.existsSync(backup)) fs.renameSync(backup, target);
    throw error;
  }
}

function classify(projectDir, sourceRoot) {
  const source = packageIdentity(sourceRoot);
  const target = workspacePluginPath(projectDir);
  const targetExists = fs.existsSync(target) && fs.statSync(target).isDirectory();
  const workspace = targetExists ? packageIdentity(target) : null;
  const state = readState(projectDir);
  if (!source) return { status: 'source-missing', source: null, workspace, state, targetExists };
  if (!targetExists) {
    const inheritedCurrent = state?.updateMode === 'global-inherited'
      && state.managedFingerprint === source.fingerprint
      && state.permissionPolicyVersion === source.policyVersion;
    return { status: inheritedCurrent ? 'current' : 'global-inherited', source, workspace: null, state, targetExists: false };
  }
  if (!workspace) return { status: 'unmanaged-workspace-plugin', source, workspace: null, state, targetExists: true };
  if (workspace.fingerprint === source.fingerprint) return { status: 'current', source, workspace, state, targetExists: true };
  if (state?.managedFingerprint && workspace.fingerprint !== state.managedFingerprint) {
    return { status: 'preserved-local', source, workspace, state, targetExists: true };
  }
  return { status: 'stale-managed-workspace', source, workspace, state, targetExists: true };
}

export function auditProjectAgent({ projectDir, sourceRoot, project } = {}) {
  const directory = normalizeRoot(projectDir, 'project-directory-required');
  const source = normalizeRoot(sourceRoot, 'source-plugin-required');
  const identity = projectIdentity({ dir: directory, project: project || path.basename(directory) });
  return {
    schema: 'mansoor.project-agent-refresh/v1',
    project: identity,
    projectState: path.join(directory, PROJECT_STATE_RELATIVE),
    workspacePlugin: path.join(directory, WORKSPACE_PLUGIN_RELATIVE),
    sourcePlugin: source,
    ...classify(directory, source),
  };
}

export function syncProjectAgent({ projectDir, sourceRoot, project, force = false, dryRun = false } = {}) {
  const audit = auditProjectAgent({ projectDir, sourceRoot, project });
  if (audit.status === 'source-missing') fail('source-plugin-invalid');
  const now = new Date().toISOString();
  const nextState = {
    schema: 'mansoor.project-agent-state/v1',
    projectId: audit.project.projectId,
    projectName: audit.project.name,
    manager: 'Mansoor AI Team Manager',
    source: 'global-installed-plugin',
    packageVersion: audit.source.version,
    permissionPolicyVersion: audit.source.policyVersion,
    managedFingerprint: audit.source.fingerprint,
    updateMode: audit.targetExists ? 'workspace-override' : 'global-inherited',
    lastSyncedAt: now,
  };

  if (audit.status === 'preserved-local' && !force) {
    return { ...audit, status: 'preserved-local', updated: false, reason: 'workspace-plugin-local-customization-detected' };
  }
  if (dryRun) return { ...audit, status: audit.status === 'current' ? 'current' : 'would-update', updated: audit.status !== 'current' };

  let rollbackPath = null;
  if (audit.targetExists && audit.status !== 'current') {
    const replacement = updateWorkspacePlugin({ projectDir: audit.project.directory, sourceRoot: audit.sourcePlugin, currentFingerprint: audit.source.fingerprint });
    rollbackPath = replacement.rollbackPath;
    nextState.rollbackPath = rollbackPath;
  }
  writeJsonAtomic(audit.projectState, nextState);
  return {
    ...audit,
    status: audit.status === 'current' ? 'current' : (audit.targetExists ? 'updated' : 'registered-global-inherited'),
    updated: audit.status !== 'current',
    rollbackPath,
    state: nextState,
  };
}

/**
 * Refresh every project Antigravity already knows about. This intentionally
 * uses the host registry instead of scanning drives, and never rewrites app
 * code or undocumented permission fields. Projects without an override inherit
 * the global policy; workspace copies are refreshed atomically when managed.
 */
export function syncKnownProjects({
  registryRoot,
  sourceRoot,
  configPath,
  force = false,
  dryRun = false,
} = {}) {
  const source = normalizeRoot(sourceRoot, 'source-plugin-required');
  const registry = path.resolve(registryRoot || path.join(process.env.USERPROFILE || process.env.HOME || '', ANTIGRAVITY_PROJECT_REGISTRY_RELATIVE));
  const policy = readGlobalPermissionPolicy(configPath || path.join(process.env.USERPROFILE || process.env.HOME || '', '.gemini', 'config', 'config.json'));
  if (!fs.existsSync(registry) || !fs.statSync(registry).isDirectory()) {
    return { schema: 'mansoor.project-agent-refresh-summary/v1', registry, policy, projects: [], counts: { discovered: 0, synced: 0, current: 0, preserved: 0, skipped: 0, errors: 0 } };
  }
  const projects = [];
  for (const file of fs.readdirSync(registry).filter((name) => name.toLowerCase().endsWith('.json')).sort()) {
    const registryFile = path.join(registry, file);
    const record = readJson(registryFile);
    const uri = projectFolderUris(record)[0];
    const projectDir = uri ? projectPathFromUri(uri) : null;
    const base = {
      registryFile,
      registryId: record?.id || path.basename(file, '.json'),
      projectName: record?.name || path.basename(file, '.json'),
      folderUri: uri || null,
      permissionMode: permissionRegistryMode(record),
    };
    if (!projectDir || !fs.existsSync(projectDir) || !fs.statSync(projectDir).isDirectory()) {
      projects.push({ ...base, status: 'skipped-missing-project', updated: false });
      continue;
    }
    try {
      projects.push({
        ...base,
        ...syncProjectAgent({ projectDir, sourceRoot: source, project: base.projectName, force, dryRun }),
        projectDir,
      });
    } catch (error) {
      projects.push({ ...base, projectDir, status: 'error', updated: false, error: error?.message || String(error) });
    }
  }
  const counts = {
    discovered: projects.length,
    synced: projects.filter((item) => item.updated === true).length,
    current: projects.filter((item) => item.status === 'current' || item.status === 'registered-global-inherited').length,
    preserved: projects.filter((item) => item.status === 'preserved-local' || item.permissionMode === 'project-override-preserved').length,
    skipped: projects.filter((item) => item.status === 'skipped-missing-project').length,
    errors: projects.filter((item) => item.status === 'error').length,
  };
  return { schema: 'mansoor.project-agent-refresh-summary/v1', registry, policy, projects, counts };
}

function arg(name, fallback = '') {
  const args = process.argv.slice(2);
  const index = args.indexOf(name);
  return index >= 0 && args[index + 1] ? args[index + 1] : fallback;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const mode = arg('--mode', 'audit');
  const projectDir = arg('--dir', process.cwd());
  const home = process.env.USERPROFILE || process.env.HOME || '';
  const sourceRoot = arg('--source', path.join(home, '.gemini', 'config', 'plugins', 'mansoor-agent-hub'));
  const result = mode === 'sync-known'
    ? syncKnownProjects({ registryRoot: arg('--registry', path.join(home, ANTIGRAVITY_PROJECT_REGISTRY_RELATIVE)), sourceRoot, configPath: arg('--config', path.join(home, '.gemini', 'config', 'config.json')), force: process.argv.includes('--force'), dryRun: process.argv.includes('--dry-run') })
    : mode === 'sync'
    ? syncProjectAgent({ projectDir, sourceRoot, project: arg('--project', path.basename(path.resolve(projectDir))), force: process.argv.includes('--force'), dryRun: process.argv.includes('--dry-run') })
    : auditProjectAgent({ projectDir, sourceRoot, project: arg('--project', path.basename(path.resolve(projectDir))) });
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}

