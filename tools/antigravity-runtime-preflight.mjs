#!/usr/bin/env node
import os from 'node:os';
import { fileURLToPath } from 'node:url';

function windowsBuild(release) {
  const match = String(release || '').match(/^(\d+)\.(\d+)\.(\d+)$/);
  return match ? { major: Number(match[1]), minor: Number(match[2]), build: Number(match[3]) } : null;
}

export function inspectAntigravityRuntime({ platform = process.platform, release = os.release(), sandboxStatus } = {}) {
  const observed = { platform, release: String(release || '') };
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
    };
  }
  if (platform === 'win32') {
    if (!version) return { schema: 'mansoor.antigravity-runtime-preflight/v1', platformSupport, osFamily, sandbox: 'unknown', execution: 'review-required', evidence: [], observed };
    // Antigravity documents that CLI sandboxing is unavailable on Windows 10/older builds.
    // Windows 11 build detection is only a platform eligibility signal, not proof that the
    // current CLI/profile actually enabled sandboxing.
    if (version.major === 10 && version.build < 22000) {
      return { schema: 'mansoor.antigravity-runtime-preflight/v1', platformSupport, osFamily, sandbox: 'unavailable', execution: 'review-required', evidence: ['windows-10-cli-sandbox-not-supported'], observed };
    }
    if (version.major === 10 && version.build >= 22000) {
      return { schema: 'mansoor.antigravity-runtime-preflight/v1', platformSupport, osFamily, sandbox: 'unknown', execution: 'review-required', evidence: ['windows-11-platform-detected', 'sandbox-state-not-probed'], observed };
    }
  }
  return { schema: 'mansoor.antigravity-runtime-preflight/v1', platformSupport, osFamily, sandbox: 'unknown', execution: 'review-required', evidence: ['host-sandbox-state-not-probed'], observed };
}

if (process.argv[1] && fileURLToPath(import.meta.url).toLowerCase() === process.argv[1].toLowerCase()) {
  process.stdout.write(`${JSON.stringify(inspectAntigravityRuntime())}\n`);
}
