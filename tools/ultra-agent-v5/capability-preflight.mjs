#!/usr/bin/env node
import os from 'node:os';

function parseWindowsRelease(release) {
  const match = String(release || '').match(/^(\d+)\.(\d+)\.(\d+)$/);
  return match ? { major: Number(match[1]), minor: Number(match[2]), build: Number(match[3]) } : null;
}

export function probeCapabilities({ platform = process.platform, release = os.release(), edition = null, sandboxProbe = null } = {}) {
  const observed = { platform: String(platform), release: String(release || ''), edition: edition || null };
  const version = platform === 'win32' ? parseWindowsRelease(release) : null;
  let isolation;
  if (platform !== 'win32') {
    isolation = { status: 'unknown', reason: 'No Windows isolation probe applies to this host.' };
  } else if (!version) {
    isolation = { status: 'unknown', reason: 'Windows build could not be parsed.' };
  } else if (version.build < 22000) {
    isolation = { status: 'unsupported', reason: 'Windows 10 build does not establish the Win32 isolated-app capability.' };
  } else if (version.build < 26100) {
    isolation = { status: 'unknown', reason: 'Windows 11 detected, but the supported Win32 isolation threshold was not reached.' };
  } else if (sandboxProbe === 'verified-by-probe') {
    isolation = { status: 'verified-by-probe', reason: 'Host supplied a successful isolation boundary probe.' };
  } else if (sandboxProbe === 'enabled') {
    isolation = { status: 'enabled', reason: 'Host reported an enabled isolation mode; filesystem/network boundary is not independently proven.' };
  } else {
    isolation = { status: 'available', reason: 'Platform is eligible for an isolation mechanism; activation and boundary verification are still required.' };
  }
  return {
    schema: 'mansoor.v5-capability-preflight/v1',
    observed,
    isolation,
    nativeHostWrites: { status: 'unverified', reason: 'Antigravity native editor writes are host-controlled and require managed promotion evidence.' },
    modelRouting: { status: 'host-controlled', reason: 'The host must expose the selected model and effort; role metadata alone is not routing proof.' },
    physicalAndroid: { status: 'not-run', reason: 'Physical device evidence requires an attached device or configured device service.' },
    generatedAt: new Date().toISOString(),
  };
}
