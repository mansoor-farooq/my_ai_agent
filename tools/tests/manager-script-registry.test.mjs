import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { registerManagerScript, verifyManagerScriptCommand } from '../ultra-agent-v5/manager-script-registry.mjs';

function fixture() {
  const root = mkdtempSync(path.join(os.tmpdir(), 'mansoor-manager-script-'));
  const project = path.join(root, 'project');
  const registryPath = path.join(root, 'registry.json');
  const scriptPath = path.join(root, 'Desktop', 'Ultra_PC_Optimizer.ps1');
  mkdirSync(project, { recursive: true });
  mkdirSync(path.dirname(scriptPath), { recursive: true });
  writeFileSync(scriptPath, 'Set-Service -Name ClickToRunSvc -StartupType Manual\n', 'utf8');
  return { root, project, registryPath, scriptPath };
}

test('registers an owner-approved non-destructive script by project and content hash', () => {
  const item = fixture();
  try {
    const result = registerManagerScript({ scriptPath: item.scriptPath, projectRoot: item.project, registryPath: item.registryPath });
    assert.equal(result.status, 'registered');
    const registry = JSON.parse(readFileSync(item.registryPath, 'utf8'));
    assert.equal(registry.entries.length, 1);
    assert.equal(registry.entries[0].approvalScope, 'project-script-hash');
    assert.match(registry.entries[0].sha256, /^sha256:/);
  } finally { rmSync(item.root, { recursive: true, force: true }); }
});

test('verifies the exact unchanged PowerShell script outside the project workspace', () => {
  const item = fixture();
  try {
    registerManagerScript({ scriptPath: item.scriptPath, projectRoot: item.project, registryPath: item.registryPath });
    const result = verifyManagerScriptCommand(`powershell.exe -NoProfile -File "${item.scriptPath}"`, { workspacePaths: [item.project], registryPath: item.registryPath });
    assert.equal(result.approved, true);
    assert.equal(result.interpreter, 'powershell');
  } finally { rmSync(item.root, { recursive: true, force: true }); }
});

test('script changes or project changes invalidate the manager grant', () => {
  const item = fixture();
  const otherProject = path.join(item.root, 'other-project');
  try {
    registerManagerScript({ scriptPath: item.scriptPath, projectRoot: item.project, registryPath: item.registryPath });
    writeFileSync(item.scriptPath, 'Set-Service -Name ClickToRunSvc -StartupType Automatic\n', 'utf8');
    assert.equal(verifyManagerScriptCommand(`powershell -File "${item.scriptPath}"`, { workspacePaths: [item.project], registryPath: item.registryPath }).approved, false);
    writeFileSync(item.scriptPath, 'Set-Service -Name ClickToRunSvc -StartupType Manual\n', 'utf8');
    assert.equal(verifyManagerScriptCommand(`powershell -File "${item.scriptPath}"`, { workspacePaths: [otherProject], registryPath: item.registryPath }).approved, false);
  } finally { rmSync(item.root, { recursive: true, force: true }); }
});

test('destructive or network scripts cannot be registered for manager auto-run', () => {
  const item = fixture();
  try {
    writeFileSync(item.scriptPath, 'Remove-Item -Recurse -Force .\\tmp\n', 'utf8');
    assert.equal(registerManagerScript({ scriptPath: item.scriptPath, projectRoot: item.project, registryPath: item.registryPath }).status, 'blocked');
    writeFileSync(item.scriptPath, 'Invoke-WebRequest https://example.com\n', 'utf8');
    assert.equal(registerManagerScript({ scriptPath: item.scriptPath, projectRoot: item.project, registryPath: item.registryPath }).status, 'blocked');
  } finally { rmSync(item.root, { recursive: true, force: true }); }
});
