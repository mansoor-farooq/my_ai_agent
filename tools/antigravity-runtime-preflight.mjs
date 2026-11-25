#!/usr/bin/env node
import os from 'node:os';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

function windowsBuild(release) {
  const match = String(release || '').match(/^(\d+)\.(\d+)\.(\d+)$/);
  return match ? { major: Number(match[1]), minor: Number(match[2]), build: Number(match[3]) } : null;
}

function decodeWslOutput(value) {
  if (Buffer.isBuffer(value)) {
    const utf8 = value.toString('utf8');
    return utf8.includes('\0') ? value.toString('utf16le') : utf8;
  }
  return String(value || '');
}

function parseWslDistros(list) {
  return String(list || '').split(/\r?\n/).flatMap((line) => {
    if (/^\s*name\s+state\s+version\s*$/i.test(line)) return [];
    const match = /^\s*(\*)?\s*([^\s]+)\s+(?:Running|Stopped)\s+\d+\s*$/i.exec(line);
    return match ? [{ name: match[2], isDefault: Boolean(match[1]) }] : [];
  });
}

export function inspectWslRuntime({ platform = process.platform, listOutput = null, statusOutput = null, readyDistro = null, error = null } = {}) {
  if (platform !== 'win32') return { available: false, reason: 'non-windows-host' };
  if (error) return { available: false, reason: String(error) };
  const list = decodeWslOutput(listOutput);
  const status = decodeWslOutput(statusOutput);
  if (!list.trim() || /access is denied|e_accessdenied|no installed distributions/i.test(`${list}\n${status}`)) {
    return { available: false, reason: /access is denied|e_accessdenied/i.test(`${list}\n${status}`) ? 'wsl-access-denied' : 'no-distribution' };
  }
  const rows = parseWslDistros(list);
  const distros = rows.map((row) => row.name);
  const candidates = rows.filter((row) => !/^docker-desktop(?:-data)?$/i.test(row.name));
  const selected = candidates.find((row) => row.name.toLowerCase() === String(readyDistro || '').toLowerCase()) || null;
  if (!selected) {
    return {
      available: false,
      reason: candidates.length ? 'distro-not-ready' : 'no-usable-distro',
      defaultDistro: null,
      preferredDistro: rows.find((row) => row.isDefault)?.name || null,
      distros,
    };
  }
  return {
    available: true,
    reason: 'healthy',
    defaultDistro: selected.name,
    preferredDistro: rows.find((row) => row.isDefault)?.name || null,
    readiness: ['bash', 'node', 'python3', 'non-root-user'],
    distros,
  };
}

let wslProbeCache = null;

function probeWslRuntime() {
  if (process.platform !== 'win32') return inspectWslRuntime({ platform: process.platform });
  if (wslProbeCache) return wslProbeCache;
  try {
    const listOutput = execFileSync('wsl.exe', ['--list', '--verbose'], { encoding: 'buffer', timeout: 2500, windowsHide: true });
    let statusOutput = '';
    try { statusOutput = execFileSync('wsl.exe', ['--status'], { encoding: 'buffer', timeout: 2500, windowsHide: true }); } catch (statusError) { statusOutput = statusError.stdout || statusError.stderr || ''; }
    const list = decodeWslOutput(listOutput);
    const rows = parseWslDistros(list);
    const candidates = rows.filter((row) => !/^docker-desktop(?:-data)?$/i.test(row.name));
    const preferred = rows.find((row) => row.isDefault);
    candidates.sort((left, right) => Number(right.name === preferred?.name) - Number(left.name === preferred?.name));
    const readinessCommand = 'test -x /bin/bash && node_path=$(command -v node) && python_path=$(command -v python3) && [[ "$node_path" != /mnt/* && "$python_path" != /mnt/* ]] && test "$(id -u)" -ne 0 && printf MANSOOR_WSL_READY';
    for (const candidate of candidates) {
      try {
        const output = execFileSync('wsl.exe', ['-d', candidate.name, '--', '/bin/bash', '-lc', readinessCommand], {
          encoding: 'utf8', timeout: 10000, windowsHide: true,
        });
        if (output.includes('MANSOOR_WSL_READY')) {
          wslProbeCache = inspectWslRuntime({ platform: process.platform, listOutput, statusOutput, readyDistro: candidate.name });
          return wslProbeCache;
        }
      } catch {
        // An unusable distro is not a blocker for Windows; try another installed distro.
      }
    }
    wslProbeCache = inspectWslRuntime({ platform: process.platform, listOutput, statusOutput });
    return wslProbeCache;
  } catch (error) {
    wslProbeCache = inspectWslRuntime({ platform: process.platform, error: error?.stderr || error?.message || 'wsl-probe-failed' });
    return wslProbeCache;
  }
}

export function inspectAntigravityRuntime({ platform = process.platform, release = os.release(), sandboxStatus } = {}) {
  const observed = { platform, release: String(release || '') };
  const wsl = platform === 'win32' && platform === process.platform ? probeWslRuntime() : null;
  const version = platform === 'win32' ? windowsBuild(release) : null;
  const osFamily = platform === 'win32' && version
    ? (version.major === 10 && version.build >= 22000 ? 'windows-11' : 'windows-10')
    : null;
  const platformSupport = platform === 'win32' ? (version ? 'supported' : 'unknown') : 'supported';
  if (sandboxStatus === 'available' || sandboxStatus === 'unavailable') {
    return {
      schema: 'mansoor.antigravity-runtime-preflight/v1',
      platformSupport,
      osFamily,
      sandbox: sandboxStatus,
      execution: sandboxStatus === 'available' ? 'sandboxed' : 'review-required',
      evidence: ['host-reported-sandbox-status'],
      observed,
      wsl,
    };
  }
  if (platform === 'win32') {
    if (!version) return { schema: 'mansoor.antigravity-runtime-preflight/v1', platformSupport, osFamily, sandbox: 'unknown', execution: 'review-required', evidence: [], observed, wsl };
    // Antigravity documents that CLI sandboxing is unavailable on Windows 10/older builds.
    // Windows 11 build detection is only a platform eligibility signal, not proof that the
    // current CLI/profile actually enabled sandboxing.
    if (version.major === 10 && version.build < 22000) {
      return { schema: 'mansoor.antigravity-runtime-preflight/v1', platformSupport, osFamily, sandbox: 'unavailable', execution: 'review-required', evidence: ['windows-10-cli-sandbox-not-supported'], observed, wsl };
    }
    if (version.major === 10 && version.build >= 22000) {
      return { schema: 'mansoor.antigravity-runtime-preflight/v1', platformSupport, osFamily, sandbox: 'unknown', execution: 'review-required', evidence: ['windows-11-platform-detected', 'sandbox-state-not-probed'], observed, wsl };
    }
  }
  return { schema: 'mansoor.antigravity-runtime-preflight/v1', platformSupport, osFamily, sandbox: 'unknown', execution: 'review-required', evidence: ['host-sandbox-state-not-probed'], observed, wsl };
}

if (process.argv[1] && fileURLToPath(import.meta.url).toLowerCase() === process.argv[1].toLowerCase()) {
  process.stdout.write(`${JSON.stringify(inspectAntigravityRuntime())}\n`);
}
