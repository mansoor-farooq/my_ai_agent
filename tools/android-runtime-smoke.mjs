#!/usr/bin/env node

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { parseAdbDevices } from './mobile-capability-preflight.mjs';

function resolveAdb() {
  const candidates = [
    process.env.ADB_PATH,
    process.env.ANDROID_HOME && path.join(process.env.ANDROID_HOME, 'platform-tools', 'adb.exe'),
    process.env.ANDROID_SDK_ROOT && path.join(process.env.ANDROID_SDK_ROOT, 'platform-tools', 'adb.exe'),
    process.platform === 'win32' && path.join(os.homedir(), 'AppData', 'Local', 'Android', 'Sdk', 'platform-tools', 'adb.exe'),
    'adb',
  ].filter(Boolean);
  for (const candidate of candidates) if (candidate === 'adb' || fs.existsSync(candidate)) return candidate;
  throw new Error('Android adb was not found.');
}

function runAdb(adb, serial, args) {
  return execFileSync(adb, ['-s', serial, ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
}

export function parsePackageState(output) {
  const versionCode = output.match(/versionCode[=\s]+([\w.-]+)/i)?.[1] ?? null;
  const versionName = output.match(/versionName[=\s]+([\w.-]+)/i)?.[1] ?? null;
  const targetSdk = output.match(/targetSdk[=\s]+(\d+)/i)?.[1] ?? null;
  return { installed: Boolean(output.trim()), versionCode, versionName, targetSdk };
}

function check(status, reason, evidence = null) {
  return { status, reason, ...(evidence ? { evidence } : {}) };
}

export function addDeepLinkCheck(checks, deepLinkCheck) {
  return { ...checks, deepLink: deepLinkCheck };
}

export function buildSmokeReport({ packageName, device, checks = {}, generatedAt = new Date() }) {
  const defaults = {
    install: device ? check('pass', 'Installed package was found on the selected device.') : check('unverified', 'No connected device evidence.'),
    launch: checks.launch ?? check('unverified', 'Launch was not executed.'),
    startup: checks.startup ?? check('unverified', 'Startup timing was not measured.'),
    backNavigation: checks.backNavigation ?? check('unverified', 'Back-navigation was not executed.'),
    deepLink: checks.deepLink ?? check('not_applicable', 'No deep-link URI was supplied.'),
    offline: checks.offline ?? check('unverified', 'Requires an app test hook; network state was not mutated.'),
    apiFailure: checks.apiFailure ?? check('unverified', 'Requires an app test hook or fixture endpoint.'),
  };
  const statuses = Object.values(defaults).map((item) => item.status);
  const overallStatus = !device ? 'unverified' : statuses.includes('fail') ? 'fail' : statuses.includes('unverified') ? 'unverified' : 'pass';
  return {
    schema: 'mansoor.android-runtime-smoke/v1',
    packageName,
    generatedAt: generatedAt.toISOString(),
    overallStatus,
    device: device ? { serial: device.serial, manufacturer: device.manufacturer, model: device.model, android: device.android, sdk: device.sdk } : null,
    checks: defaults,
    evidencePolicy: 'read-only ADB launch/back/deep-link checks; offline and API-failure checks require app-owned test hooks',
  };
}

function main() {
  const argv = process.argv.slice(2);
  const value = (flag) => {
    const index = argv.indexOf(flag);
    return index === -1 ? null : argv[index + 1];
  };
  const packageName = value('--package');
  if (!packageName) throw new Error('--package is required');
  const deepLink = value('--deep-link');
  const requireDevice = argv.includes('--require-device');
  const out = value('--out');
  const adb = resolveAdb();
  const devices = parseAdbDevices(execFileSync(adb, ['devices', '-l'], { encoding: 'utf8' })).filter((item) => item.state === 'device');
  if (!devices.length) {
    const report = buildSmokeReport({ packageName, device: null });
    if (out) fs.writeFileSync(path.resolve(out), `${JSON.stringify(report, null, 2)}\n`);
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
    if (requireDevice) process.exitCode = 2;
    return;
  }
  const selected = devices[0];
  const serial = selected.serial;
  const packageDump = runAdb(adb, serial, ['shell', 'dumpsys', 'package', packageName]);
  const packageState = parsePackageState(packageDump);
  const checks = {};
  if (!packageState.installed) {
    checks.install = check('fail', 'Package is not installed on the selected device.');
  } else {
    try {
      runAdb(adb, serial, ['shell', 'am', 'force-stop', packageName]);
      const timing = runAdb(adb, serial, ['shell', 'am', 'start', '-W', '-a', 'android.intent.action.MAIN', '-c', 'android.intent.category.LAUNCHER', '-n', `${packageName}/.MainActivity`]);
      const totalMs = Number(timing.match(/TotalTime:\s*(\d+)/)?.[1]);
      checks.launch = /Status:\s*ok/i.test(timing)
        ? check('pass', 'Android launch completed successfully.', timing.match(/Activity:\s*([^\r\n]+)/)?.[1] ?? null)
        : check('fail', 'Android launch did not return Status: ok.');
      checks.startup = Number.isFinite(totalMs) ? check('pass', 'Android launch timing measured with am start -W.', totalMs) : check('unverified', 'Launch completed but Android did not return TotalTime.');
      runAdb(adb, serial, ['shell', 'input', 'keyevent', '4']);
      checks.backNavigation = check('pass', 'Android back key was delivered without a command error.');
    } catch (error) {
      checks.launch = check('fail', error instanceof Error ? error.message : String(error));
    }
    if (deepLink) {
      try {
        runAdb(adb, serial, ['shell', 'am', 'start', '-W', '-a', 'android.intent.action.VIEW', '-d', deepLink]);
        Object.assign(checks, addDeepLinkCheck(checks, check('pass', 'Deep-link intent was accepted by Android.', deepLink)));
      } catch (error) {
        Object.assign(checks, addDeepLinkCheck(checks, check('fail', error instanceof Error ? error.message : String(error), deepLink)));
      }
    }
  }
  const report = buildSmokeReport({ packageName, device: { ...selected, ...packageState }, checks });
  if (out) {
    fs.mkdirSync(path.dirname(path.resolve(out)), { recursive: true });
    fs.writeFileSync(path.resolve(out), `${JSON.stringify(report, null, 2)}\n`);
  }
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  if (report.overallStatus === 'fail') process.exitCode = 1;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
