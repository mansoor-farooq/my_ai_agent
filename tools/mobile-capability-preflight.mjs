#!/usr/bin/env node

/**
 * Read-only Android device/emulator capability preflight.
 *
 * This intentionally reports evidence and uncertainty; it never grants
 * capability access, changes permissions, installs an APK or edits a project.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const CAPABILITIES = new Set([
  'bluetooth',
  'camera',
  'location',
  'ml',
  'notifications',
  'background',
  'storage',
]);

function parseArgs(argv) {
  const args = { capabilities: ['camera', 'bluetooth', 'location'] };
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith('--')) continue;
    const key = token.slice(2);
    if (key === 'require-device') {
      args.requireDevice = true;
      continue;
    }
    const value = argv[i + 1];
    if (!value || value.startsWith('--')) throw new Error(`Missing value for --${key}`);
    i += 1;
    if (key === 'capabilities') {
      if (value.trim().toLowerCase() === 'auto') {
        args.autoCapabilities = true;
        args.capabilities = [];
      } else {
        args.capabilities = value.split(',').map((item) => item.trim().toLowerCase()).filter(Boolean);
      }
    } else {
      args[key.replaceAll('-', '')] = value;
    }
  }
  const invalid = args.capabilities.filter((item) => !CAPABILITIES.has(item));
  if (invalid.length) throw new Error(`Unsupported capabilities: ${invalid.join(', ')}`);
  return args;
}

function resolveAdb() {
  const candidates = [
    process.env.ADB_PATH,
    process.env.ANDROID_HOME && path.join(process.env.ANDROID_HOME, 'platform-tools', 'adb.exe'),
    process.env.ANDROID_SDK_ROOT && path.join(process.env.ANDROID_SDK_ROOT, 'platform-tools', 'adb.exe'),
    process.platform === 'win32' && path.join(os.homedir(), 'AppData', 'Local', 'Android', 'Sdk', 'platform-tools', 'adb.exe'),
    'adb',
  ].filter(Boolean);
  for (const candidate of candidates) {
    if (candidate === 'adb' || fs.existsSync(candidate)) return candidate;
  }
  throw new Error('Android adb was not found. Set ADB_PATH, ANDROID_HOME or ANDROID_SDK_ROOT.');
}

function runAdb(adb, serial, args) {
  const fullArgs = serial ? ['-s', serial, ...args] : args;
  return execFileSync(adb, fullArgs, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
}

export function parseAdbDevices(output) {
  return output.split(/\r?\n/)
    .slice(1)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [serial, state, ...metadata] = line.split(/\s+/);
      const fields = Object.fromEntries(metadata.filter((item) => item.includes(':')).map((item) => {
        const index = item.indexOf(':');
        return [item.slice(0, index), item.slice(index + 1)];
      }));
      return { serial, state, ...fields };
    });
}

export function comparePermissionDrift(previousReport, currentReport) {
  const before = new Set(previousReport?.devices?.[0]?.package?.requestedPermissions ?? []);
  const after = new Set(currentReport?.devices?.[0]?.package?.requestedPermissions ?? []);
  const added = [...after].filter((permission) => !before.has(permission)).sort();
  const removed = [...before].filter((permission) => !after.has(permission)).sort();
  return { changed: added.length > 0 || removed.length > 0, added, removed };
}

function parseRequestedPermissions(packageDump) {
  const section = packageDump.match(/requested permissions:\s*([\s\S]*?)(?:\r?\n\s*(?:install permissions|runtime permissions|User \d+):|$)/i)?.[1] ?? '';
  return [...new Set(section.match(/android\.permission\.[A-Z0-9_]+/g) ?? [])].sort();
}

function readProp(adb, serial, name) {
  return runAdb(adb, serial, ['shell', 'getprop', name]);
}

function readDevice(adb, device, packageName) {
  const serial = device.serial;
  const sdk = Number.parseInt(readProp(adb, serial, 'ro.build.version.sdk'), 10) || null;
  const features = runAdb(adb, serial, ['shell', 'pm', 'list', 'features'])
    .split(/\r?\n/)
    .map((item) => item.trim().replace(/^feature:/, ''))
    .filter(Boolean);
  let packageDump = '';
  if (packageName) {
    try {
      packageDump = runAdb(adb, serial, ['shell', 'dumpsys', 'package', packageName]);
    } catch {
      packageDump = '';
    }
  }
  return {
    serial,
    state: device.state,
    manufacturer: readProp(adb, serial, 'ro.product.manufacturer'),
    model: readProp(adb, serial, 'ro.product.model'),
    android: readProp(adb, serial, 'ro.build.version.release'),
    sdk,
    abi: readProp(adb, serial, 'ro.product.cpu.abilist'),
    features,
    package: packageName
      ? { name: packageName, found: Boolean(packageDump), requestedPermissions: parseRequestedPermissions(packageDump) }
      : null,
  };
}

function hasFeature(device, suffix) {
  return device.features.some((feature) => feature === suffix || feature.endsWith(suffix));
}

export function evaluateCapability(capability, device) {
  if (!device) return { status: 'unverified', reason: 'No connected device or emulator evidence.' };
  const permissions = new Set(device.package?.requestedPermissions ?? []);
  const notApplicable = (reason) => ({ status: 'not_applicable', reason });
  switch (capability) {
    case 'camera':
      if (device.package?.found && !permissions.has('android.permission.CAMERA')) {
        return notApplicable('The installed app does not request camera access.');
      }
      return hasFeature(device, 'android.hardware.camera.any') || hasFeature(device, 'android.hardware.camera')
        ? { status: 'pass', reason: 'Camera feature reported by the device.' }
        : { status: 'fail', reason: 'Device reports no camera feature.' };
    case 'bluetooth':
      if (device.package?.found && ![...permissions].some((permission) => permission.startsWith('android.permission.BLUETOOTH'))) {
        return notApplicable('The installed app does not request Bluetooth access.');
      }
      return hasFeature(device, 'android.hardware.bluetooth') || hasFeature(device, 'android.hardware.bluetooth_le')
        ? { status: 'pass', reason: 'Bluetooth feature reported by the device.' }
        : { status: 'fail', reason: 'Device reports no Bluetooth feature.' };
    case 'location':
      if (device.package?.found && ![...permissions].some((permission) => permission.includes('ACCESS_FINE_LOCATION') || permission.includes('ACCESS_COARSE_LOCATION'))) {
        return notApplicable('The installed app does not request location access.');
      }
      return hasFeature(device, 'android.hardware.location') || hasFeature(device, 'android.hardware.location.gps')
        ? { status: 'pass', reason: 'Location feature reported by the device.' }
        : { status: 'fail', reason: 'Device reports no location feature.' };
    case 'storage':
      return device.sdk && device.sdk >= 29
        ? { status: 'pass', reason: 'Scoped storage era device; app-specific storage must still be tested.' }
        : { status: 'unverified', reason: 'Legacy storage behavior requires an app-specific runtime test.' };
    case 'notifications':
      if (device.package?.found && !permissions.has('android.permission.POST_NOTIFICATIONS')) {
        return notApplicable('The installed app does not request notification permission.');
      }
      return device.sdk && device.sdk >= 33
        ? { status: 'unverified', reason: 'POST_NOTIFICATIONS runtime permission must be exercised by the app.' }
        : { status: 'pass', reason: 'Pre-Android-13 notification permission behavior applies.' };
    case 'background':
      if (device.package?.found && ![...permissions].some((permission) => permission.includes('FOREGROUND_SERVICE') || permission.includes('RECEIVE_BOOT_COMPLETED') || permission.includes('ACCESS_BACKGROUND_LOCATION'))) {
        return notApplicable('The installed app does not declare a background execution capability.');
      }
      return { status: 'unverified', reason: 'OEM battery/background limits require a foreground/background runtime test.' };
    case 'ml':
      return { status: 'unverified', reason: 'Model, accelerator, memory and latency support require an app-specific inference test.' };
    default:
      return { status: 'unverified', reason: `No probe registered for ${capability}.` };
  }
}

function aggregateStatus(results) {
  const applicable = results.filter((result) => result.status !== 'not_applicable');
  if (applicable.length === 0) return results.length === 0 ? 'unverified' : 'pass';
  if (applicable.some((result) => result.status === 'fail')) return 'fail';
  if (applicable.some((result) => result.status !== 'pass')) return 'unverified';
  return 'pass';
}

function inferCapabilities(device) {
  const permissions = new Set(device.package?.requestedPermissions ?? []);
  const capabilities = ['storage'];
  if (permissions.has('android.permission.CAMERA')) capabilities.push('camera');
  if ([...permissions].some((permission) => permission.startsWith('android.permission.BLUETOOTH'))) capabilities.push('bluetooth');
  if ([...permissions].some((permission) => permission.includes('ACCESS_FINE_LOCATION') || permission.includes('ACCESS_COARSE_LOCATION'))) capabilities.push('location');
  if (permissions.has('android.permission.POST_NOTIFICATIONS')) capabilities.push('notifications');
  if ([...permissions].some((permission) => permission.includes('FOREGROUND_SERVICE') || permission.includes('RECEIVE_BOOT_COMPLETED') || permission.includes('ACCESS_BACKGROUND_LOCATION'))) capabilities.push('background');
  return capabilities;
}

export function buildReport({ projectRoot, packageName, capabilities, devices, generatedAt = new Date(), manifestDrift = null }) {
  const expiresAt = new Date(generatedAt.getTime() + 30 * 24 * 60 * 60 * 1000);
  const deviceReports = devices.map((device) => ({
    ...device,
    capabilities: Object.fromEntries(capabilities.map((capability) => [capability, evaluateCapability(capability, device)])),
  }));
  const capabilityResults = capabilities.map((capability) => {
    const observations = deviceReports.map((device) => device.capabilities[capability]);
    return { capability, status: aggregateStatus(observations), observations };
  });
  return {
    schema: 'mansoor.mobile-capability-report/v1',
    projectRoot: projectRoot ? path.resolve(projectRoot) : process.cwd(),
    packageName: packageName || null,
    generatedAt: generatedAt.toISOString(),
    expiresAt: expiresAt.toISOString(),
    evidencePolicy: 'read-only probe; runtime capability tests remain required for unverified states',
    overallStatus: manifestDrift?.changed ? 'unverified' : aggregateStatus(capabilityResults),
    ...(manifestDrift ? { manifestDrift } : {}),
    devices: deviceReports,
    capabilities: capabilityResults,
  };
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const adb = resolveAdb();
  const projectRoot = args.project || process.cwd();
  const rawDevices = parseAdbDevices(runAdb(adb, null, ['devices', '-l']));
  const connected = rawDevices.filter((device) => device.state === 'device');
  if (args.requireDevice && connected.length === 0) {
    console.error('No ready Android device/emulator is connected. Capability verification is blocked.');
    process.exitCode = 2;
    return;
  }
  const devices = connected.map((device) => readDevice(adb, device, args.package));
  const capabilities = args.autoCapabilities ? inferCapabilities(devices[0]) : args.capabilities;
  const previousPath = args.previousreport;
  const previousReport = previousPath && fs.existsSync(previousPath) ? JSON.parse(fs.readFileSync(previousPath, 'utf8')) : null;
  const manifestDrift = previousReport ? comparePermissionDrift(previousReport, { devices }) : null;
  const report = buildReport({ projectRoot, packageName: args.package, capabilities, devices, manifestDrift });
  const serialized = `${JSON.stringify(report, null, 2)}\n`;
  if (args.out) {
    fs.mkdirSync(path.dirname(path.resolve(args.out)), { recursive: true });
    fs.writeFileSync(args.out, serialized, 'utf8');
  }
  process.stdout.write(serialized);
  if (report.overallStatus === 'fail') process.exitCode = 1;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
